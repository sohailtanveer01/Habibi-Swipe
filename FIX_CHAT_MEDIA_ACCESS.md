# Fix Chat Media 400 Error

## Problem
Images are being uploaded successfully, but when trying to display them, you get a 400 error: `"Download marked as failed because of invalid response status code 400"`

## Root Cause
The `chat-media` storage bucket is not public, so the public URLs don't work.

## Solution: Make the Bucket Public

### Option 1: Make Bucket Public (Recommended - Simplest)

1. Go to **Supabase Dashboard** → **Storage** → **Buckets**
2. Find the `chat-media` bucket
3. Click on it to open settings
4. Toggle **"Public bucket"** to **ON** ✅
5. Save

This will allow public access to all files in the bucket, similar to how `profile-photos` works.

### Option 2: Use Signed URLs (More Secure)

If you want to keep the bucket private, you need to use signed URLs. However, this requires:
- Generating signed URLs when displaying images
- URLs expire after a set time (e.g., 1 hour)
- More complex implementation

## Verify the Fix

After making the bucket public:
1. Try sending an image in chat
2. The image should now display correctly
3. Check the console - you should see `✅ Image loaded successfully` instead of the 400 error

## Alternative: Check RLS Policies

If making the bucket public doesn't work, check the RLS policies:

1. Go to **Supabase Dashboard** → **Storage** → **Policies**
2. Find policies for `chat-media` bucket
3. Ensure the "Users can read chat media" policy is active
4. The policy should allow users to read from match folders they're part of

## Quick Test

After making the bucket public, test with this URL format:
```
https://[your-project].supabase.co/storage/v1/object/public/chat-media/[matchId]/[userId]/[timestamp].jpg
```

If this URL works in a browser, the bucket is public and images should load in the app.

