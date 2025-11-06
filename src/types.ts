import { Database } from './db/database.types'

// Database entity type aliases for cleaner usage
export type Profile = Database['public']['Tables']['profiles']['Row']
export type ProfileInsert = Database['public']['Tables']['profiles']['Insert']
export type ProfileUpdate = Database['public']['Tables']['profiles']['Update']

export type Playlist = Database['public']['Tables']['playlists']['Row']
export type PlaylistInsert = Database['public']['Tables']['playlists']['Insert']
export type PlaylistUpdate = Database['public']['Tables']['playlists']['Update']

export type PlaylistTrack = Database['public']['Tables']['playlist_tracks']['Row']
export type PlaylistTrackInsert = Database['public']['Tables']['playlist_tracks']['Insert']
export type PlaylistTrackUpdate = Database['public']['Tables']['playlist_tracks']['Update']

export type AISession = Database['public']['Tables']['ai_sessions']['Row']
export type AISessionInsert = Database['public']['Tables']['ai_sessions']['Insert']

export type SpotifyToken = Database['public']['Tables']['spotify_tokens']['Row']

// Enums
export type PlanType = Database['public']['Enums']['plan_type']
export type AIStatus = Database['public']['Enums']['ai_status_enum']

// Generic utility types
export interface PaginatedResponse<T> {
  items: T[]
  page: number
  pageSize: number
  total: number
}

export interface ErrorResponse {
  error: {
    code: string
    message: string
    details?: Record<string, unknown>
  }
}

// === PROFILE DTOS ===

// GET /api/profile
export interface ProfileDto {
  userId: string
  username: string
  plan: PlanType
  proExpiresAt: string | null
  createdAt: string
  updatedAt: string
}

// PATCH /api/profile
export interface UpdateProfileCommand {
  username: string
}

// GET /api/profile/usage
export interface ProfileUsageDto {
  playlists: {
    count: number
    limit: number
  }
  ai: {
    used: number
    limit: number
    remaining: number
    resetAt: string
  }
}

// === PLAYLIST DTOS ===

// GET /api/playlists query options
export interface ListPlaylistsOptions {
  page: number
  pageSize: number
  search?: string
  sort: string // Format: 'column.direction' (e.g., 'name.asc', 'created_at.desc')
  isDeleted: boolean // Filter for soft-deleted playlists
}

// GET /api/playlists (list item)
export interface PlaylistListItemDto {
  id: string
  name: string
  isDeleted: boolean
  createdAt: string
  updatedAt: string
  trackCount: number
}

// GET /api/playlists
export type PlaylistListDto = PaginatedResponse<PlaylistListItemDto>

// POST /api/playlists
export interface CreatePlaylistCommand {
  name: string
  description?: string | null
}

// POST /api/playlists response & GET /api/playlists/{id}
export interface PlaylistDto {
  id: string
  name: string
  description?: string | null
  createdAt: string
  updatedAt: string
  trackCount?: number // Only present in GET single playlist
}

// PATCH /api/playlists/{id}
export interface UpdatePlaylistCommand {
  name?: string
  description?: string | null
}

// === PLAYLIST TRACK DTOS ===

// GET /api/playlists/{id}/tracks (track item)
export interface PlaylistTrackDto {
  position: number
  trackUri: string
  artist: string
  title: string
  album: string
  addedAt: string
}

// GET /api/playlists/{id}/tracks
export type PlaylistTrackListDto = PaginatedResponse<PlaylistTrackDto>

// POST /api/playlists/{id}/tracks (single track data)
export interface TrackMetadata {
  trackUri: string
  artist: string
  title: string
  album: string
}

// POST /api/playlists/{id}/tracks
export interface AddTracksCommand {
  tracks: TrackMetadata[]
  insertAfterPosition?: number
}

// POST /api/playlists/{id}/tracks response
export interface AddTracksResponseDto {
  added: number
  positions: number[]
}

// PUT /api/playlists/{id}/tracks/reorder
export interface ReorderTracksExplicitCommand {
  ordered: Array<{
    position: number
    trackUri: string
  }>
}

// PUT /api/playlists/{id}/tracks/reorder response
export interface ReorderTracksResponseDto {
  positions: Array<{
    trackUri: string
    position: number
  }>
}

// === SPOTIFY SEARCH DTOS ===

// GET /api/spotify/search (search result item)
export interface SpotifySearchResultDto {
  trackId: string
  trackUri: string
  artist: string
  title: string
  album: string
}

// GET /api/spotify/search
export interface SpotifySearchDto {
  items: SpotifySearchResultDto[]
}

// GET /api/spotify/status
export interface SpotifyStatusDto {
  linked: boolean
  expiresAt?: string
}

// === AI GENERATION DTOS ===

// POST /api/ai/generate
export interface GeneratePlaylistCommand {
  prompt: string
}

// POST /api/ai/generate response (track suggestion)
export interface AISuggestedTrack {
  artist: string
  title: string
  album: string
  trackUri: string
}

// POST /api/ai/generate response
export interface GeneratePlaylistResponseDto {
  sessionId: string
  playlistName?: string
  playlistDescription?: string | null
  summary?: string | null
  items: AISuggestedTrack[]
  count: number
  warningUnderMinCount: boolean
}

// GET /api/ai/quota
export interface AIQuotaDto {
  used: number
  limit: number
  remaining: number
  resetAt: string
}

// GET /api/ai/sessions (session item)
export interface AISessionDto {
  id: string
  status: AIStatus
  createdAt: string
}

// GET /api/ai/sessions
export type AISessionListDto = PaginatedResponse<AISessionDto>

// === EXPORT DTOS ===

// POST /api/playlists/{id}/export/spotify
export interface ExportToSpotifyCommand {
  description?: string | null
}

// POST /api/playlists/{id}/export/spotify response
export interface ExportToSpotifyResponseDto {
  spotifyPlaylistId: string
  spotifyPlaylistUrl: string
  exported: number
  note: string
}

// === BILLING DTOS ===

// POST /api/billing/checkout
export interface CreateCheckoutCommand {
  successUrl: string
  cancelUrl: string
}

// POST /api/billing/checkout response
export interface CheckoutResponseDto {
  url: string
}

// POST /api/billing/portal
export interface CreatePortalCommand {
  returnUrl: string
}

// POST /api/billing/portal response
export interface PortalResponseDto {
  url: string
}

// POST /api/webhooks/stripe response
export interface WebhookResponseDto {
  ok: boolean
}

// === ACCOUNT DTOS ===

// DELETE /api/profile response
export interface DeleteProfileResponseDto {
  status: string
}

