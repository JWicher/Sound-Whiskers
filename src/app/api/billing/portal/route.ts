import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST() {
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

    // TODO: Implement Stripe billing portal
    // For now, return error
    return NextResponse.json(
      { error: { code: 'NOT_IMPLEMENTED', message: 'Billing integration coming soon' } },
      { status: 501 }
    );
  } catch {
    return NextResponse.json(
      { error: { code: 'INTERNAL_SERVER_ERROR', message: 'Failed to create portal session' } },
      { status: 500 }
    );
  }
}

