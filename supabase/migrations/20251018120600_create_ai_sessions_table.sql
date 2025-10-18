-- ============================================================================
-- Migration: Create AI Sessions Table (Partitioned)
-- Created: 2025-10-18 12:06:00 UTC
-- Purpose: Create partitioned table for tracking AI operations with TTL cleanup
-- Dependencies: 20251018120200_create_profiles_table.sql, 20251018120100_create_enums.sql (ai_status_enum)
-- ============================================================================
--
-- This migration creates the ai_sessions table for tracking AI operations
-- (prompts, status, costs) with monthly range partitioning for performance.
--
-- Key features:
-- - Monthly range partitioning on created_at for efficient querying and archival
-- - Tracks AI operation outcomes (succeeded, failed, timeout)
-- - Records operation costs for billing/monitoring
-- - 30-day TTL enforced via cron job
-- - Global indexes for user-based queries
--
-- Partitioning strategy:
-- - Partitions created monthly (e.g., ai_sessions_2025_10, ai_sessions_2025_11)
-- - Old partitions automatically cleaned up after 30 days
-- - New partitions created automatically via cron job
--
-- ============================================================================

-- create partitioned ai_sessions table
-- range partitioned by month for efficient querying and archival
create table ai_sessions (
  -- unique identifier for the ai session
  id uuid not null default gen_random_uuid(),
  
  -- foreign key to profiles (user who initiated the ai operation)
  user_id uuid not null references profiles(user_id) on delete cascade,
  
  -- user's prompt/input to the ai system
  prompt text not null,
  
  -- outcome of the ai operation
  status ai_status_enum not null,
  
  -- cost of the ai operation in USD
  -- tracked for billing and monitoring purposes
  -- CHECK constraint ensures non-negative costs
  cost numeric(10,4) not null check (cost >= 0),
  
  -- timestamp when the ai session was created
  -- used as partitioning key (monthly partitions)
  created_at timestamptz not null default now(),
  
  -- primary key includes partition key for efficient lookups
  primary key (id, created_at)
) partition by range (created_at);

-- ============================================================================
-- Initial Partitions
-- ============================================================================
-- Create partitions for current month and next 3 months
-- Additional partitions will be created automatically by cron job

-- partition for october 2025
create table ai_sessions_2025_10 partition of ai_sessions
  for values from ('2025-10-01') to ('2025-11-01');

-- partition for november 2025
create table ai_sessions_2025_11 partition of ai_sessions
  for values from ('2025-11-01') to ('2025-12-01');

-- partition for december 2025
create table ai_sessions_2025_12 partition of ai_sessions
  for values from ('2025-12-01') to ('2026-01-01');

-- partition for january 2026
create table ai_sessions_2026_01 partition of ai_sessions
  for values from ('2026-01-01') to ('2026-02-01');

-- ============================================================================
-- Global Indexes
-- ============================================================================
-- These indexes span all partitions for efficient querying

-- index for user-based queries ordered by recency
-- speeds up queries like: "get recent ai sessions for user X"
create index ai_sessions_user_created_idx 
  on ai_sessions (user_id, created_at desc);

-- index for filtering by user and status
-- speeds up queries like: "count failed ai sessions for user X"
create index ai_sessions_user_status_idx 
  on ai_sessions (user_id, status);

-- index for cost analysis queries
-- speeds up queries like: "sum ai costs for user X this month"
create index ai_sessions_user_cost_idx 
  on ai_sessions (user_id, cost);

-- ============================================================================
-- Row Level Security (RLS) Policies
-- ============================================================================
-- Enable RLS to ensure users can only access their own AI session data.

-- enable row level security on ai_sessions
alter table ai_sessions enable row level security;

-- policy: allow authenticated users to select their own ai sessions
-- rationale: users need to view their ai operation history
create policy "ai_sessions_select_own" on ai_sessions
  for select
  to authenticated
  using (user_id = auth.uid());

-- policy: allow authenticated users to insert their own ai sessions
-- rationale: users need to log ai operations they initiate
-- note: user_id must match auth.uid() to prevent logging sessions for other users
create policy "ai_sessions_insert_own" on ai_sessions
  for insert
  to authenticated
  with check (user_id = auth.uid());

