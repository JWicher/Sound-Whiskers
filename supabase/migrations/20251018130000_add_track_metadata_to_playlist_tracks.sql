-- ============================================================================
-- Migration: Add Track Metadata to Playlist Tracks Table
-- Created: 2025-10-18 13:00:00 UTC
-- Purpose: Add artist, title, and album columns to playlist_tracks
-- Dependencies: 20251018120400_create_playlist_tracks_table.sql
-- ============================================================================
--
-- This migration adds denormalized Spotify track metadata to the playlist_tracks
-- table to improve performance and reduce API calls to Spotify.
--
-- New columns:
-- - artist: Track artist name (NOT NULL)
-- - title: Track title/name (NOT NULL)
-- - album: Album name (NOT NULL)
--
-- Impact:
-- - Reduces need to query Spotify API for basic track information
-- - Improves UI rendering performance when displaying playlists
-- - Allows search/filter functionality on track metadata without external API calls
-- - Trade-off: Small increase in storage, but significant performance gain
--
-- Note: Existing rows will need to be backfilled if any exist.
-- For new installations, this should not be an issue.
-- ============================================================================

-- add artist column
-- stores the primary artist name from spotify track data
alter table playlist_tracks
  add column artist text;

-- add title column
-- stores the track name/title from spotify track data
alter table playlist_tracks
  add column title text;

-- add album column
-- stores the album name from spotify track data
alter table playlist_tracks
  add column album text;

-- ============================================================================
-- Apply NOT NULL constraints
-- ============================================================================
-- Note: For existing data, you would need to backfill these columns first.
-- For a fresh database, we can add NOT NULL immediately.
-- If you have existing data, comment out the NOT NULL constraints below
-- and run a backfill query first.

-- make artist required (not null)
alter table playlist_tracks
  alter column artist set not null;

-- make title required (not null)
alter table playlist_tracks
  alter column title set not null;

-- make album required (not null)
alter table playlist_tracks
  alter column album set not null;

-- ============================================================================
-- Optional: Create indexes for search performance
-- ============================================================================
-- These indexes can be added later if search/filter on track metadata is needed.
-- Commented out for now to keep the migration focused.

-- create index playlist_tracks_artist_idx
--   on playlist_tracks (artist)
--   where is_deleted = false;

-- create index playlist_tracks_title_idx
--   on playlist_tracks (title)
--   where is_deleted = false;

-- ============================================================================
-- Migration Notes
-- ============================================================================
-- 1. Application code must now provide artist, title, and album when inserting tracks
-- 2. Update your track insertion logic to include these fields from Spotify API responses
-- 3. Consider adding a data validation layer to ensure metadata quality
-- 4. Future: Could add indexes if search/filter features are needed

