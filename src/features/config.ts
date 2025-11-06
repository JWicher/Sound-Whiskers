/**
 * Feature Flags Configuration
 * 
 * Define feature flags for each environment here.
 * 
 * SECURITY: This file is SERVER-ONLY. Never import it in client components.
 */

import { FeatureFlagsConfiguration } from './types';

export const FEATURE_FLAGS: FeatureFlagsConfiguration = {
  local: {
    generateWithAI: true,
  },
  integration: {
    generateWithAI: true,
  },
  production: {
    generateWithAI: true, // Set to true when ready to release
  },
};

/**
 * Default fallback when a feature flag is not found
 */
export const DEFAULT_FEATURE_FLAG_VALUE = false;

