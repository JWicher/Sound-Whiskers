/**
 * Feature Flag Guards for API Routes
 * 
 * SERVER-ONLY utilities for protecting API routes behind feature flags.
 */

import { NextResponse } from 'next/server';
import { isFeatureEnabled } from './flags';
import { FeatureFlagKey } from './types';

/**
 * Check if a feature is enabled and return appropriate error response if not
 * 
 * @param featureKey - Feature flag to check
 * @returns NextResponse with 404 error if feature is disabled, null if enabled
 * 
 * @example
 * ```ts
 * export async function POST(request: NextRequest) {
 *   const guardResponse = requireFeature('generateWithAI');
 *   if (guardResponse) return guardResponse;
 *   
 *   // Feature is enabled, continue with handler logic
 * }
 * ```
 */
export function requireFeature(featureKey: FeatureFlagKey): NextResponse | null {
  if (!isFeatureEnabled(featureKey)) {
    console.warn(`[FeatureFlags] Access denied to disabled feature: ${featureKey}`);
    
    return NextResponse.json(
      {
        error: 'Feature not available',
        code: 'FEATURE_DISABLED',
        message: 'This feature is currently not available.',
      },
      { status: 404 }
    );
  }

  return null;
}

/**
 * Higher-order function that wraps an API route handler with feature flag check
 * 
 * @param featureKey - Feature flag to check
 * @param handler - The actual API route handler
 * @returns Wrapped handler that checks feature flag first
 * 
 * @example
 * ```ts
 * export const POST = withFeatureFlag('generateWithAI', async (request: NextRequest) => {
 *   // This only runs if feature is enabled
 *   return NextResponse.json({ success: true });
 * });
 * ```
 */
export function withFeatureFlag<T extends (...args: never[]) => Promise<NextResponse>>(
  featureKey: FeatureFlagKey,
  handler: T
): T {
  return (async (...args: Parameters<T>) => {
    const guardResponse = requireFeature(featureKey);
    if (guardResponse) {
      return guardResponse;
    }

    return handler(...args);
  }) as T;
}

