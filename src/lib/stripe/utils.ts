/**
 * Stripe Utility Functions
 * 
 * Helper functions for URL validation, customer management, and webhook processing.
 */

import { stripe } from './client';
import { createClient } from '@/lib/supabase/server';

/**
 * Validates and sanitizes a URL to prevent open redirects
 * @param url - URL to validate
 * @param allowedOrigin - Allowed origin (defaults to NEXT_PUBLIC_APP_URL)
 * @returns Sanitized URL or fallback URL
 */
export function sanitizeUrl(url: string, allowedOrigin?: string): string {
  const fallbackUrl = `${process.env.NEXT_PUBLIC_APP_URL}/profile`;
  const origin = allowedOrigin || process.env.NEXT_PUBLIC_APP_URL;

  if (!url || !origin) {
    return fallbackUrl;
  }

  try {
    const parsedUrl = new URL(url);
    const parsedOrigin = new URL(origin);

    // Check if the URL's origin matches the allowed origin
    if (parsedUrl.origin === parsedOrigin.origin) {
      return url;
    }

    return fallbackUrl;
  } catch {
    // Invalid URL format
    return fallbackUrl;
  }
}

/**
 * Gets or creates a Stripe customer for a user
 * @param userId - Supabase user ID
 * @param email - User email
 * @returns Stripe customer ID
 */
export async function getOrCreateStripeCustomer(
  userId: string,
  email: string
): Promise<string> {
  const supabase = createClient();

  // First, check if customer already exists in our database
  const { data: profile } = await supabase
    .from('profiles')
    .select('stripe_customer_id')
    .eq('id', userId)
    .single();

  if (profile?.stripe_customer_id) {
    return profile.stripe_customer_id;
  }

  // Create new Stripe customer
  const customer = await stripe.customers.create({
    email,
    metadata: {
      user_id: userId,
    },
  });

  // Save customer ID to database
  await supabase
    .from('profiles')
    .update({ stripe_customer_id: customer.id })
    .eq('id', userId);

  return customer.id;
}

/**
 * Determines the Stripe price ID based on payment method
 * @param paymentMethod - Payment method type ('card' or 'blik')
 * @returns Stripe price ID
 */
export function getPriceId(paymentMethod: 'card' | 'blik' = 'card'): string {
  if (paymentMethod === 'blik') {
    const priceId = process.env.STRIPE_PRICE_PRO_BLIK;
    if (!priceId) {
      throw new Error('Missing STRIPE_PRICE_PRO_BLIK environment variable');
    }
    return priceId;
  }

  const priceId = process.env.STRIPE_PRICE_PRO_CARD;
  if (!priceId) {
    throw new Error('Missing STRIPE_PRICE_PRO_CARD environment variable');
  }
  return priceId;
}

/**
 * Checks if a Stripe event has already been processed (idempotency check)
 * @param eventId - Stripe event ID
 * @returns true if event was already processed
 */
export async function isEventProcessed(eventId: string): Promise<boolean> {
  const supabase = createClient();

  const { data } = await supabase
    .from('stripe_events')
    .select('id')
    .eq('id', eventId)
    .single();

  return !!data;
}

/**
 * Marks a Stripe event as processed
 * @param eventId - Stripe event ID
 */
export async function markEventProcessed(eventId: string): Promise<void> {
  const supabase = createClient();

  await supabase
    .from('stripe_events')
    .insert({ id: eventId });
}

/**
 * Updates user plan based on subscription status
 * @param customerId - Stripe customer ID
 * @param plan - Plan type ('free' or 'pro')
 */
export async function updateUserPlan(
  customerId: string,
  plan: 'free' | 'pro'
): Promise<void> {
  const supabase = createClient();

  await supabase
    .from('profiles')
    .update({ plan })
    .eq('stripe_customer_id', customerId);
}

/**
 * Sets the Stripe customer ID for a user
 * @param userId - Supabase user ID
 * @param customerId - Stripe customer ID
 */
export async function setStripeCustomerId(
  userId: string,
  customerId: string
): Promise<void> {
  const supabase = createClient();

  await supabase
    .from('profiles')
    .update({ stripe_customer_id: customerId })
    .eq('id', userId);
}

