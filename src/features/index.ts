/**
 * Feature Flags System
 * 
 * SERVER-ONLY module for managing feature flags across environments.
 * 
 * @example
 * ```ts
 * // In API routes
 * import { requireFeature, isFeatureEnabled } from '@/features';
 * 
 * export async function POST(request: NextRequest) {
 *   const guardResponse = requireFeature('generateWithAI');
 *   if (guardResponse) return guardResponse;
 *   // ... rest of handler
 * }
 * ```
 * 
 * @example
 * ```tsx
 * // In Server Components
 * import { shouldRenderFeature } from '@/features';
 * 
 * export default async function Page() {
 *   const showAI = shouldRenderFeature('generateWithAI');
 *   return <div>{showAI && <AIButton />}</div>;
 * }
 * ```
 */

// Core functionality
export { isFeatureEnabled, getAllFeatureFlags, getCurrentEnvironment } from './flags';

// API route guards
export { requireFeature, withFeatureFlag } from './guards';

// Server component utilities
export { shouldRenderFeature, getFeatureFlagForClient, assertFeatureEnabled } from './server-utils';

// Types (for type safety in consuming code)
export type { FeatureFlagKey, EnvironmentName, FeatureFlagConfig } from './types';

