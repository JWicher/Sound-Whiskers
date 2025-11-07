import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { stripe } from '@/lib/stripe/client';
import { sanitizeUrl } from '@/lib/stripe/utils';

// Force Node.js runtime for Stripe API calls
export const runtime = 'nodejs';

/**
 * POST /api/billing/portal
 * 
 * Creates a Stripe Billing Portal session for managing subscriptions.
 * User must have an existing Stripe customer ID (created during checkout).
 * 
 * Request body:
 * - returnUrl: string (URL to return to after managing subscription)
 * 
 * Response: { url: string } - Stripe Billing Portal URL
 */
export async function POST(request: NextRequest) {
  try {
    // Authenticate user
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

    // Parse request body
    const body = await request.json();
    const { returnUrl } = body as { returnUrl?: string };

    // Get user profile with stripe_customer_id
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('stripe_customer_id')
      .eq('user_id', user.id)
      .single();

    if (profileError || !profile) {
      return NextResponse.json(
        {
          error: {
            code: 'PROFILE_NOT_FOUND',
            message: 'User profile not found',
          },
        },
        { status: 404 }
      );
    }

    // Check if user has a Stripe customer ID
    if (!profile.stripe_customer_id) {
      return NextResponse.json(
        {
          error: {
            code: 'NO_CUSTOMER',
            message:
              'No billing account found. Please complete checkout first to create a subscription.',
          },
        },
        { status: 400 }
      );
    }

    // Sanitize return URL
    const sanitizedReturnUrl = sanitizeUrl(
      returnUrl || '',
      process.env.NEXT_PUBLIC_APP_URL
    );

    // Create Billing Portal session
    const session = await stripe.billingPortal.sessions.create({
      customer: profile.stripe_customer_id,
      return_url: sanitizedReturnUrl,
    });

    if (!session.url) {
      return NextResponse.json(
        {
          error: {
            code: 'STRIPE_ERROR',
            message: 'Failed to create billing portal session URL',
          },
        },
        { status: 502 }
      );
    }

    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error('Portal error:', error);

    // Handle Stripe-specific errors
    if (error && typeof error === 'object' && 'type' in error) {
      return NextResponse.json(
        {
          error: {
            code: 'STRIPE_ERROR',
            message: 'Failed to create billing portal session',
          },
        },
        { status: 502 }
      );
    }

    return NextResponse.json(
      {
        error: {
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to create portal session',
        },
      },
      { status: 500 }
    );
  }
}

