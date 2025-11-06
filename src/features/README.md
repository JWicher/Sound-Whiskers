# Feature Flags System

A server-only feature flag system for controlling feature availability across different environments in Sound Whiskers.

## Overview

This module provides a type-safe, environment-based feature flag system that:
- ✅ **Server-only** - Prevents client-side manipulation
- ✅ **Type-safe** - Full TypeScript support with autocomplete
- ✅ **Simple** - Boolean flags for straightforward enable/disable
- ✅ **Environment-aware** - Different configurations per environment
- ✅ **Fail-safe** - Defaults to `false` with error logging

## Architecture

```
src/features/
├── index.ts            # Public API exports
├── types.ts            # TypeScript type definitions
├── config.ts           # Feature flag configurations per environment
├── flags.ts            # Core feature flag logic
├── guards.ts           # API route protection utilities
├── server-utils.ts     # Server Component helpers
└── README.md           # This file
```

## Environment Configuration

The system uses the `ENV_NAME` environment variable to determine which configuration to use:

- `local` - Local development
- `integration` - Staging/integration environment
- `production` - Production environment

**Add to your `.env` file:**
```bash
ENV_NAME=local
```

## Usage

### 1. API Routes (Next.js Route Handlers)

#### Option A: Guard Function (Recommended)

```typescript
import { requireFeature } from '@/features';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  // Check feature flag first
  const guardResponse = requireFeature('generateWithAI');
  if (guardResponse) return guardResponse;

  // Feature is enabled - continue with handler logic
  const body = await request.json();
  // ... rest of your handler
}
```

#### Option B: Higher-Order Function

```typescript
import { withFeatureFlag } from '@/features';
import { NextRequest, NextResponse } from 'next/server';

export const POST = withFeatureFlag('generateWithAI', async (request: NextRequest) => {
  // This only runs if feature is enabled
  const body = await request.json();
  // ... rest of your handler
  return NextResponse.json({ success: true });
});
```

#### Option C: Manual Check

```typescript
import { isFeatureEnabled } from '@/features';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  if (!isFeatureEnabled('generateWithAI')) {
    return NextResponse.json(
      { error: 'Feature not available' },
      { status: 404 }
    );
  }

  // Feature is enabled - continue
}
```

### 2. Server Components (Next.js Pages)

#### Conditional Rendering

```tsx
import { shouldRenderFeature } from '@/features';

export default async function PlaylistsPage() {
  const showAIFeature = shouldRenderFeature('generateWithAI');

  return (
    <div>
      <h1>Playlists</h1>
      {showAIFeature && <AIGenerateButton />}
    </div>
  );
}
```

#### Passing to Client Components

```tsx
import { getFeatureFlagForClient } from '@/features';
import { PlaylistList } from '@/components/PlaylistList';

export default async function PlaylistsPage() {
  // Get feature flag status to pass as prop
  const aiFeature = getFeatureFlagForClient('generateWithAI');

  return (
    <div>
      <PlaylistList aiEnabled={aiFeature.enabled} />
    </div>
  );
}
```

**In the Client Component:**

```tsx
'use client';

interface PlaylistListProps {
  aiEnabled: boolean;
}

export function PlaylistList({ aiEnabled }: PlaylistListProps) {
  return (
    <div>
      {aiEnabled && <button>Generate with AI</button>}
    </div>
  );
}
```

### 3. Server Actions

```tsx
'use server';

import { assertFeatureEnabled } from '@/features';

export async function generatePlaylistAction(prompt: string) {
  // Will throw an error if feature is disabled
  assertFeatureEnabled('generateWithAI');

  // Feature is enabled - continue with action
  const result = await generatePlaylist(prompt);
  return result;
}
```

## Adding New Feature Flags

### Step 1: Add Type Definition

Edit `src/features/types.ts`:

```typescript
export type FeatureFlagKey = 
  | 'generateWithAI'
  | 'yourNewFeature';  // Add your new feature here
```

### Step 2: Configure Flag for All Environments

Edit `src/features/config.ts`:

```typescript
export const FEATURE_FLAGS: FeatureFlagsConfiguration = {
  local: {
    generateWithAI: true,
    yourNewFeature: true,  // Enable in local
  },
  integration: {
    generateWithAI: true,
    yourNewFeature: true,  // Enable in integration
  },
  production: {
    generateWithAI: false,
    yourNewFeature: false, // Disable in production until ready
  },
};
```

