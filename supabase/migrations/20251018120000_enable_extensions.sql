-- ============================================================================
-- Migration: Enable Required Extensions
-- Created: 2025-10-18 12:00:00 UTC
-- Purpose: Enable PostgreSQL extensions required for the Sound Whiskers app
-- Dependencies: None
-- ============================================================================
--
-- This migration enables the following extensions:
-- 1. pgcrypto - for encryption/decryption of Spotify tokens and UUID generation
-- 2. pg_cron - for scheduled cleanup jobs (e.g., deleting old ai_sessions)
--
-- Note: These extensions must be enabled before creating tables that depend on them.
-- ============================================================================

-- enable pgcrypto for token encryption and uuid generation
-- used for: pgp_sym_encrypt/decrypt, gen_random_uuid()
create extension if not exists pgcrypto;

-- enable pg_cron for scheduled maintenance tasks
-- used for: automatic cleanup of old ai_sessions records
create extension if not exists pg_cron;

