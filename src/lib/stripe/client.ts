/**
 * Stripe Client Configuration
 * 
 * Initializes and exports a configured Stripe instance for server-side usage.
 * Requires STRIPE_SECRET_KEY environment variable.
 */

import Stripe from 'stripe';

if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error('Missing STRIPE_SECRET_KEY environment variable');
}

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2025-10-29.clover',
  typescript: true,
});

