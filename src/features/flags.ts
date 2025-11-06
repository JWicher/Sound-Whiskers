/**
 * Feature Flags Core Logic
 * 
 * SERVER-ONLY module for checking feature flags.
 * Never import this in client components.
 */

import { FEATURE_FLAGS, DEFAULT_FEATURE_FLAG_VALUE } from './config';
import { EnvironmentName, FeatureFlagKey } from './types';

/**
 * Get current environment name from ENV_NAME environment variable
 */
function getEnvironment(): EnvironmentName {
  const envName = process.env.ENV_NAME?.toLowerCase();
  
  if (!envName) {
    console.error('[FeatureFlags] ENV_NAME environment variable is not set. Defaulting to "local".');
    return 'local';
  }

  if (envName !== 'local' && envName !== 'integration' && envName !== 'production') {
    console.error(`[FeatureFlags] Invalid ENV_NAME "${envName}". Must be one of: local, integration, production. Defaulting to "local".`);
    return 'local';
  }

  return envName as EnvironmentName;
}

/**
 * Check if a feature flag is enabled for the current environment
 * 
 * @param key - Feature flag key to check
 * @returns true if the feature is enabled, false otherwise
 * 
 * @example
 * ```ts
 * if (isFeatureEnabled('generateWithAI')) {
 *   // Feature is enabled
 * }
 * ```
 */
export function isFeatureEnabled(key: FeatureFlagKey): boolean {
  const environment = getEnvironment();
  const config = FEATURE_FLAGS[environment];

  if (config === undefined) {
    console.error(`[FeatureFlags] Configuration not found for environment "${environment}". Using default value.`);
    return DEFAULT_FEATURE_FLAG_VALUE;
  }

  const flagValue = config[key];

  if (flagValue === undefined) {
    console.error(`[FeatureFlags] Feature flag "${key}" not found in configuration for environment "${environment}". Using default value.`);
    return DEFAULT_FEATURE_FLAG_VALUE;
  }

  return flagValue;
}

/**
 * Get all feature flags for the current environment
 * Useful for debugging and logging
 */
export function getAllFeatureFlags() {
  const environment = getEnvironment();
  return {
    environment,
    flags: FEATURE_FLAGS[environment],
  };
}

/**
 * Get current environment name
 * Useful for logging and debugging
 */
export function getCurrentEnvironment(): EnvironmentName {
  return getEnvironment();
}

