# Plan implementacji widoku Playlist Detail

## 1. Przegląd

Widok Playlist Detail umożliwia użytkownikowi kompletne zarządzanie playlistą: edycję metadanych (nazwa, opis), reorderkowanie oraz usuwanie trackow, dodawanie nowych trackow poprzez wyszukiwanie na Spotify, oraz eksport playlisty do konta Spotify użytkownika. Widok jest kluczowy dla realizacjiUser Stories US-003 i US-004. Obsługuje pełny cykl edycji playlisty z interfejsem drag-and-drop, modalami do dodawania trackow i eksportu, oraz potwierdzeniami dla operacji destrukcyjnych.

## 2. Routing widoku

- **Ścieżka:** `/playlists/[id]` (dynamiczny segment ID playlisty)
- **Server Component:** `src/app/playlists/[id]/page.tsx` (fetch playlist meta, server-side auth check)
- **Client Component:** `src/components/playlists/PlaylistDetailClient.tsx` (główny komponent zarządzający stanem i interakcjami)
- **Layout:** Wspólny layout z `AppHeader` (topbar) zawierający nawigację oraz link "Back to Playlists"

## 3. Struktura komponentów

```
PlaylistDetailPage (Server Component)
  └── [data fetch + layout wrapper]
      └── PlaylistDetailClient (Client Component, główny orchestrator)
          ├── PlaylistHeader
          │   ├── Playlist name display
          │   ├── Track count badge (1..100)
          │   └── Export to Spotify button
          │
          ├── Layout Grid (responsive: desktop 2-column, mobile 1-column stack)
          │   ├── Left Column (Desktop) / Top (Mobile)
          │   │   └── PlaylistMetaSection
          │   │       ├── Playlist metadata display (name, description)
          │   │       ├── Add Tracks button → opens AddTracksDialog
          │   │       ├── Delete Playlist button → opens ConfirmDialog
          │   │       └── Badges (private, export date if available)
          │   │
          │   └── Right Column (Desktop) / Bottom (Mobile)
          │       ├── ReorderableTrackList (with @dnd-kit)
          │       │   ├── DnD Context with sensors (PointerSensor, KeyboardSensor)
          │       │   ├── SortableContext (manages items)
          │       │   ├── Individual track items (sortable, draggable)
          │       │   │   └── Track card (position, artist, title, album, remove button)
          │       │   └── Empty state placeholder
          │       │
          │       └── UnsavedChangesBar (conditional, shows only if positions modified)
          │           └── "Save order" button
          │
          ├── Modals (portaled, triggered by state)
          │   ├── AddTracksDialog
          │   │   ├── Form (artist input, title input with debounce)
          │   │   ├── Search results (≤10 items with skeleton loading)
          │   │   └── Add buttons per result
          │   │
          │   ├── ExportDialog
          │   │   ├── Spotify link status badge
          │   │   ├── Optional description textarea
          │   │   └── Export button
          │   │
          │   └── ConfirmDialog (generic, reused)
          │       └── Confirmation message + actions
          │
          └── Loading & Error States
              ├── Skeleton loaders (header, meta, track list)
              ├── Error alerts (404, 401, 409, 422, 429, 504, 502)
              └── Toast notifications (success, error)
```

## 4. Szczegóły komponentów

### PlaylistDetailPage (Server Component)

**Opis:** Strona na poziomie serwera obsługująca routing i prefetch danych. Weryfikuje autentykację, fetches playlistę, i renderuje layout z client componentem.

**Główne elementy:**
- Layout wrapper z AppHeader (topbar + back link)
- PlaylistDetailClient component zawinięty w error boundary
- Suspense boundary z fallback skeleton

**Obsługiwane interakcje:**
- Ładowanie strony → fetch playlisty
- Error boundary catch 404/401 errors

**Obsługiwana walidacja:**
- 401 UNAUTHORIZED → redirect do /auth z returnTo
- 404 NOT_FOUND → error page "Playlist not found"

**Typy:**
- PlaylistDto
- PlaylistTrackListDto
- ErrorResponse

**Propsy:** Brak (routing-based component)

---

### PlaylistDetailClient (Main Client Component)

**Opis:** Główny orchestrator komponentu. Zarządza stanem playlisty (meta + tracks), detekcją zmian (unsaved positions), oraz otwieraniem/zamykaniem modali. Koordinuje wszystkie mutacje API i efekty uboczne.

**Główne elementy:**
- PlaylistHeader (display name, export button, count)
- Responsive layout grid (left/right columns)
- PlaylistMetaSection (left column)
- ReorderableTrackList (right column)
- UnsavedChangesBar (conditional)
- Modals: AddTracksDialog, ExportDialog, ConfirmDialog
- Error/loading states (toasts, alerts)

