# REST API Plan

## 1. Resources
- **Profile** → table: `profiles`
- **Playlist** → table: `playlists`
- **PlaylistTrack** → table: `playlist_tracks`
- **AISession** → table: `ai_sessions`
- **SpotifyToken** (server-only) → table: `spotify_tokens`
- **Search** (Spotify) → external API, no table
- **Export** (to Spotify) → external API, no table
- **Billing** (Stripe) → external API + `profiles.plan`
- **Account** → Supabase Auth user + owned rows

Notes impacting design:
- `playlists`: unique on `(owner_id, lower(name)) WHERE is_deleted = FALSE` → surface 409 on duplicate names.
- `playlist_tracks`: PK `(playlist_id, position)`, `CHECK (position BETWEEN 1 AND 100)`, unique `(playlist_id, track_uri) WHERE is_deleted = FALSE`; required metadata columns `artist`, `title`, `album` (NOT NULL) → enforce max 100 items, prevent duplicates.
- `ai_sessions`: partitioned, indexes on `(user_id, created_at DESC)` and `(user_id, status)` → list fast by user and recent first.
- `spotify_tokens`: encrypted columns; never exposed to clients.

## 2. Endpoints

Conventions
- Base path: `/api`
- Auth: Supabase Auth (JWT cookies); all endpoints require auth unless noted.
- Pagination: `page` (1-based), `pageSize` (default 20, max 100).
- Sorting: `sort` format: `field:direction` (e.g., `created_at:desc`). Defaults noted per endpoint.
- Error format (example):
  ```json
  { "error": { "code": "VALIDATION_ERROR", "message": "Name is required", "details": { "name": "Required" } } }
  ```

### 2.1 Profile

- GET `/api/profile`
  - Description: Return current user's profile.
  - Response 200:
    ```json
    { "userId": "uuid", "username": "string", "plan": "free|pro", "createdAt": "ISO-8601", "updatedAt": "ISO-8601" }
    ```
  - Errors: 401 UNAUTHORIZED

- PATCH `/api/profile`
  - Description: Update `username`. `plan` is managed by billing/webhooks.
  - Request:
    ```json
    { "username": "string" }
    ```
  - Response 200: same shape as GET.
  - Errors: 400 VALIDATION_ERROR, 401 UNAUTHORIZED

- GET `/api/profile/usage`
  - Description: Convenience usage summary (playlists count, AI quota usage in current month UTC).
  - Response 200:
    ```json
    { "playlists": { "count": 12, "limit": 200 }, "ai": { "used": 2, "limit": 3, "remaining": 1, "resetAt": "ISO-8601" } }
    ```

### 2.2 Playlists

- GET `/api/playlists`
  - Description: List current user's non-deleted playlists.
  - Query: `search` (case-insensitive substring on name), `page`, `pageSize`, `sort` (default `updated_at:desc`).
  - Response 200:
    ```json
    {
      "items": [
        { "id": "uuid", "name": "string", "isDeleted": false, "createdAt": "ISO-8601", "updatedAt": "ISO-8601", "trackCount": 17 }
      ],
      "page": 1,
      "pageSize": 20,
      "total": 42
    }
    ```

- POST `/api/playlists`
  - Description: Create a playlist.
  - Request:
    ```json
    { "name": "string", "description": "string|null" }
    ```
  - Response 201:
    ```json
    { "id": "uuid", "name": "string", "description": "string|null", "createdAt": "ISO-8601", "updatedAt": "ISO-8601" }
    ```
  - Errors: 400 VALIDATION_ERROR, 401 UNAUTHORIZED, 409 CONFLICT (duplicate name), 422 LIMIT_EXCEEDED (user over cap)

- GET `/api/playlists/{playlistId}`
  - Description: Get a playlist (owner only).
  - Response 200: same as POST 201 plus `trackCount`.
  - Errors: 401, 404 NOT_FOUND

- PATCH `/api/playlists/{playlistId}`
  - Description: Update `name` and/or `description` (owner only).
  - Request:
    ```json
    { "name": "string", "description": "string|null" }
    ```
  - Response 200: updated playlist.
  - Errors: 400, 401, 404, 409 (duplicate name)

