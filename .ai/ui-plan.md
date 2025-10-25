# UI Architecture for Sound Whiskers

## 1. UI Structure Overview

Sound Whiskers is a Next.js web application (App Router, RSC + Client Components) with shadcn/ui as the component library. The UI focuses on quickly building playlists through manual search and editing as well as AI generation, with export to Spotify and simple profile/billing.

- **Routing (App Router)**: `/auth`, `/playlists`, `/playlists/[id]`, `/profile` (+ modals triggered from views).
- **Global layout**: Topbar (shadcn/ui `navigation-menu`) on authenticated pages; a “Back to Playlists” link on the detail view. `/auth` has a simplified layout without the full topbar.
- **State and fetch**: RSC with `fetch` `no-store`; after mutations, hard refresh of section/page. Timeouts: search 25s, AI/export 60s. No external state manager.
- **Modals**: “New playlist” (Tabs: Manual/AI), “Add tracks”, “Export to Spotify”, “Confirm”.
- **UX and accessibility**: focus-trap and aria for dialogs, keyboard-accessible DnD, inline error messages (from `error.details`), skeletons during loading, WCAG AA contrast, UI texts in EN.
- **Security**: Supabase Auth (JWT cookies), 401 → redirect to `/auth`. AI and Export actions require a verified email. Preflight `/api/spotify/status` before export. RLS enforced on the API side. Least-privilege for Spotify. Rate limiting communicated to the user.

## 2. List of Views

### View: Auth
- **View path**: `/auth`
- **Primary goal**: Sign in/sign up/magic link, password reset, resend verification; after login return to `returnTo`.
- **Key information to display**:
  - Tabs: Sign in / Sign up / Magic link
  - Links: “Forgot password”, “Resend verification”
  - Form error statuses and successes (low-priority toasts)
- **Key view components**: `tabs`, `form`, `input`, `button`, `toast`, `separator`, `alert`
- **Related API endpoints**: Supabase Auth; after login `GET /api/profile` (lazy) to initialize the header; 401 errors cause redirect to `/auth`.
- **UX, accessibility, and security considerations**:
  - Brute force protection on the Auth side (outside the UI); messages for 401/429; focus on the first field; aria-live for errors.

### View: Playlists (list)
- **View path**: `/playlists`
- **Primary goal**: Browse and filter the user’s playlists, enter the detail view, create a new playlist.
- **Key information to display**:
  - List: name, `trackCount`, `updatedAt`
  - Controls: `q` (search), `page` (1‑based), `sort` (default `updated_at:desc`)
  - CTA: “New playlist” (opens modal with Manual/AI)
- **Key view components**: `input` (search), `button`, `pagination`, `card`/`table` rows, `dialog` (New), `tabs` (Manual/AI), `toast`
- **Related API endpoints**:
  - `GET /api/playlists?q=&page=&pageSize=&sort=`
  - `POST /api/playlists` (Manual tab)
  - `POST /api/ai/generate` (AI preview) → then `POST /api/playlists` and `POST /api/playlists/{id}/tracks`
- **UX, accessibility, and security considerations**:
  - Changing `q` resets `page=1`; URL-driven state (deep links). Skeleton during loading. Inline validation errors. 409 (duplicate name) in modal. For 422 (200 limit) a clear message.

### View: New playlist (modal)
- **View path**: modal in `/playlists`
- **Primary goal**: Create a new playlist manually (name/description) or via AI (prompt → preview → create).
- **Key information to display**:
  - Tabs: Manual (Name, optional Description), AI (Prompt, preview ≤20, notes)
  - Information about limits (e.g., 200 playlists; AI: quota/plans)
- **Key view components**: `dialog`, `tabs`, `form`, `input`, `textarea`, `button`, `skeleton`, `toast`
- **Related API endpoints**:
  - Manual: `POST /api/playlists`
  - AI: `POST /api/ai/generate` → `POST /api/playlists` → `POST /api/playlists/{id}/tracks`
  - Quota: `GET /api/ai/quota` (optional badge)
- **UX, accessibility, and security considerations**:
  - AI: block for unverified email (banner). 402 (quota) with a clear action (upgrade). 504/502 with “Try again later”.

