import { NextRequest, NextResponse } from 'next/server';
import { profileService, checkAndDowngradeIfExpired } from '@/lib/services/profileService';
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

    // Check and downgrade if Pro plan has expired
    await checkAndDowngradeIfExpired(user.id);

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

    const userId = user.id;

    // Step 1: Delete all profile data (playlists, tokens, profile record)
    await profileService.deleteAccount(userId);
    
    // Step 2: Sign out the user's session
    await supabase.auth.signOut();

    // Step 3: Delete the auth user (requires admin privileges)
    // This must be done last, after all data cleanup
    const { createAdminClient } = await import('@/lib/supabase/server');
    const adminClient = createAdminClient();
    
    const { error: deleteAuthError } = await adminClient.auth.admin.deleteUser(userId);
    
    if (deleteAuthError) {
      console.error('Failed to delete auth user:', deleteAuthError);
      // Even if auth deletion fails, we've already cleaned up the data
      // Return success but log the error for monitoring
      return NextResponse.json(
        { 
          status: 'accepted',
          warning: 'Profile data deleted but auth cleanup incomplete'
        },
        { status: 202 }
      );
    }
    
    return NextResponse.json(
      { status: 'accepted' },
      { status: 202 }
    );
  } catch (error) {
    return handleApiError(error);
  }
}
