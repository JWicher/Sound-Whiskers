import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function DELETE() {
  try {
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

    // TODO: Delete spotify token from database
    // For now, return success
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json(
      { error: { code: 'INTERNAL_SERVER_ERROR', message: 'Failed to unlink Spotify' } },
      { status: 500 }
    );
  }
}

