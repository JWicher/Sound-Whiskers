-- ============================================================================
-- Fix Missing Profiles Script
-- Purpose: Check for and create profiles for users who don't have them
-- 
-- This script can be run manually to fix any existing users who don't have
-- profiles due to:
-- 1. Signing up before the trigger was created
-- 2. Trigger failures
-- 3. Manual user creation via admin SDK
-- ============================================================================

-- Step 1: Check how many users don't have profiles
-- (Run this first to see if there's a problem)
SELECT 
    COUNT(*) as users_without_profiles
FROM auth.users au
LEFT JOIN profiles p ON p.user_id = au.id
WHERE p.user_id IS NULL;

-- Step 2: View details of users without profiles
-- (Optional - to see which users are affected)
SELECT 
    au.id,
    au.email,
    au.created_at,
    au.raw_user_meta_data
FROM auth.users au
LEFT JOIN profiles p ON p.user_id = au.id
WHERE p.user_id IS NULL
ORDER BY au.created_at DESC;

-- Step 3: Create profiles for all users without them
-- (Run this to fix the issue)
-- This uses the same logic as the database trigger
INSERT INTO profiles (user_id, username, plan)
SELECT 
    au.id,
    -- Same username extraction logic as trigger
    LEFT(TRIM(COALESCE(
        au.raw_user_meta_data->>'username',
        au.raw_user_meta_data->>'name',
        au.raw_user_meta_data->>'full_name',
        CASE 
            WHEN au.email IS NOT NULL THEN split_part(au.email, '@', 1)
            ELSE 'User'
        END
    )), 64) as username,
    'free'::plan_type as plan
FROM auth.users au
LEFT JOIN profiles p ON p.user_id = au.id
WHERE p.user_id IS NULL;

-- Step 4: Verify all users now have profiles
-- (Should return 0)
SELECT 
    COUNT(*) as remaining_users_without_profiles
FROM auth.users au
LEFT JOIN profiles p ON p.user_id = au.id
WHERE p.user_id IS NULL;

-- ============================================================================
-- Notes:
-- ============================================================================
-- 
-- How to run this script:
-- 
-- Option 1: Supabase Dashboard (Hosted)
-- 1. Go to your project in Supabase Dashboard
-- 2. Navigate to SQL Editor
-- 3. Copy and paste the queries one by one
-- 4. Click "Run" for each query
-- 
-- Option 2: Supabase CLI (Local Development)
-- 1. Start local Supabase: npx supabase start
-- 2. Run: npx supabase db execute --file docs/fix-missing-profiles.sql
-- 
-- Option 3: psql (Direct Connection)
-- 1. Get database connection string from Supabase Dashboard
-- 2. Run: psql "your-connection-string" -f docs/fix-missing-profiles.sql
-- 
-- Safety:
-- - This script only INSERTS new profiles, never updates or deletes
-- - It's safe to run multiple times (will skip users who already have profiles)
-- - Uses the same logic as the automatic trigger
-- 
-- After Running:
-- - All existing users should now be able to:
--   * View their profile page
--   * Create playlists
--   * Use all features requiring a profile
-- 
-- ============================================================================

