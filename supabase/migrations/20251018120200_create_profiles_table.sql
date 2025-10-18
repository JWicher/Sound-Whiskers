-- ============================================================================
-- Migration: Create Profiles Table
-- Created: 2025-10-18 12:02:00 UTC
-- Purpose: Create user profiles table with one-to-one relationship to auth.users
-- Dependencies: 20251018120100_create_enums.sql (plan_type)
-- ============================================================================
--
-- This migration creates the profiles table which extends Supabase auth.users
-- with application-specific user data. Each auth user has exactly one profile.
--
-- Key features:
-- - One-to-one relationship with auth.users via user_id FK
-- - Tracks subscription plan (free/pro)
-- - Stores Stripe customer ID for billing integration
-- - Automatic timestamp management via triggers
--
-- Security: RLS enabled with owner-only access
-- ============================================================================

-- create profiles table
-- extends auth.users with app-specific user data
create table profiles (
  -- primary key and foreign key to auth.users
  -- cascades delete when user account is removed
  user_id uuid not null primary key references auth.users(id) on delete cascade,
  
  -- user's display name
  username text not null,
  
  -- subscription tier (free or pro)
  -- defaults to free for new users
  plan plan_type not null default 'free',
  
  -- stripe customer identifier for billing
  -- unique constraint ensures one stripe customer per user
  -- nullable as not all users will have stripe accounts
  stripe_customer_id text unique,
  
  -- timestamp tracking
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ============================================================================
-- Row Level Security (RLS) Policies
-- ============================================================================
-- Enable RLS to ensure users can only access their own profile data.
-- All policies check that the row's user_id matches the authenticated user's id.

-- enable row level security on profiles
alter table profiles enable row level security;

-- policy: allow authenticated users to select their own profile
-- rationale: users need to read their own profile data for app functionality
create policy "profiles_select_own" on profiles
  for select
  to authenticated
  using (user_id = auth.uid());

-- policy: allow authenticated users to insert their own profile
-- rationale: new users need to create their profile during registration
-- note: user_id must match auth.uid() to prevent creating profiles for other users
create policy "profiles_insert_own" on profiles
  for insert
  to authenticated
  with check (user_id = auth.uid());

-- policy: allow authenticated users to update their own profile
-- rationale: users need to update username, plan, etc.
-- note: prevents users from modifying other users' profiles
create policy "profiles_update_own" on profiles
  for update
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- policy: allow authenticated users to delete their own profile
-- rationale: enables user account deletion functionality
-- note: will cascade from auth.users deletion in typical flows
create policy "profiles_delete_own" on profiles
  for delete
  to authenticated
  using (user_id = auth.uid());

-- ============================================================================
-- Triggers for Automatic Timestamp Management
-- ============================================================================
-- Automatically update the updated_at timestamp on row modifications

-- trigger function to update updated_at timestamp
create or replace function update_updated_at_column()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

-- apply trigger to profiles table
create trigger update_profiles_updated_at
  before update on profiles
  for each row
  execute function update_updated_at_column();

-- ============================================================================
-- Indexes
-- ============================================================================
-- Primary key on user_id automatically creates an index
-- No additional indexes needed for MVP (user_id lookups are fast)

