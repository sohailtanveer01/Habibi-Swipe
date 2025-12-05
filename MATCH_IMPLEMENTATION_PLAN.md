# Match Implementation Plan

## Overview
When two users like each other, they should:
1. See a "Congratulations! You have matched" screen
2. Be redirected to the chat
3. No longer appear in "my likes" or "liked me" sections (since they're now matched)

## Backend Changes Required

### 1. Create `send-swipe` Edge Function
**Location**: `supabase/functions/send-swipe/index.ts`

**Functionality**:
- Record the swipe action in the `swipes` table
- Check if the other user has already liked the current user
- If both users have liked each other:
  - Create a match in the `matches` table
  - Return `{ matched: true, matchId: <match_id>, otherUser: <user_profile> }`
- If not matched:
  - Return `{ matched: false }`

**Logic**:
```typescript
1. Insert swipe record into `swipes` table
2. If action is "like":
   - Check if reverse swipe exists (swiped_id liked swiper_id)
   - If yes:
     a. Create match record in `matches` table
     b. Return match info
   - If no:
     a. Return no match
3. If action is "pass":
   - Just record the swipe, no match check needed
```

### 2. Update `get-liked-me` Edge Function
**Location**: `supabase/functions/get-liked-me/index.ts`

**Changes**:
- Exclude users who are already matched with the current user
- Filter out users where a match exists in the `matches` table

**Query Logic**:
```sql
-- Get swipes where someone liked current user
-- BUT exclude users who are already matched
SELECT swiper_id 
FROM swipes 
WHERE swiped_id = current_user_id 
  AND action = 'like'
  AND swiper_id NOT IN (
    SELECT CASE 
      WHEN user1 = current_user_id THEN user2 
      ELSE user1 
    END
    FROM matches
    WHERE user1 = current_user_id OR user2 = current_user_id
  )
```

### 3. Update `get-my-likes` Edge Function
**Location**: `supabase/functions/get-my-likes/index.ts`

**Changes**:
- Exclude users who are already matched with the current user
- Same filtering logic as `get-liked-me`

**Query Logic**:
```sql
-- Get swipes where current user liked someone
-- BUT exclude users who are already matched
SELECT swiped_id 
FROM swipes 
WHERE swiper_id = current_user_id 
  AND action = 'like'
  AND swiped_id NOT IN (
    SELECT CASE 
      WHEN user1 = current_user_id THEN user2 
      ELSE user1 
    END
    FROM matches
    WHERE user1 = current_user_id OR user2 = current_user_id
  )
```

### 4. Database Schema Requirements

**Matches Table** (should already exist):
```sql
CREATE TABLE matches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user1 UUID NOT NULL REFERENCES users(id),
  user2 UUID NOT NULL REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user1, user2),
  CHECK(user1 < user2) -- Ensure consistent ordering
);
```

**Swipes Table** (should already exist):
```sql
CREATE TABLE swipes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  swiper_id UUID NOT NULL REFERENCES users(id),
  swiped_id UUID NOT NULL REFERENCES users(id),
  action TEXT NOT NULL CHECK(action IN ('like', 'pass', 'superlike')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(swiper_id, swiped_id)
);
```

## Frontend Changes Required

### 1. Update Swipe Screen (`app/(main)/swipe/index.tsx`)
- When `data?.matched` is true:
  - Show match celebration modal/screen
  - Navigate to chat screen with the match ID
  - Pass the matched user's profile info

### 2. Create Match Celebration Screen
**Location**: `app/(main)/swipe/match-celebration.tsx` (or modal)

**Features**:
- "Congratulations! You have matched" message
- Show matched user's photo and name
- "Start Chatting" button that navigates to chat
- Auto-redirect after 3 seconds (optional)

### 3. Update Likes Screen
- No changes needed - backend will automatically exclude matched users

## Implementation Steps

1. ✅ Create `send-swipe` Edge Function
2. ✅ Update `get-liked-me` to exclude matches
3. ✅ Update `get-my-likes` to exclude matches
4. ✅ Create match celebration screen/modal
5. ✅ Update swipe screen to handle matches
6. ✅ Test match flow end-to-end

## Edge Function: send-swipe

```typescript
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Missing authorization header" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      {
        global: { headers: { Authorization: authHeader } },
      }
    );

    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { swiped_id, action } = await req.json();

    if (!swiped_id || !action) {
      return new Response(
        JSON.stringify({ error: "Missing swiped_id or action" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Record the swipe
    const { error: swipeError } = await supabaseClient
      .from("swipes")
      .upsert(
        {
          swiper_id: user.id,
          swiped_id: swiped_id,
          action: action,
        },
        {
          onConflict: "swiper_id,swiped_id",
        }
      );

    if (swipeError) {
      console.error("Error recording swipe:", swipeError);
      return new Response(
        JSON.stringify({ error: swipeError.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let matched = false;
    let matchId = null;
    let otherUser = null;

    // Check for match only if action is "like"
    if (action === "like") {
      // Check if the other user has already liked this user
      const { data: reverseSwipe } = await supabaseClient
        .from("swipes")
        .select("*")
        .eq("swiper_id", swiped_id)
        .eq("swiped_id", user.id)
        .eq("action", "like")
        .single();

      if (reverseSwipe) {
        // Match! Create match record
        // Ensure user1 < user2 for consistent ordering
        const user1 = user.id < swiped_id ? user.id : swiped_id;
        const user2 = user.id < swiped_id ? swiped_id : user.id;

        const { data: match, error: matchError } = await supabaseClient
          .from("matches")
          .insert({
            user1: user1,
            user2: user2,
          })
          .select()
          .single();

        if (matchError) {
          // Match might already exist, try to fetch it
          const { data: existingMatch } = await supabaseClient
            .from("matches")
            .select("*")
            .or(`user1.eq.${user1},user2.eq.${user1}`)
            .or(`user1.eq.${user2},user2.eq.${user2}`)
            .single();

          if (existingMatch) {
            matchId = existingMatch.id;
            matched = true;
          } else {
            console.error("Error creating match:", matchError);
          }
        } else {
          matchId = match.id;
          matched = true;
        }

        // Get the other user's profile
        if (matched) {
          const { data: profile } = await supabaseClient
            .from("users")
            .select("id, first_name, last_name, name, photos")
            .eq("id", swiped_id)
            .single();

          if (profile) {
            otherUser = profile;
          }
        }
      }
    }

    return new Response(
      JSON.stringify({
        matched: matched,
        matchId: matchId,
        otherUser: otherUser,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in send-swipe:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
```

## Summary

**Backend Changes**:
1. Create `send-swipe` Edge Function (handles swipe recording and match creation)
2. Update `get-liked-me` to exclude matched users
3. Update `get-my-likes` to exclude matched users

**Frontend Changes**:
1. Create match celebration screen/modal
2. Update swipe screen to show celebration and redirect to chat
3. No changes needed to likes screen (backend handles filtering)

