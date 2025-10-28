# Spotify OAuth Setup & Token Management

## Overview

This document explains how Sound Whiskers implements Spotify OAuth 2.0 authorization code flow to securely link user Spotify accounts and manage tokens.

## Feature

Users can authorize Sound Whiskers to access their Spotify account, allowing the app to:
- Export playlists to the user's Spotify account
- Create private playlists with names given by user while creating a playlist in the app

## Environment Variables

Add these variables to your `.env.local` file:

```env
# Spotify OAuth Credentials (from Spotify Developer Dashboard)
SPOTIFY_CLIENT_ID=your_client_id_here
SPOTIFY_CLIENT_SECRET=your_client_secret_here

# Redirect URI for OAuth callback
SPOTIFY_REDIRECT_URI=http://localhost:3000/api/spotify/callback

# Encryption key for storing tokens securely in database
# Generate a strong random string (32+ characters)
SPOTIFY_ENCRYPTION_KEY=your_strong_random_key_here_minimum_32_chars
```

## SPOTIFY_REDIRECT_URI Setup

The redirect URI must be registered in your Spotify Developer Application settings:

### Development
```
http://localhost:3000/api/spotify/callback
```

### Production (Vercel/Custom Domain)
```
https://yourdomain.com/api/spotify/callback
```

