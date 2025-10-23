# Environment Variables Setup

This document lists all required environment variables for Sound Whiskers. Create a `.env.local` file in the project root with these variables.

## Required Environment Variables

### Supabase Configuration

```bash
# Supabase Project URL
# Get from: Supabase Dashboard > Settings > API > Project URL
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co

# Supabase Anonymous Key (Public)
# Get from: Supabase Dashboard > Settings > API > Project API keys > anon/public
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key

# Supabase Service Role Key (Server-side only)
# ⚠️ CRITICAL: NEVER expose this key to the client or commit it to version control
# Required for admin operations like deleting auth users during account deletion
# Get from: Supabase Dashboard > Settings > API > Project API keys > service_role
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
```

### Stripe Configuration (Billing)

```bash
# Stripe Secret Key (Server-side only)
# Get from: Stripe Dashboard > Developers > API keys > Secret key
STRIPE_SECRET_KEY=sk_test_...

# Stripe Publishable Key (Public)
# Get from: Stripe Dashboard > Developers > API keys > Publishable key
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...

# Stripe Webhook Secret
# Get from: Stripe Dashboard > Developers > Webhooks > Add endpoint
STRIPE_WEBHOOK_SECRET=whsec_...
```

### OpenRouter Configuration (AI Features)

```bash
# OpenRouter API Key
# Get from: https://openrouter.ai/keys
OPENROUTER_API_KEY=your_openrouter_api_key
```

### Spotify Configuration

```bash
# Spotify Client ID
# Get from: https://developer.spotify.com/dashboard
SPOTIFY_CLIENT_ID=your_spotify_client_id

# Spotify Client Secret
# Get from: https://developer.spotify.com/dashboard
SPOTIFY_CLIENT_SECRET=your_spotify_client_secret

# Spotify Redirect URI
# Must match the redirect URI configured in your Spotify app settings
# For local development:
SPOTIFY_REDIRECT_URI=http://localhost:3000/api/spotify/callback

# For production, use your production URL:
# SPOTIFY_REDIRECT_URI=https://yourdomain.com/api/spotify/callback
```

### Application Configuration

```bash
# Application Base URL
# For local development:
NEXT_PUBLIC_APP_URL=http://localhost:3000

# For production, use your production URL:
# NEXT_PUBLIC_APP_URL=https://yourdomain.com
```

## Security Notes

### Service Role Key Security

The `SUPABASE_SERVICE_ROLE_KEY` has admin privileges and can bypass Row Level Security (RLS) policies. It is used **only** for admin operations such as:

- Deleting auth users during account deletion
- Other admin-level operations that require elevated privileges

**Security Requirements:**
1. ✅ NEVER expose this key to the client-side code
2. ✅ NEVER commit this key to version control
3. ✅ Only use this key in server-side API routes
4. ✅ Store it securely in platform environment variables (Vercel, Railway, etc.)
5. ✅ Rotate the key if it's ever compromised

### Environment Variable Best Practices

1. **Never commit `.env.local`** - It's already in `.gitignore`
2. **Use different keys for development and production**
3. **Store production secrets in your hosting platform's environment variables**
4. **Regularly rotate sensitive keys** (especially service role keys)
5. **Use test/sandbox keys during development** (Stripe test mode, etc.)

## Verification

After setting up your `.env.local` file, verify that:

1. The Next.js dev server starts without errors
2. Authentication works (sign up/login)
3. Profile operations work (including account deletion)
4. Spotify OAuth flow works
5. AI features work (if OpenRouter is configured)
6. Billing features work (if Stripe is configured)

## Troubleshooting

### Missing SUPABASE_SERVICE_ROLE_KEY Error

If you see the error: `SUPABASE_SERVICE_ROLE_KEY is not configured`

This means you haven't set the service role key. Get it from:
1. Go to your Supabase Dashboard
2. Navigate to Settings > API
3. Find "Project API keys" section
4. Copy the `service_role` key (not the `anon` key)
5. Add it to your `.env.local` file

### Account Deletion Fails

If account deletion fails with auth-related errors, check:
1. The `SUPABASE_SERVICE_ROLE_KEY` is correctly set
2. The key has not expired or been revoked
3. The Supabase project is accessible

