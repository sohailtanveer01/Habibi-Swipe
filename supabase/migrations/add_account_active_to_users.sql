-- Migration to add account_active column to users table
ALTER TABLE IF EXISTS public.users 
ADD COLUMN IF NOT EXISTS account_active BOOLEAN DEFAULT true NOT NULL;

-- Add index for efficient filtering in swipe feed and chat list
CREATE INDEX IF NOT EXISTS idx_users_account_active ON public.users(account_active);

-- Update existing users to be active (though DEFAULT true NOT NULL handles this for future)
-- UPDATE public.users SET account_active = true WHERE account_active IS NULL;