**Obsługiwane interakcje:**
- Drag-drop na tracki → detect position changes
- "Save order" button → PUT /api/playlists/{id}/tracks/reorder
- "Add Tracks" button → open AddTracksDialog
- "Remove track" button → open ConfirmDialog → DELETE /api/playlists/{id}/tracks/{position}
- "Delete Playlist" button → open ConfirmDialog → DELETE /api/playlists/{id}
- "Export to Spotify" button → open ExportDialog → handle OAuth + export flow
- Edit metadata → PATCH /api/playlists/{id}

**Obsługiwana walidacja:**
- Playlist exists (404 NOT_FOUND)
- User is owner (401 UNAUTHORIZED)
- Track count ≤100 (422 on POST /tracks)
- No duplicate trackuri (409 on POST /tracks)
- Spotify linked (403 on POST /export)
- Playlist not empty (409 on POST /export)
- Exact match on reorder (422)

**Typy:**
- PlaylistDto
- PlaylistTrackListDto
- PlaylistDetailViewModel (custom state type)
- UpdatePlaylistCommand
- AddTracksCommand
- ReorderTracksExplicitCommand
- ExportToSpotifyCommand
- ErrorResponse

**Propsy:** Brak (wraps route [id] segment)

---

### PlaylistHeader

**Opis:** Header sekcja widoku. Wyświetla nazwę playlisty, liczbę trackow (badge 1-100), oraz przycisk "Export to Spotify".

**Główne elementy:**
- h1 lub h2 (playlist name)
- Badge component (track count, styled differently if ≥90)
- Button "Export to Spotify" (variant="default")
- Skeleton loader podczas ładowania

**Obsługiwane interakcje:**
- onClick "Export to Spotify" → setShowExportDialog(true)

**Obsługiwana walidacja:**
- Display count as "X trackow / 100"
- Disable export button if count === 0 (prepares UX for 409 EMPTY_PLAYLIST)

**Typy:**
- playlist: PlaylistDto
- trackCount: number
- onExportClick: () => void

**Propsy:**
```typescript
{
  playlistName: string
  trackCount: number
  onExportClick: () => void
  isLoadingTracks: boolean
}
```

---

### PlaylistMetaSection

**Opis:** Lewa kolumna (desktop) / top (mobile). Wyświetla i umożliwia edycję metadanych playlisty (nazwa, opis). Zawiera akcje (Add Tracks, Delete). Może zawierać badges (private, export info).

**Główne elementy:**
- Meta display (name, description) lub editable form
- "Add Tracks" button
- "Delete Playlist" button (styled as destructive)
- Badges (private indicator)
- Separator line
- Edit/Save toggle or inline editing (optional per MVP scope)

**Obsługiwane interakcje:**
- Click "Add Tracks" → emit onAddTracksClick()
- Click "Delete Playlist" → emit onDeletePlaylistClick()
- Edit mode toggle (optional): Click edit icon → Show form inputs → Click save → emit onUpdatePlaylist()

**Obsługiwana walidacja:**
- Name required, non-empty, max length (assume 120)
- Description optional, max length (assume 500)
- 409 CONFLICT if duplicate name → show error toast

**Typy:**
- PlaylistDto
- UpdatePlaylistCommand (if editing enabled)
- ErrorResponse

**Propsy:**
```typescript
{
  playlist: PlaylistDto
  isLoading: boolean
  onAddTracksClick: () => void
  onDeletePlaylistClick: () => void
  onUpdatePlaylist?: (command: UpdatePlaylistCommand) => Promise<void>
}
```

---

### ReorderableTrackList

**Opis:** Drag-and-drop sortable track list z @dnd-kit. Obsługuje keyboard navigation (arrow keys, Enter do reorder). Wyświetla tracki z pozycją, metadata (artist, title, album), oraz remove buttons.

**Główne elementy:**
- DndContext (closestCenter strategy, PointerSensor + KeyboardSensor)
- SortableContext (items: track URIs, strategy: verticalListSortingStrategy)
- Sortable track items (useSortable hook per item)
- Track card (position badge, artist/title/album, remove button with icon)
- Empty state placeholder (if 0 tracks)
- Loading skeleton (if isLoading)
- ScrollArea wrapper (for mobile responsiveness)

**Obsługiwane interakcje:**
- Drag track → reorder locally (detect position changes)
- Drop track → mark as modified, show UnsavedChangesBar
- Arrow keys (up/down) → move item
- Enter → confirm move (if focus on item)
- Click remove button → emit onRemoveTrack(position)
- Double-click track → could open edit modal (optional, scope cut if time)

**Obsługiwana walidacja:**
- Position validity (1..100)
- Prevent invalid drops (handled by @dnd-kit)
- Keyboard support accessibility

**Typy:**
- PlaylistTrackDto[]
- PlaylistDetailViewModel (for unsaved changes detection)

**Propsy:**
```typescript
{
  tracks: PlaylistTrackDto[]
  isLoading: boolean
  modifiedPositions: Map<string, number> | null
  onTrackRemove: (position: number, trackUri: string) => void
  onPositionChange: (reorderedTracks: PlaylistTrackDto[]) => void
  onHasChanges: (modified: boolean) => void
}
```

