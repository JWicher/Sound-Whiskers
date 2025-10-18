# API Endpoint Implementation Plan: Profile Management

## 1. Endpoint Overview

This implementation covers four profile-related endpoints that provide complete profile management functionality:

- **GET /api/profile**: Retrieves the authenticated user's profile information
- **PATCH /api/profile**: Updates the user's username (plan changes handled by billing webhooks)  
- **GET /api/profile/usage**: Returns usage statistics including playlist counts and AI quota consumption
- **DELETE /api/account**: Self-serve account deletion that purges user data and revokes tokens

All endpoints require user authentication via Supabase Auth and operate on the `profiles` table with proper RLS policies.

## 2. Request Details

### GET /api/profile
- **HTTP Method**: GET
- **URL Structure**: `/api/profile`
- **Parameters**: None (user identified via authentication)
- **Request Body**: None
- **Authentication**: Required (Supabase session)

### PATCH /api/profile  
- **HTTP Method**: PATCH
- **URL Structure**: `/api/profile`
- **Parameters**: None
- **Request Body**:
  ```json
  {
    "username": "string" // Required, 1-50 characters, alphanumeric + underscores
  }
  ```
- **Authentication**: Required (Supabase session)

### GET /api/profile/usage
- **HTTP Method**: GET
- **URL Structure**: `/api/profile/usage`
- **Parameters**: None (user identified via authentication)
- **Request Body**: None
- **Authentication**: Required (Supabase session)

### DELETE /api/account
- **HTTP Method**: DELETE
- **URL Structure**: `/api/account`
- **Parameters**: None (user identified via authentication)
- **Request Body**: None
- **Authentication**: Required (Supabase session)

## 3. Used Types

### DTOs and Command Models
```typescript
// Response for GET /api/profile and PATCH /api/profile
export interface ProfileDto {
  userId: string
  username: string
  plan: PlanType
  createdAt: string
  updatedAt: string
}

// Request body for PATCH /api/profile
export interface UpdateProfileCommand {
  username: string
}

// Response for GET /api/profile/usage
export interface ProfileUsageDto {
  playlists: {
    count: number
    limit: number
  }
  ai: {
    used: number
    limit: number
    remaining: number
    resetAt: string
  }
}

// Response for DELETE /api/account
export interface DeleteAccountResponseDto {
  status: string
}

// Error response structure
export interface ErrorResponse {
  error: {
    code: string
    message: string
    details?: Record<string, any>
  }
}
```

## 4. Response Details

### Successful Responses

**GET /api/profile (200)**:
```json
{
  "userId": "uuid",
  "username": "string", 
  "plan": "free|pro",
  "createdAt": "2023-10-18T12:00:00Z",
  "updatedAt": "2023-10-18T12:00:00Z"
}
```

**PATCH /api/profile (200)**:
Same structure as GET /api/profile with updated data.

**GET /api/profile/usage (200)**:
```json
{
  "playlists": {
    "count": 12,
    "limit": 200
  },
  "ai": {
    "used": 2,
    "limit": 3, 
    "remaining": 1,
    "resetAt": "2023-11-01T00:00:00Z"
  }
}
```

**DELETE /api/account (202)**:
```json
{
  "status": "accepted"
}
```

### Error Responses

**401 Unauthorized**:
```json
{
  "error": {
    "code": "UNAUTHORIZED", 
    "message": "Authentication required"
  }
}
```

**400 Validation Error** (PATCH only):
```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid username format",
    "details": {
      "field": "username",
      "constraint": "1-50 characters, alphanumeric and underscores only"
    }
  }
}
```

## 5. Data Flow

### GET /api/profile
1. Validate authentication → Extract user ID from session
2. Query `profiles` table for user's profile data  
3. Transform database row to `ProfileDto`
4. Return formatted response

### PATCH /api/profile
1. Validate authentication → Extract user ID from session
2. Validate request body (username format and constraints)
3. Update `profiles` table with new username and current timestamp
4. Query updated profile data
5. Transform to `ProfileDto` and return

