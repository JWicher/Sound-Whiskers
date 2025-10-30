import { http, HttpResponse } from 'msw'

/**
 * MSW request handlers for API mocking
 * Add your API mocks here
 */

export const handlers = [
  // Example: Mock Supabase auth
  http.post('http://localhost:54321/auth/v1/token', () => {
    return HttpResponse.json({
      access_token: 'mock-access-token',
      token_type: 'bearer',
      expires_in: 3600,
      refresh_token: 'mock-refresh-token',
      user: {
        id: 'mock-user-id',
        email: 'test@example.com',
      },
    })
  }),

  // Example: Mock playlists API
  http.get('/api/playlists', () => {
    return HttpResponse.json({
      data: [
        {
          id: '1',
          name: 'Test Playlist',
          description: 'A test playlist',
          track_count: 10,
          created_at: new Date().toISOString(),
        },
      ],
    })
  }),
]

