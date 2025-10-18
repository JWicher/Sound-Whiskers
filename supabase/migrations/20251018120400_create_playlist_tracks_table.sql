-- ============================================================================
-- Migration: Create Playlist Tracks Table
-- Created: 2025-10-18 12:04:00 UTC
-- Purpose: Create playlist_tracks table for storing songs in playlists
-- Dependencies: 20251018120300_create_playlists_table.sql
-- ============================================================================
--
-- This migration creates the playlist_tracks table which stores individual songs
-- within playlists, including their position/order.
--
-- Key features:
-- - Composite primary key (playlist_id, position)
-- - Position-based ordering (1-100, allowing up to 100 tracks per playlist)
-- - Soft delete support cascaded from parent playlist
-- - Prevents duplicate tracks in the same playlist (when not deleted)
-- - Stores Spotify track URIs
--
-- Security: RLS enabled with playlist-owner-based access
-- ============================================================================

-- create playlist_tracks table
-- stores individual tracks within playlists with position-based ordering
create table playlist_tracks (
  -- foreign key to playlists
  -- part of composite primary key
  playlist_id uuid not null references playlists(id) on delete cascade,
  
  -- 1-based position for track ordering in playlist
  -- CHECK constraint enforces max 100 tracks per playlist
  -- part of composite primary key
  position smallint not null check (position between 1 and 100),
  
  -- spotify track uri (e.g., "spotify:track:...")
  -- identifies the song in spotify's catalog
  track_uri text not null,
  
  -- soft delete flag
  -- automatically set when parent playlist is soft-deleted
  is_deleted boolean not null default false,
  
  -- timestamp when track was added to playlist
  added_at timestamptz not null default now(),
  
  -- composite primary key ensures one track per position per playlist
  primary key (playlist_id, position)
);

-- ============================================================================
-- Indexes and Constraints
-- ============================================================================

-- partial unique index: prevent duplicate tracks in same playlist
-- only applies to non-deleted tracks
-- allows the same track at different positions if one is deleted
create unique index playlist_tracks_no_dup_idx
  on playlist_tracks (playlist_id, track_uri)
  where is_deleted = false;

-- index for efficient queries by playlist
-- speeds up queries like: "get all tracks for playlist X"
create index playlist_tracks_playlist_deleted_idx
  on playlist_tracks (playlist_id, is_deleted);

-- ============================================================================
-- Triggers for Cascading Soft Delete
-- ============================================================================

-- trigger function: cascade soft delete from playlist to its tracks
-- when a playlist is marked as deleted, all its tracks should also be marked deleted
-- this maintains data integrity for soft delete operations
create or replace function soft_delete_playlist_tracks()
returns trigger as $$
begin
  -- only proceed if is_deleted changed from false to true
  if new.is_deleted = true and old.is_deleted = false then
    -- soft-delete all tracks in this playlist
    update playlist_tracks
    set is_deleted = true
    where playlist_id = new.id and is_deleted = false;
  end if;
  
  -- if playlist is being undeleted, restore its tracks
  if new.is_deleted = false and old.is_deleted = true then
    -- restore all tracks in this playlist
    update playlist_tracks
    set is_deleted = false
    where playlist_id = new.id and is_deleted = true;
  end if;
  
  return new;
end;
$$ language plpgsql;

-- apply trigger to playlists table (not playlist_tracks)
-- triggers when a playlist's is_deleted flag is updated
create trigger cascade_soft_delete_to_tracks
  after update of is_deleted on playlists
  for each row
  execute function soft_delete_playlist_tracks();

-- ============================================================================
-- Row Level Security (RLS) Policies
-- ============================================================================
-- Enable RLS to ensure users can only access tracks from their own playlists.
-- All policies verify ownership through the parent playlist's owner_id.

-- enable row level security on playlist_tracks
alter table playlist_tracks enable row level security;

-- policy: allow authenticated users to select tracks from their own playlists
-- rationale: users need to view tracks in their playlists
-- access control: checks that the track's playlist belongs to the authenticated user
create policy "playlist_tracks_select_own" on playlist_tracks
  for select
  to authenticated
  using (
    playlist_id in (
      select id from playlists where owner_id = auth.uid()
    )
  );

-- policy: allow authenticated users to insert tracks into their own playlists
-- rationale: users need to add songs to their playlists
-- access control: prevents adding tracks to other users' playlists
create policy "playlist_tracks_insert_own" on playlist_tracks
  for insert
  to authenticated
  with check (
    playlist_id in (
      select id from playlists where owner_id = auth.uid()
    )
  );

-- policy: allow authenticated users to update tracks in their own playlists
-- rationale: users need to reorder tracks, soft-delete them, etc.
-- access control: prevents modifying tracks in other users' playlists
create policy "playlist_tracks_update_own" on playlist_tracks
  for update
  to authenticated
  using (
    playlist_id in (
      select id from playlists where owner_id = auth.uid()
    )
  )
  with check (
    playlist_id in (
      select id from playlists where owner_id = auth.uid()
    )
  );

-- policy: allow authenticated users to delete tracks from their own playlists
-- rationale: enables hard deletion if needed (though soft delete is preferred)
-- access control: prevents deleting tracks from other users' playlists
create policy "playlist_tracks_delete_own" on playlist_tracks
  for delete
  to authenticated
  using (
    playlist_id in (
      select id from playlists where owner_id = auth.uid()
    )
  );