### View: Playlist Detail
- **View path**: `/playlists/[id]`
- **Primary goal**: Review and edit content (reorder/remove), add tracks, export to Spotify.
- **Key information to display**:
  - Header: playlist name, “Export to Spotify” button, item count (max 100)
  - Left column (desktop): meta (name, optional description), actions (Add tracks, Delete playlist), badges (e.g., private/export info)
  - Right column: track list with position, artist/title/album, remove actions, DnD reorder
  - “Unsaved changes” bar + “Save order”
- **Key view components**: `button` (Export, Add), `badge`, `dialog` (Add tracks, Confirm delete, Export), DnD list (`@dnd-kit`), `alert`, `toast`, `skeleton`, `separator`
- **Related API endpoints**:
  - `GET /api/playlists/{id}` (meta)
  - `GET /api/playlists/{id}/tracks` (ordered list)
  - `POST /api/playlists/{id}/tracks` (append)
  - `DELETE /api/playlists/{id}/tracks/{position}` (remove)
  - `PUT /api/playlists/{id}/tracks/reorder` (save order)
  - (optional) `PATCH /api/playlists/{id}` (rename/description, if within MVP)
- **UX, accessibility, and security considerations**:
  - DnD: keyboard support. No optimistic updates: full refetch after mutation. 422 when exceeding 100 items. 409 duplicates when adding. Clear confirmation when deleting.

### View: Add Tracks (modal)
- **View path**: modal in `/playlists/[id]`
- **Primary goal**: Spotify search (artist + partial title) and add individual tracks to the end of the list.
- **Key information to display**:
  - Form: `artist` and `title` (both required, min. 2 characters), debounce 300–400 ms
  - Results (≤10): artist/title/album, loading state (skeleton), no results
  - Inline 409 DUPLICATE on attempting to add an existing track
- **Key view components**: `dialog`, `form`, `input`, `button`, `skeleton`, `scroll-area`, `alert`
- **Related API endpoints**:
  - `GET /api/spotify/search?artist=&title=&limit=10`
  - `POST /api/playlists/{id}/tracks` (append; optionally `insertAfterPosition`)
- **UX, accessibility, and security considerations**:
  - Debounce and cancel previous requests. 429 message (“Try again in X s”). 504 timeout with a suggestion to retry. Clear focus states.

### View: Export to Spotify (modal/flow)
- **View path**: modal triggered from `/playlists/[id]`
- **Primary goal**: Create a private playlist on Spotify with the suffix “Sound Whiskers – {YYYY‑MM‑DD}”.
- **Key information to display**:
  - Spotify connection status (badge); optional Description field; note: “Re‑export creates a new copy”
- **Key view components**: `dialog`, `form`, `input/textarea`, `button`, `badge`, `alert`, `toast`
- **Related API endpoints**:
  - Preflight: `GET /api/spotify/status`
  - If `linked=false` → redirect to `GET /api/spotify/login` (OAuth) → after callback auto‑resume export
  - Export: `POST /api/playlists/{id}/export/spotify`
- **UX, accessibility, and security considerations**:
  - Clear message for `EMPTY_PLAYLIST` 409 and 403 `SPOTIFY_NOT_LINKED`. Handle resume after relink (e.g., `returnTo` + `action=export`).

### View: Profile
- **View path**: `/profile`
- **Primary goal**: Manage account, plan/billing, usage (quota), Spotify linking, and account deletion.
- **Key information to display**:
  - Sections: Account (username), Plan & Billing (upgrade/portal), Usage (playlists count, AI quota), Spotify (status/link/unlink), Danger Zone (delete)
- **Key view components**: `card`, `form`, `input`, `button`, `badge`, `separator`, `alert`, `toast`, `dialog` (confirm)
- **Related API endpoints**:
  - `GET /api/profile`, `PATCH /api/profile`, `DELETE /api/profile`
  - `GET /api/profile/usage`
  - Billing: `POST /api/billing/checkout`, `POST /api/billing/portal`
  - Spotify: `GET /api/spotify/status`, `DELETE /api/spotify/link`
- **UX, accessibility, and security considerations**:
  - Clear warnings in Danger Zone, confirm modal, information about irreversibility. No PII leakage in logs/toasts. Inline validation errors.

