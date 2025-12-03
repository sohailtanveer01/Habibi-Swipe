# Backend Changes for Removing Marriage Intent Step

This document outlines the backend changes needed after removing the Marriage Intent step from onboarding.

---

## 1. Database Schema Changes

### Option A: Keep Columns (Recommended for Backward Compatibility)
**No immediate changes needed.** The columns can remain in the database for existing users who have already set these values. New users will simply have `NULL` values for these fields.

### Option B: Remove Columns (If you want to completely remove the fields)

If you want to completely remove the columns from the database, run this migration:

```sql
-- Remove marriage timeline columns from users table
ALTER TABLE public.users 
DROP COLUMN IF EXISTS get_to_know_timeline,
DROP COLUMN IF EXISTS marriage_timeline;
```

**⚠️ Warning:** This will permanently delete all existing marriage timeline data for all users. Only do this if you're certain you don't need this data.

---

## 2. Edge Functions

### No Changes Required

The following Edge Functions do **NOT** need changes:
- `get_swipe_feed` - Does not filter or use marriage timeline fields
- `get-chat` - Does not use marriage timeline fields
- `get-chat-list` - Does not use marriage timeline fields
- `send-message` - Does not use marriage timeline fields
- `get-liked-me` - Does not use marriage timeline fields
- `get-my-likes` - Does not use marriage timeline fields
- `get-viewers` - Does not use marriage timeline fields
- `create-profile-view` - Does not use marriage timeline fields

**Reason:** None of the Edge Functions currently filter or use the `get_to_know_timeline` or `marriage_timeline` fields.

---

## 3. Frontend Changes (Already Completed)

The following frontend changes have been made:

1. ✅ **Deleted** `app/(auth)/onboarding/step2-Marriage_Intent.tsx`
2. ✅ **Updated** `step1-basic.tsx` to navigate directly to `step3-Religiosity`
3. ✅ **Updated** all step numbers from 9 to 8 steps
4. ✅ **Removed** `getToKnowTimeline` and `marriageTimeline` from `onboardingStore.tsx`
5. ✅ **Removed** saving these fields in `done.tsx`
6. ✅ **Removed** editing/displaying these fields in:
   - `app/(main)/profile/index.tsx`
   - `app/(main)/profile/preview.tsx`
   - `components/ProfileCard.tsx`

---

## 4. Migration Strategy

### Recommended Approach: Keep Columns, Stop Using Them

1. **Keep the columns** in the database (no migration needed)
2. **Existing users** who have set marriage timelines will still see them in their profiles (if you want to remove this, you'll need to update the profile screens)
3. **New users** will have `NULL` values for these fields
4. The columns can be removed later if needed via a migration

### Alternative: Remove Columns Immediately

If you want to remove the columns immediately:

1. Run the migration SQL above
2. Update any existing profile data that references these fields (if any)
3. The frontend is already updated to not use these fields

---

## 5. Summary

**Required Backend Actions:**
- ✅ **None** - The frontend has been updated to stop collecting and displaying these fields
- ⚠️ **Optional** - Remove columns from database if you want to completely eliminate the fields

**Edge Functions:**
- ✅ **No changes needed** - None of the Edge Functions use these fields

**Database:**
- ✅ **No changes required** - Columns can remain for backward compatibility
- ⚠️ **Optional** - Remove columns if you want to clean up the schema

---

## 6. Testing Checklist

After deploying these changes:

- [ ] New users can complete onboarding without the marriage intent step
- [ ] Onboarding flow goes: Step 1 → Step 2 (Religiosity) → Step 3 (Hobbies) → etc.
- [ ] Profile screens no longer show marriage timeline fields
- [ ] Profile cards no longer display marriage timeline information
- [ ] Existing users with marriage timeline data don't see errors (if columns remain)
- [ ] Swipe feed and other features work normally

---

## Notes

- The `get_to_know_timeline` and `marriage_timeline` columns were never used in filtering or matching logic
- These fields were purely informational and displayed on user profiles
- Removing them does not affect the core matching/swiping functionality

