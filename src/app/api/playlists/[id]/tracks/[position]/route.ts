import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { handleApiError } from '@/lib/errors/handleApiError';

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

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string; position: string } }
) {
  try {
    const userId = await getUserId();
    if (!userId) return unauthorized();

    const playlistId = params.id;
    const positionStr = params.position;

    // Parse position as integer
    const position = parseInt(positionStr, 10);
    if (isNaN(position) || position <= 0) {
      return NextResponse.json(
        {
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid position: must be a positive integer',
            details: { position: positionStr },
          },
        },
        { status: 400 }
      );
    }

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

    // Verify track exists at this position and is not already deleted
    const { data: track, error: trackError } = await supabase
      .from('playlist_tracks')
      .select('position, track_uri, is_deleted')
      .eq('playlist_id', playlistId)
      .eq('position', position)
      .single();

    if (trackError || !track) {
      return NextResponse.json(
        { error: { code: 'NOT_FOUND', message: 'Track not found at this position' } },
        { status: 404 }
      );
    }

    if (track.is_deleted) {
      return NextResponse.json(
        { error: { code: 'NOT_FOUND', message: 'Track already deleted' } },
        { status: 404 }
      );
    }

    // Soft delete the track
    const { error: deleteError } = await supabase
      .from('playlist_tracks')
      .update({ is_deleted: true })
      .eq('playlist_id', playlistId)
      .eq('position', position)
      .eq('is_deleted', false);

    if (deleteError) {
      throw deleteError;
    }

    // Return 204 No Content for successful deletion
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    return handleApiError(error);
  }
}
