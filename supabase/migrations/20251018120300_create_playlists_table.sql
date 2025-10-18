-- ============================================================================
-- Migration: Create Playlists Table
-- Created: 2025-10-18 12:03:00 UTC
-- Purpose: Create playlists table with soft delete and limit enforcement
-- Dependencies: 20251018120200_create_profiles_table.sql
-- ============================================================================
--
-- This migration creates the playlists table for managing user playlist collections.
--
-- Key features:
-- - Soft delete support via is_deleted flag
-- - Case-insensitive unique playlist names per user (for non-deleted playlists)
-- - 50 playlist limit per user enforced via trigger
-- - Automatic timestamp management
--
-- Security: RLS enabled with owner-only access
-- ============================================================================

-- create playlists table
-- stores user-created playlist metadata
create table playlists (
  -- unique identifier for the playlist
  id uuid not null primary key default gen_random_uuid(),
  
  -- foreign key to profiles (playlist owner)
  -- cascades delete when user is removed
  owner_id uuid not null references profiles(user_id) on delete cascade,
  
  -- playlist name
  -- combined with owner_id must be unique (case-insensitive) when not deleted
  name text not null,
  
  -- soft delete flag
  -- allows "undeleting" playlists and maintains referential integrity
  -- deleted playlists don't count toward the 50-playlist limit
  is_deleted boolean not null default false,
  
  -- timestamp tracking
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ============================================================================
-- Indexes and Constraints
-- ============================================================================

-- partial unique index: ensure unique playlist names per user (case-insensitive)
-- only applies to non-deleted playlists
-- allows reusing names if the original playlist is soft-deleted
create unique index playlists_owner_name_idx 
  on playlists (owner_id, lower(name)) 
  where is_deleted = false;

-- index for efficient queries filtering by owner and deletion status
-- speeds up queries like: "get all non-deleted playlists for user X"
create index playlists_owner_deleted_idx 
  on playlists (owner_id, is_deleted);

-- ============================================================================
-- Triggers for Business Logic
-- ============================================================================

-- trigger function: enforce 50 playlist limit per user
-- checks that users don't exceed 50 non-deleted playlists
-- runs as a deferred constraint trigger to allow batch operations
create or replace function check_playlists_limit()
returns trigger as $$
declare
  playlist_count integer;
begin
  -- count non-deleted playlists for the owner
  select count(*) into playlist_count
  from playlists
  where owner_id = new.owner_id and is_deleted = false;
  
  -- enforce limit of 50 playlists
  if playlist_count > 50 then
    raise exception 'User cannot have more than 50 playlists. Current count: %', playlist_count;
  end if;
  
  return new;
end;
$$ language plpgsql;

-- apply deferred trigger to enforce playlist limit
-- deferred: allows multiple inserts in a transaction, checks at commit time
-- runs after insert or update to is_deleted flag
create constraint trigger enforce_playlists_limit
  after insert or update of is_deleted on playlists
  deferrable initially deferred
  for each row
  execute function check_playlists_limit();

-- trigger: automatically update updated_at timestamp
create trigger update_playlists_updated_at
  before update on playlists
  for each row
  execute function update_updated_at_column();

-- ============================================================================
-- Row Level Security (RLS) Policies
-- ============================================================================
-- Enable RLS to ensure users can only access their own playlists.
-- All policies verify that the playlist's owner_id matches the authenticated user.

-- enable row level security on playlists
alter table playlists enable row level security;

-- policy: allow authenticated users to select their own playlists
-- rationale: users need to view their playlist collections
create policy "playlists_select_own" on playlists
  for select
  to authenticated
  using (owner_id = auth.uid());

-- policy: allow authenticated users to insert their own playlists
-- rationale: users need to create new playlists
-- note: owner_id must match auth.uid() to prevent creating playlists for other users
create policy "playlists_insert_own" on playlists
  for insert
  to authenticated
  with check (owner_id = auth.uid());

-- policy: allow authenticated users to update their own playlists
-- rationale: users need to rename playlists, soft-delete them, etc.
-- note: prevents users from modifying other users' playlists
create policy "playlists_update_own" on playlists
  for update
  to authenticated
  using (owner_id = auth.uid())
  with check (owner_id = auth.uid());

-- policy: allow authenticated users to delete their own playlists
-- rationale: enables hard deletion if needed (though soft delete is preferred)
-- note: cascade will handle related playlist_tracks
create policy "playlists_delete_own" on playlists
  for delete
  to authenticated
  using (owner_id = auth.uid());

