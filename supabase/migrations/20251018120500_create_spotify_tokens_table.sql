-- ============================================================================
-- Migration: Create Spotify Tokens Table
-- Created: 2025-10-18 12:05:00 UTC
-- Purpose: Create secure storage for encrypted Spotify OAuth tokens
-- Dependencies: 20251018120200_create_profiles_table.sql, 20251018120000_enable_extensions.sql (pgcrypto)
-- ============================================================================
--
-- This migration creates the spotify_tokens table for securely storing
-- encrypted Spotify OAuth access and refresh tokens.
--
-- Key security features:
-- - Tokens stored as encrypted bytea using pgp_sym_encrypt
-- - Encryption key stored in Supabase Secrets (app.spotify_secret)
-- - One-to-one relationship with profiles (one token set per user)
-- - RLS restricts access to owner only
-- - Intended for server-side/RPC access only (not direct client queries)
--
-- Important: Never expose raw tokens to the client. Use secure RPC functions
-- or Next.js API routes to decrypt and use tokens server-side only.
-- ============================================================================

-- create spotify_tokens table
-- securely stores encrypted spotify oauth tokens per user
create table spotify_tokens (
  -- primary key and foreign key to profiles
  -- one-to-one relationship: each user has at most one set of tokens
  user_id uuid not null primary key references profiles(user_id) on delete cascade,
  
  -- encrypted spotify access token
  -- encrypted using pgp_sym_encrypt with key from supabase secrets
  -- decrypt server-side only using: pgp_sym_decrypt(access_token, current_setting('app.spotify_secret'))
  access_token bytea not null,
  
  -- encrypted spotify refresh token
  -- used to obtain new access tokens when they expire
  -- decrypt server-side only using: pgp_sym_decrypt(refresh_token, current_setting('app.spotify_secret'))
  refresh_token bytea not null,
  
  -- timestamp when access_token expires
  -- used to determine when to refresh the token
  expires_at timestamptz not null,
  
  -- timestamp tracking
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ============================================================================
-- Indexes
-- ============================================================================
-- Primary key on user_id automatically creates a unique index
-- No additional indexes needed for MVP (user_id lookups are fast)

-- ============================================================================
-- Triggers for Automatic Timestamp Management
-- ============================================================================

-- trigger: automatically update updated_at timestamp
create trigger update_spotify_tokens_updated_at
  before update on spotify_tokens
  for each row
  execute function update_updated_at_column();

-- ============================================================================
-- Row Level Security (RLS) Policies
-- ============================================================================
-- Enable RLS with very strict access control.
-- 
-- IMPORTANT SECURITY NOTE:
-- While RLS policies below allow authenticated users to access their own tokens,
-- the application should NOT allow direct client access to this table.
-- 
-- Best practice: Access spotify_tokens ONLY through:
-- 1. Secure RPC functions (with SECURITY DEFINER if needed)
-- 2. Server-side Next.js API routes
-- 3. Supabase Edge Functions
--
-- This prevents accidentally exposing encrypted tokens to the client and ensures
-- decryption happens only in secure server contexts where the encryption key is available.

-- enable row level security on spotify_tokens
alter table spotify_tokens enable row level security;

-- policy: allow authenticated users to select their own tokens
-- rationale: users need to access their spotify tokens for oauth flow
-- note: should only be used by server-side code, not client-side
create policy "spotify_tokens_select_own" on spotify_tokens
  for select
  to authenticated
  using (user_id = auth.uid());

-- policy: allow authenticated users to insert their own tokens
-- rationale: users need to store tokens after completing spotify oauth
-- note: user_id must match auth.uid() to prevent storing tokens for other users
create policy "spotify_tokens_insert_own" on spotify_tokens
  for insert
  to authenticated
  with check (user_id = auth.uid());

-- policy: allow authenticated users to update their own tokens
-- rationale: users need to refresh their tokens when they expire
-- note: prevents users from modifying other users' tokens
create policy "spotify_tokens_update_own" on spotify_tokens
  for update
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- policy: allow authenticated users to delete their own tokens
-- rationale: enables disconnecting spotify account
-- note: typically done when user wants to revoke spotify integration
create policy "spotify_tokens_delete_own" on spotify_tokens
  for delete
  to authenticated
  using (user_id = auth.uid());

-- ============================================================================
-- Helper Functions for Token Encryption/Decryption
-- ============================================================================
-- These functions should be called from server-side code (Next.js API routes)
-- where the encryption key is available via environment variables.
--
-- Example usage in API route:
-- 1. Store encrypted tokens:
--    await supabase.rpc('store_spotify_tokens', {
--      p_user_id: userId,
--      p_access_token: accessToken,
--      p_refresh_token: refreshToken,
--      p_expires_at: expiresAt,
--      p_encryption_key: process.env.SPOTIFY_TOKEN_ENCRYPTION_KEY
--    });
--
-- 2. Retrieve and decrypt tokens:
--    const { data } = await supabase.rpc('get_spotify_tokens', {
--      p_user_id: userId,
--      p_encryption_key: process.env.SPOTIFY_TOKEN_ENCRYPTION_KEY
--    });

-- function: securely store encrypted spotify tokens
-- encrypts tokens using pgp_sym_encrypt before storage
create or replace function store_spotify_tokens(
  p_user_id uuid,
  p_access_token text,
  p_refresh_token text,
  p_expires_at timestamptz,
  p_encryption_key text
)
returns void as $$
begin
  insert into spotify_tokens (user_id, access_token, refresh_token, expires_at)
  values (
    p_user_id,
    pgp_sym_encrypt(p_access_token, p_encryption_key),
    pgp_sym_encrypt(p_refresh_token, p_encryption_key),
    p_expires_at
  )
  on conflict (user_id) do update
  set 
    access_token = pgp_sym_encrypt(p_access_token, p_encryption_key),
    refresh_token = pgp_sym_encrypt(p_refresh_token, p_encryption_key),
    expires_at = p_expires_at,
    updated_at = now();
end;
$$ language plpgsql security definer;

-- function: securely retrieve and decrypt spotify tokens
-- decrypts tokens using pgp_sym_decrypt
-- returns null if tokens don't exist for the user
create or replace function get_spotify_tokens(
  p_user_id uuid,
  p_encryption_key text
)
returns table (
  access_token text,
  refresh_token text,
  expires_at timestamptz
) as $$
begin
  return query
  select 
    pgp_sym_decrypt(st.access_token, p_encryption_key)::text,
    pgp_sym_decrypt(st.refresh_token, p_encryption_key)::text,
    st.expires_at
  from spotify_tokens st
  where st.user_id = p_user_id;
end;
$$ language plpgsql security definer;

-- grant execute permissions on helper functions to authenticated users
grant execute on function store_spotify_tokens(uuid, text, text, timestamptz, text) to authenticated;
grant execute on function get_spotify_tokens(uuid, text) to authenticated;