### Step 3: Use the Feature Flag

```typescript
import { isFeatureEnabled } from '@/features';

if (isFeatureEnabled('yourNewFeature')) {
  // Your feature code here
}
```

## API Reference

### Core Functions

#### `isFeatureEnabled(key: FeatureFlagKey): boolean`

Check if a feature flag is enabled for the current environment.

```typescript
import { isFeatureEnabled } from '@/features';

if (isFeatureEnabled('generateWithAI')) {
  // Feature is enabled
}
```

#### `getAllFeatureFlags()`

Get all feature flags for the current environment (useful for debugging).

```typescript
import { getAllFeatureFlags } from '@/features';

const flags = getAllFeatureFlags();
console.log(flags);
// {
//   environment: 'local',
//   flags: { generateWithAI: true, ... }
// }
```

#### `getCurrentEnvironment(): EnvironmentName`

Get the current environment name.

```typescript
import { getCurrentEnvironment } from '@/features';

const env = getCurrentEnvironment(); // 'local' | 'integration' | 'production'
```

### API Route Guards

#### `requireFeature(key: FeatureFlagKey): NextResponse | null`

Returns an error response if feature is disabled, `null` if enabled.

```typescript
import { requireFeature } from '@/features';

export async function POST(request: NextRequest) {
  const guardResponse = requireFeature('generateWithAI');
  if (guardResponse) return guardResponse;
  
  // Continue with handler
}
```

#### `withFeatureFlag(key: FeatureFlagKey, handler: Function)`

Higher-order function that wraps a handler with feature flag check.

```typescript
import { withFeatureFlag } from '@/features';

export const POST = withFeatureFlag('generateWithAI', async (request) => {
  // Handler only runs if feature is enabled
});
```

### Server Component Utilities

#### `shouldRenderFeature(key: FeatureFlagKey): boolean`

Check if a feature should be rendered (alias for `isFeatureEnabled` for clarity).

```typescript
import { shouldRenderFeature } from '@/features';

const show = shouldRenderFeature('generateWithAI');
```

#### `getFeatureFlagForClient(key: FeatureFlagKey): { enabled: boolean }`

Get feature flag status to pass to client components.

**⚠️ Important:** The value will be visible in HTML source. Only use for UI-only features, never for security-critical features.

```typescript
import { getFeatureFlagForClient } from '@/features';

const feature = getFeatureFlagForClient('generateWithAI');
// Pass feature.enabled as prop to client component
```

#### `assertFeatureEnabled(key: FeatureFlagKey): void`

Throw an error if feature is disabled (useful for server actions).

```typescript
import { assertFeatureEnabled } from '@/features';

assertFeatureEnabled('generateWithAI'); // Throws if disabled
```

## Configuration

### Environment Variables

**Required:**
- `ENV_NAME` - Must be `local`, `integration`, or `production`

**Example `.env`:**
```bash
ENV_NAME=local
```

**Example `.env.production`:**
```bash
ENV_NAME=production
```

### Default Behavior

- **Unknown/missing feature flag**: Returns `false` and logs error
- **Invalid environment**: Falls back to `local` and logs error
- **Missing ENV_NAME**: Falls back to `local` and logs error

## Security

### ✅ Server-Only Design

All feature flag logic runs on the server. Flags are never exposed to the client except when explicitly passed as props to client components.

### ✅ API Protection

API routes protected by feature flags return `404 Feature not available` when disabled, preventing discovery.

### ⚠️ Client Component Props

When you pass feature flags to client components using `getFeatureFlagForClient()`, the value becomes visible in the HTML source. This is acceptable for UI-only features (hiding buttons, tabs) but **never use this for security-critical features**.

**Safe:**
```tsx
// Hiding a button - user can't enable it without API access
const aiFeature = getFeatureFlagForClient('generateWithAI');
<Button disabled={!aiFeature.enabled}>Generate</Button>
```

**Not Safe:**
```tsx
// DON'T DO THIS - user can manipulate client-side code
const adminFeature = getFeatureFlagForClient('adminAccess');
if (adminFeature.enabled) {
  // Show admin panel - BAD!
}
```

