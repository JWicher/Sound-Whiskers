import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export const runtime = 'nodejs';

export async function DELETE() {
  // Check authentication first
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json(
      { error: { code: 'UNAUTHORIZED', message: 'Authentication required' } },
      { status: 401 }
    );
  }

  try {
    // Delete Spotify tokens from database
    const { error } = await supabase
      .from('spotify_tokens')
      .delete()
      .eq('user_id', user.id);

    if (error) {
      console.error('Failed to delete Spotify tokens:', error);
      throw error;
    }

    // Return 204 No Content for successful deletion
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    console.error('Failed to unlink Spotify:', error);
    return NextResponse.json(
      { error: { code: 'INTERNAL_SERVER_ERROR', message: 'Failed to unlink Spotify' } },
      { status: 500 }
    );
  }
}