-- policy: allow authenticated users to update their own ai sessions
-- rationale: may need to update status or cost after operation completes
-- note: prevents users from modifying other users' session data
create policy "ai_sessions_update_own" on ai_sessions
  for update
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- policy: allow authenticated users to delete their own ai sessions
-- rationale: enables manual cleanup if needed
-- note: automatic cleanup handled by cron job (see below)
create policy "ai_sessions_delete_own" on ai_sessions
  for delete
  to authenticated
  using (user_id = auth.uid());

-- ============================================================================
-- Automated Partition Management
-- ============================================================================
-- Cron jobs for automatic partition creation and TTL cleanup

-- function: create next month's partition if it doesn't exist
-- called monthly by cron job to ensure partitions exist in advance
create or replace function create_next_ai_sessions_partition()
returns void as $$
declare
  next_month timestamptz;
  next_month_plus_one timestamptz;
  partition_name text;
  partition_exists boolean;
begin
  -- calculate next month's boundaries
  next_month := date_trunc('month', now() + interval '1 month');
  next_month_plus_one := next_month + interval '1 month';
  
  -- generate partition name (e.g., ai_sessions_2026_02)
  partition_name := 'ai_sessions_' || to_char(next_month, 'YYYY_MM');
  
  -- check if partition already exists
  select exists(
    select 1 from pg_class where relname = partition_name
  ) into partition_exists;
  
  -- create partition if it doesn't exist
  if not partition_exists then
    execute format(
      'create table %I partition of ai_sessions for values from (%L) to (%L)',
      partition_name,
      next_month,
      next_month_plus_one
    );
    raise notice 'Created partition: %', partition_name;
  else
    raise notice 'Partition % already exists', partition_name;
  end if;
end;
$$ language plpgsql;

-- schedule monthly partition creation (runs at 2 AM on the 1st of each month)
-- ensures new partitions are ready before they're needed
select cron.schedule(
  'create_ai_sessions_partition',
  '0 2 1 * *',
  $$select create_next_ai_sessions_partition();$$
);

-- ============================================================================
-- TTL Cleanup
-- ============================================================================
-- Automatically delete ai_sessions older than 30 days
-- Runs daily at 3 AM to avoid peak usage hours

-- schedule daily cleanup of old ai sessions (runs at 3 AM daily)
-- deletes records older than 30 days
-- note: since table is partitioned, consider dropping entire partitions
-- instead of deleting rows for better performance (future optimization)
select cron.schedule(
  'delete_old_ai_sessions',
  '0 3 * * *',
  $$
    delete from ai_sessions 
    where created_at < now() - interval '30 days';
  $$
);

-- ============================================================================
-- Helper Functions for AI Session Management
-- ============================================================================

-- function: log a new ai session
-- convenience function for creating ai session records
create or replace function log_ai_session(
  p_user_id uuid,
  p_prompt text,
  p_status ai_status_enum,
  p_cost numeric
)
returns uuid as $$
declare
  session_id uuid;
begin
  insert into ai_sessions (user_id, prompt, status, cost)
  values (p_user_id, p_prompt, p_status, p_cost)
  returning id into session_id;
  
  return session_id;
end;
$$ language plpgsql security definer;

-- grant execute permission to authenticated users
grant execute on function log_ai_session(uuid, text, ai_status_enum, numeric) to authenticated;

-- function: get ai usage summary for a user
-- returns aggregated stats: total sessions, total cost, success rate
create or replace function get_ai_usage_summary(
  p_user_id uuid,
  p_start_date timestamptz default now() - interval '30 days',
  p_end_date timestamptz default now()
)
returns table (
  total_sessions bigint,
  total_cost numeric,
  succeeded_count bigint,
  failed_count bigint,
  timeout_count bigint,
  success_rate numeric
) as $$
begin
  return query
  select
    count(*)::bigint as total_sessions,
    sum(ai.cost)::numeric as total_cost,
    count(*) filter (where ai.status = 'succeeded')::bigint as succeeded_count,
    count(*) filter (where ai.status = 'failed')::bigint as failed_count,
    count(*) filter (where ai.status = 'timeout')::bigint as timeout_count,
    case 
      when count(*) > 0 then
        round(count(*) filter (where ai.status = 'succeeded')::numeric / count(*)::numeric * 100, 2)
      else 0
    end as success_rate
  from ai_sessions ai
  where ai.user_id = p_user_id
    and ai.created_at between p_start_date and p_end_date;
end;
$$ language plpgsql security definer;

-- grant execute permission to authenticated users
grant execute on function get_ai_usage_summary(uuid, timestamptz, timestamptz) to authenticated;

