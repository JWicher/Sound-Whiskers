/**
 * Feature Flag Utilities for Server Components and Server Actions
 * 
 * SERVER-ONLY utilities for checking feature flags in Next.js Server Components.
 */

import { isFeatureEnabled } from './flags';
import { FeatureFlagKey } from './types';

/**
 * Check if a feature should be rendered in a Server Component
 * 
 * @param featureKey - Feature flag to check
 * @returns true if feature should be rendered, false otherwise
 * 
 * @example
 * ```tsx
 * // In a Server Component
 * export default async function PlaylistsPage() {
 *   const showAIFeature = shouldRenderFeature('generateWithAI');
 *   
 *   return (
 *     <div>
 *       {showAIFeature && <AIGenerateButton />}
 *     </div>
 *   );
 * }
 * ```
 */
export function shouldRenderFeature(featureKey: FeatureFlagKey): boolean {
  return isFeatureEnabled(featureKey);
}

/**
 * Get feature flag status to pass to client components (as props only!)
 * 
 * IMPORTANT: Only use this when you need to pass the flag status to a client component.
 * The value will be visible in the HTML source, but this is acceptable for UI-only features.
 * Never use this for security-critical features.
 * 
 * @param featureKey - Feature flag to check
 * @returns Object with enabled status
 * 
 * @example
 * ```tsx
 * // In a Server Component
 * export default async function PlaylistsPage() {
 *   const aiFeature = getFeatureFlagForClient('generateWithAI');
 *   
 *   return <PlaylistList aiEnabled={aiFeature.enabled} />;
 * }
 * 
 * // In Client Component (PlaylistList.tsx)
 * 'use client';
 * export function PlaylistList({ aiEnabled }: { aiEnabled: boolean }) {
 *   return <div>{aiEnabled && <Button>Generate with AI</Button>}</div>;
 * }
 * ```
 */
export function getFeatureFlagForClient(featureKey: FeatureFlagKey): { enabled: boolean } {
  return {
    enabled: isFeatureEnabled(featureKey),
  };
}

/**
 * Throw an error if feature is not enabled
 * Useful for server actions that should only run when feature is enabled
 * 
 * @param featureKey - Feature flag to check
 * @throws Error if feature is disabled
 * 
 * @example
 * ```ts
 * 'use server';
 * export async function generatePlaylistAction(prompt: string) {
 *   assertFeatureEnabled('generateWithAI');
 *   
 *   // Feature is enabled, continue with action
 * }
 * ```
 */
export function assertFeatureEnabled(featureKey: FeatureFlagKey): void {
  if (!isFeatureEnabled(featureKey)) {
    console.warn(`[FeatureFlags] Attempted to use disabled feature: ${featureKey}`);
    throw new Error(`Feature "${featureKey}" is not enabled in this environment`);
  }
}

