-- ============================================================================
-- Migration: Create stripe_events table for webhook idempotency
-- Created: 2025-11-05 00:00:00 UTC
-- Purpose: Track processed Stripe webhook events to ensure idempotent processing
-- Dependencies: 20251018120200_create_profiles_table.sql
-- ============================================================================
--
-- This migration creates a table to store Stripe event IDs for idempotency.
-- Webhooks can be retried by Stripe, so we need to track which events
-- have already been processed to avoid duplicate updates.
--
-- ============================================================================

-- Create stripe_events table
CREATE TABLE stripe_events (
  id text PRIMARY KEY,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Add index on created_at for potential cleanup queries
CREATE INDEX idx_stripe_events_created_at ON stripe_events (created_at);

-- Add index on profiles.stripe_customer_id for faster lookups
CREATE INDEX IF NOT EXISTS idx_profiles_stripe_customer_id ON profiles (stripe_customer_id);

-- Add comment to document the table
COMMENT ON TABLE stripe_events IS 'Tracks processed Stripe webhook events for idempotency';
COMMENT ON COLUMN stripe_events.id IS 'Stripe event ID (evt_...)';
COMMENT ON COLUMN stripe_events.created_at IS 'Timestamp when the event was first processed';