## 3. User Journey Map

### Main flow: Create playlist (AI) → Edit → Export to Spotify
1) User lands on `/playlists` (if unauthenticated → `/auth` with return to `returnTo`).
2) Opens “New playlist” → AI tab → enters prompt → `POST /api/ai/generate` → preview ≤20 items.
3) Clicks “Create playlist” → `POST /api/playlists` → `POST /api/playlists/{id}/tracks` (add previewed items) → redirect to `/playlists/[id]`.
4) In detail: optionally add tracks (Add tracks modal) and reorder (DnD) → “Save order”.
5) Clicks “Export to Spotify” → preflight `GET /api/spotify/status` →
   - if `linked=false` or token expired: redirect to `GET /api/spotify/login` → after callback auto‑resume export;
   - if OK: `POST /api/playlists/{id}/export/spotify` with optional Description → toast with link to Spotify.

### Alternative flows
- Manual playlist creation (Manual tab in “New playlist”).
- Manual track adding: Add tracks modal (artist+title, debounce) → `POST /tracks` append.
- Account and plan management: `/profile` → upgrade (Checkout) or portal → usage overview → link/unlink Spotify → delete account.

### Error states and edge cases (global)
- 401: redirect to `/auth` with `returnTo`.
- 402 (AI quota): message with CTA to upgrade (Profile → Billing).
- 409: duplicate playlist name (New), duplicate track (Add tracks), empty playlist on export.
- 422: item limit (100) or playlists limit (200) — clear messages.
- 429: message “Try again in X s” (cooldown), hints to reduce requests.
- 502/504: information about unavailability/timeout and suggestion to retry.

## 4. Layout and Navigation Structure

- **Topbar** (shadcn/ui `navigation-menu`):
  - Items: Playlists, New playlist (opens modal), Profile, Logout.
  - On the detail view: additional “Back to Playlists” link.
  - Visibility: on authenticated pages; `/auth` without topbar.
- **URL control**:
  - `/playlists` supports `q`, `page`, `sort` (default `updated_at:desc`). Changing `q` resets `page=1`.
- **Modals**: opened from views; focus-trap; ESC to close; aria‑labelledby/aria‑describedby.
- **Responsiveness**:
  - Mobile: single column; Desktop: playlist detail in 2 columns (left meta/actions, right list). Sticky header with actions in detail.

## 5. Key Components

- **TopbarNav**: global navigation (Playlists, New, Profile, Logout) + “Back to Playlists” on detail.
- **NewPlaylistDialog**: modal with `tabs` Manual/AI; forms, validations, error states, quota badge.
- **PlaylistsList**: list/cards with name, track count, updated date; empty-state with CTA.
- **PaginationControls**: control `page` and `pageSize` (max 100) aligned with URL.
- **PlaylistHeader**: name, export, counter 1..100, quick actions.
- **ReorderableTrackList**: track list with DnD (`@dnd-kit`), keyboard support, remove items.
- **UnsavedChangesBar**: detect order changes, “Save order” button.
- **AddTracksDialog**: form (artist + partial title, debounce), results (≤10), single-add, inline 409.
- **ExportDialog**: preflight status, optional description, export, toast with link.
- **SpotifyStatusBadge**: connection state (linked/expired/unlinked) + link/unlink actions.
- **QuotaBadge**: AI usage (used/limit/remaining, resetAt) and playlists count.
- **ProfileSections**: Account (username), Plan & Billing (upgrade/portal), Usage, Spotify, Danger Zone (delete).
- **ConfirmDialog**: confirmations (remove track, delete playlist/account).
- **ErrorBanner**: messages for 401/402/409/422/429/502/504; aria-live, friendly EN copies.
- **Skeletons/Loaders**: playlists list, track list, search results, AI preview.
- **Toasts**: low‑priority successes (created/exported/saved order).

---
The designed UI architecture meets the PRD and maps directly to the API plan: all user actions have corresponding endpoints, and the UI anticipates limits, validations, and errors (409/422/429/504). The structure is responsive, accessible, and secure, with simple navigation and URL‑driven playlist list state.
