# PostgreSQL Database Schema — Sound Whiskers MVP

## 1. Tables

### 1.1 `profiles`
| Column               | Type                     | Constraints & Notes |
|----------------------|--------------------------|---------------------|
| `user_id`            | `uuid`                   | **PK**, FK → `auth.users.id`, `NOT NULL` |
| `username`           | `text`                   | `NOT NULL` |
| `plan`               | `plan_type`              | `NOT NULL DEFAULT 'free'` |
| `stripe_customer_id` | `text`                   | `UNIQUE`, nullable |
| `created_at`         | `timestamptz`            | `NOT NULL DEFAULT now()` |
| `updated_at`         | `timestamptz`            | `NOT NULL DEFAULT now()` |

> One-to-one with `auth.users` (managed by Supabase).

---

### 1.2 `playlists`
| Column      | Type      | Constraints & Notes |
|-------------|-----------|---------------------|
| `id`        | `uuid`    | **PK**, `DEFAULT gen_random_uuid()` |
| `owner_id`  | `uuid`    | FK → `profiles.user_id`, `NOT NULL` |
| `name`      | `text`    | `NOT NULL` |
| `is_deleted`| `boolean` | `NOT NULL DEFAULT FALSE` |
| `created_at`| `timestamptz` | `NOT NULL DEFAULT now()` |
| `updated_at`| `timestamptz` | `NOT NULL DEFAULT now()` |

Constraints:
* Partial **UNIQUE** index on `(owner_id, lower(name)) WHERE is_deleted = FALSE`.
* Deferred trigger `check_playlists_limit()` ensures ≤ 50 non-deleted playlists per user.

---

### 1.3 `playlist_tracks`
| Column        | Type    | Constraints & Notes |
|---------------|---------|---------------------|
| `playlist_id` | `uuid`  | FK → `playlists.id`, `NOT NULL` |
| `position`    | `smallint` | 1-based track order, `CHECK (position BETWEEN 1 AND 100)` |
| `track_uri`   | `text`  | Spotify track URI, `NOT NULL` |
| `is_deleted`  | `boolean` | `NOT NULL DEFAULT FALSE` |
| `added_at`    | `timestamptz` | `NOT NULL DEFAULT now()` |

Primary Key: `(playlist_id, position)`

Additional Constraints & Indexes:
* ON DELETE CASCADE (soft) handled via trigger `soft_delete_playlist_tracks()` when a playlist is soft-deleted.

---

### 1.4 Enums
```sql
CREATE TYPE plan_type AS ENUM ('free', 'pro');
CREATE TYPE ai_status_enum AS ENUM ('succeeded', 'failed', 'timeout');
```

---

### 1.5 `ai_sessions`  _(monthly range-partitioned)_
| Column       | Type          | Constraints & Notes |
|--------------|---------------|---------------------|
| `id`         | `uuid`        | **PK**, `DEFAULT gen_random_uuid()` |
| `user_id`    | `uuid`        | FK → `profiles.user_id`, `NOT NULL` |
| `prompt`     | `text`        | `NOT NULL` |
| `status`     | `ai_status_enum` | `NOT NULL` |
| `cost`       | `numeric(10,4)` | `NOT NULL CHECK (cost >= 0)` |
| `created_at` | `timestamptz` | `NOT NULL DEFAULT now()` |

Partitioning:
```sql
CREATE TABLE ai_sessions ( ... )
PARTITION BY RANGE (date_trunc('month', created_at));
```
Monthly partitions are created via migration jobs.

TTL Cleanup:
```sql
SELECT cron.schedule('delete_old_ai_sessions', '0 3 * * *', $$
  DELETE FROM ai_sessions WHERE created_at < now() - interval '30 days';
$$);
```

Indexes:
* Global index on `(user_id, created_at DESC)`
* Global index on `(user_id, status)`

---

