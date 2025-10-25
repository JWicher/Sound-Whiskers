import { z } from 'zod';

// Query parameters for listing playlists
export const listPlaylistsQuerySchema = z
  .object({
    page: z
      .string()
      .transform((v) => {
        return v ? Number(v) : 1 
      })
      .pipe(z.number().int().positive()),
    pageSize: z
      .string()
      .optional()
      .transform((v) => {
        return Number(v) || 20
      })
      .pipe(z.number().positive().max(100)),
    search: z.string().optional(),
    sort: z
      .string()
      .optional()
      .default('updated_at.desc')
      .refine(
        (val) =>
          [
            'created_at.asc',
            'created_at.desc',
            'updated_at.asc',
            'updated_at.desc',
            'name.asc',
            'name.desc',
          ].includes(val),
        {
          message: 'Invalid sort option',
        }
      ),
  })
  .transform((obj) => ({
    page: obj.page,
    pageSize: obj.pageSize,
    search: obj.search,
    sort: obj.sort as typeof obj.sort &
       'created_at.asc'
      | 'created_at.desc'
      | 'updated_at.asc'
      | 'updated_at.desc'
      | 'name.asc'
      | 'name.desc',
  }));

// Body for create playlist
export const createPlaylistSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(255).nullable().optional(),
});

// Body for update playlist
export const updatePlaylistSchema = createPlaylistSchema.partial().refine(
  (data) => data.name !== undefined || data.description !== undefined,
  {
    message: 'At least one field must be provided',
  }
);

export type ListPlaylistsOptions = z.infer<typeof listPlaylistsQuerySchema>;
export type CreatePlaylistCommand = z.infer<typeof createPlaylistSchema>;
export type UpdatePlaylistCommand = z.infer<typeof updatePlaylistSchema>;

// Spotify search query parameters
export const spotifySearchQuerySchema = z.object({
  artist: z.string().min(1, 'Artist is required').max(100),
  title: z.string().max(100).optional(),
  limit: z
    .string()
    .optional()
    .transform((v) => (v ? Number(v) : 10))
    .pipe(z.number().int().min(1).max(10)),
  market: z.string().length(2).optional(), // ISO 3166-1 alpha-2
  cursor: z.string().optional(),
});

export type SpotifySearchQuery = z.infer<typeof spotifySearchQuerySchema>;
