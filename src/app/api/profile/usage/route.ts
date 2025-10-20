import { NextResponse } from 'next/server';
import { profileService } from '@/lib/services/profileService';
import { handleApiError } from '@/lib/errors/handleApiError';
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

    const usageDto = await profileService.getUsage(user.id);
    return NextResponse.json(usageDto);
  } catch (error) {
    return handleApiError(error);
  }
}