---

### UnsavedChangesBar

**Opis:** Alert bar pokazujący się gdy użytkownik zmienił porządek trackow ale nie zapisał. Zawiera komunikat i przycisk "Save order".

**Główne elementy:**
- Alert component (variant="warning" lub "info")
- Text: "Zmiany niezapisane - zmieniono porządek trackow"
- Button "Zapisz porządek" (variant="default")
- Button "Anuluj" lub "Cofnij" (variant="ghost", optional)
- Optional: Skeleton loader podczas saving

**Obsługiwane interakcje:**
- Click "Save order" → emit onSaveOrder()
- Click "Discard" (optional) → emit onDiscardChanges()

**Obsługiwana walidacja:**
- Only show if modifiedPositions.size > 0
- Disable save button during saving (isSaving=true)

**Typy:**
- Map<string, number> (trackUri -> new position)

**Propsy:**
```typescript
{
  isVisible: boolean
  isSaving: boolean
  onSaveOrder: () => Promise<void>
  onDiscardChanges?: () => void
}
```

---

### AddTracksDialog

**Opis:** Modal do dodawania trackow. Zawiera formularz z dwoma input polami (artist, title) z debounce 300-400ms. Wyświetla wyniki wyszukiwania (≤10), loading skeleton, no results state, i inline errory (409 DUPLICATE). Każdy wynik ma przycisk "Add".

**Główne elementy:**
- Dialog wrapper (shadcn/ui)
- DialogHeader z DialogTitle
- DialogContent zawierająca:
  - Form (artist input required, title input required, min 2 chars)
  - Validation messages below inputs
  - Search results area:
    - Loading skeleton (3-5 rows)
    - Results list (map trackow)
    - "No results" message
    - Per-result card: artist/title/album + "Add" button
  - Error alert (if error)
  - Optional: Clear button to reset search
- DialogFooter z Close/Cancel button

**Obsługiwane interakcje:**
- Type in artist/title → debounce 300-400ms → trigger search
- Click "Add" button → POST /api/playlists/{id}/tracks → handle 409 DUPLICATE inline
- Click "Close" → close dialog
- ESC key → close dialog

**Obsługiwana walidacja:**
- Artist required, min 2 chars (show error if < 2)
- Title required (optional per API, but UI says required), min 2 chars
- Debounce: no request until both fields meet min length
- 409 DUPLICATE: show inline error below result item, don't close dialog
- 422 PLAYLIST_MAX_ITEMS_EXCEEDED: show error alert "Playlist limit reached"
- 429 RATE_LIMITED: show error "Try again in X seconds"
- 504 TIMEOUT: show error "Request timed out, try again"
- 502 UPSTREAM_ERROR: show error "Spotify is unavailable"

**Typy:**
- SpotifySearchResultDto[]
- SearchResultsState (custom ViewModel)
- AddTracksCommand
- ErrorResponse

**Propsy:**
```typescript
{
  playlistId: string
  isOpen: boolean
  onOpenChange: (open: boolean) => void
  onTrackAdded: () => Promise<void> // triggers full refetch
  existingTrackUris: string[] // to check for duplicates
}
```

---

### ExportDialog

**Opis:** Modal do eksportu playlisty na Spotify. Wykonuje preflight check GET /api/spotify/status. Jeśli linked=false, pokazuje przycisk do linku Spotify (redirect do /api/spotify/login). Jeśli linked=true, pokazuje opcjonalne pole textarea do opisu, oraz przycisk Export.

**Główne elementy:**
- Dialog wrapper
- DialogHeader z DialogTitle
- DialogContent zawierająca:
  - Spotify status badge (linked/not linked, expiry date if available)
  - Note text: "Re-export creates a new copy"
  - Conditional content based on linked status:
    - If NOT linked: Alert + Link button → redirect to /api/spotify/login
    - If linked: Optional description textarea + Export button
  - Error alert (if error)
- DialogFooter z Close/Cancel button

**Obsługiwane interakcje:**
- Modal opens → GET /api/spotify/status (preflight)
- If linked=false: Click "Link Spotify" → redirect to /api/spotify/login → handle OAuth callback
- After OAuth callback: User returns to page, should resume export or re-open dialog
- If linked=true: User can type optional description → Click "Export" → POST /api/playlists/{id}/export/spotify
- On success: Show success toast with Spotify URL link, close dialog
- Click "Close" → close dialog
- ESC key → close dialog

**Obsługiwana walidacja:**
- 403 SPOTIFY_NOT_LINKED: show alert + link button
- 409 EMPTY_PLAYLIST: show error "Playlist must have at least 1 track"
- 429 RATE_LIMITED: show error "Try again in X seconds"
- 504 TIMEOUT: show error "Export timed out, try again"
- 502 UPSTREAM_ERROR: show error "Spotify is unavailable"
- Description optional, max length ~1000

**Typy:**
- SpotifyStatusDto
- ExportToSpotifyCommand
- ExportToSpotifyResponseDto
- ErrorResponse

