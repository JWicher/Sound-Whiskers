import { NextRequest, NextResponse } from 'next/server';
import { playlistService } from '@/lib/services/playlistService';
import { handleApiError } from '@/lib/errors/handleApiError';
import { updatePlaylistSchema } from '@/lib/validators/playlistSchemas';
import { createClient } from '@/lib/supabase/server';

function unauthorized() {
  return NextResponse.json(
    { error: { code: 'UNAUTHORIZED', message: 'Unauthorized' } },
    { status: 401 }
  );
}

async function getUserId() {
  const supabase = createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();
  if (error || !user) return null;
  return user.id;
}

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const userId = await getUserId();
    if (!userId) return unauthorized();

    const dto = await playlistService.get(userId, params.id);
    return NextResponse.json(dto);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const userId = await getUserId();
    if (!userId) return unauthorized();

    const body = await request.json();
    const parse = updatePlaylistSchema.safeParse(body);
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

    const dto = await playlistService.update(userId, params.id, parse.data);
    return NextResponse.json(dto);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const userId = await getUserId();
    if (!userId) return unauthorized();

    await playlistService.softDelete(userId, params.id);
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    return handleApiError(error);
  }
}
