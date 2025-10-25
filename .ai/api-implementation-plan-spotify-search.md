# Spotify Search Endpoint Implementation

## Endpoint: GET `/api/spotify/search`

Search for songs on Spotify using artist name and optional track title.

### Features

- **Artist + Title Search**: Uses Spotify's query operators (`artist:"..."` and `track:"..."`)
- **Deduplication**: Removes duplicate results by track ID
- **Market Filtering**: Optional ISO 3166-1 alpha-2 country code for market-specific results
- **Timeout Handling**: 
  - 10s timeout for Spotify authentication (Client Credentials)
  - 25s timeout for search request
- **Rate Limiting**: Detects and reports Spotify rate limits (429)
- **Error Handling**: Comprehensive error responses with proper HTTP status codes

### Query Parameters

| Parameter | Type | Required | Default | Max | Notes |
|-----------|------|----------|---------|-----|-------|
| `artist` | string | Yes | — | 100 chars | Artist name to search for |
| `title` | string | No | — | 100 chars | Track title (partial match supported) |
| `limit` | number | No | 10 | 10 | Number of results to return |
| `market` | string | No | — | 2 chars | ISO 3166-1 alpha-2 country code (e.g., "US", "PL") |
| `cursor` | string | No | — | — | Pagination cursor (not typically used) |

### Response Format

**Status 200 OK:**
```json
{
  "items": [
    {
      "trackId": "7qiZfU4dY1lWllzX7mPBI3",
      "trackUri": "spotify:track:7qiZfU4dY1lWllzX7mPBI3",
      "artist": "Ed Sheeran",
      "title": "Shape of You",
      "album": "÷ (Deluxe)"
    }
  ]
}
```

### Error Responses

| Status | Code | Message | Cause |
|--------|------|---------|-------|
| 400 | `VALIDATION_ERROR` | Invalid query parameters | Missing required fields or invalid format |
| 401 | `UNAUTHORIZED` | Invalid Spotify credentials | Spotify API authentication failed |
| 429 | `RATE_LIMITED` | Spotify rate limit exceeded | Too many requests to Spotify API |
| 502 | `UPSTREAM_ERROR` | Failed to authenticate with Spotify | Spotify auth service unavailable |
| 502 | `UPSTREAM_ERROR` | Spotify API error | Spotify search service error |
| 504 | `TIMEOUT` | Spotify search timed out | Request took longer than 25 seconds |

### Implementation Details

#### Authentication Flow
Uses Spotify **Client Credentials OAuth 2.0** flow:
1. Exchanges `SPOTIFY_CLIENT_ID` + `SPOTIFY_CLIENT_SECRET` for access token
2. Caches token in-memory for ~1 hour (5-min buffer before expiry)
3. Token is used for subsequent searches

#### Search Query Building
Query uses Spotify's search operators:
- **With title**: `track:"Shape of You" artist:"Ed Sheeran"`
- **Artist only**: `artist:"Ed Sheeran"`

#### Deduplication
Removes duplicate results by Spotify track ID using a `Set<string>` for O(1) lookups.

#### Response Mapping
Maps Spotify API response to our DTO format:
```
Spotify Response → Our DTO
id → trackId
uri → trackUri
name → title
artists[0].name → artist
album.name → album
```

### Environment Variables Required

```bash
SPOTIFY_CLIENT_ID=your_client_id
SPOTIFY_CLIENT_SECRET=your_client_secret
```

### Usage Examples

#### Search by Artist Name (EN)
```bash
curl -X GET "http://localhost:3000/api/spotify/search?artist=Ed%20Sheeran&limit=5"
```

Response:
```json
{
  "items": [
    {
      "trackId": "7qiZfU4dY1lWllzX7mPBI3",
      "trackUri": "spotify:track:7qiZfU4dY1lWllzX7mPBI3",
      "artist": "Ed Sheeran",
      "title": "Shape of You",
      "album": "÷ (Deluxe)"
    },
    ...
  ]
}
```

#### Search by Artist + Title
```bash
curl -X GET "http://localhost:3000/api/spotify/search?artist=The%20Weeknd&title=Blinding%20Lights&limit=5"
```

#### Search with Market Filter
```bash
curl -X GET "http://localhost:3000/api/spotify/search?artist=Dua%20Lipa&market=PL&limit=10"
```

#### Error Response Example
```bash
curl -X GET "http://localhost:3000/api/spotify/search?limit=20"
```

Response (400):
```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid query parameters",
    "details": [
      {
        "code": "too_small",
        "minimum": 1,
        "type": "string",
        "path": ["artist"],
        "message": "Artist is required"
      }
    ]
  }
}
```

### Frontend Integration Example

```typescript
import { SpotifySearchDto } from '@/types';

async function searchSpotifyTracks(artist: string, title?: string) {
  const params = new URLSearchParams();
  params.append('artist', artist);
  if (title) {
    params.append('title', title);
  }
  params.append('limit', '10');

  const response = await fetch(`/api/spotify/search?${params}`);
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error.message);
  }

  const data: SpotifySearchDto = await response.json();
  return data.items;
}

// Usage
try {
  const tracks = await searchSpotifyTracks('Ed Sheeran', 'Shape of You');
  console.log(`Found ${tracks.length} tracks`);
} catch (error) {
  console.error('Search failed:', error.message);
}
```

### Performance Considerations

1. **Token Caching**: In-memory cache prevents re-authentication on every request (~1 hour validity)
2. **Timeout Protection**: 25s timeout prevents hanging requests; 10s for auth prevents slow auth service
3. **Deduplication**: Set-based lookup is O(1) per track, ensuring scalability
4. **Rate Limiting**: Spotify API rate limits are detected and reported to client
5. **Market Filtering**: Optional market param reduces irrelevant results for better UX

### Security Considerations

1. **Credentials**: `SPOTIFY_CLIENT_ID` and `SPOTIFY_CLIENT_SECRET` are server-only environment variables
2. **Query Escaping**: Spotify query operators handle special characters safely
3. **Error Messages**: Sensitive errors (e.g., auth failures) are abstracted from client
4. **No Client-Side Tokens**: Spotify tokens never exposed to frontend

### Testing Checklist

- [ ] Valid search returns expected results
- [ ] Artist parameter is required (400 without it)
- [ ] Limit is capped at 10 (400 if > 10)
- [ ] Duplicate results are removed
- [ ] Market filter works (e.g., market=PL)
- [ ] Timeout is enforced (504 after 25s)
- [ ] Rate limiting is detected (429)
- [ ] Invalid Spotify credentials error (401 or 502)