- DELETE `/api/playlists/{playlistId}`
  - Description: Soft-delete playlist (`is_deleted = TRUE`) (owner only). Cascades soft-delete of tracks via trigger.
  - Response 204 No Content
  - Errors: 401, 404

### 2.3 Playlist Tracks

- GET `/api/playlists/{playlistId}/tracks`
  - Description: List tracks in order (non-deleted only).
  - Query: `page`, `pageSize` (default 100 to return full list), `sort` ignored (always by `position` asc).
  - Response 200:
    ```json
    {
      "items": [
        { "position": 1, "trackUri": "spotify:track:...", "artist": "string", "title": "string", "album": "string", "addedAt": "ISO-8601" }
      ],
      "page": 1,
      "pageSize": 100,
      "total": 17
    }
    ```

- POST `/api/playlists/{playlistId}/tracks`
  - Description: Append one or more tracks with required metadata; places after current last position by default. Optionally specify explicit `insertAfterPosition`.
  - Request:
    ```json
    {
      "tracks": [
        { "trackUri": "spotify:track:...", "artist": "string", "title": "string", "album": "string" }
      ],
      "insertAfterPosition": 0
    }
    ```
  - Response 201:
    ```json
    { "added": 3, "positions": [12, 13, 14] }
    ```
  - Errors: 400 VALIDATION_ERROR, 401, 404, 409 DUPLICATE_TRACK, 422 POSITION_OUT_OF_RANGE or PLAYLIST_MAX_ITEMS_EXCEEDED (max 100)

- DELETE `/api/playlists/{playlistId}/tracks/{position}`
  - Description: Remove a track at a specific position (soft delete) and compact positions above by -1.
  - Response 204
  - Errors: 401, 404

- PUT `/api/playlists/{playlistId}/tracks/reorder`
  - Description: Reorder tracks by providing the full ordered list of `{position, trackUri}` pairs.
  - Request:
    ```json
    { "ordered": [{ "position": 1, "trackUri": "spotify:track:..." }] }
    ```
  - Response 200:
    ```json
    { "positions": [{ "position": 1, "trackUri":"spotify:track:..." }] }
    ```
  - Notes: Reorder does not alter `artist`, `title`, or `album` metadata.
  - Errors: 400, 401, 404, 422 MISSING_OR_EXTRA_ITEMS (must match current non-deleted set exactly)

### 2.4 Spotify Search

- GET `/api/search/spotify`
  - Description: Artist + partial title search using Spotify operators; market-filtered; deduped by track ID. Server-timeout 25s.
  - Query: `artist` (required), `title` (optional), `limit` (default 10, max 10), `market` (optional; default user market), `cursor` (opaque, optional) – typically no pagination per PRD.
  - Response 200:
    ```json
    {
      "items": [
        { "trackId": "string", "trackUri": "spotify:track:...", "artist": "string", "title": "string", "album": "string" }
      ]
    }
    ```
  - Errors: 400, 401, 429 RATE_LIMITED, 504 TIMEOUT, 502 UPSTREAM_ERROR

### 2.5 AI Playlist Generation

- POST `/api/ai/generate`
  - Description: Generate up to 20-track suggestions from a natural-language prompt (EN/PL). Applies 60s timeout; validates tracks in user market; dedupes; backfills via Spotify Recommendations. Counts toward monthly quota on success only.
  - Request:
    ```json
    { "prompt": "string" }
    ```
  - Response 200 (succeeded):
    ```json
    {
      "sessionId": "uuid",
      "summary": "string|null",
      "items": [
        { "artist": "string", "title": "string", "album": "string" }
      ],
      "count": 20,
      "warningUnderMinCount": false
    }
    ```
  - Response 200 (partial <12): same shape with `warningUnderMinCount: true`.
  - Errors: 400, 401, 402 PAYMENT_REQUIRED (free quota exhausted), 429 RATE_LIMITED, 504 TIMEOUT, 502 UPSTREAM_ERROR