## Best Practices

### 1. Check Flags Early

In API routes, check feature flags before authentication/authorization to fail fast:

```typescript
export async function POST(request: NextRequest) {
  // 1. Check feature flag first
  const guardResponse = requireFeature('generateWithAI');
  if (guardResponse) return guardResponse;

  // 2. Then authenticate
  const user = await authenticate(request);
  
  // 3. Then authorize
  // ...
}
```

### 2. Progressive Rollout

Use environments to progressively roll out features:

```typescript
{
  local: { newFeature: true },      // Test in development
  integration: { newFeature: true }, // Test in staging
  production: { newFeature: false }, // Keep disabled in production
}
```

When ready, flip `production` to `true`.

### 3. Feature Flag Naming

Use descriptive, action-oriented names:

✅ Good:
- `generateWithAI`
- `exportToSpotify`
- `advancedSearch`

❌ Bad:
- `feature1`
- `aiFeature`
- `newStuff`

### 4. Clean Up Old Flags

When a feature is fully released and stable:
1. Remove the feature flag from code
2. Remove it from `types.ts` and `config.ts`
3. Simplify the code to always use the feature

### 5. Document Flags

Add comments in `config.ts` for context:

```typescript
export const FEATURE_FLAGS: FeatureFlagsConfiguration = {
  local: {
    // AI playlist generation - requires OpenAI API
    // Depends on: OpenAI key, Pro plan billing
    generateWithAI: true,
  },
  // ...
};
```

## Troubleshooting

### "ENV_NAME environment variable is not set"

**Solution:** Add `ENV_NAME=local` to your `.env` file.

### "Feature flag not found in configuration"

**Solution:** Ensure the feature flag is defined in `config.ts` for all environments.

### TypeScript errors about unknown feature keys

**Solution:** Add the feature flag to the `FeatureFlagKey` type in `types.ts`.

### Feature flag always returns false

**Solution:** 
1. Check `ENV_NAME` is set correctly
2. Verify the feature is enabled in `config.ts` for your environment
3. Check server logs for error messages

### Client component doesn't hide the feature

**Solution:** Ensure you're using `getFeatureFlagForClient()` in a Server Component and passing it as a prop to the Client Component.

## Example: Complete Integration

Here's a complete example of adding a new feature flag:

### 1. Define the Feature Flag

```typescript
// src/features/types.ts
export type FeatureFlagKey = 
  | 'generateWithAI'
  | 'exportToDeezer'; // New feature
```

### 2. Configure It

```typescript
// src/features/config.ts
export const FEATURE_FLAGS: FeatureFlagsConfiguration = {
  local: {
    generateWithAI: true,
    exportToDeezer: true,
  },
  integration: {
    generateWithAI: true,
    exportToDeezer: false, // Not ready for integration yet
  },
  production: {
    generateWithAI: false,
    exportToDeezer: false,
  },
};
```

### 3. Protect the API Route

```typescript
// src/app/api/export/deezer/route.ts
import { requireFeature } from '@/features';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  const guardResponse = requireFeature('exportToDeezer');
  if (guardResponse) return guardResponse;

  // Handle Deezer export
  return NextResponse.json({ success: true });
}
```

### 4. Show/Hide in UI

```tsx
// src/app/playlists/[id]/page.tsx (Server Component)
import { getFeatureFlagForClient } from '@/features';

export default async function PlaylistDetailPage() {
  const deezerFeature = getFeatureFlagForClient('exportToDeezer');

  return (
    <PlaylistDetailClient showDeezerExport={deezerFeature.enabled} />
  );
}
```

```tsx
// src/components/PlaylistDetailClient.tsx (Client Component)
'use client';

interface Props {
  showDeezerExport: boolean;
}

export function PlaylistDetailClient({ showDeezerExport }: Props) {
  return (
    <div>
      <button>Export to Spotify</button>
      {showDeezerExport && <button>Export to Deezer</button>}
    </div>
  );
}
```

## Related Documentation

- [Environment Setup](../../docs/environment-setup.md)
- [API Development Guide](../../docs/api-development.md)
- [Deployment Guide](../../docs/deployment.md)

## Support

For questions or issues with the feature flag system, contact the development team or create an issue in the project repository.

