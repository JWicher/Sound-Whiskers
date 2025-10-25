# Diagram API Endpointów - Playlist Management

```mermaid
graph TD
    A["🎵 PlaylistDetailClient<br/>(Frontend)"]
    
    A -->|GET /api/playlists/{id}| B["GET Playlist Meta<br/>route.ts"]
    A -->|PATCH /api/playlists/{id}| C["PATCH Update<br/>route.ts"]
    A -->|DELETE /api/playlists/{id}| D["DELETE Playlist<br/>route.ts"]
    A -->|GET /api/playlists/{id}/tracks?pageSize=100| E["GET Track List<br/>[Not yet implemented]"]
    A -->|PUT /api/playlists/{id}/tracks/reorder| F["PUT Reorder Tracks<br/>[Not yet implemented]"]
    A -->|DELETE /api/playlists/{id}/tracks/{pos}| G["DELETE Remove Track<br/>[Not yet implemented]"]
    A -->|POST /api/playlists/{id}/tracks| H["✅ POST Add Tracks<br/>NEW"]
    A -->|POST /api/playlists/{id}/export/spotify| I["✅ POST Export<br/>NEW"]
    A -->|GET /api/spotify/search| J["GET Search Spotify<br/>[Not yet implemented]"]
    A -->|GET /api/spotify/status| K["GET Spotify Status<br/>[Not yet implemented]"]
    
    B -->|Supabase RLS| L["🗄️ Playlists Table"]
    C -->|Supabase RLS| L
    D -->|Supabase RLS| L
    
    H -->|Supabase RLS| M["🗄️ Playlist Tracks<br/>Table"]
    H -->|Duplicate check| M
    H -->|Limit check| M
    
    I -->|Fetch tracks| M
    I -->|Get tokens| N["🗄️ Spotify Tokens<br/>Table"]
    I -->|Create playlist| O["🎵 Spotify API<br/>spotify-web-api-node"]
    
    L -->|owner_id check| P["🔐 Supabase Auth"]
    M -->|playlist_id check| P
    N -->|user_id check| P
    
    O -->|Token refresh| N
    O -->|Add tracks| O
    
    style H fill:#90EE90
    style I fill:#90EE90
    style B fill:#87CEEB
    style C fill:#87CEEB
    style D fill:#87CEEB
    style E fill:#FFB6C1
    style F fill:#FFB6C1
    style G fill:#FFB6C1
    style J fill:#FFB6C1
    style K fill:#FFB6C1
```

## Implementacja

### ✅ Zaimplementowane POST Endpointy

#### 1. POST /api/playlists/{id}/tracks
**Lokalizacja:** `src/app/api/playlists/[id]/tracks/route.ts`

**Funkcjonalność:**
- Dodawanie trackow do playlisty
- Weryfikacja duplikatów
- Sprawdzenie limitu (max 100 trackow)
- Obliczanie pozycji dla nowych trackow
- Validacja danych wejściowych (artist, title, album, trackUri)

**Obsługiwane błędy:**
- `400` VALIDATION_ERROR
- `401` UNAUTHORIZED
- `404` NOT_FOUND
- `409` DUPLICATE_TRACK
- `422` PLAYLIST_MAX_ITEMS_EXCEEDED

#### 2. POST /api/playlists/{id}/export/spotify
**Lokalizacja:** `src/app/api/playlists/[id]/export/spotify/route.ts`

**Funkcjonalność:**
- Eksport playlisty na konto Spotify użytkownika
- Weryfikacja powiązania Spotify
- Automatyczne odświeżenie tokena (jeśli wygasnął)
- Tworzenie prywatnej playlisty na Spotify
- Dodawanie trackow w paczach po 100
- Timeout operacji: 60 sekund
- Obsługa opisu playlisty

**Obsługiwane błędy:**
- `400` VALIDATION_ERROR
- `401` UNAUTHORIZED
- `403` SPOTIFY_NOT_LINKED / SPOTIFY_AUTH_FAILED
- `404` NOT_FOUND
- `409` EMPTY_PLAYLIST
- `429` RATE_LIMITED
- `502` UPSTREAM_ERROR
- `504` TIMEOUT

### 📋 Do Implementacji

Pozostałe endpointy wymagane w planie widoku:
- [ ] GET /api/playlists/{id}/tracks - Fetch tracks list
- [ ] PUT /api/playlists/{id}/tracks/reorder - Reorder tracks
- [ ] DELETE /api/playlists/{id}/tracks/{position} - Remove track
- [ ] GET /api/spotify/search - Search Spotify
- [ ] GET /api/spotify/status - Check Spotify link

## Best Practices Zastosowane

✅ **Error Handling** - Early returns dla błędów, guard clauses  
✅ **RLS Security** - Wszystkie operacje chronione Row Level Security  
✅ **Timeout Handling** - 60s timeout dla export operacji  
✅ **Token Management** - Automatyczne odświeżenie Spotify tokenów  
✅ **Duplicate Prevention** - Sprawdzenie duplikatów przed dodaniem  
✅ **Batch Operations** - Chunking do 100 dla Spotify API  
✅ **Input Validation** - Zod schemas dla request bodies  
✅ **Rate Limiting** - Obsługa Spotify rate limit errors