**Propsy:**
```typescript
{
  playlistId: string
  playlistName: string
  trackCount: number
  isOpen: boolean
  onOpenChange: (open: boolean) => void
  onExportSuccess: () => void
}
```

---

### ConfirmDialog

**Opis:** Generyczny modal confirmacji dla operacji destrukcyjnych (delete playlist, remove track). Zawiera komunikat potwierdzenia, "Cancel" i "Confirm/Delete" buttons.

**Główne elementy:**
- Dialog wrapper
- DialogHeader z DialogTitle
- DialogContent zawierająca komunikat
- DialogFooter z:
  - "Cancel" button (variant="ghost")
  - "Delete" button (variant="destructive")

**Obsługiwane interakcje:**
- Click "Cancel" → close dialog
- Click "Delete" → emit onConfirm() → close dialog
- ESC key → close dialog (cancel)

**Obsługiwana walidacja:**
- Brak walidacji (confirmation only)

**Typy:**
- Brak specjalistycznych typów

**Propsy:**
```typescript
{
  isOpen: boolean
  title: string
  description: string
  onOpenChange: (open: boolean) => void
  onConfirm: () => Promise<void>
  isLoading?: boolean
  confirmText?: string
}
```

---

## 5. Typy

### PlaylistDetailViewModel (Custom ViewModel)

Główny state model dla PlaylistDetailClient komponentu:

```typescript
interface PlaylistDetailViewModel {
  // Data
  playlistId: string
  playlist: PlaylistDto | null
  tracks: PlaylistTrackDto[]
  
  // Loading & Error
  isLoadingPlaylist: boolean
  isLoadingTracks: boolean
  isSavingOrder: boolean
  error: ErrorResponse | null
  
  // Local state changes
  modifiedPositions: Map<string, number> | null // trackUri -> new position
  
  // UI state - modals
  showAddTracksDialog: boolean
  showExportDialog: boolean
  showDeleteConfirm: boolean
  selectedTrackForRemoval: {
    position: number
    trackUri: string
  } | null
  
  // UI state - edit metadata (optional per MVP)
  isEditingMetadata: boolean
  editingName: string | null
  editingDescription: string | null
}
```

### SearchResultsState (Custom ViewModel)

State dla AddTracksDialog:

```typescript
interface SearchResultsState {
  artist: string
  title: string
  results: SpotifySearchResultDto[]
  isLoading: boolean
  error: ErrorResponse | null
  duplicateErrors: Map<string, string> // trackId -> error message
  debounceTimer: ReturnType<typeof setTimeout> | null
  abortController: AbortController | null
}
```

### ExportState (Custom ViewModel)

State dla ExportDialog:

```typescript
interface ExportState {
  spotifyStatus: SpotifyStatusDto | null
  statusError: ErrorResponse | null
  isCheckingStatus: boolean
  
  description: string
  isExporting: boolean
  exportError: ErrorResponse | null
  
  exportResult: ExportToSpotifyResponseDto | null
}
```

### UpdatePlaylistCommand (jeśli editing enabled)

```typescript
// z types.ts - już istnieje
interface UpdatePlaylistCommand {
  name?: string
  description?: string | null
}
```

## 6. Zarządzanie stanem

### Główny state management (PlaylistDetailClient)

Używamy `useState` hooki dla lokalnego stanu, w połączeniu z custom hookami API:

1. **usePlaylist(playlistId):** Custom hook zarządzający playlistą + trackami
   - State: playlist, tracks, loading, error
   - Mutacje: updatePlaylist, addTracks, removeTrack, reorderTracks, deletePlaylist, exportToSpotify
   - Automatyczne refetch po mutacjach

2. **useSpotifySearch(artist, title):** Custom hook dla debounced Spotify search
   - State: results, isLoading, error
   - Debounce: 300-400ms
   - Anulowanie poprzednich requestow (AbortController)

3. **Local state useState hooks:**
   - showAddTracksDialog: boolean
   - showExportDialog: boolean
   - showDeleteConfirm: boolean
   - selectedTrackForRemoval: { position, trackUri } | null
   - modifiedPositions: Map<string, number> | null
   - isEditingMetadata: boolean (optional)

4. **useEffect hooks:**
   - Load playlist data on component mount
   - Detect position changes (compare current order vs original)
   - Handle OAuth callback (check for action=export in URL params)
   - Resume export if needed

### Unsaved Changes Detection

```typescript
const [originalOrder, setOriginalOrder] = useState<PlaylistTrackDto[]>([])
const [modifiedPositions, setModifiedPositions] = useState<Map<string, number> | null>(null)

const handleDragEnd = (event: DragEndEvent) => {
  const newOrder = /* reorder tracks based on event */
  
  // Compare new order vs original
  const hasChanges = !arraysEqual(newOrder, originalOrder)
  setModifiedPositions(hasChanges ? new Map(...) : null)
}

const handleSaveOrder = async () => {
  const reorderCommand: ReorderTracksExplicitCommand = {
    ordered: modifiedPositions.entries().map(...) // build command
  }
  await usePlaylist.reorderTracks(playlistId, reorderCommand)
  setModifiedPositions(null)
}
```

