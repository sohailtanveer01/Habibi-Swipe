-- Migration: Sync email from auth.users to public.users

-- 1. Add email column to public.users if it doesn't exist
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS email TEXT;

-- 2. Create index on email for faster searches (especially for check-user-status)
CREATE INDEX IF NOT EXISTS idx_users_email ON public.users(email);

-- 3. Function to pull email from auth.users
-- This will be used when a profile is first created in public.users
CREATE OR REPLACE FUNCTION public.sync_email_from_auth()
RETURNS TRIGGER AS $$
BEGIN
  -- Fetch email from auth.users and set it on the new public.users record
  NEW.email := (SELECT email FROM auth.users WHERE id = NEW.id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Trigger on public.users (BEFORE INSERT)
-- This ensures that as soon as a profile is created, it has the correct email
DROP TRIGGER IF EXISTS on_public_user_created ON public.users;
CREATE TRIGGER on_public_user_created
  BEFORE INSERT ON public.users
  FOR EACH ROW EXECUTE FUNCTION public.sync_email_from_auth();

-- 5. Function to update email when it changes in auth.users
CREATE OR REPLACE FUNCTION public.handle_auth_email_update()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.users SET email = NEW.email WHERE id = NEW.id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. Trigger on auth.users (AFTER UPDATE)
-- This keeps the email in sync if it's changed in the auth system later
DROP TRIGGER IF EXISTS on_auth_email_updated ON auth.users;
CREATE TRIGGER on_auth_email_updated
  AFTER UPDATE OF email ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_auth_email_update();
