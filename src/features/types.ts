/**
 * Feature Flags System - Type Definitions
 * 
 * All feature flags are server-side only to prevent client-side manipulation.
 */

/**
 * Available environment names
 */
export type EnvironmentName = 'local' | 'integration' | 'production';

/**
 * Feature flag keys - add new features here
 */
export type FeatureFlagKey = 
  | 'generateWithAI';

/**
 * Feature flag configuration for a single environment
 */
export type FeatureFlagConfig = {
  [K in FeatureFlagKey]: boolean;
};

/**
 * Complete feature flags configuration for all environments
 */
export type FeatureFlagsConfiguration = {
  [E in EnvironmentName]: FeatureFlagConfig;
};

