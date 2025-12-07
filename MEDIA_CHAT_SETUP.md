# Media Chat Setup Instructions

## Overview
Media functionality has been implemented for chat messages. Users can now send images along with text messages (or images alone).

## Database Changes

### 1. Run Migration: `add_message_media.sql`
This migration adds `media_url` and `media_type` columns to the `messages` table.

**To apply:**
```sql
-- Run this in Supabase SQL Editor or via migration
ALTER TABLE messages 
ADD COLUMN IF NOT EXISTS media_url TEXT,
ADD COLUMN IF NOT EXISTS media_type TEXT;
```

## Storage Setup

### 2. Create Storage Bucket: `chat-media`

**In Supabase Dashboard:**
1. Go to **Storage** → **Buckets**
2. Click **New Bucket**
3. Name: `chat-media`
4. **Public bucket**: ✅ Yes (or configure RLS policies)
5. Click **Create bucket**

### 3. Run Storage RLS Migration: `add_chat_media_storage_rls.sql`

**Note:** The RLS policies in the migration file use `storage.foldername()` which may not be available in all Supabase versions. You may need to adjust the policies based on your Supabase setup.

**Alternative approach (if RLS policies don't work):**
- Make the bucket public (simpler, but less secure)
- Or use service role key for uploads (more secure, but requires Edge Function for uploads)

## Edge Function Updates

### 4. Deploy Updated `send-message` Function

The `send-message` Edge Function has been updated to:
- Accept optional `mediaUrl` and `mediaType` parameters
- Allow messages with only media (no text) or only text (no media)
- Store media information in the database

**To deploy:**
```bash
supabase functions deploy send-message
```

## Frontend Implementation

### ✅ Completed Features:

1. **Image Picker**
   - Tapping the "+" button opens the device gallery
   - Users can select one image at a time
   - Image quality is compressed to 0.8 for faster uploads

2. **Image Preview**
   - Selected image appears above the input field
   - Users can remove the selected image before sending
   - Preview shows a small thumbnail with a close button

3. **Image Upload**
   - Images are uploaded to Supabase Storage before sending
   - Path structure: `{matchId}/{userId}/{timestamp}.{ext}`
   - Upload happens when user taps "Send"
   - Loading indicator shows during upload

4. **Message Display**
   - Images are displayed in chat messages using `expo-image` for optimization
   - Images appear above text content if both are present
   - Images are clickable (placeholder for full-screen viewer)
   - Images are 250x250px with rounded corners

5. **Send Button**
   - Enabled when either text or image is present
   - Shows loading spinner during media upload
   - Always visible with gold background

## Testing Checklist

- [ ] Run database migration
- [ ] Create `chat-media` storage bucket
- [ ] Deploy updated `send-message` Edge Function
- [ ] Test image selection from gallery
- [ ] Test image preview and removal
- [ ] Test sending image-only message
- [ ] Test sending text + image message
- [ ] Test image display in chat
- [ ] Test image upload error handling
- [ ] Verify images are stored correctly in Storage
- [ ] Verify media_url is saved in messages table

## Future Enhancements

- Full-screen image viewer when tapping on images
- Multiple images per message
- Video support
- Image compression before upload
- Progress indicator for large uploads
- Camera capture option (not just gallery)

