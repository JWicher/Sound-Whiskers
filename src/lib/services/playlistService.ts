import { createClient } from '@/lib/supabase/server';
import { ApiError } from '@/lib/errors/ApiError';
import type {
  CreatePlaylistCommand,
  ListPlaylistsOptions,
  UpdatePlaylistCommand,
  PlaylistListDto,
  PlaylistDto,
} from '@/types';

export class PlaylistService {
  // Lazy getter to ensure createClient() is called within request context
  private get supabase() {
    return createClient();
  }

  async list(userId: string, options: ListPlaylistsOptions): Promise<PlaylistListDto> {
    const { page, pageSize, search, sort } = options;

    // Apply pagination bounds safeguard
    if (page * pageSize > 5000) {
      throw new ApiError(400, 'VALIDATION_ERROR', 'Pagination limit exceeded', {
        page,
        pageSize,
      });
    }

    const [sortColumn, sortDir] = sort.split('.') as [string, 'asc' | 'desc'];

    let query = this.supabase
      .from('playlists')
      .select('id, name, is_deleted, created_at, updated_at, playlist_tracks(count)', {
        count: 'exact',
      })
      .eq('owner_id', userId)
      .order(sortColumn, { ascending: sortDir === 'asc' })
      .range((page - 1) * pageSize, page * pageSize - 1);

    if (search) {
      query = query.ilike('name', `%${search}%`);
    }

    const { data, error, count } = await query;

    if (error) {
      throw new ApiError(500, 'INTERNAL_SERVER_ERROR', error.message);
    }

    return {
      items:
        data?.map((row) => ({
          id: row.id,
          name: row.name,
          isDeleted: row.is_deleted,
          createdAt: row.created_at,
          updatedAt: row.updated_at,
          trackCount: row.playlist_tracks?.[0]?.count ?? 0,
        })) ?? [],
      page,
      pageSize,
      total: count ?? 0,
    };
  }

  async create(userId: string, command: CreatePlaylistCommand): Promise<PlaylistDto> {
    const { name, description } = command;

    const { data, error } = await this.supabase
      .from('playlists')
      .insert({
        owner_id: userId,
        name,
        description: description ?? null,
      })
      .select('*')
      .single();

    if (error) {
      if (error.code === '23505') {
        throw new ApiError(409, 'CONFLICT', 'Playlist name already exists');
      }
      if (error.code === 'P0001' && error.message.includes('PLAYLISTS_LIMIT_EXCEEDED')) {
        throw new ApiError(422, 'LIMIT_EXCEEDED', 'Playlists limit exceeded');
      }
      throw new ApiError(500, 'INTERNAL_SERVER_ERROR', error.message);
    }

    return {
      id: data.id,
      name: data.name,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
    };
  }

  async get(userId: string, playlistId: string): Promise<PlaylistDto & { trackCount: number }> {
    const { data, error } = await this.supabase
      .from('playlists')
      .select('id, name, description, created_at, updated_at, playlist_tracks(count)')
      .eq('owner_id', userId)
      .eq('id', playlistId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        // not found
        throw new ApiError(404, 'NOT_FOUND', 'Playlist not found');
      }
      throw new ApiError(500, 'INTERNAL_SERVER_ERROR', error.message);
    }

    const row: any = data;
    return {
      id: row.id,
      name: row.name,
      description: row.description,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      trackCount: row.playlist_tracks?.[0]?.count ?? 0,
    };
  }

  async update(
    userId: string,
    playlistId: string,
    command: UpdatePlaylistCommand
  ): Promise<PlaylistDto> {
    const { data, error } = await this.supabase
      .from('playlists')
      .update({ ...command, updated_at: new Date().toISOString() })
      .eq('owner_id', userId)
      .eq('id', playlistId)
      .select('*')
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        throw new ApiError(404, 'NOT_FOUND', 'Playlist not found');
      }
      if (error.code === '23505') {
        throw new ApiError(409, 'CONFLICT', 'Playlist name already exists');
      }
      throw new ApiError(500, 'INTERNAL_SERVER_ERROR', error.message);
    }

    const row2: any = data;
    return {
      id: row2.id,
      name: row2.name,
      description: row2.description,
      createdAt: row2.created_at,
      updatedAt: row2.updated_at,
    };
  }

  async softDelete(userId: string, playlistId: string): Promise<void> {
    const { error } = await this.supabase
      .from('playlists')
      .update({ is_deleted: true, updated_at: new Date().toISOString() })
      .eq('owner_id', userId)
      .eq('id', playlistId);

    if (error) {
      if (error.code === 'PGRST116') {
        throw new ApiError(404, 'NOT_FOUND', 'Playlist not found');
      }
      throw new ApiError(500, 'INTERNAL_SERVER_ERROR', error.message);
    }
  }
}

export const playlistService = new PlaylistService();
