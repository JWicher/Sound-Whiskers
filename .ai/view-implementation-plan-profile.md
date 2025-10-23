## Profile View Implementation Plan

### 1. Overview
The Profile view (`/profile`) lets a signed-in user manage account information, plan/billing, usage quotas, Spotify linking, and account deletion. It aggregates small, focused sections, each with clear actions and robust error handling, using shadcn/ui components with accessible patterns.

- Primary goals:
  - View and update `username`
  - See current plan (`free`/`pro`) and manage billing
  - See usage: playlists count and AI quota (used/limit/remaining, monthly reset)
  - Link/unlink Spotify account; show status
  - Delete account (danger zone with confirmation)
- Related backend:
  - GET `/api/profile`
  - PATCH `/api/profile`
  - DELETE `/api/profile`
  - GET `/api/profile/usage`
  - Billing: `POST /api/billing/checkout`, `POST /api/billing/portal`
  - Spotify: `GET /api/spotify/status`, `DELETE /api/spotify/link`, `GET /api/spotify/login` (OAuth start)

### 2. View Routing
- Path: `/profile`
- Route type: Server component wrapper (RSC) for initial data and SEO, with a nested Client Component for interactivity.
- Access: Authenticated only. 401 → redirect to `/auth` with `returnTo=/profile`.
- Caching: `fetch` with `no-store` for user-scoped data; mutate on changes.

### 3. Component Structure
```
ProfilePage (Server component)
└─ ProfileClient (Client component)
   ├─ HeaderBar
   │   └─ <h1>Profile</h1>
   ├─ ProfileGrid (responsive grid/stack)
   │   ├─ AccountCard (username form)
   │   ├─ PlanBillingCard (current plan, upgrade/portal)
   │   ├─ UsageCard (playlists & AI quota)
   │   ├─ SpotifyCard (status, link/unlink)
   │   └─ DangerZoneCard (delete account)
   └─ ToastProvider (shadcn/ui)
```

### 4. Component Details
#### 4.1 ProfilePage
- Purpose: RSC wrapper that preloads profile and usage (optional; can hydrate via client). Passes data as props to `ProfileClient`. Handles 401 via server-side guard.
- Props: `{ initialProfile?: ProfileDto; initialUsage?: UsageDto }`

#### 4.2 ProfileClient
- Purpose: Client-side logic, forms, and actions. Orchestrates sections and toasts.
- Responsibilities:
  - Initialize SWR/React Query with `initialProfile`/`initialUsage` (if provided)
  - Handle optimistic UI where safe (e.g., username save button states)
  - Centralize error → toast mapping

#### 4.3 HeaderBar
- Elements: Page title and optional subtitle.

#### 4.4 AccountCard (username form)
- Elements: `Card` with `Form`, `Label`, `Input`, `Button` (Save)
- Validation: zod schema; trim; 3–30 chars; allowed: letters, numbers, `_` and `-`
- Behavior: Disabled state while saving; success toast on update; inline error messages on 400.
- API: `PATCH /api/profile`

#### 4.5 PlanBillingCard
- Elements: `Card` with current plan badge, buttons: `Upgrade` (if free), `Manage billing` (if pro)
- API:
  - `POST /api/billing/checkout` (Upgrade)
  - `POST /api/billing/portal` (Manage)
- Behavior: Opens Stripe Checkout/Portal via returned URL; loading states; error toasts.

#### 4.6 UsageCard
- Elements: `Card` with two sections
  - Playlists: `count / 200` (soft cap)
  - AI: `used / limit`, `remaining`, `resetAt` (UTC)
- API: `GET /api/profile/usage`
- Behavior: Refresh on page load and after AI actions elsewhere; friendly copy for limits.

#### 4.7 SpotifyCard
- Elements: `Card` with status badge: `linked`, `expired`, or `not linked`
- Actions:
  - Link: start OAuth (`GET /api/spotify/login`)
  - Unlink: `DELETE /api/spotify/link` (confirm dialog)
- API: `GET /api/spotify/status`, `DELETE /api/spotify/link`
- Behavior: If expired, prompt relink; after link/unlink, refetch status and show toast.

#### 4.8 DangerZoneCard
- Elements: `Card` with `Delete account` button (destructive), confirm `Dialog`
- Confirmation: Require typing `DELETE` (or checkbox) to proceed
- API: `DELETE /api/profile`
- Behavior: On success, sign out and redirect to `/auth` with goodbye message; handle 401 gracefully.

### 5. Types
| Name | Description |
|------|-------------|
| `ProfileDto` | `{ userId: string; username: string; plan: 'free' | 'pro'; createdAt: string; updatedAt: string }` |
| `UpdateProfileCommand` | `{ username: string }` |
| `UsageDto` | `{ playlists: { count: number; limit: number }; ai: { used: number; limit: number; remaining: number; resetAt: string } }` |
| `SpotifyStatusDto` | `{ linked: boolean; expired?: boolean }` |