### Error boundary

```typescript
<ErrorBoundary fallback={<ErrorPage />}>
  <PlaylistDetailClient {...props} />
</ErrorBoundary>
```

## 7. Integracja API

### Wymagane API endpoints

1. **GET /api/playlists/{id}** - Fetch playlist meta
   - Request: playlistId (z URL params)
   - Response: PlaylistDto
   - Error: 404 NOT_FOUND, 401 UNAUTHORIZED

2. **GET /api/playlists/{id}/tracks** - Fetch tracks
   - Request: playlistId, page=1, pageSize=100
   - Response: PlaylistTrackListDto
   - Error: 404, 401

3. **PUT /api/playlists/{id}/tracks/reorder** - Save new order
   - Request: ReorderTracksExplicitCommand
     ```json
     {
       "ordered": [
         { "position": 1, "trackUri": "spotify:track:..." },
         ...
       ]
     }
     ```
   - Response: ReorderTracksResponseDto
   - Error: 400, 401, 404, 422 MISSING_OR_EXTRA_ITEMS

4. **DELETE /api/playlists/{id}/tracks/{position}** - Remove track
   - Request: playlistId, position
   - Response: 204 No Content
   - Error: 401, 404

5. **POST /api/playlists/{id}/tracks** - Add tracks
   - Request: AddTracksCommand
     ```json
     {
       "tracks": [
         { "trackUri": "...", "artist": "...", "title": "...", "album": "..." }
       ],
       "insertAfterPosition": 0
     }
     ```
   - Response: AddTracksResponseDto
   - Error: 400, 401, 404, 409 DUPLICATE_TRACK, 422 PLAYLIST_MAX_ITEMS_EXCEEDED

6. **GET /api/spotify/search** - Search Spotify
   - Request: artist (required), title (optional), limit=10, market (optional)
   - Response: SpotifySearchDto
   - Error: 400, 401, 429 RATE_LIMITED, 504 TIMEOUT, 502 UPSTREAM_ERROR

7. **GET /api/spotify/status** - Check Spotify link
   - Request: (no params)
   - Response: SpotifyStatusDto
   - Error: 401

8. **POST /api/playlists/{id}/export/spotify** - Export to Spotify
   - Request: ExportToSpotifyCommand
     ```json
     { "description": "string or null" }
     ```
   - Response: ExportToSpotifyResponseDto
   - Error: 400, 401, 403 SPOTIFY_NOT_LINKED, 404, 409 EMPTY_PLAYLIST, 429, 504, 502

9. **PATCH /api/playlists/{id}** - Update playlist meta (if enabled)
   - Request: UpdatePlaylistCommand
   - Response: PlaylistDto
   - Error: 400, 401, 404, 409 CONFLICT

10. **DELETE /api/playlists/{id}** - Delete playlist
    - Request: playlistId
    - Response: 204 No Content
    - Error: 401, 404

### Custom Hooki

#### usePlaylist(playlistId: string)

```typescript
function usePlaylist(playlistId: string) {
  const [playlist, setPlaylist] = useState<PlaylistDto | null>(null)
  const [tracks, setTracks] = useState<PlaylistTrackDto[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<ErrorResponse | null>(null)
  
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [playlistRes, tracksRes] = await Promise.all([
          fetch(`/api/playlists/${playlistId}`),
          fetch(`/api/playlists/${playlistId}/tracks?pageSize=100`)
        ])
        if (!playlistRes.ok || !tracksRes.ok) throw new Error(...)
        setPlaylist(await playlistRes.json())
        setTracks((await tracksRes.json()).items)
      } catch (err) {
        setError(err)
      } finally {
        setIsLoading(false)
      }
    }
    fetchData()
  }, [playlistId])
  
  const reorderTracks = async (command: ReorderTracksExplicitCommand) => {
    setIsSaving(true)
    try {
      const res = await fetch(`/api/playlists/${playlistId}/tracks/reorder`, {
        method: 'PUT',
        body: JSON.stringify(command)
      })
      if (!res.ok) throw new Error(await res.json())
      // Full refetch
      const tracksRes = await fetch(`/api/playlists/${playlistId}/tracks?pageSize=100`)
      setTracks((await tracksRes.json()).items)
    } finally {
      setIsSaving(false)
    }
  }
  
  // Podobnie dla addTracks, removeTrack, deletePlaylist, exportToSpotify
  
  return { playlist, tracks, isLoading, isSaving, error, reorderTracks, ... }
}
```

#### useSpotifySearch(artist: string, title: string)

