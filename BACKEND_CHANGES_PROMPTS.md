# Backend Changes for Prompts Feature

## Database Schema Changes

### 1. Add `prompts` column to `users` table

You need to add a new column to store user prompts and answers. The prompts should be stored as a JSONB array.

**SQL Migration:**

```sql
-- Add prompts column to users table
ALTER TABLE users 
ADD COLUMN prompts JSONB DEFAULT '[]'::jsonb;

-- Add comment for documentation
COMMENT ON COLUMN users.prompts IS 'Array of user prompts with questions and answers. Format: [{"id": "string", "question": "string", "answer": "string"}]';
```

### 2. Optional: Create a separate `user_prompts` table (Alternative Approach)

If you prefer a normalized approach with a separate table:

```sql
-- Create user_prompts table
CREATE TABLE user_prompts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  question TEXT NOT NULL,
  answer TEXT NOT NULL,
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, display_order)
);

-- Create index for faster queries
CREATE INDEX idx_user_prompts_user_id ON user_prompts(user_id);

-- Add RLS policies
ALTER TABLE user_prompts ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own prompts
CREATE POLICY "Users can view own prompts"
  ON user_prompts FOR SELECT
  USING (auth.uid() = user_id);

-- Policy: Users can insert their own prompts
CREATE POLICY "Users can insert own prompts"
  ON user_prompts FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Policy: Users can update their own prompts
CREATE POLICY "Users can update own prompts"
  ON user_prompts FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Policy: Users can delete their own prompts
CREATE POLICY "Users can delete own prompts"
  ON user_prompts FOR DELETE
  USING (auth.uid() = user_id);
```

## ✅ Implementation: Separate Table (Selected)

You have chosen to use the **separate table approach** (Option 2). This provides:
- Better normalization
- Easier to query individual prompts
- Better for future features (e.g., prompt analytics)
- Cleaner data structure

## Data Format

The `user_prompts` table stores each prompt as a separate row:

| id | user_id | question | answer | display_order |
|----|---------|----------|--------|---------------|
| uuid | uuid | "My love language is…" | "Quality time and physical touch" | 0 |
| uuid | uuid | "One thing I'm proud of…" | "Completing my master's degree" | 1 |
| uuid | uuid | "A green flag about me…" | "I'm a great listener" | 2 |

The `display_order` field determines the order in which prompts should be displayed.

## Frontend Integration

The frontend is already set up to:
1. Collect prompts during onboarding (step 5)
2. Store them in the onboarding store
3. Save them to the `user_prompts` table in the `done.tsx` screen

The prompts are saved separately after the user profile is created:

```typescript
// Delete existing prompts
await supabase
  .from("user_prompts")
  .delete()
  .eq("user_id", user.id);

// Insert new prompts with display_order
const promptsToInsert = data.prompts.map((prompt, index) => ({
  user_id: user.id,
  question: prompt.question,
  answer: prompt.answer,
  display_order: index,
}));

await supabase
  .from("user_prompts")
  .insert(promptsToInsert);
```

## Edge Functions / RPC Updates

If you have any Edge Functions or RPC functions that return user profiles, you need to join with the `user_prompts` table:

```typescript
// Example in get_swipe_feed or similar functions
const { data: user } = await supabase
  .from("users")
  .select("id, name, photos, ...")
  .eq("id", userId)
  .single();

// Fetch prompts separately
const { data: prompts } = await supabase
  .from("user_prompts")
  .select("question, answer, display_order")
  .eq("user_id", userId)
  .order("display_order", { ascending: true });

// Combine in response
return {
  ...user,
  prompts: prompts || []
};
```

Or use a join query:

```typescript
const { data } = await supabase
  .from("users")
  .select(`
    id,
    name,
    photos,
    ...,
    user_prompts (
      question,
      answer,
      display_order
    )
  `)
  .eq("id", userId)
  .single();

// The prompts will be in data.user_prompts array
```

## Displaying Prompts

When displaying user profiles (swipe cards, profile preview, etc.), you can access prompts like:

```typescript
// If using join query
const prompts = profile.user_prompts || [];
prompts.sort((a, b) => a.display_order - b.display_order);
prompts.forEach((prompt) => {
  console.log(prompt.question); // "My love language is…"
  console.log(prompt.answer);   // "Quality time and physical touch"
});

// Or if prompts are fetched separately and added to the profile object
const prompts = profile.prompts || [];
prompts.forEach((prompt) => {
  console.log(prompt.question);
  console.log(prompt.answer);
});
```

## Validation

Consider adding a database function or trigger to ensure a user doesn't have more than 3 prompts:

```sql
-- Function to check prompt count
CREATE OR REPLACE FUNCTION check_prompts_limit()
RETURNS TRIGGER AS $$
BEGIN
  IF (SELECT COUNT(*) FROM user_prompts WHERE user_id = NEW.user_id) > 3 THEN
    RAISE EXCEPTION 'Maximum 3 prompts allowed per user';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to enforce limit
CREATE TRIGGER enforce_prompts_limit
  BEFORE INSERT ON user_prompts
  FOR EACH ROW
  EXECUTE FUNCTION check_prompts_limit();
```

Or use a simpler approach with a unique constraint on (user_id, display_order) and ensure display_order is 0, 1, or 2:

```sql
-- Ensure display_order is between 0 and 2
ALTER TABLE user_prompts 
ADD CONSTRAINT check_display_order_range 
CHECK (display_order >= 0 AND display_order <= 2);
```

## Summary

1. ✅ `user_prompts` table created (you've done this)
2. ✅ Frontend updated to save prompts to `user_prompts` table
3. ⚠️ Update any Edge Functions that fetch user data to join with `user_prompts`
4. ⚠️ Update profile display components to show prompts
5. ✅ (Optional) Add validation constraint for max 3 prompts

The frontend is already complete and will save prompts to the `user_prompts` table!

