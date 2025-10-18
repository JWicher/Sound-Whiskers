-- ============================================================================
-- Migration: Add Profile Creation Trigger
-- Created: 2025-10-18 13:01:00 UTC
-- Purpose: Automatically create profile records when new users sign up
-- Dependencies: 20251018120200_create_profiles_table.sql
-- ============================================================================
--
-- This migration creates a database trigger that automatically creates
-- a profile record whenever a new user is created in auth.users.
--
-- Key features:
-- - Automatic profile creation on user signup
-- - Username extracted from user metadata or derived from email
-- - Proper error handling and security
-- - Uses security definer for elevated privileges
--
-- Flow:
-- 1. User signs up via Supabase Auth
-- 2. Record inserted into auth.users
-- 3. Trigger fires and calls handle_new_user()
-- 4. Profile record created automatically in profiles table
-- ============================================================================

-- function: create profile record for new users
-- automatically called when a new user signs up
-- extracts username from metadata or derives from email
create or replace function handle_new_user() 
returns trigger as $$
declare
  extracted_username text;
begin
  -- extract username from user metadata, fallback to email prefix
  -- priority: raw_user_meta_data.username > raw_user_meta_data.name > email prefix
  extracted_username := coalesce(
    new.raw_user_meta_data->>'username',
    new.raw_user_meta_data->>'name',
    new.raw_user_meta_data->>'full_name',
    split_part(new.email, '@', 1)
  );
  
  -- ensure username is not null or empty
  if extracted_username is null or trim(extracted_username) = '' then
    extracted_username := 'User'; -- fallback username
  end if;
  
  -- truncate username if too long (assuming 64 char limit)
  extracted_username := left(trim(extracted_username), 64);
  
  -- insert profile record with default values
  insert into profiles (user_id, username, plan)
  values (
    new.id,
    extracted_username,
    'free'::plan_type  -- default to free plan
  );
  
  return new;
exception
  when others then
    -- log error but don't prevent user creation
    -- the user can still be created and profile can be added later via API
    raise warning 'Failed to create profile for user %: %', new.id, sqlerrm;
    return new;
end;
$$ language plpgsql security definer;

-- ============================================================================
-- Trigger Creation
-- ============================================================================
-- Create trigger to automatically call handle_new_user() when new users sign up

-- trigger: automatically create profile for new users
-- fires after insert on auth.users to ensure user exists first
-- uses security definer function to bypass RLS for profile creation
create trigger on_auth_user_created
  after insert on auth.users
  for each row
  execute function handle_new_user();

-- ============================================================================
-- Grant Permissions
-- ============================================================================
-- The trigger function runs with elevated privileges (security definer)
-- but we still need to ensure proper access

-- grant usage on the function to the service role
-- this ensures the trigger can execute properly
grant execute on function handle_new_user() to service_role;

-- ============================================================================
-- Comments and Documentation
-- ============================================================================

comment on function handle_new_user() is 
'Automatically creates a profile record when a new user signs up. Extracts username from user metadata or derives from email. Uses security definer for elevated privileges to bypass RLS.';

-- Note: Cannot add comment to trigger on auth.users due to permissions
-- comment on trigger on_auth_user_created on auth.users is 
-- 'Automatically creates a corresponding profile record in the profiles table when a new user is created via Supabase Auth.';

-- ============================================================================
-- Notes for Future Development
-- ============================================================================
--
-- Username Resolution Priority:
-- 1. raw_user_meta_data.username (if provided during signup)
-- 2. raw_user_meta_data.name (common field name)
-- 3. raw_user_meta_data.full_name (alternative field name)
-- 4. Email prefix (fallback - everything before @)
-- 5. 'User' (final fallback)
--
-- Error Handling:
-- - If profile creation fails, user creation still succeeds
-- - Warning is logged but doesn't block the signup process
-- - Profile can be created later via /api/profile endpoint if needed
--
-- Security:
-- - Function uses security definer to bypass RLS
-- - Only service_role can execute the function
-- - Still respects the profiles table constraints and validation
--
-- Future Enhancements:
-- - Could add more sophisticated username generation
-- - Could add duplicate username handling with suffixes
-- - Could validate username format/characters
-- ============================================================================