```typescript
function useSpotifySearch(artist: string, title: string) {
  const [results, setResults] = useState<SpotifySearchResultDto[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<ErrorResponse | null>(null)
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout>>(null)
  const abortControllerRef = useRef<AbortController | null>(null)
  
  useEffect(() => {
    // Clear timer
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current)
    }
    
    // Validate min length
    if (!artist || artist.length < 2 || (title && title.length < 2)) {
      setResults([])
      return
    }
    
    // Debounce search
    debounceTimerRef.current = setTimeout(async () => {
      // Cancel previous request
      if (abortControllerRef.current) {
        abortControllerRef.current.abort()
      }
      abortControllerRef.current = new AbortController()
      
      setIsLoading(true)
      try {
        const params = new URLSearchParams({ artist, limit: '10' })
        if (title) params.append('title', title)
        
        const res = await fetch(`/api/spotify/search?${params}`, {
          signal: abortControllerRef.current.signal
        })
        if (!res.ok) throw new Error(await res.json())
        setResults((await res.json()).items)
        setError(null)
      } catch (err) {
        if (err.name !== 'AbortError') {
          setError(err)
        }
      } finally {
        setIsLoading(false)
      }
    }, 350) // 350ms debounce
    
    return () => {
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current)
      if (abortControllerRef.current) abortControllerRef.current.abort()
    }
  }, [artist, title])
  
  return { results, isLoading, error }
}
```

## 8. Interakcje użytkownika

### Interakcja 1: Load playlisty
1. Użytkownik naviguje na `/playlists/[id]`
2. Server component fetches playlistę
3. Client component renderuje skeleton loading state
4. Załadowane dane wyświetlane w pełnym widoku

### Interakcja 2: Reorder trackow
1. Użytkownik drags track w liście (lub uses keyboard arrow keys)
2. @dnd-kit obsługuje drag event
3. Component detektuje zmianę pozycji
4. UnsavedChangesBar pokazuje się
5. Użytkownik clicks "Save order"
6. PUT /api/playlists/{id}/tracks/reorder (timeout: 60s)
7. Success: full refetch tracks, hide bar, show success toast
8. Error: show error toast/alert, keep bar visible

### Interakcja 3: Remove track
1. Użytkownik clicks remove/delete icon na track row
2. ConfirmDialog modal opens
3. Użytkownik confirms delete
4. DELETE /api/playlists/{id}/tracks/{position}
5. Success: full refetch tracks, show success toast, close modal
6. Error: show error alert/toast, keep modal open for retry

### Interakcja 4: Add tracks
1. Użytkownik clicks "Add Tracks" button
2. AddTracksDialog modal opens
3. Użytkownik types artist name (min 2 chars)
4. Debounce 350ms
5. GET /api/spotify/search fires (timeout: 25s)
6. Results display (≤10)
7. Użytkownik clicks "Add" na wynik
8. POST /api/playlists/{id}/tracks
9. If 409 DUPLICATE: show inline error, don't close dialog
10. If success: full refetch tracks, show success toast, optionally close dialog (or allow multiple adds)
11. If 422 EXCEEDED: show error "Max 100 tracks reached"

### Interakcja 5: Edit metadata (optional per MVP)
1. Użytkownik clicks edit button na playlist meta
2. MetaSection enters edit mode (show form inputs)
3. Użytkownik modifies name/description
4. Clicks save
5. PATCH /api/playlists/{id} (timeout: 60s)
6. Success: update display, close edit mode, show toast
7. Error: show error, keep edit mode, allow retry

### Interakcja 6: Delete playlisty
1. Użytkownik clicks "Delete Playlist" button
2. ConfirmDialog opens
3. Użytkownik confirms
4. DELETE /api/playlists/{id}
5. Success: redirect to /playlists, show success toast
6. Error: show error alert, keep dialog open

### Interakcja 7: Export to Spotify
1. Użytkownik clicks "Export to Spotify" button
2. ExportDialog opens
3. GET /api/spotify/status (preflight)
4. If linked=false: show alert + "Link Spotify" button
   - User clicks link button
   - Redirect to GET /api/spotify/login (OAuth)
   - After OAuth callback: user redirected back (with returnTo param)
   - Option 1: Auto-resume export (check for action=export in URL)
   - Option 2: User manually re-opens export dialog (sees linked=true now)
5. If linked=true: show optional description textarea
   - User optionally types description
   - Clicks "Export"
   - POST /api/playlists/{id}/export/spotify (timeout: 60s)
   - Success: show success toast with Spotify URL link, close dialog
   - Error: show error alert, keep dialog open for retry
6. If error (429, 504, 502): show error message + retry button

## 9. Warunki i walidacja

### Warunki weryfikowane na poziomie komponentów

1. **Playlist existence**
   - Kompletny: zweryfikowany przez API (404)
   - Komponent: catch error, show error page

2. **Track count limit (100)**
   - Validacja: track count display, disable add button if ≥100
   - POST /api/playlists/{id}/tracks: 422 response
   - Komponent: show error toast

3. **Duplicate tracks**
   - Validacja: check incoming trackUri against existing list
   - POST /api/playlists/{id}/tracks: 409 response
   - Komponent: AddTracksDialog - show inline error below result

