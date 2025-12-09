-- Add reply_to_id column to messages table
-- This allows messages to reference other messages they are replying to

ALTER TABLE public.messages
ADD COLUMN IF NOT EXISTS reply_to_id UUID REFERENCES public.messages(id) ON DELETE SET NULL;

-- Add index for better query performance when fetching replies
CREATE INDEX IF NOT EXISTS idx_messages_reply_to_id ON public.messages(reply_to_id);

-- Add comment
COMMENT ON COLUMN public.messages.reply_to_id IS 'ID of the message this message is replying to';