### 1.6 `spotify_tokens`
| Column         | Type      | Constraints & Notes |
|----------------|-----------|---------------------|
| `user_id`      | `uuid`    | **PK**, FK → `profiles.user_id`, `NOT NULL` |
| `access_token` | `bytea`   | Encrypted: `pgp_sym_encrypt`, `NOT NULL` |
| `refresh_token`| `bytea`   | Encrypted: `pgp_sym_encrypt`, `NOT NULL` |
| `expires_at`   | `timestamptz` | `NOT NULL` |
| `created_at`   | `timestamptz` | `NOT NULL DEFAULT now()` |
| `updated_at`   | `timestamptz` | `NOT NULL DEFAULT now()` |

> Encryption key stored in Supabase Secrets; decrypt only in secure server contexts.

---

## 2. Relationships
* `auth.users (1) ── (1) profiles`
* `profiles (1) ── (N) playlists`
* `playlists (1) ── (N) playlist_tracks`
* `profiles (1) ── (N) ai_sessions`
* `profiles (1) ── (1) spotify_tokens`

## 3. Indexes
1. `playlists_owner_name_idx`: `UNIQUE (owner_id, lower(name)) WHERE is_deleted = FALSE`
2. `playlist_tracks_no_dup_idx`: `UNIQUE (playlist_id, track_uri) WHERE is_deleted = FALSE`
3. `ai_sessions_user_created_idx`: `btree (user_id, created_at DESC)`
4. `ai_sessions_user_status_idx`: `btree (user_id, status)`
5. `spotify_tokens_user_idx`: `UNIQUE (user_id)`

## 4. Row-Level Security Policies (Supabase)
```sql
-- PROFILES
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Profiles are owner-read-write" ON profiles
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- PLAYLISTS
ALTER TABLE playlists ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Playlists are owner-read-write" ON playlists
  USING (owner_id = auth.uid()) WITH CHECK (owner_id = auth.uid());

-- PLAYLIST_TRACKS
ALTER TABLE playlist_tracks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Tracks accessible through playlist owner" ON playlist_tracks
  USING (playlist_id IN (SELECT id FROM playlists WHERE owner_id = auth.uid()))
  WITH CHECK (playlist_id IN (SELECT id FROM playlists WHERE owner_id = auth.uid()));

-- AI_SESSIONS
ALTER TABLE ai_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "AI sessions owner" ON ai_sessions
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- SPOTIFY_TOKENS (server-side only)
ALTER TABLE spotify_tokens ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Owner access via RPC" ON spotify_tokens
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
```
> For `spotify_tokens` the client should **not** access the table directly. Expose via secure RPC or server-side only role.

---

## 5. Security & Compliance

1. **Token encryption** – `pgp_sym_encrypt` / `pgp_sym_decrypt` with secret held in Supabase Secrets (`app.spotify_secret`).
2. **RLS everywhere** – each table has `USING` / `WITH CHECK` clauses enforcing `user_id = auth.uid()` or equivalent.
3. **Least-privilege roles** – application service role granted only required column permissions; admin tasks via elevated role.
4. **Stripe webhook idempotency & signature** handled in API layer; events are *not* persisted.

---

## 6. Additional Notes
* **Triggers**
  * `check_playlists_limit()`: AFTER INSERT/UPDATE ON playlists, deferred; raises error if `SELECT COUNT(*)` of non-deleted playlists for user > 50.
  * `soft_delete_playlist_tracks()`: BEFORE UPDATE OF `is_deleted` ON playlists; when playlist set to `TRUE`, cascade soft-delete track rows.
* **Soft delete**: `is_deleted` columns are preferred over `deleted_at` for simpler partial indexes.
* **Partition maintenance**: Jobs create next month’s `ai_sessions` partition automatically.
* **Extensions required**: `pgcrypto` for encryption (`pgp_sym_encrypt`), `pg_cron` for scheduled cleanup, `uuid-ossp` or `pgcrypto` for `gen_random_uuid()`.
* **Future growth**: Global indexes on partitioned `ai_sessions` are adequate for MVP volumes; reassess once >1 M rows.

