# Playlists View Implementation Plan

## 1. Overview
The Playlists list view (`/playlists`) lets a signed-in user browse, search, sort, paginate, and create their own playlists. It is the primary entry point to playlist management and must feel fast and responsive while reflecting server-side query parameters in the URL for shareable deep links.

## 2. View Routing
* **Path:** `/playlists`
* **Route type:** Client page inside the existing `app` router (Next.js 14). Use a Server Component wrapper for SEO and a nested Client Component for data-driven UI.
* **URL params:**
  * `q` – search term (optional)
  * `page` – 1-based integer (default `1`)
  * `pageSize` – integer (default `20`, max `100`; optional as future enhancement)
  * `sort` – `'created_at.asc' | 'created_at.desc' | 'updated_at.asc' | 'updated_at.desc' | 'name.asc' | 'name.desc'` (default `updated_at.desc`)
* **Examples:**
  * `/playlists` → first page, default sort
  * `/playlists?q=chill&page=2&sort=name.asc` → filtered by name, page 2, ascending by name

## 3. Component Structure
```
PlaylistsPage (Server component)
└─ PlaylistsClient (Client component)
   ├─ HeaderBar
   │   ├─ Title
   │   └─ NewPlaylistButton ➜ NewPlaylistDialog
   ├─ ControlsBar
   │   ├─ SearchInput
   │   └─ SortSelect
   ├─ PlaylistsTable
   │   ├─ PlaylistRow (×N)
   │   └─ EmptyState
   ├─ Pagination
   └─ ToastProvider (shadcn/ui)
```

## 4. Component Details
### 4.1 PlaylistsPage
* **Purpose:** Wrapper Server Component that parses URL params, passes them as props to `PlaylistsClient`, and handles `<Suspense>` for streaming.
* **Children:** `PlaylistsClient`
* **Props:** `{ searchParams: { q?: string; page?: string; sort?: string } }`

### 4.2 PlaylistsClient
* **Purpose:** Client-side logic and rendering; holds local state that syncs with URL.
* **Key elements:** Uses `usePlaylists()` hook, renders header, controls, table, pagination, toast, and dialog.
* **Events:**
  * `onSearchChange(term)` – debounce 300 ms, update URL (replace) resetting page=1
  * `onSortChange(sort)` – update URL (replace)
  * `onPageChange(page)` – push URL with new page
  * `onCreateSuccess(playlist)` – push to `/playlists/{id}` and toast success
* **Validation:** none (delegated to children)
* **Props:** Parsed params from parent

### 4.3 HeaderBar
* **Purpose:** Sticky header with page title and CTA.
* **Elements:** `<h1>Playlists</h1>`, `<Button variant="default">New playlist</Button>`
* **Events:** Click opens `NewPlaylistDialog`

### 4.4 ControlsBar
* **Purpose:** Search + sort controls.
* **Elements:**
  * `SearchInput` (shadcn `input` + `search` icon)
  * `SortSelect` (shadcn `select`) – options derived from allowed sort values
* **Validation:** None; sort value validated in hook before API call.

### 4.5 PlaylistsTable
* **Purpose:** Display list of playlists in table form (`Card` grid alternative on mobile).
* **Elements:** `<Table>` with columns: Name, Tracks, Updated
* **Children:** Multiple `PlaylistRow`s or `EmptyState` if no data.
* **Events:** Row click → router push to `/playlists/{id}`.

### 4.6 PlaylistRow
* **Props:** `PlaylistListItemDto`
* **Events:** Click open detail view.

### 4.7 EmptyState
* **Purpose:** Friendly message when no playlists match filter.

### 4.8 Pagination
* **Purpose:** Page navigation with `Previous` and `Next` plus page numbers.
* **Props:** `{ page: number; total: number; pageSize: number }`
* **Events:** `onPageChange`

### 4.9 NewPlaylistDialog
* **Purpose:** Modal with Tabs (Manual / AI) to create a playlist.
* **Elements:**
  * `Tabs` (`manual`, `ai`)
  * Manual tab → `ManualForm`
  * AI tab → `AIPromptForm` + `AISuggestionsPreview`
* **Validation:** Name 1-100 chars (manual), AI prompt non-empty <= 300 chars.
* **Errors:** 409 duplicate, 422 limit exceeded → toast & inline.

