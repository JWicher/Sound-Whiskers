### AI Detective View — Refactor Plan 1

#### Zakres
- Katalog: `src/components` (z pominięciem `src/components/ui` — komponenty shadcn/ui)
- Cel: Identyfikacja plików o najwyższym LOC oraz propozycje refaktoryzacji zgodne z aktualnym stackiem: Next.js 14 (App Router), React 18, TypeScript, Tailwind + shadcn/ui, Supabase, Stripe, OpenRouter.

---

### TOP 5 plików wg liczby linii (LOC) — potencjalnie wysoka złożoność
1. `src/components/playlists/CreatePlaylistDialog.tsx` — ~509 linii
2. `src/components/playlists/PlaylistList.tsx` — ~493 linie
3. `src/components/playlists/PlaylistDetailClient.tsx` — ~287 linii
4. `src/components/playlists/ExportDialog.tsx` — ~242 linie
5. `src/components/playlists/AddTracksDialog.tsx` — ~237 linii

---

### Szczegółowe kierunki refaktoryzacji

#### 1) CreatePlaylistDialog.tsx (509)
Problemy:
- God-object: manual + AI flow + zarządzanie stanami + podgląd + walidacja + mutacje.
- Dwa formularze (React Hook Form) w jednym komponencie; zagnieżdżone Tabs i warunki.
- Sporo warunkowego renderowania, trudne testowanie.

Kierunki refaktoryzacji:
- Podział na komponenty (Compound Components / SoC):
  - `CreatePlaylistDialog` (kontener modal + routing kroków)
  - `ManualPlaylistForm`
  - `AIPlaylistForm`
  - `AIPlaylistPreview`
  - `PlaylistFormTabs`
- Custom hooks dla logiki biznesowej i efektów ubocznych:
  - `usePlaylistCreation()` — tworzenie playlist (manual), obsługa API i toasty
  - `useAIPlaylistGeneration()` — wywołanie AI, timeout, obsługa limitów/planów
  - `usePlaylistApproval()` — zatwierdzanie od AI do zapisu + dodanie tracków
- State machine (XState lub własna maszyna stanów):
  - Stany: `idle → generating → preview → approving → success | error`
- Strategy pattern dla trybów tworzenia:
  - `ManualPlaylistStrategy` i `AIPlaylistStrategy` implementujące wspólny interfejs

Efekty:
- Mniejszy komponent drzewa, łatwiejsze testy jednostkowe, czytelność przepływu, izolacja błędów i timeoutów AI.

---

#### 2) PlaylistList.tsx (493)
Problemy:
- Duplikacja UI/markup między zakładkami „active” i „deleted”.
- Złożona paginacja, sortowanie, debouncing i wywołania efektów w jednym miejscu.
- Mieszanie server-state (fetch) z UI bez warstwy cache.

Kierunki refaktoryzacji:
- Wydzielenie wspólnej zawartości zakładek:
  - `PlaylistTabContent` (DRY: filtry, lista, puste stany, grid, skeletony)
- Osobny komponent paginacji:
  - `Pagination` (przyciski, obliczenia stron, disabled, loading)
- Custom hook do zarządzania filtrami/URL:
  - `usePlaylistFilters()` — `page`, `search`, `sort`, `isDeleted`, `updateFilters()`
- Server-state via React Query/SWR:
  - `useQuery(['playlists', {search, sort, page, isDeleted}], ...)` z `keepPreviousData`

Efekty:
- Eliminacja duplikacji, przewidywalne odświeżanie, łatwiejsza nawigacja (deep link przez URL), płynniejsze UX (cache, prefetch, optimistic updates).

---

#### 3) PlaylistDetailClient.tsx (287)
Problemy:
- Wiele lokalnych stanów modalnych i operacji (add/export/delete/remove/reorder).
- Unsaved changes tracking + DnD + mutacje API w jednym komponencie.

Kierunki refaktoryzacji:
- Context dla zarządzania modalami:
  - `PlaylistModalsProvider` + `usePlaylistModals()`; centralny render modali w providerze
- Command pattern dla operacji na trackach (z opcjonalnym undo/redo):
  - `ReorderTracksCommand`, `RemoveTrackCommand`, `AddTrackCommand`
- Optimistic updates (React 18 `useOptimistic` lub React Query `optimisticUpdates`):
  - Natychmiastowa zmiana kolejności, cofanie po błędzie
