-- Update existing auth.users to have '123456' as their password if they don't have one
-- This allows users who were created via OTP to log in with the new default password.
-- Uses the built-in pgcrypto extension available in Supabase.

UPDATE auth.users 
SET encrypted_password = crypt('123456', gen_salt('bf')) 
WHERE encrypted_password IS NULL OR encrypted_password = '';
