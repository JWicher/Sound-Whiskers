-- ============================================================================
-- Migration: Create Custom Enums
-- Created: 2025-10-18 12:01:00 UTC
-- Purpose: Define custom enum types for the Sound Whiskers app
-- Dependencies: None
-- ============================================================================
--
-- This migration creates the following enum types:
-- 1. plan_type - defines user subscription tiers (free, pro)
-- 2. ai_status_enum - tracks AI operation outcomes (succeeded, failed, timeout)
--
-- These enums provide type safety and ensure data consistency across tables.
-- ============================================================================

-- enum for user subscription plan types
-- currently supports two tiers: free (default) and pro (paid)
create type plan_type as enum ('free', 'pro');

-- enum for ai operation status tracking
-- tracks the outcome of ai-powered features:
-- - succeeded: operation completed successfully
-- - failed: operation failed due to error
-- - timeout: operation exceeded 60-second limit
create type ai_status_enum as enum ('succeeded', 'failed', 'timeout');