### GET /api/profile/usage
1. Validate authentication → Extract user ID from session
2. Count user's playlists (non-deleted)
3. Calculate AI quota usage for current billing month (UTC)
4. Determine limits based on user's plan (free: 3 AI, pro: 50 AI)
5. Calculate next billing cycle reset date
6. Return formatted usage summary

### DELETE /api/account
1. Validate authentication → Extract user ID from session
2. Soft or hard delete user's playlists and tracks (cascade)
3. Delete profile record
4. Delete Supabase Auth user
5. Return confirmation of scheduled deletion

### Database Queries Required
- Profile lookup: `SELECT * FROM profiles WHERE user_id = $1`
- Profile update: `UPDATE profiles SET username = $1, updated_at = NOW() WHERE user_id = $2`
- Playlist count: `SELECT COUNT(*) FROM playlists WHERE user_id = $1 AND is_deleted = false`
- AI usage: `SELECT COUNT(*) FROM ai_sessions WHERE user_id = $1 AND created_at >= $2 AND created_at < $3`
- Account deletion queries:
  - Spotify token deletion: `DELETE FROM spotify_tokens WHERE user_id = $1`
  - Playlist soft/hard delete: `UPDATE playlists SET is_deleted = true WHERE owner_id = $1` or `DELETE FROM playlists WHERE owner_id = $1`
  - Profile deletion: `DELETE FROM profiles WHERE user_id = $1`

## 6. Security Considerations

### Authentication & Authorization
- All endpoints require valid Supabase session
- Use RLS policies to ensure users can only access their own data
- Extract user ID from authenticated session, never trust client input

### Input Validation
- Username validation: 1-50 characters, alphanumeric + underscores only
- Sanitize input to prevent SQL injection (use parameterized queries)
- Validate against database constraints before updating

### Data Protection
- Ensure RLS policies prevent cross-user data access
- Don't expose internal user IDs or sensitive data
- Use proper error messages that don't leak system information

### Account Deletion Security
- Require re-authentication before deletion to prevent accidental or malicious deletion

## 7. Error Handling

### Authentication Errors (401)
- Missing Authorization header
- Invalid or expired session token
- User not found in auth system

### Validation Errors (400)
- Invalid username format (empty, too long, invalid characters)
- Malformed JSON request body
- Missing required fields

### Server Errors (500)
- Database connection failures
- RLS policy errors
- Unexpected system errors

### Error Response Strategy
- Use consistent error response format
- Provide user-friendly messages
- Include validation details for 400 errors
- Log detailed errors server-side for debugging
- Never expose internal system details to clients

## 8. Performance Considerations

### Database Optimization
- Ensure proper indexing on `profiles.user_id` (should exist as FK)
- Optimize usage queries with appropriate indexes on timestamps


## 9. Implementation Steps

1. **Create ProfileService class**
   - Implement profile retrieval logic
   - Add username validation helpers
   - Create usage calculation methods
   - Handle all database interactions

2. **Implement GET /api/profile endpoint**
   - Add authentication middleware
   - Create route handler with proper error handling
   - Integrate ProfileService for data retrieval
   - Add input validation and response formatting

3. **Implement PATCH /api/profile endpoint**
   - Add request body validation schema
   - Create route handler with authentication
   - Implement username update logic via ProfileService
   - Add proper error handling and response formatting

4. **Implement GET /api/profile/usage endpoint**
   - Create usage calculation service methods
   - Add billing cycle calculation logic
   - Implement route handler with authentication
   - Add proper aggregation queries and response formatting

5. **Implement DELETE /api/account endpoint**
   - Create account deletion service with comprehensive cleanup logic
   - Implement cascading deletion of user data (playlists, tracks, AI sessions)
   - Integrate Supabase Auth user deletion

6. **Add comprehensive error handling**
   - Implement consistent error response formatting
   - Add proper logging for debugging
   - Create user-friendly error messages
   - Test all error scenarios

7. **Implement security measures**
   - Verify RLS policies are properly configured
   - Add input sanitization and validation
   - Implement rate limiting where appropriate
   - Test authentication and authorization

8. **Add performance optimizations**
   - Optimize database queries and indexes