4. **Empty playlist on export**
   - Validacja: disable export button if trackCount === 0
   - POST /api/playlists/{id}/export/spotify: 409 response
   - Komponent: show error alert

5. **Spotify linked for export**
   - Validacja: preflight GET /api/spotify/status
   - POST /api/playlists/{id}/export/spotify: 403 response
   - Komponent: ExportDialog - show link button, handle OAuth

6. **Exact match on reorder**
   - Validacja: ordered[] musi mieć dokładnie ten sam set trackow (by trackUri)
   - PUT /api/playlists/{id}/tracks/reorder: 422 response
   - Komponent: catch error, show toast "Reorder failed, reloading..."

7. **Position validity (1-100)**
   - Validacja: @dnd-kit handles this internally
   - DELETE /api/playlists/{id}/tracks/{position}: 404 response
   - Komponent: catch error, full refetch, show toast

### Mapowanie warunków do komponentów

| Warunek | Komponent | Akcja |
|---------|-----------|-------|
| Playlist 404 | PlaylistDetailClient | Catch error, show error page |
| Track count ≥100 | PlaylistHeader, PlaylistMetaSection | Disable add button, show warning badge |
| Duplicate track | AddTracksDialog | Show inline 409 error |
| Empty on export | PlaylistHeader, ExportDialog | Disable export button, show error |
| Spotify not linked | ExportDialog | Show link button, handle OAuth |
| Reorder exact match | ReorderableTrackList | Validate command, catch 422 |
| Position invalid | ReorderableTrackList | Full refetch on error |

## 10. Obsługa błędów

### Błędy podczas ładowania playlisty

1. **404 NOT_FOUND**
   - Pokazanie: Error page "Playlist not found"
   - Akcja: Link do /playlists

2. **401 UNAUTHORIZED**
   - Pokazanie: Redirect middleware (handle in next.config)
   - Akcja: Redirect do /auth z returnTo=/playlists/[id]

### Błędy podczas reordera trackow

1. **422 MISSING_OR_EXTRA_ITEMS**
   - Pokazanie: Toast error "Nie udało się zmienić porządku, odświeżam..."
   - Akcja: Full refetch tracks, clear modifiedPositions

2. **404 / 401**
   - Pokazanie: Toast error + error alert
   - Akcja: Redirect lub retry

### Błędy podczas usuwania tracka

1. **404 NOT_FOUND**
   - Pokazanie: Toast error "Track not found"
   - Akcja: Full refetch, close confirm dialog

2. **401 UNAUTHORIZED**
   - Pokazanie: Redirect do /auth

### Błędy podczas dodawania trackow

1. **409 DUPLICATE_TRACK**
   - Pokazanie: Inline error message pod wynikiem w AddTracksDialog
   - Akcja: Highlight result, don't close dialog

2. **422 PLAYLIST_MAX_ITEMS_EXCEEDED**
   - Pokazanie: Alert error "Playlist limit reached (max 100 tracks)"
   - Akcja: Keep dialog open, let user add to other playlist

3. **429 RATE_LIMITED**
   - Pokazanie: Toast/alert "Try again in X seconds"
   - Akcja: Disable add button for X seconds, show retry button

4. **504 TIMEOUT**
   - Pokazanie: Toast error "Request timed out"
   - Akcja: Show retry button

5. **502 UPSTREAM_ERROR**
   - Pokazanie: Toast error "Spotify API unavailable"
   - Akcja: Show retry button

### Błędy podczas Spotify search

1. **400 VALIDATION_ERROR**
   - Pokazanie: Inline validation message (min 2 chars required)
   - Akcja: Prevent request

2. **429 RATE_LIMITED**
   - Pokazanie: Alert "Spotify rate limit - try again in X seconds"
   - Akcja: Show retry button, disable search temporarily

3. **504 TIMEOUT**
   - Pokazanie: Alert "Search timed out"
   - Akcja: Show retry button

4. **502 UPSTREAM_ERROR**
   - Pokazanie: Alert "Spotify API unavailable"
   - Akcja: Show retry button

### Błędy podczas eksportu do Spotify

1. **403 SPOTIFY_NOT_LINKED**
   - Pokazanie: Alert "Not linked to Spotify" + Link button
   - Akcja: Redirect do /api/spotify/login

2. **409 EMPTY_PLAYLIST**
   - Pokazanie: Alert "Playlist must have at least 1 track"
   - Akcja: Close dialog, prompt user to add tracks

3. **429 RATE_LIMITED**
   - Pokazanie: Toast "Try again in X seconds"
   - Akcja: Show retry button

4. **504 TIMEOUT**
   - Pokazanie: Toast "Export timed out"
   - Akcja: Show retry button

5. **502 UPSTREAM_ERROR**
   - Pokazanie: Toast "Spotify API unavailable"
   - Akcja: Show retry button

### Network / AbortError