### 4.10 ManualForm
* **Fields:** `name` (required), `description` (optional)
* **Events:** `onSubmit` → POST `/api/playlists`

### 4.11 AIPromptForm
* **Fields:** `prompt` (textarea)
* **Events:**
  * `onGenerate` → POST `/api/ai/generate`
  * After preview OK: `onCreate` → POST `/api/playlists` + `/api/playlists/{id}/tracks`
* **Error handling:** AI quota 422 → surface dialog w/ link to billing.

### 4.12 AISuggestionsPreview
* **Elements:** Skeleton list of suggested tracks; show count and summary; allow confirm.

### 4.13 ToastProvider
* **Purpose:** Central toast system for success & error messages.

## 5. Types
| Name | Description |
|------|-------------|
| `ViewQueryParams` | `{ q?: string; page: number; sort: SortOption }` |
| `SortOption` | Union of allowed sort strings |
| `NewPlaylistFormValues` | `{ name: string; description?: string | null }` |
| `AIGenerateFormValues` | `{ prompt: string }` |
| `AISuggestion` | Re-export `AISuggestedTrack` |
| `PlaylistsListResponse` | Alias for `PlaylistListDto` |

All API DTOs are imported from `@/types` to avoid duplication.

## 6. State Management
* **`usePlaylists(params)`** – Custom hook wrapping `useSWR` (or React Query) that fetches playlists list using params, returns `{data, isLoading, error, mutate}`.
* **`useUrlSync()`** – Custom hook that exposes `setQueryParam` util and listens to router query changes.
* Dialog internal forms use `react-hook-form` with `zodResolver` for validation.

## 7. API Integration
| Component / Hook | Method & Endpoint | Request Type | Response Type |
|------------------|-------------------|--------------|---------------|
| `usePlaylists` | GET `/api/playlists` | `null` (query string only) | `PlaylistListDto` |
| `ManualForm` | POST `/api/playlists` | `CreatePlaylistCommand` | `PlaylistDto` |
| `AIPromptForm` (generate) | POST `/api/ai/generate` | `GeneratePlaylistCommand` | `GeneratePlaylistResponseDto` |
| `AIPromptForm` (final create) | POST `/api/playlists` then POST `/api/playlists/{id}/tracks` | see above | `AddTracksResponseDto` |

## 8. User Interactions
1. **Search:** User types → debounce → fetch → table updates.
2. **Sort:** Select option → fetch new list.
3. **Pagination:** Click page → fetch page.
4. **New Playlist (Manual):** Open modal → fill form → submit → success toast → navigate to detail.
5. **New Playlist (AI):** Open modal → enter prompt → generate → preview → confirm → success.
6. **Row click:** Navigate to playlist detail.

## 9. Conditions & Validation
* **Name:** 1-100 chars; trimmed; unique per user (server enforced).
* **Description:** ≤255 chars.
* **Prompt:** 1-300 chars; reject empty.
* **Query params:** `page ≥1`, `sort` in allowed list; fallback to defaults.

## 10. Error Handling
| Scenario | UI Reaction |
|----------|-------------|
| 400 Validation | Inline form errors + toast |
| 401 Unauthorized | Redirect to sign-in |
| 404 Not found (row click) | Toast + navigate back |
| 409 Conflict (duplicate) | Inline name error in dialog |
| 422 Limit exceeded | Dialog error & link to upgrade |
| Network / 5xx | Toast “Something went wrong” |
| AI timeout | Toast + allow retry |

## 11. Implementation Steps
1. **Route setup:** Add `src/app/(auth)/playlists/page.tsx` Server Component.
2. **Create `PlaylistsClient.tsx`.**
3. **Implement `usePlaylists` hook` + Zod schema for query params.
4. **Build UI components** with shadcn/ui (`Input`, `Select`, `Table`, `Dialog`, `Tabs`, `Toast`).
5. **Implement search & sort URL sync (useRouter).**
6. **Add pagination component util.**
7. **Create `NewPlaylistDialog` with Manual & AI tabs.**
8. **Integrate API calls with `supabase-js` session cookie forwarding.**
9. **Add skeleton loaders & empty states.**
10. **Write unit tests for hooks & components (Jest + React Testing Library).**
11. **Run lint & type checks; ensure accessibility (labels, roles, focus trap).**
12. **QA flow: search, pagination, duplicate name, limit exceeded, AI quota, network error.**
