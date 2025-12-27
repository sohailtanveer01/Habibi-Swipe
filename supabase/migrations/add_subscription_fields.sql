-- Add subscription-related columns to users table
ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS is_premium BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS boost_count INTEGER DEFAULT 1;

-- Update existing users to have 1 boost if they don't have these columns yet
UPDATE public.users SET boost_count = 1 WHERE boost_count IS NULL;