- Podział layoutu:
  - `PlaylistDetailLayout`, `PlaylistSidebar`, `PlaylistTrackArea`

Efekty:
- Łatwiejsza kontrola stanów modali, rozszerzalność (kolejne akcje), spójne operacje i możliwość dodania „Undo”.

---

#### 4) ExportDialog.tsx (242)
Problemy:
- Dialog obsługuje sprawdzanie statusu Spotify, eksport, sukces, błędy — złożony warunkowy render.
- Powielanie logiki statusu Spotify (częściowo istnieje `useSpotifyStatus`).

Kierunki refaktoryzacji:
- Wizard pattern (multi-step): `check → configure → exporting → success`.
- Wykorzystanie `useSpotifyStatus` zamiast lokalnego fetch i stanów; uproszczenie efektów.
- `SpotifyStatusChecker` — mały komponent do walidacji/linkowania/relinkowania.
- `DialogErrorBoundary` — przechwytywanie błędów bez psucia UX dialogu.

Efekty:
- Jaśniejszy przepływ kroków, reuse status-checkera, mniej efektów ubocznych w jednym miejscu.

---

#### 5) AddTracksDialog.tsx (237)
Problemy:
- Debounce i wyścigi requestów (race conditions) przy szybkim wpisywaniu.
- Brak anulowania zapytań (AbortController); potencjalne opóźnione/stare wyniki.
- Duplikacja markup dla itemów listy wyników; brak wirtualizacji.

Kierunki refaktoryzacji:
- `useSearchWithAbort(query, delay)` — debounce + abort poprzednich requestów.
- `SearchResultItem` — ekstrakcja karty wyniku (Add/disabled/duplicate states).
- Wirtualizacja długich list (`@tanstack/react-virtual`) z przewidywaną wysokością itemu.
- Prosta maszyna stanów dla form/search: `idle → searching → results → adding → success|error`.

Efekty:
- Stabilna i responsywna wyszukiwarka, mniej migotania wyników, lepsza wydajność na długich listach.

---

### Wzorce i techniki (mapowanie na stack)
- React 18 + TS:
  - Custom Hooks (Separation of Concerns), Context, Compound Components
  - State Machine (XState lub lekka własna implementacja)
  - Optimistic UI (`useOptimistic` lub React Query optimistic updates)
  - Virtual Scrolling (`@tanstack/react-virtual`)
- Next.js (App Router):
  - Query params dla filtrów/paginacji (deep-linking), ewentualnie `useSearchParams`
  - API routes (Node runtime) już wykorzystywane — zostają bez zmian
- shadcn/ui + Tailwind:
  - Reuse istniejących prymitywów; komponenty kompozycyjne zamiast custom CSS
- Data (Supabase/Stripe/Spotify):
  - React Query/SWR dla server-state (cache, prefetch, retry), spójne błędy i toasty
  - Idempotentne akcje i uprzejme komunikaty błędów

---

### Quick Wins (małe kroki, duży efekt)
- Wydziel `Pagination` i `PlaylistTabContent` z `PlaylistList.tsx` (redukcja LOC ~30–40%).
- `SearchResultItem` + `useSearchWithAbort` w `AddTracksDialog.tsx` (likwidacja wyścigów requestów).
- Ujednolicenie statusu Spotify z `useSpotifyStatus` w `ExportDialog.tsx` (mniej efektów i stanów).

---

### Proponowana kolejność prac
1) PlaylistList: DRY (tab content + pagination) + wprowadzenie React Query.
2) AddTracksDialog: debounce z AbortController + ekstrakcja itemu.
3) ExportDialog: wizard steps + reuse `useSpotifyStatus`.
4) PlaylistDetailClient: modale do Context + optimistic reorder.
5) CreatePlaylistDialog: rozbicie na podkomponenty + maszyna stanów + strategie.

---

### Kryteria akceptacji (Definition of Done)
- Spadek LOC w TOP 5 o min. 25% (łącznie) bez utraty funkcji.
- Brak regresji e2e (Playwright) i testów jednostkowych (Vitest/RTL) — zielone.
- Stabilna wyszukiwarka (brak „przeskakiwania” wyników; requesty abortowane).
- Paginacja i sortowanie zachowują stan w URL; odświeżenie strony nie gubi widoku.
- Dialogi z jasnymi krokami i obsługą błędów (bez „martwych” stanów UI).


