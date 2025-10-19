import { NextRequest, NextResponse } from 'next/server';
import { playlistService } from '@/lib/services/playlistService';
import { handleApiError } from '@/lib/errors/handleApiError';
import { listPlaylistsQuerySchema, createPlaylistSchema } from '@/lib/validators/playlistSchemas';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  try {
    const supabase = createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(
        { error: { code: 'UNAUTHORIZED', message: 'Unauthorized' } },
        { status: 401 }
      );
    }

    const parseResult = listPlaylistsQuerySchema.safeParse(Object.fromEntries(request.nextUrl.searchParams));
    if (!parseResult.success) {
      return NextResponse.json(
        {
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid query params',
            details: parseResult.error.issues,
          },
        },
        { status: 400 }
      );
    }

    const dto = await playlistService.list(user.id, parseResult.data);
    return NextResponse.json(dto);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(
        { error: { code: 'UNAUTHORIZED', message: 'Unauthorized' } },
        { status: 401 }
      );
    }

    const body = await request.json();
    const parseResult = createPlaylistSchema.safeParse(body);
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

    const dto = await playlistService.create(user.id, parseResult.data);
    return NextResponse.json(dto, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