- GET `/api/ai/quota`
  - Description: Return current month's AI usage and limits based on plan.
  - Response 200:
    ```json
    { "used": 2, "limit": 3, "remaining": 1, "resetAt": "ISO-8601" }
    ```

- GET `/api/ai/sessions`
  - Description: List user's AI sessions (recent first). Typically for debugging or history.
  - Query: `status` (optional: succeeded|failed|timeout), `page`, `pageSize`.
  - Response 200: standard paginated list with `id`, `status`, `createdAt`.

### 2.6 Spotify Linking & Status

- GET `/api/spotify/login`
  - Description: Start OAuth; responds 302 redirect to Spotify authorize with `playlist-modify-private` scope only.
  - Response: 302 Redirect

- GET `/api/spotify/oauth-callback`
  - Description: Handle OAuth callback; exchange code; encrypt and store tokens; set/refresh expiry; redirect to app.
  - Response: 302 Redirect to app success/failure screen
  - Errors: 400, 401, 502

- GET `/api/spotify/status`
  - Description: Whether user is linked to Spotify and token expiry.
  - Response 200:
    ```json
    { "linked": true, "expiresAt": "ISO-8601" }
    ```

- DELETE `/api/spotify/link`
  - Description: Unlink Spotify; revoke token if possible; delete row.
  - Response 204

### 2.7 Export to Spotify

- POST `/api/playlists/{playlistId}/export/spotify`
  - Description: Create a new private playlist on Spotify with date suffix per naming template “Sound Whiskers – {YYYY-MM-DD}”. Not a sync; each export creates a new copy. 60s timeout.
  - Request:
    ```json
    { "description": "string|null" }
    ```
  - Response 201:
    ```json
    { "spotifyPlaylistId": "string", "spotifyPlaylistUrl": "string", "exported": 17, "note": "Re-export creates a new copy" }
    ```
  - Errors: 400, 401, 403 SPOTIFY_NOT_LINKED, 404, 409 EMPTY_PLAYLIST, 429, 504, 502

### 2.8 Billing (Stripe)

- POST `/api/billing/checkout`
  - Description: Create Stripe Checkout Session for Pro ($10/mo, tax-inclusive). No trial.
  - Request:
    ```json
    { "successUrl": "string", "cancelUrl": "string" }
    ```
  - Response 200:
    ```json
    { "url": "string" }
    ```
  - Errors: 401, 502

- POST `/api/billing/portal`
  - Description: Create Stripe Customer Portal session link.
  - Request: `{ "returnUrl": "string" }`
  - Response 200: `{ "url": "string" }`

- POST `/api/webhooks/stripe` (no auth)
  - Description: Verify signature; idempotently update `profiles.plan` and `stripe_customer_id`.
  - Response 200: `{ "ok": true }`
  - Errors: 400 INVALID_SIGNATURE, 409 IDEMPOTENCY_CONFLICT

### 2.9 Account Deletion

- DELETE `/api/account`
  - Description: Self-serve delete. Revoke Spotify tokens, delete `spotify_tokens`, `playlists` (soft or hard per policy), `playlist_tracks`, `ai_sessions`, and Supabase user. Requires re-auth/confirmation flow client-side.
  - Response 202 Accepted:
    ```json
    { "status": "accepted" }
    ```
  - Errors: 401, 423 ACCOUNT_LOCKED

## 3. Authentication and Authorization

- Mechanism: Supabase Auth (JWT in cookies). Email verification required; 30-day session persistence.
- Authorization: Enforced via Supabase RLS as primary guard:
  - `profiles`: owner read/write (`user_id = auth.uid()`).
  - `playlists`: owner read/write (`owner_id = auth.uid()`).
  - `playlist_tracks`: accessible via owner of parent playlist.
  - `ai_sessions`: owner.
  - `spotify_tokens`: server-only access via RPC/service role; never exposed directly to clients.
- API routes run on Node.js runtime; sensitive operations (Spotify, AI, Stripe) must execute server-side only.

