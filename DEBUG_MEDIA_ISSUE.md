# Debugging Media Not Showing in Chat

## Steps to Debug

1. **Check if database migration was run:**
   - Go to Supabase Dashboard → SQL Editor
   - Run: `SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'messages' AND column_name IN ('media_url', 'media_type');`
   - If no rows returned, the migration hasn't been run

2. **Check if messages have media_url in database:**
   - Run: `SELECT id, content, media_url, media_type, created_at FROM messages WHERE media_url IS NOT NULL ORDER BY created_at DESC LIMIT 5;`
   - This will show if messages are being saved with media_url

3. **Check console logs:**
   - When sending a message with image, look for:
     - `📤 Sending message:` - Shows what's being sent
     - `📤 Calling send-message Edge Function:` - Shows Edge Function call
     - `✅ Send message response:` - Shows what Edge Function returned
     - `📥 Received messages:` - Shows what get-chat returns
     - `📸 Messages with media:` - Shows if messages have media_url

4. **Check Edge Function logs:**
   - Go to Supabase Dashboard → Edge Functions → send-message → Logs
   - Look for any errors when inserting messages

5. **Verify storage bucket:**
   - Check if `chat-media` bucket exists
   - Check if files are being uploaded to the correct path: `{matchId}/{userId}/{timestamp}.{ext}`

## Common Issues

1. **Migration not run:** Run `add_message_media.sql` migration
2. **Column name mismatch:** Database uses `media_url` (snake_case), ensure Edge Function uses same
3. **RLS policies:** Check if RLS is blocking reads/writes
4. **Storage bucket not public:** Check bucket permissions

## Quick Fix

If migration hasn't been run, execute this in Supabase SQL Editor:

```sql
ALTER TABLE messages 
ADD COLUMN IF NOT EXISTS media_url TEXT,
ADD COLUMN IF NOT EXISTS media_type TEXT;
```

