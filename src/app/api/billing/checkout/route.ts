import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { stripe } from '@/lib/stripe/client';
import {
  sanitizeUrl,
  getOrCreateStripeCustomer,
  getPriceId,
} from '@/lib/stripe/utils';

// Force Node.js runtime for Stripe API calls
export const runtime = 'nodejs';

/**
 * POST /api/billing/checkout
 * 
 * Creates a Stripe Checkout session for Pro plan subscription.
 * Supports both CARD (USD) and BLIK (PLN) payment methods.
 * 
 * Request body:
 * - successUrl: string (redirect URL after successful payment)
 * - cancelUrl: string (redirect URL if payment is cancelled)
 * - paymentMethod?: 'card' | 'blik' (defaults to 'card')
 * 
 * Response: { url: string } - Stripe Checkout URL
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

    // Parse and validate request body
    const body = await request.json();
    const {
      successUrl,
      cancelUrl,
      paymentMethod = 'card',
    } = body as {
      successUrl?: string;
      cancelUrl?: string;
      paymentMethod?: 'card' | 'blik';
    };

    // Validate payment method
    if (paymentMethod !== 'card' && paymentMethod !== 'blik') {
      return NextResponse.json(
        {
          error: {
            code: 'INVALID_REQUEST',
            message: 'Payment method must be either "card" or "blik"',
          },
        },
        { status: 400 }
      );
    }

    // Sanitize URLs to prevent open redirects
    const sanitizedSuccessUrl = sanitizeUrl(
      successUrl || '',
      process.env.NEXT_PUBLIC_APP_URL
    );
    const sanitizedCancelUrl = sanitizeUrl(
      cancelUrl || '',
      process.env.NEXT_PUBLIC_APP_URL
    );

    // Get or create Stripe customer
    const customerId = await getOrCreateStripeCustomer(user.id, user.email!);

    // Get price ID based on payment method
    const priceId = getPriceId(paymentMethod);

    // Determine payment method types and locale
    const paymentMethodTypes: ('card' | 'blik')[] =
      paymentMethod === 'blik' ? ['blik'] : ['card'];
    const locale = paymentMethod === 'blik' ? 'pl' : 'auto';

    // Create Stripe Checkout session
    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      customer: customerId,
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      payment_method_types: paymentMethodTypes,
      allow_promotion_codes: false,
      automatic_tax: {
        enabled: true,
      },
      locale: locale as any,
      success_url: sanitizedSuccessUrl,
      cancel_url: sanitizedCancelUrl,
      metadata: {
        user_id: user.id,
      },
    });

    if (!session.url) {
      return NextResponse.json(
        {
          error: {
            code: 'STRIPE_ERROR',
            message: 'Failed to create checkout session URL',
          },
        },
        { status: 502 }
      );
    }

    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error('Checkout error:', error);

    // Handle Stripe-specific errors
    if (error && typeof error === 'object' && 'type' in error) {
      return NextResponse.json(
        {
          error: {
            code: 'STRIPE_ERROR',
            message: 'Failed to create checkout session',
          },
        },
        { status: 502 }
      );
    }

    return NextResponse.json(
      {
        error: {
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to create checkout session',
        },
      },
      { status: 500 }
    );
  }
}