### How to Register:
1. Go to [Spotify Developer Dashboard](https://developer.spotify.com/dashboard)
2. Select your application
3. Click "Edit Settings"
4. Add redirect URI to "Redirect URIs" section
5. **The URI must match exactly** (including protocol, domain, and path)

## SPOTIFY_ENCRYPTION_KEY Setup

Generate a strong encryption key:

```bash
# Using OpenSSL (recommended)
openssl rand -base64 32

# Or using Node.js
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

Store this key securely in your environment. The key is used server-side only to encrypt/decrypt tokens stored in the database.

## API Endpoints

### 1. Start OAuth Flow
```
GET /api/spotify/login
```

**Description:** Initiates Spotify OAuth 2.0 authorization code flow
- Generates random state parameter for CSRF protection
- Stores state in secure HTTP-only cookie (10-min expiry)
- Redirects to Spotify authorization endpoint
- Requests scopes: `playlist-modify-private` and `playlist-modify-public`

**Authentication:** Required (user must be logged in)

**Response:**
- 302 Redirect to Spotify's authorization endpoint
- 401 if not authenticated
- 500 if OAuth credentials are not configured

### 2. OAuth Callback Handler
```
GET /api/spotify/callback?code=AUTH_CODE&state=STATE
```

**Description:** Handles Spotify's OAuth callback
- Validates state parameter against stored cookie (CSRF protection)
- Exchanges authorization code for tokens
- Encrypts and stores tokens in database
- Redirects to profile page with status

**Query Parameters:**
- `code`: Authorization code from Spotify
- `state`: State parameter for CSRF validation
- `error` (optional): Error code if user denied access

**Response:**
- 302 Redirect to `/profile?spotify=linked` on success
- 302 Redirect to `/profile?error=spotify_*` on failure with error details

**Error Scenarios:**
- `spotify_auth_denied`: User denied access
- `spotify_invalid_callback`: Missing code or state
- `spotify_state_mismatch`: CSRF validation failed
- `spotify_token_exchange_failed`: Failed to exchange code for tokens

### 3. Check Spotify Link Status
```
GET /api/spotify/status
```

**Description:** Returns whether user is linked to Spotify and token expiry

**Authentication:** Required

**Response (200 OK):**
```json
{
  "linked": true,
  "expiresAt": "2025-10-28T12:34:56.789Z"
}
```

Or if not linked:
```json
{
  "linked": false
}
```

**Error Responses:**
- 401: Not authenticated
- 500: Server error

### 4. Unlink Spotify Account
```
DELETE /api/spotify/link
```

**Description:** Removes stored Spotify tokens from database

**Authentication:** Required

**Response:**
- 204 No Content on success
- 401 if not authenticated
- 500 if deletion failed

## OAuth Flow Diagram

```
┌─────────────┐           ┌──────────────┐           ┌───────────────┐
│   Browser   │           │  App Server  │           │    Spotify    │
└─────────────┘           └──────────────┘           └───────────────┘
      │                           │                          │
      │ 1. Click "Link Spotify"   │                          │
      ├──────────────────────────→│                          │
      │                           │                          │
      │    2. Redirect to Spotify auth URL (with state)     │
      │←──────────────────────────────────────────────────────┤
      │                           │                          │
      │ 3. User authorizes app   │                          │
      ├─────────────────────────────────────────────────────→│
      │                           │                          │
      │ 4. OAuth callback with code + state (same state)    │
      │←──────────────────────────────────────────────────────┤
      │                           │                          │
      │    5. Exchange code for tokens (back-channel)       │
      │                           ├─────────────────────────→│
      │                           │                          │
      │                           │ 6. Return access + refresh tokens
      │                           │←─────────────────────────┤
      │                           │                          │
      │    7. Encrypt & store tokens in database            │
      │                           │                          │
      │    8. Redirect to success page                      │
      │←──────────────────────────┤                          │
      │                           │                          │
```

## Database Storage

Tokens are stored in the `spotify_tokens` table:

- **access_token**: Encrypted with AES (pgp_sym_encrypt)
- **refresh_token**: Encrypted with AES (pgp_sym_encrypt)
- **expires_at**: Token expiry timestamp
- **user_id**: Foreign key to authenticated user

### RPC Functions

Two RPC functions handle secure token operations:

#### store_spotify_tokens
```sql
SELECT store_spotify_tokens(
  p_user_id,           -- User's UUID
  p_access_token,      -- Plain text (will be encrypted)
  p_refresh_token,     -- Plain text (will be encrypted)
  p_expires_at,        -- ISO 8601 timestamp
  p_encryption_key     -- Encryption key from environment
);
```

#### get_spotify_tokens
```sql
SELECT get_spotify_tokens(
  p_user_id,          -- User's UUID
  p_encryption_key    -- Encryption key from environment
);
```

## Security Considerations

### 1. CSRF Protection
- State parameter generated randomly for each OAuth request
- Stored in secure HTTP-only cookie with 10-minute expiry
- Validated against state returned by Spotify
- Cookie automatically deleted after validation

### 2. Token Encryption
- Tokens encrypted in database using AES-128 with pgp_sym_encrypt
- Encryption key stored only in environment variables
- Key never exposed to client
- Decryption happens only server-side via RPC functions

### 3. HTTPS Only
- OAuth callback must use HTTPS in production
- Cookie security flag set when `NODE_ENV === 'production'`

### 4. Scope Minimization
- Only requests necessary scopes: `playlist-modify-private` and `playlist-modify-public`
- Users can see exactly what permissions are being requested

### 5. Token Handling
- Access tokens are short-lived (typically 1 hour)
- Refresh token stored for obtaining new access tokens
- Expired tokens handled gracefully with refresh flow

## Token Refresh Flow

When an access token expires, the app will use the refresh token to obtain a new one:

```typescript
const refreshed = await refreshAccessToken(existingRefreshToken);
// refreshed.accessToken - new access token
// refreshed.expiresAt - new expiry time
```

The refresh can be automated in the export process before making Spotify API calls.

## Troubleshooting

### "SPOTIFY_REDIRECT_URI does not match registered URI"
- **Cause**: The redirect URI in environment doesn't match Spotify Developer settings
- **Solution**: 
  1. Check Spotify Developer Dashboard for registered URIs
  2. Ensure exact match (case-sensitive, including protocol and path)
  3. Update `.env.local` with correct URI

### "SPOTIFY_ENCRYPTION_KEY not configured"
- **Cause**: Missing encryption key environment variable
- **Solution**: Generate key and add to `.env.local`

### "State mismatch - potential CSRF attack"
- **Cause**: OAuth state parameter doesn't match stored value
- **Solution**: 
  - Clear cookies and try again
  - Check if cookies are blocked
  - Verify same origin/domain for OAuth flow

### "Failed to exchange authorization code"
- **Cause**: Invalid or expired authorization code
- **Solution**: 
  - Try relinking account
  - Check SPOTIFY_CLIENT_ID and SPOTIFY_CLIENT_SECRET
  - Ensure redirect URI matches exactly

## Development Testing

### Manual Flow Testing

```bash
# 1. Start the app
npm run dev

# 2. Navigate to profile page
# http://localhost:3000/profile

# 3. Click "Link Spotify" button
# You'll be redirected to Spotify

# 4. Grant permissions
# You'll be redirected back to http://localhost:3000/api/spotify/callback

# 5. Check status
curl http://localhost:3000/api/spotify/status \
  -H "Authorization: Bearer YOUR_AUTH_TOKEN"

# 6. Test unlink
curl -X DELETE http://localhost:3000/api/spotify/link \
  -H "Authorization: Bearer YOUR_AUTH_TOKEN"
```

### Environment Setup for Testing
```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key

SPOTIFY_CLIENT_ID=test_client_id
SPOTIFY_CLIENT_SECRET=test_client_secret
SPOTIFY_REDIRECT_URI=http://localhost:3000/api/spotify/callback
SPOTIFY_ENCRYPTION_KEY=test_encryption_key_32_chars_or_more
```

## References

- [Spotify Web API Authorization Code Flow](https://developer.spotify.com/documentation/web-api/tutorials/code-flow)
- [Spotify OAuth 2.0 Scopes](https://developer.spotify.com/documentation/web-api/concepts/scopes)
- [RFC 6749 - OAuth 2.0 Authorization Framework](https://datatracker.ietf.org/doc/html/rfc6749)
- [Supabase pgcrypto Documentation](https://supabase.com/docs/guides/database/vault)
