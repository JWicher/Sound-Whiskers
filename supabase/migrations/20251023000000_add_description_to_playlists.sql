-- ============================================================================
-- Migration: Add description column to playlists table
-- Created: 2025-10-23 00:00:00 UTC
-- Purpose: Add optional description field to playlists
-- Dependencies: 20251018120300_create_playlists_table.sql
-- ============================================================================
--
-- This migration adds a description column to the playlists table.
-- The description field is optional and can be used to provide additional
-- context or notes about the playlist.
--
-- ============================================================================

-- Add description column to playlists table
ALTER TABLE playlists
ADD COLUMN description text NULL;

-- Add comment to document the column
COMMENT ON COLUMN playlists.description IS 'Optional user-provided description or notes for the playlist';

