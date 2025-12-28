-- Migration: Add city and country columns to users table
ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS city TEXT,
ADD COLUMN IF NOT EXISTS country TEXT;

-- Update existing records to have empty strings if preferred, 
-- or leave as NULL which is also fine for the frontend logic I planned.