## 4. Validation and Business Logic

Validation (API layer + DB constraints)
- Profile
  - `username`: non-empty string; length ≤ 64 (assumed); trim whitespace.
- Playlist
  - `name`: required, non-empty, length ≤ 120 (assumed); unique per user case-insensitive among non-deleted.
  - `description`: optional; length ≤ 500 (assumed).
  - Cap: ≤ 200 active playlists per user (PRD). Surface 422 `LIMIT_EXCEEDED` if above; align DB trigger `check_playlists_limit()` to 200.
- PlaylistTrack
  - `trackUri`: must be valid `spotify:track:` URI.
  - `position`: 1..100 (DB `CHECK`).
  - `artist`, `title`, `album`: required; non-empty strings; trim whitespace; recommended length ≤ 200.
  - No duplicates per playlist while `is_deleted = FALSE` (DB unique index).
  - Max items per playlist: 100; enforce on add and reorder.
- AI
  - `prompt`: required; EN/PL only; refuse non-music requests with guidance.
  - Output: ≤ 20 tracks; if <12 valid after validation/backfill, return with warning and allow export.
- Export
  - Requires linked Spotify; tokens valid or refreshable.
  - Playlist must have ≥ 1 track to export; enforce private by default; description includes attribution.
- Billing
  - Price: $10/mo; no trials; cancellation at period end; downgrade on unpaid renewal.

Business Logic
- Search
  - Use Spotify search operators; filter by user market; dedupe by track ID; server timeout 25s.
- AI Generation
  - Use OpenRouter with 60s timeout; on success record `ai_sessions(status='succeeded')` and count toward quota.
  - Fallback: Spotify Recommendations to backfill constrained by prompt semantics.
  - Quotas: Free 3/month, Pro 50/month; compute within current billing month (UTC). Endpoint `/api/ai/quota` derives from `ai_sessions` partition.
  - Rate limit: e.g., 5 requests/min per user; return 429 when exceeded.
- Playlists & Tracks
  - Soft delete playlists; soft-delete cascade of tracks via trigger.
  - Reorder compacts positions 1..N with no gaps.
  - Add/remove adjusts positions accordingly; maintain uniqueness by `trackUri`.
  - On add, clients must provide `artist`, `title`, and `album` metadata (denormalized); server validates and persists. Reorder/delete do not modify metadata.
- Export to Spotify
  - Create new playlist each export; name template “Sound Whiskers – {YYYY-MM-DD}”.
  - Default private; include attribution in description.
  - Handle rate limiting and token refresh automatically; transactional semantics: best-effort insert; return count exported.
- Billing
  - Webhooks verified and idempotent; update `profiles.plan` and `stripe_customer_id` accordingly; gate `/api/ai/generate` by plan/quota.
- Account Deletion
  - Revoke Spotify tokens; purge user data (profiles soft-delete optional); delete Supabase user; ensure RLS prevents residual access.

Security
- RLS enabled on all tables; server-only access for `spotify_tokens`.
- Encrypt Spotify tokens at rest using `pgp_sym_encrypt` with secret in Supabase Secrets; decrypt only server-side.
- Rate limiting on `/api/search/spotify`, `/api/ai/generate`, and `/api/playlists/{id}/export/spotify` (e.g., token bucket per IP/user).
- Verify webhooks (Stripe, OpenRouter if used) and enforce idempotency keys.
- Least-privilege Spotify scopes: `playlist-modify-private` only.

Performance & Timeouts
- Enforce timeouts: search 25s, AI 60s, export 60s.
- Use indexes for playlist lists and AI sessions to keep queries under ~50ms P50.
- Batch add tracks; avoid per-track roundtrips.

HTTP Status Codes Summary
- 200 OK, 201 Created, 202 Accepted, 204 No Content
- 400 Validation/Bad Request, 401 Unauthorized, 402 Payment Required (quota), 403 Forbidden, 404 Not Found, 409 Conflict, 422 Unprocessable, 429 Too Many Requests
- 500 Internal Error, 502 Upstream Error, 504 Gateway Timeout


