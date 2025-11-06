import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { handleApiError } from '@/lib/errors/handleApiError';
import { z } from 'zod';
import type { AddTracksResponseDto, PlaylistTrackListDto } from '@/types';
import type { ReorderTracksResponseDto } from '@/types';

const addTracksSchema = z.object({
  tracks: z.array(
    z.object({
      trackUri: z.string().min(1, 'Track URI required'),
      artist: z.string().min(1, 'Artist required'),
      title: z.string().min(1, 'Title required'),
      album: z.string().min(1, 'Album required'),
    })
  ).min(1, 'At least one track required'),
  insertAfterPosition: z.number().int().min(0).optional(),
});

const getTracksSchema = z.object({
  page: z.number().int().min(1).default(1),
  pageSize: z.number().int().min(1).max(100).default(50),
});

async function getUserId() {
  const supabase = createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();
  if (error || !user) return null;
  return user.id;
}

function unauthorized() {
  return NextResponse.json(
    { error: { code: 'UNAUTHORIZED', message: 'Unauthorized' } },
    { status: 401 }
  );
}

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const userId = await getUserId();
    if (!userId) return unauthorized();

    // Parse query parameters
    const parseResult = getTracksSchema.safeParse({
      page: request.nextUrl.searchParams.get('page') ? parseInt(request.nextUrl.searchParams.get('page')!) : undefined,
      pageSize: request.nextUrl.searchParams.get('pageSize') ? parseInt(request.nextUrl.searchParams.get('pageSize')!) : undefined,
    });

    if (!parseResult.success) {
      return NextResponse.json(
        {
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid query parameters',
            details: parseResult.error.issues,
          },
        },
        { status: 400 }
      );
    }

    const { page, pageSize } = parseResult.data;
    const playlistId = params.id;
    const supabase = createClient();

    // Verify playlist exists and is owned by user
    const { data: playlist, error: playlistError } = await supabase
      .from('playlists')
      .select('id, owner_id')
      .eq('id', playlistId)
      .eq('owner_id', userId)
      .single();

    if (playlistError || !playlist) {
      return NextResponse.json(
        { error: { code: 'NOT_FOUND', message: 'Playlist not found' } },
        { status: 404 }
      );
    }

    // Get total count of non-deleted tracks
    const { count: totalCount, error: countError } = await supabase
      .from('playlist_tracks')
      .select('*', { count: 'exact', head: true })
      .eq('playlist_id', playlistId)
      .eq('is_deleted', false);

    if (countError) {
      throw countError;
    }

    const total = totalCount ?? 0;

    // Calculate offset
    const offset = (page - 1) * pageSize;

    // Fetch tracks with pagination
    const { data: tracks, error: tracksError } = await supabase
      .from('playlist_tracks')
      .select('position, track_uri, artist, title, album, added_at')
      .eq('playlist_id', playlistId)
      .eq('is_deleted', false)
      .order('position', { ascending: true })
      .range(offset, offset + pageSize - 1);

    if (tracksError) {
      throw tracksError;
    }

    const response: PlaylistTrackListDto = {
      items: (tracks || []).map((track) => ({
        position: track.position,
        trackUri: track.track_uri,
        artist: track.artist,
        title: track.title,
        album: track.album,
        addedAt: track.added_at,
      })),
      page,
      pageSize,
      total,
    };

    return NextResponse.json(response);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const userId = await getUserId();
    if (!userId) return unauthorized();

    const body = await request.json();
    const parse = addTracksSchema.safeParse(body);
    if (!parse.success) {
      return NextResponse.json(
        {
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid body',
            details: parse.error.issues,
          },
        },
        { status: 400 }
      );
    }

    const supabase = createClient();
    const playlistId = params.id;
    const { tracks, insertAfterPosition = 0 } = parse.data;

    // Verify playlist exists and is owned by user
    const { data: playlist, error: playlistError } = await supabase
      .from('playlists')
      .select('id, playlist_tracks(count)')
      .eq('id', playlistId)
      .eq('owner_id', userId)
      .single();

    if (playlistError || !playlist) {
      return NextResponse.json(
        { error: { code: 'NOT_FOUND', message: 'Playlist not found' } },
        { status: 404 }
      );
    }

    const currentTrackCount = playlist.playlist_tracks?.[0]?.count ?? 0;
    const totalTracksAfterAdd = currentTrackCount + tracks.length;

    // Check if adding tracks would exceed limit (100)
    if (totalTracksAfterAdd > 100) {
      return NextResponse.json(
        {
          error: {
            code: 'PLAYLIST_MAX_ITEMS_EXCEEDED',
            message: 'Playlist cannot exceed 100 tracks',
            details: {
              currentCount: currentTrackCount,
              maxCount: 100,
              requestedToAdd: tracks.length,
            },
          },
        },
        { status: 422 }
      );
    }

    // Check for duplicates in existing tracks and get all positions (including deleted)
    const { data: existingTracks, error: existingError } = await supabase
      .from('playlist_tracks')
      .select('track_uri, position, is_deleted')
      .eq('playlist_id', playlistId);

    if (existingError) {
      throw existingError;
    }

    const existingTrackUris = new Set(
      existingTracks?.filter((t) => !t.is_deleted).map((t) => t.track_uri) || []
    );

    // Get all occupied positions (both deleted and non-deleted tracks use a position)
    const occupiedPositions = new Set(
      existingTracks?.map((t) => t.position) || []
    );

    // Check if any of the incoming tracks are duplicates
    for (const track of tracks) {
      if (existingTrackUris.has(track.trackUri)) {
        return NextResponse.json(
          {
            error: {
              code: 'DUPLICATE_TRACK',
              message: `Track already in playlist: ${track.artist} - ${track.title}`,
              details: { trackUri: track.trackUri },
            },
          },
          { status: 409 }
        );
      }
      existingTrackUris.add(track.trackUri);
    }

    // Calculate positions for new tracks
    // Find available positions starting after insertAfterPosition
    const newPositions: number[] = [];
    let nextPosition = insertAfterPosition + 1;

    for (let i = 0; i < tracks.length; i++) {
      // Skip occupied positions
      while (occupiedPositions.has(nextPosition) && nextPosition <= 100) {
        nextPosition++;
      }

      if (nextPosition > 100) {
        return NextResponse.json(
          {
            error: {
              code: 'PLAYLIST_MAX_ITEMS_EXCEEDED',
              message: 'Playlist cannot exceed 100 tracks',
              details: {
                currentCount: currentTrackCount,
                maxCount: 100,
                requestedToAdd: tracks.length,
              },
            },
          },
          { status: 422 }
        );
      }

      newPositions.push(nextPosition);
      occupiedPositions.add(nextPosition);
      nextPosition++;
    }

    // Insert tracks with their new positions
    const tracksToInsert = tracks.map((track, index) => ({
      playlist_id: playlistId,
      position: newPositions[index],
      track_uri: track.trackUri,
      artist: track.artist,
      title: track.title,
      album: track.album,
    }));

    const { error: insertError } = await supabase
      .from('playlist_tracks')
      .insert(tracksToInsert);

    if (insertError) {
      throw insertError;
    }

    const response: AddTracksResponseDto = {
      added: tracks.length,
      positions: newPositions,
    };

    return NextResponse.json(response, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const userId = await getUserId();
    if (!userId) return unauthorized();

    const body = await request.json();

    // Validate request body structure
    if (!Array.isArray(body.ordered)) {
      return NextResponse.json(
        {
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid body: ordered must be an array',
            details: { expected: 'ordered array of {position, trackUri}' },
          },
        },
        { status: 400 }
      );
    }

    // Validate ordered items
    const reorderSchema = z.object({
      ordered: z.array(
        z.object({
          position: z.number().int().positive('Position must be positive'),
          trackUri: z.string().min(1, 'Track URI required'),
        })
      ).min(1, 'At least one track required'),
    });

    const parseResult = reorderSchema.safeParse(body);
    if (!parseResult.success) {
      return NextResponse.json(
        {
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid body',
            details: parseResult.error.issues,
          },
        },
        { status: 400 }
      );
    }

    const supabase = createClient();
    const playlistId = params.id;
    const { ordered } = parseResult.data;

    // Verify playlist exists and is owned by user
    const { data: playlist, error: playlistError } = await supabase
      .from('playlists')
      .select('id, owner_id')
      .eq('id', playlistId)
      .eq('owner_id', userId)
      .single();

    if (playlistError || !playlist) {
      return NextResponse.json(
        { error: { code: 'NOT_FOUND', message: 'Playlist not found' } },
        { status: 404 }
      );
    }

    // Fetch all non-deleted tracks for this playlist
    const { data: currentTracks, error: tracksError } = await supabase
      .from('playlist_tracks')
      .select('position, track_uri')
      .eq('playlist_id', playlistId)
      .eq('is_deleted', false)
      .order('position', { ascending: true });

    if (tracksError) {
      throw tracksError;
    }

    if (!currentTracks) {
      return NextResponse.json(
        { error: { code: 'NOT_FOUND', message: 'No tracks found in playlist' } },
        { status: 404 }
      );
    }

    // Create a map of current track URIs for validation
    const currentTrackUris = new Set(currentTracks.map((t) => t.track_uri));
    const orderedTrackUris = new Set(ordered.map((t) => t.trackUri));

    // Validate that ordered list matches current tracks exactly (same items, potentially different order)
    if (currentTracks.length !== ordered.length) {
      return NextResponse.json(
        {
          error: {
            code: 'MISSING_OR_EXTRA_ITEMS',
            message: 'Ordered tracks must match current playlist tracks exactly',
            details: {
              currentCount: currentTracks.length,
              orderedCount: ordered.length,
            },
          },
        },
        { status: 422 }
      );
    }

    // Check for missing or extra tracks
    const missingTracks = Array.from(currentTrackUris).filter((uri) => !orderedTrackUris.has(uri));
    const extraTracks = Array.from(orderedTrackUris).filter((uri) => !currentTrackUris.has(uri));

    if (missingTracks.length > 0 || extraTracks.length > 0) {
      return NextResponse.json(
        {
          error: {
            code: 'MISSING_OR_EXTRA_ITEMS',
            message: 'Ordered tracks must match current playlist tracks exactly',
            details: {
              missing: missingTracks,
              extra: extraTracks,
            },
          },
        },
        { status: 422 }
      );
    }

    // Check for duplicate positions in the ordered list
    const positions = new Set(ordered.map((t) => t.position));
    if (positions.size !== ordered.length) {
      return NextResponse.json(
        {
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Duplicate positions found in ordered list',
          },
        },
        { status: 400 }
      );
    }

    // Update positions for each track
    for (const item of ordered) {
      const { error: updateError } = await supabase
        .from('playlist_tracks')
        .update({ position: item.position })
        .eq('playlist_id', playlistId)
        .eq('track_uri', item.trackUri);

      if (updateError) {
        throw updateError;
      }
    }

    // Prepare response
    const response: ReorderTracksResponseDto = {
      positions: ordered.map((item) => ({
        trackUri: item.trackUri,
        position: item.position,
      })),
    };

    return NextResponse.json(response, { status: 200 });
  } catch (error) {
    return handleApiError(error);
  }
}
