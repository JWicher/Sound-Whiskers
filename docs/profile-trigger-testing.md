# Profile Creation Trigger - Testing Guide

This document explains how the automatic profile creation trigger works and how to test it.

## Overview

The profile creation trigger automatically creates a `profiles` table record whenever a new user signs up through Supabase Auth. This ensures that every authenticated user has a corresponding profile with default settings.

## Implementation Details

### Database Components

1. **Function**: `handle_new_user()`
   - Extracts username from user metadata or email
   - Creates profile record with default `free` plan
   - Handles errors gracefully without blocking user creation

2. **Trigger**: `on_auth_user_created`
   - Fires after INSERT on `auth.users`
   - Calls `handle_new_user()` for each new user

### Username Extraction Logic

The function extracts usernames in this priority order:
1. `raw_user_meta_data.username`
2. `raw_user_meta_data.name`
3. `raw_user_meta_data.full_name`
4. Email prefix (everything before @)
5. "User" (fallback)

## Testing the Trigger

### Verification Steps

1. **Check Installation**:
   ```sql
   -- Verify trigger exists
   SELECT EXISTS (
     SELECT 1 FROM pg_trigger 
     WHERE tgname = 'on_auth_user_created'
   ) AS trigger_installed;

   -- Verify function exists  
   SELECT EXISTS (
     SELECT 1 FROM pg_proc 
     WHERE proname = 'handle_new_user'
   ) AS function_installed;
   ```

2. **Test Username Logic** (without actual user creation):
   ```sql
   -- Test various metadata scenarios
   SELECT 
     coalesce(
       '{"username": "testuser"}'::jsonb->>'username',
       '{"username": "testuser"}'::jsonb->>'name', 
       '{"username": "testuser"}'::jsonb->>'full_name',
       split_part('test@example.com', '@', 1)
     ) AS extracted_username;
   ```

### Integration Testing

To test the complete flow with actual user creation:

1. **Using Supabase Auth API** (recommended):
   ```javascript
   // In a test script or application
   const { createClient } = require('@supabase/supabase-js');
   const supabase = createClient(url, key);

   // Sign up a test user
   const { data, error } = await supabase.auth.signUp({
     email: 'test@example.com',
     password: 'testpassword123',
     options: {
       data: {
         username: 'testuser'
       }
     }
   });

   // Check if profile was created
   const { data: profile } = await supabase
     .from('profiles')
     .select('*')
     .eq('user_id', data.user?.id)
     .single();

   console.log('Auto-created profile:', profile);
   ```

2. **Using curl** (for API testing):
   ```bash
   curl -X POST 'http://127.0.0.1:54321/auth/v1/signup' \
     -H "apikey: YOUR_ANON_KEY" \
     -H "Content-Type: application/json" \
     -d '{
       "email": "test@example.com",
       "password": "testpassword123",
       "data": {
         "username": "testuser"
       }
     }'
   ```

### Expected Results

After successful user signup:

1. **User created** in `auth.users` table
2. **Profile automatically created** in `profiles` table with:
   - `user_id`: matches `auth.users.id`
   - `username`: extracted from metadata or email
   - `plan`: defaults to 'free'
   - `created_at`/`updated_at`: automatically set

### Error Handling

The trigger is designed to be non-blocking:
- If profile creation fails, user creation still succeeds
- Errors are logged as warnings
- Profile can be created later via API endpoints

## Monitoring

To monitor trigger performance:

```sql
-- Check for users without profiles (shouldn't happen with working trigger)
SELECT u.id, u.email, u.created_at
FROM auth.users u
LEFT JOIN profiles p ON u.id = p.user_id
WHERE p.user_id IS NULL;

-- Count profiles vs users (should be equal)
SELECT 
  (SELECT COUNT(*) FROM auth.users) AS total_users,
  (SELECT COUNT(*) FROM profiles) AS total_profiles;
```

## Maintenance

The trigger is automatically applied through database migrations. No manual maintenance required unless modifications to the username extraction logic are needed.
