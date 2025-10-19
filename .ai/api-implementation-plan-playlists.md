# API Endpoint Implementation Plan: Playlists CRUD

## 1. Endpoint Overview
The playlists API exposes CRUD operations for a user’s playlists:

* **GET /api/playlists** – Paginated list of the current user’s non-deleted playlists.
* **POST /api/playlists** – Create a new playlist for the current user.
* **GET /api/playlists/{id}** – Fetch a single playlist (owner-only).
* **PATCH /api/playlists/{id}** – Update playlist name / description.
* **DELETE /api/playlists/{id}** – Soft-delete a playlist; triggers cascade track soft-delete.

All routes are authenticated (Supabase session cookie or `Authorization: Bearer <jwt>`). Row-level security (RLS) additionally enforces owner access at the database layer.

## 2. Request Details
### 2.1 GET /api/playlists
* **Method**: GET
* **Query params**:
  * `page` (number, default `1`, min `1`)
  * `pageSize` (number, default `20`, min `1`, max `100`)
  * `search` (string, optional, case-insensitive substring on `name`)
  * `sort` (enum, default `updated_at:desc`). Accepted values:
    * `created_at:asc|desc`
    * `updated_at:asc|desc`
    * `name:asc|desc`

### 2.2 POST /api/playlists
* **Method**: POST
* **Body** (`application/json`):
```jsonc
{
  "name": "string",          // required, 1-100 chars
  "description": "string|null" // optional, ≤ 255 chars
}
```

### 2.3 GET /api/playlists/{id}
* **Method**: GET
* **Path param**: `id` – playlist UUID

### 2.4 PATCH /api/playlists/{id}
* **Method**: PATCH
* **Body** (any/all fields optional, at least one must be present):
```jsonc
{
  "name": "string",          // 1-100 chars
  "description": "string|null" // ≤ 255 chars
}
```

### 2.5 DELETE /api/playlists/{id}
* **Method**: DELETE
* **No body**

## 3. Used Types
* **DTOs** (already in `src/types.ts`):
  * `PlaylistListDto`, `PlaylistListItemDto`
  * `PlaylistDto`
  * `PaginatedResponse<T>`
  * `ErrorResponse`
* **Command models** (already in `src/types.ts`):
  * `CreatePlaylistCommand`
  * `UpdatePlaylistCommand`
* **Internal service types (new)**:
  * `ListPlaylistsOptions` – { search?: string; page: number; pageSize: number; sort: SortOption }
  * `SortOption` – `'created_at.asc' | 'created_at.desc' | 'updated_at.asc' | 'updated_at.desc' | 'name.asc' | 'name.desc'`

## 4. Response Details
| Operation | Success status | Body |
|-----------|---------------|------|
| List | 200 | `PlaylistListDto` |
| Create | 201 | `PlaylistDto` |
| Get | 200 | `PlaylistDto` + `trackCount` |
| Update | 200 | `PlaylistDto` |
| Delete | 204 | – |

Error codes follow `ErrorResponse` shape with `code` enumerations:
* 400 `VALIDATION_ERROR`
* 401 `UNAUTHORIZED`
* 404 `NOT_FOUND`
* 409 `CONFLICT` (duplicate name)
* 422 `LIMIT_EXCEEDED` (≥ 50 playlists)
* 500 `INTERNAL_SERVER_ERROR`

## 5. Data Flow
1. **Request enters Next.js API route** under `/src/app/api/playlists`.& push.
3. **Route handler** delegates to `playlistService` (new file `src/lib/services/playlistService.ts`).
4. Service uses **Supabase Server Client** (`@/lib/supabase/server`) with the user’s JWT to run parametrised SQL / RPC against the DB.
5. **RLS** ensures records belong to the user.
6. Results mapped to DTOs and returned.
7. Failures propagate through a unified `ApiError` helper (new) that serialises to `ErrorResponse`.
8. **Soft-delete** simply updates `is_deleted = true`; DB trigger `soft_delete_playlist_tracks()` handles tracks.

## 6. Security Considerations
* **Authentication**: Require active Supabase session; return 401 otherwise.
* **Authorization**: RLS + explicit `WHERE owner_id = auth.uid()` in selects for defence-in-depth.
* **Rate limiting**: Re-use existing middleware (`src/middleware.ts`) to throttle to 30 req/min per IP for authenticated routes.
* **Input validation**: All params/body validated with **Zod** schemas before DB access to prevent injection and malformed data.
* **Duplicate name**: Unique partial index (`(owner_id, lower(name)) WHERE is_deleted = FALSE`) prevents duplicates; handle conflict error and return 409.
* **Limit exceeded**: Deferred trigger `check_playlists_limit()` may raise Postgres error `PLAYLISTS_LIMIT_EXCEEDED`; translate to 422.
* **Pagination bounds**: Enforce `page * pageSize` ≤ 5000 to avoid heavy scans.
* **Logging**: On 5xx, log structured error (`console.error` + `@/lib/log` wrapper) with request id.

## 7. Error Handling
| Scenario | Status | Code | Notes |
|----------|--------|------|-------|
| Missing/invalid JWT | 401 | UNAUTHORIZED | – |
| Validation fails | 400 | VALIDATION_ERROR | List of issues |
| Duplicate playlist name | 409 | CONFLICT | – |
| Over 50 playlists | 422 | LIMIT_EXCEEDED | – |
| Playlist not found / not owner | 404 | NOT_FOUND | – |
| DB/network failure | 500 | INTERNAL_SERVER_ERROR | Logged |
| Request timeout (>25s) | 500 | INTERNAL_SERVER_ERROR | Abort controller |

## 8. Performance Considerations
* **Indexes**: use `playlists_owner_name_idx` and default PK/updated_at index; ensure queries use index-only scans.
* **Pagination**: keyset pagination possible later; current offset-limit acceptable given ≤ 50 rows.
* **Response size**: cap `pageSize` to 100.
* **Timeouts**: Abort DB + request after 25 s via `AbortController`.

## 9. Implementation Steps
1. **Create `src/lib/errors/ApiError.ts`** – helper class with `status`, `code`, `details`.
2. **Add Zod schemas** in `src/lib/validators/playlistSchemas.ts` for commands & query params.
3. **Scaffold service** `src/lib/services/playlistService.ts` with methods:
   * `list(userId, options)`
   * `create(userId, command)`
   * `get(userId, playlistId)`
   * `update(userId, playlistId, command)`
   * `softDelete(userId, playlistId)`
4. **Write DB queries** using Supabase JS:
   * `from('playlists').select('id, name, is_deleted, created_at, updated_at, playlist_tracks(count)') ...`
   * Use `ilike('%search%')` for filter.
5. **Translate Postgres errors** (`23505`, `P0001`) to `ApiError` (409/422).
6. **Implement route handlers**:
   * `/src/app/api/playlists/route.ts` – supports GET & POST.
   * `/src/app/api/playlists/[id]/route.ts` – supports GET, PATCH, DELETE.
7. **Run lints**
