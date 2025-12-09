-- Migration: Ensure mandatory fields have NOT NULL constraints and defaults
-- This ensures all mandatory fields are always set and prevents null constraint violations

-- 1. Ensure gender is NOT NULL (if not already)
-- Add default value if column allows null
DO $$
BEGIN
  -- Check if gender column exists and if it allows NULL
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'users' 
    AND column_name = 'gender' 
    AND is_nullable = 'YES'
  ) THEN
    -- Set default for existing NULL values
    UPDATE users SET gender = '' WHERE gender IS NULL;
    
    -- Add NOT NULL constraint
    ALTER TABLE users ALTER COLUMN gender SET NOT NULL;
    
    -- Set default value for future inserts
    ALTER TABLE users ALTER COLUMN gender SET DEFAULT '';
  END IF;
END $$;

-- 2. Ensure dob (date of birth) is NOT NULL (if not already)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'users' 
    AND column_name = 'dob' 
    AND is_nullable = 'YES'
  ) THEN
    -- Set default for existing NULL values (you may want to handle this differently)
    -- For now, we'll set a placeholder date - you should update existing users manually
    -- UPDATE users SET dob = '1990-01-01' WHERE dob IS NULL;
    
    -- Add NOT NULL constraint (uncomment after handling existing NULL values)
    -- ALTER TABLE users ALTER COLUMN dob SET NOT NULL;
    
    -- Set default value for future inserts (optional)
    -- ALTER TABLE users ALTER COLUMN dob SET DEFAULT '1990-01-01';
  END IF;
END $$;

-- 3. Ensure first_name and last_name are NOT NULL (if not already)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'users' 
    AND column_name = 'first_name' 
    AND is_nullable = 'YES'
  ) THEN
    UPDATE users SET first_name = '' WHERE first_name IS NULL;
    ALTER TABLE users ALTER COLUMN first_name SET NOT NULL;
    ALTER TABLE users ALTER COLUMN first_name SET DEFAULT '';
  END IF;
  
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'users' 
    AND column_name = 'last_name' 
    AND is_nullable = 'YES'
  ) THEN
    UPDATE users SET last_name = '' WHERE last_name IS NULL;
    ALTER TABLE users ALTER COLUMN last_name SET NOT NULL;
    ALTER TABLE users ALTER COLUMN last_name SET DEFAULT '';
  END IF;
END $$;

-- Note: Review and adjust the default values and NULL handling based on your requirements
-- For dob, you may want to require it during onboarding instead of setting a default

