# Unread Messages Implementation Plan

## Overview
Implement unread message tracking to show users which chats have new messages they haven't read yet.

## Database Schema Requirements

### Messages Table
Ensure the `messages` table has a `read` column:
```sql
ALTER TABLE messages 
ADD COLUMN IF NOT EXISTS read BOOLEAN DEFAULT FALSE;
```

## Implementation Components

### 1. Edge Function: `get-chat` (Update)
**Location**: `supabase/functions/get-chat/index.ts`

**Changes**:
- When loading chat, mark all messages from the other user as read
- Return unread count in the response

**Response Addition**:
```json
{
  "unreadCount": 5,  // Number of unread messages before marking as read
  ...
}
```

### 2. Edge Function: `get-chat-list` (New)
**Location**: `supabase/functions/get-chat-list/index.ts`

**Purpose**: Get all matches with unread counts per chat

**Response**:
```json
{
  "matches": [
    {
      "id": "...",
      "otherUser": {...},
      "lastMessage": {...},
      "unreadCount": 3,  // Number of unread messages in this chat
      "lastMessageTime": "..."
    }
  ]
}
```

### 3. Chat List Screen (`chat/index.tsx`)
**Changes**:
- Fetch unread count for each match
- Display unread badge on chat items with unread messages
- Show unread count badge (red circle with number)
- Bold text for chats with unread messages
- Subscribe to real-time message updates to refresh unread counts

**UI Updates**:
- Add red badge with unread count next to chat item
- Make chat item name bold if unread messages exist
- Show unread count in badge (max 99+)

### 4. Chat Detail Screen (`chat/[chatId].tsx`)
**Changes**:
- When chat is opened, mark all messages as read (via Edge Function)
- Remove "Unread" label from sent messages (that's for the other user)
- Real-time subscription should update when messages are marked as read

### 5. Tab Bar Badge (`_layout.tsx`)
**Changes**:
- Update unread count calculation to use `read = false` filter
- Only count messages where `sender_id != current_user.id AND read = false`
- Show badge on chat tab icon when unread messages exist

### 6. Real-time Subscriptions
**Subscriptions Needed**:
1. **Chat List**: Subscribe to message INSERT/UPDATE events to refresh unread counts
2. **Chat Detail**: Subscribe to message UPDATE events (when marked as read)
3. **Tab Bar**: Subscribe to message INSERT events to update global count

## Implementation Flow

### When User Opens a Chat:
1. Call `get-chat` Edge Function
2. Edge Function marks all messages from other user as read
3. Return updated messages with `read: true`
4. Update local state
5. Refresh chat list unread counts

### When New Message Arrives:
1. Real-time subscription fires
2. If chat is open: Add message to list (it's already read if we're viewing)
3. If chat is closed: Increment unread count for that chat
4. Update tab bar badge count

### When User Views Chat List:
1. Call `get-chat-list` Edge Function
2. Get all matches with unread counts
3. Display badges on chats with unread messages
4. Subscribe to real-time updates

## Visual Indicators

### Chat List Item:
```
[Photo] Name (Bold if unread)        [3] 10:30
        Last message preview
```

### Tab Bar:
- Red dot on chat icon if any unread messages
- Badge with count if count > 0

## Edge Cases to Handle

1. **Multiple Devices**: If user opens chat on device A, messages should be marked as read on device B too (via real-time)
2. **Network Issues**: If marking as read fails, retry mechanism
3. **Race Conditions**: Handle case where new message arrives while marking as read
4. **Performance**: Batch unread count queries, use indexes on `read` and `sender_id` columns

## Database Indexes (Recommended)
```sql
CREATE INDEX IF NOT EXISTS idx_messages_match_read 
ON messages(match_id, read) 
WHERE read = false;

CREATE INDEX IF NOT EXISTS idx_messages_sender_read 
ON messages(sender_id, read) 
WHERE read = false;
```

## Testing Checklist

- [ ] Messages marked as read when chat is opened
- [ ] Unread count shows correctly on chat list
- [ ] Badge appears on tab bar when unread messages exist
- [ ] Real-time updates work when new messages arrive
- [ ] Unread count decreases when chat is opened
- [ ] Multiple chats show correct unread counts
- [ ] No unread count shown for own messages
- [ ] Badge disappears when all messages are read

