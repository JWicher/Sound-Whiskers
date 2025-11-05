-- =============================================================================
-- Migration: Harden RLS for stripe_events and ai_sessions partitions
-- Created: 2025-11-06 01:00:00 UTC
-- Purpose:
--   - Enable RLS and revoke anon/auth access on public.stripe_events
--   - Enable RLS (and revoke anon/auth) on all existing ai_sessions partitions
--   - Update create_next_ai_sessions_partition() to enforce RLS on new partitions
-- Notes:
--   - service_role bypasses RLS (used by secure server contexts only)
--   - Parent ai_sessions policies remain the source of truth
-- =============================================================================

-- -----------------------------------------------------------------------------
-- A) stripe_events: enable RLS and revoke public client access
-- -----------------------------------------------------------------------------
alter table if exists public.stripe_events enable row level security;

-- remove direct table privileges from anon/authenticated clients
revoke all on table public.stripe_events from anon, authenticated;

-- explicitly deny all via policy for defense-in-depth (optional but explicit)
drop policy if exists stripe_events_deny_all on public.stripe_events;
create policy stripe_events_deny_all on public.stripe_events
  for all
  to anon, authenticated
  using (false)
  with check (false);

-- -----------------------------------------------------------------------------
-- B) ai_sessions partitions: enable RLS and revoke anon/auth on all existing
-- -----------------------------------------------------------------------------
do $$
declare
  r record;
begin
  for r in
    select n.nspname as schema_name, c.relname as partition_name
    from pg_inherits i
    join pg_class c on c.oid = i.inhrelid
    join pg_namespace n on n.oid = c.relnamespace
    where i.inhparent = 'public.ai_sessions'::regclass
  loop
    execute format('alter table %I.%I enable row level security', r.schema_name, r.partition_name);
    -- remove direct table privileges from anon/authenticated on each partition
    execute format('revoke all on table %I.%I from anon, authenticated', r.schema_name, r.partition_name);
  end loop;
end $$;

-- -----------------------------------------------------------------------------
-- C) Update function to create new partitions with RLS enabled and privileges revoked
-- -----------------------------------------------------------------------------
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

    -- enforce RLS on the newly created partition
    execute format('alter table %I enable row level security', partition_name);
    -- remove direct privileges from anon/authenticated on the new partition
    execute format('revoke all on table %I from anon, authenticated', partition_name);

    raise notice 'Created partition with RLS enabled: %', partition_name;
  else
    raise notice 'Partition % already exists', partition_name;
  end if;
end;
$$ language plpgsql;


