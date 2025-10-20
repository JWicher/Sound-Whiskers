import { NextRequest, NextResponse } from 'next/server';
import { profileService } from '@/lib/services/profileService';
import { handleApiError } from '@/lib/errors/handleApiError';
import { updateProfileSchema } from '@/lib/validators/profileSchemas';
import { createClient } from '@/lib/supabase/server';

export async function GET() {
  try {
    const supabase = createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json(
        { error: { code: 'UNAUTHORIZED', message: 'Authentication required' } },
        { status: 401 }
      );
    }

    const profileDto = await profileService.getProfile(user.id);
    return NextResponse.json(profileDto);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const supabase = createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json(
        { error: { code: 'UNAUTHORIZED', message: 'Authentication required' } },
        { status: 401 }
      );
    }

    const body = await request.json();
    const parseResult = updateProfileSchema.safeParse(body);
    
    if (!parseResult.success) {
      return NextResponse.json(
        {
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid username format',
            details: {
              field: 'username',
              constraint: '1-50 characters, alphanumeric and underscores only',
              issues: parseResult.error.issues,
            },
          },
        },
        { status: 400 }
      );
    }

    const profileDto = await profileService.updateProfile(user.id, parseResult.data);
    return NextResponse.json(profileDto);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE() {
  try {
    const supabase = createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json(
        { error: { code: 'UNAUTHORIZED', message: 'Authentication required' } },
        { status: 401 }
      );
    }

    await profileService.deleteAccount(user.id);
    
    return NextResponse.json(
      { status: 'accepted' },
      { status: 202 }
    );
  } catch (error) {
    return handleApiError(error);
  }
}
