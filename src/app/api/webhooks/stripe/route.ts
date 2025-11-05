import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { stripe } from '@/lib/stripe/client';
import {
  isEventProcessed,
  markEventProcessed,
  updateUserPlan,
  setStripeCustomerId,
  updateUserPlanWithExpiry,
} from '@/lib/stripe/utils';

// Force Node.js runtime for Stripe webhook handling
export const runtime = 'nodejs';

/**
 * POST /api/webhooks/stripe
 * 
 * Handles Stripe webhook events for both subscription and one-time payment management.
 * Processes events like checkout completion, subscription updates, and deletions.
 * 
 * Events handled:
 * - checkout.session.completed: Set customer ID and upgrade to Pro
 *   - For subscriptions (Card): Pro until subscription ends
 *   - For one-time payments (BLIK): Pro lazy downgrade until 30 days after payment
 * - customer.subscription.updated: Update plan based on subscription status
 * - customer.subscription.deleted: Downgrade to Free
 * - invoice.payment_failed: Log for monitoring (no immediate action)
 * 
 * Security:
 * - Verifies webhook signature using STRIPE_WEBHOOK_SECRET
 * - Implements idempotency using stripe_events table
 */
export async function POST(request: NextRequest) {
  const signature = request.headers.get('stripe-signature');

  if (!signature) {
    return NextResponse.json(
      {
        error: {
          code: 'MISSING_SIGNATURE',
          message: 'Missing Stripe signature header',
        },
      },
      { status: 400 }
    );
  }

  if (!process.env.STRIPE_WEBHOOK_SECRET) {
    console.error('STRIPE_WEBHOOK_SECRET environment variable is not set');
    return NextResponse.json(
      {
        error: {
          code: 'CONFIGURATION_ERROR',
          message: 'Webhook configuration error',
        },
      },
      { status: 500 }
    );
  }

  let event: Stripe.Event;

  try {
    // Get raw body for signature verification
    const rawBody = await request.text();

    // Verify webhook signature
    event = stripe.webhooks.constructEvent(
      rawBody,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (error) {
    console.error('Webhook signature verification failed:', error);
    return NextResponse.json(
      {
        error: {
          code: 'INVALID_SIGNATURE',
          message: 'Invalid webhook signature',
        },
      },
      { status: 400 }
    );
  }

  // Check if event was already processed (idempotency)
  const alreadyProcessed = await isEventProcessed(event.id);
  if (alreadyProcessed) {
    console.log(`Event ${event.id} already processed, skipping`);
    return NextResponse.json({ received: true, skipped: true });
  }

  try {
    // Handle different event types
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        console.log('Processing checkout.session.completed:', session.id);

        if (session.customer && session.metadata?.user_id) {
          const customerId = session.customer as string;
          const userId = session.metadata.user_id;
          const paymentMethod = session.metadata?.payment_method;

          // Set customer ID
          await setStripeCustomerId(userId, customerId);

          // For one-time payment (BLIK) - set expiration date to +30 days
          if (paymentMethod === 'blik' && session.mode === 'payment') {
            const expiresAt = new Date();
            expiresAt.setDate(expiresAt.getDate() + 30);
            await updateUserPlanWithExpiry(customerId, 'pro', expiresAt);
            console.log(`User ${userId} upgraded to Pro (expires: ${expiresAt.toISOString()})`);
          } 
          // For subscription (Card) - no expiration date
          else {
            await updateUserPlanWithExpiry(customerId, 'pro', null);
            console.log(`User ${userId} upgraded to Pro (subscription, no expiration)`);
          }
        }
        break;
      }

      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription;
        console.log('Processing customer.subscription.updated:', subscription.id);

        const customerId = subscription.customer as string;
        const status = subscription.status;

        // Update plan based on subscription status
        if (status === 'active') {
          await updateUserPlan(customerId, 'pro');
          console.log(`Customer ${customerId} subscription active, plan set to Pro`);
        } else if (status === 'canceled' || status === 'incomplete_expired') {
          await updateUserPlan(customerId, 'free');
          console.log(
            `Customer ${customerId} subscription ${status}, plan set to Free`
          );
        }
        // For 'past_due' or 'unpaid': keep Pro until Stripe cancels at period end
        else {
          console.log(
            `Customer ${customerId} subscription status ${status}, no plan change`
          );
        }
        break;
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription;
        console.log('Processing customer.subscription.deleted:', subscription.id);

        const customerId = subscription.customer as string;

        // Downgrade to Free
        await updateUserPlan(customerId, 'free');
        console.log(`Customer ${customerId} subscription deleted, plan set to Free`);
        break;
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice;
        console.log('Processing invoice.payment_failed:', invoice.id);

        // Log for monitoring/support, no immediate plan change
        console.warn(
          `Payment failed for customer ${invoice.customer}, invoice ${invoice.id}`
        );
        break;
      }

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    // Mark event as processed
    await markEventProcessed(event.id);

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('Error processing webhook event:', error);

    // Still mark as processed to avoid infinite retries
    // Stripe will retry failed webhooks automatically
    try {
      await markEventProcessed(event.id);
    } catch (markError) {
      console.error('Failed to mark event as processed:', markError);
    }

    return NextResponse.json(
      {
        error: {
          code: 'WEBHOOK_PROCESSING_ERROR',
          message: 'Error processing webhook event',
        },
      },
      { status: 500 }
    );
  }
}