All DTOs should be sourced from `@/types` or colocated API route types to avoid duplication.

### 6. State Management
- Hooks (client):
  - `useProfile()` – fetches GET `/api/profile`; exposes `{ data, isLoading, error, updateUsername }`
  - `useUsage()` – fetches GET `/api/profile/usage`
  - `useSpotifyStatus()` – fetches GET `/api/spotify/status`
- Forms: `react-hook-form` + `zodResolver` for username. Debounce not needed.
- Mutations: Call API routes; on success `mutate()` relevant caches.

### 7. API Integration
| Component / Hook | Method & Endpoint | Request Type | Response Type |
|------------------|-------------------|--------------|---------------|
| `ProfilePage` (RSC, optional prefetch) | GET `/api/profile`, GET `/api/profile/usage` | `null` | `ProfileDto`, `UsageDto` |
| `AccountCard` (save) | PATCH `/api/profile` | `UpdateProfileCommand` | `ProfileDto` |
| `UsageCard` | GET `/api/profile/usage` | `null` | `UsageDto` |
| `SpotifyCard` (status) | GET `/api/spotify/status` | `null` | `SpotifyStatusDto` |
| `SpotifyCard` (unlink) | DELETE `/api/spotify/link` | `null` | `{ ok: true }` |
| `PlanBillingCard` (upgrade) | POST `/api/billing/checkout` | `{}` | `{ url: string }` |
| `PlanBillingCard` (portal) | POST `/api/billing/portal` | `{}` | `{ url: string }` |
| `DangerZoneCard` (delete) | DELETE `/api/profile` | `null` | `204 No Content` |

### 8. User Interactions
1. View profile → data loads; skeletons shown.
2. Update username → validate → save → success toast → data refetch.
3. Click Upgrade/Manage → request session → redirect to Stripe URL.
4. View usage → numbers update on load; show reset date.
5. Link Spotify → start OAuth; on return, status becomes linked.
6. Unlink Spotify → confirm dialog → unlink → toast → status updates.
7. Delete account → confirm → delete → sign out → redirect to `/auth`.

### 9. Conditions & Validation
- Username: required, trimmed, 3–30 chars; regex `/^[A-Za-z0-9_-]+$/`.
- Auth: 401 → redirect to `/auth` with `returnTo`.
- Billing buttons are disabled for anonymous/401 and show relevant errors.
- Danger Zone: require explicit confirmation to proceed.

### 10. Error Handling
| Scenario | UI Reaction |
|----------|-------------|
| 400 Validation (username) | Inline field errors + toast |
| 401 Unauthorized | Redirect to sign-in |
| 403 Email not verified (for certain actions) | Banner with instructions to verify |
| 404 N/A (not expected for current user) | Generic error toast |
| 409 Conflict (rare) | Toast with actionable guidance |
| 429 Rate limited (Spotify/billing) | Toast: “Try again in X s” |
| Network / 5xx | Toast “Something went wrong” |

### 11. Implementation Steps
1. Route setup: Create `src/app/profile/page.tsx` as Server Component; guard auth and pass initial props or leave client to fetch.
2. Create `ProfileClient.tsx` (Client Component) to render sections and orchestrate hooks.
3. Build section components with shadcn/ui:
   - `AccountCard`: `card`, `form`, `input`, `button`
   - `PlanBillingCard`: `card`, `badge`, `button`
   - `UsageCard`: `card`, `badge`, `separator`
   - `SpotifyCard`: `card`, `badge`, `button`, `dialog`
   - `DangerZoneCard`: `card`, `button`, `dialog`
4. Implement hooks: `useProfile`, `useUsage`, `useSpotifyStatus`; wire to API routes.
5. Validation: zod schema for username; integrate with RHF (`zodResolver`).
6. Loading & empty states: skeletons for cards; disabled buttons during mutations.
7. Toasters & dialogs: success/failure toasts; confirm dialogs for destructive actions.
8. Navigation: Add `Profile` item to top navigation if not present.
9. QA: 401 redirect, username validation, billing redirects, Spotify link/unlink, delete flow.
10. Lint & type checks; accessibility (labels, roles, focus trap, aria-live for errors).

### 12. Accessibility & Security
- Use proper labels (`aria-label`, `aria-describedby`) for form inputs.
- Dialogs: focus trap, ESC close, `aria-labelledby`/`aria-describedby`.
- Destructive actions: clear copy and confirmation step.
- Respect RLS: all API routes operate under the user’s session; no client direct DB access.

### 13. shadcn/ui Components
- Prefer shadcn/ui primitives over custom elements; import from `@/components/ui`.
- Styling with Tailwind and `cn()` helper; support dark mode automatically.