1. **AbortError (user cancels request)**
   - Pokazanie: Brak (normal, silent)
   - Akcja: Ignore error

### Global error boundary

```typescript
<ErrorBoundary
  fallback={({ error, reset }) => (
    <div>
      <p>Something went wrong</p>
      <p>{error?.message}</p>
      <button onClick={reset}>Try again</button>
    </div>
  )}
>
  <PlaylistDetailClient {...props} />
</ErrorBoundary>
```

## 11. Kroki implementacji

### Faza 1: Setup i podstawowe komponenty (2-3h)

1. Utwórz `src/app/playlists/[id]/page.tsx` (Server Component)
   - Layout wrapper z AppHeader
   - Fetch playlist meta + verify auth
   - Render PlaylistDetailClient

2. Utwórz `src/components/playlists/PlaylistDetailClient.tsx` (Client Component)
   - Implement main state management
   - Use usePlaylist hook (stub inicjalnie)
   - Basic skeleton layout

3. Utwórz custom hook `src/lib/hooks/usePlaylist.ts`
   - Fetch playlist + tracks
   - Basic mutations (stubs)

4. Utwórz `src/components/playlists/PlaylistHeader.tsx`
   - Display name + count + export button
   - Basic skeleton

5. Utwórz `src/components/playlists/PlaylistMetaSection.tsx`
   - Display meta info
   - Add Tracks + Delete buttons (disable initially)

### Faza 2: Track list + DnD (2-3h)

6. Utwórz `src/components/playlists/ReorderableTrackList.tsx`
   - Install @dnd-kit libraries
   - Implement DnD context
   - Individual track items (sortable)
   - Implement keyboard support

7. Utwórz `src/components/playlists/UnsavedChangesBar.tsx`
   - Unsaved changes detection
   - Save order button

8. Implement reorderTracks mutation w usePlaylist
   - PUT /api/playlists/{id}/tracks/reorder
   - Full refetch

### Faza 3: Add Tracks modal (2-3h)

9. Utwórz custom hook `src/lib/hooks/useSpotifySearch.ts`
   - Debounce 350ms
   - AbortController dla cancellation
   - Handle errors

10. Utwórz `src/components/playlists/AddTracksDialog.tsx`
    - Form (artist, title inputs)
    - Search results display
    - Add buttons

11. Implement addTracks mutation w usePlaylist
    - POST /api/playlists/{id}/tracks
    - Handle 409 DUPLICATE inline
    - Full refetch

### Faza 4: Export modal + finalizacja (2-3h)

12. Utwórz `src/components/playlists/ExportDialog.tsx`
    - Preflight GET /api/spotify/status
    - Conditional UI (linked / not linked)
    - Handle OAuth redirect

13. Implement exportToSpotify mutation w usePlaylist
    - POST /api/playlists/{id}/export/spotify
    - Handle 403, 409 errors
    - Show success toast z Spotify URL

14. Utwórz `src/components/playlists/ConfirmDialog.tsx`
    - Generic confirmation modal

15. Implement delete mutations w usePlaylist
    - DELETE /api/playlists/{id}
    - DELETE /api/playlists/{id}/tracks/{position}

### Faza 5: Polish + error handling (1-2h)

16. Zaimplementuj comprehensive error handling
    - All error codes (400, 401, 403, 404, 409, 422, 429, 502, 504)
    - Toast + alert messages
    - Retry buttons

17. Add accessibility features
    - ARIA labels + descriptions
    - Focus management
    - Keyboard navigation

18. Responsive design polish
    - Desktop: 2-column layout
    - Mobile: 1-column stack
    - Tablet: intermediate layout

19. Loading states + skeletons
    - Track list skeleton
    - Search results skeleton
    - Export dialog skeleton

20. Testing
    - Manual testing all flows
    - Error scenarios
    - Edge cases (empty playlist, 100 tracks, duplicates, etc.)

### Faza 6: Optional scope cuts (time permitting)

21. Edit metadata (optional per MVP scope)
    - Implement edit mode toggle
    - PATCH /api/playlists/{id}

22. OAuth resume after linking Spotify
    - Check URL params for action=export
    - Auto-resume export modal

23. Analytics / logging (optional)
    - Track user interactions
    - Log errors

---

## Notatki implementacyjne

- **No optimistic updates:** PRD specifies full refetch after mutations, nie używaj optimistic updates.
- **Keyboard support:** @dnd-kit zapewnia support dla arrow keys, pamiętaj test to.
- **Timeouts:** Search 25s, export 60s - enforce w API routes, UI shows error message.
- **Debounce:** 300-400ms dla Spotify search, implement z AbortController dla cancellation.
- **Error messages:** User-friendly EN messages, detailed error codes w logs.
- **Accessibility:** Focus management w modals, ARIA labels, keyboard navigation.
- **Mobile responsiveness:** Test na diferentes screen sizes, verify DnD works on touch.
- **Performance:** Efficient re-renders, memoize components, avoid unnecessary effect runs.
