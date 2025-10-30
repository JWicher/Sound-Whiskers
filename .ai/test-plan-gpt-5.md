### Test Plan for Sound Whiskers

#### 1) Introduction and Testing Objectives
- **Purpose**: Validate that Sound Whiskers delivers a reliable, secure, and performant AI-powered playlist manager with Spotify export, billing, and Supabase-backed authentication, aligned with product requirements.
- **Objectives**:
  - Ensure core user journeys work end-to-end: authentication, playlist CRUD and reorder, Spotify linking/search/export, AI playlist generation, quotas, and billing.
  - Verify security controls: Supabase RLS, token encryption, webhook verification, least-privilege OAuth scopes.
  - Validate performance SLAs: search ≤ 25s, AI/export ≤ 60s, acceptable UI responsiveness.
  - Prevent regressions with automated tests in CI, including database migrations and API routes.

#### 2) Scope
- **In Scope**:
  - Frontend (Next.js App Router pages in `src/app/**`, components in `src/components/**`).
  - API routes under `src/app/api/**`.
  - Supabase schema/migrations in `supabase/migrations/**` with RLS policy behavior.
  - Spotify integration flows under `src/app/api/spotify/**` and playlist export under `src/app/api/playlists/[id]/export/spotify/route.ts`.
  - Billing flows under `src/app/api/billing/**`.
  - AI usage and quota gating logic (`src/app/api/profile/usage/route.ts`, any AI endpoints).
- **Out of Scope (initial)**:
  - Non-functional internationalization of UI (beyond AI EN/PL content outputs).
  - Cross-browser legacy support (focus on Chromium/WebKit/Firefox latest).

#### 3) Test Types
- **Unit Tests**:
  - Pure functions and hooks in `src/lib/**`, `src/components/**` (logic-heavy components).
  - Validators in `src/lib/validators/**`.
  - Service functions in `src/lib/services/**` (mock I/O via MSW or spies).
- **Integration Tests**:
  - Component integration with React Testing Library (forms, dialogs, DnD behavior for `ReorderableTrackList`).
  - API route handlers in `src/app/api/**` tested with a test server harness and MSW/recorded fixtures for Spotify/OpenRouter.
  - Supabase RLS/policies verification using a seeded test DB and anon/service roles.
- **End-to-End (E2E) Tests**:
  - Critical flows across UI → API → DB (auth, playlist CRUD, reorder, add tracks, export to Spotify, AI generation, billing).
  - Middleware/session flows in `src/middleware.ts`.
- **Security Tests**:
  - RLS enforcement and data isolation, token encryption at rest, OAuth scope enforcement, webhook signature verification, rate limiting behaviors.
- **Performance Tests**:
  - API latency and timeouts (search ≤ 25s, AI/export ≤ 60s).
  - UI render performance for playlist pages and large track lists.
- **Resilience/Failure Injection**:
  - Spotify rate limiting, network errors, expired tokens, AI timeouts/fallback.
- **Accessibility (A11y)**:
  - Basic aria/keyboard checks on shadcn/ui dialogs/forms/lists.
- **Visual Regression (Optional)**
  - Key screens: login, playlists list/detail, export dialog, billing card.

#### 4) Test Scenarios for Key Functionalities
- **Authentication (Supabase)**
  - Magic link and email/password registration/login at `src/app/auth/**`; email verification required.
  - Session persistence (~30 days) and auto-refresh via `src/middleware.ts`.
  - Password reset and verification flows; blocked access to protected pages when unauthenticated.
- **Profile**
  - Fetch/update profile via `src/app/api/profile/route.ts`; usage endpoint `src/app/api/profile/usage/route.ts`.
  - Account deletion removes user data, revokes Spotify tokens, and invalidates session.
- **Playlists**
  - Create/edit/delete: `src/app/api/playlists/route.ts`, `src/app/api/playlists/[id]/route.ts`.
  - Track operations: add/remove/reorder endpoints in `src/app/api/playlists/[id]/tracks/**`.
  - UI scenarios: `CreatePlaylistDialog`, `EditPlaylistDialog`, `ReorderableTrackList`, `UnsavedChangesBar`, `ExportDialog`.
  - Dedupe logic, metadata persistence in DB, position updates idempotency.
- **Spotify Integration**
  - OAuth login/link/callback under `src/app/api/spotify/**`; token encryption, refresh handling.
  - Search (`src/app/api/spotify/search/route.ts`): operators, market scoping, top N results, dedupe.
  - Export to Spotify (`src/app/api/playlists/[id]/export/spotify/route.ts`): correct scopes, rate-limit handling, private playlists by default.
- **AI Generation**
  - Prompting and result validation: ≤ 20 tracks, dedupe, EN/PL support, timeout ≤ 60s.
  - Fallback to Spotify Recommendations on AI timeout/failure.
  - Quota gating: free vs paid (3 vs 50/month) tied to billing state and current billing window.
- **Billing (Stripe)**
  - Checkout and portal flows under `src/app/api/billing/**`.
  - Webhook signature verification and idempotent state changes; subscription status transitions drive quota limits.
  - Downgrade paths when unpaid; UI updates on `PlanBillingCard`, `UsageCard`.
- **Security & RLS**
  - Ensure users can only access their rows; attempts to access others’ playlists/tracks are denied.
  - Verify only encrypted refresh tokens are stored; no secrets in client bundles.
  - Rate limiting for search/AI endpoints (if implemented).
- **Error Handling**
  - Standardized API errors using `src/lib/errors/**` mapped to user-friendly UI toasts/modals.
  - Network/server failures render recoverable UI states.

#### 5) Test Environment
- **Local**:
  - Node 20, Next.js 14, TypeScript 5, Tailwind CSS per project.
  - Supabase: use Supabase CLI with a dedicated test project; apply `supabase/migrations/**` on start; seed test data.
  - Env files: `.env.local` for dev, `.env.test` for tests (no production keys).
- **CI**:
  - GitHub Actions runners with Node 20.
  - Supabase service via CLI or ephemeral managed test instance; run migrations on CI start.
  - Headless browsers for Playwright (Chromium, WebKit, Firefox).
- **Third-party Sandboxes**:
  - Spotify test app credentials (restricted scopes).
  - Stripe test keys and Stripe CLI for webhook testing.
  - OpenRouter test key; MSW to simulate failures/timeouts.

#### 6) Testing Tools
- **Unit/Integration**: Vitest, @testing-library/react, @testing-library/user-event.
- **API Integration**: Vitest test server harness; MSW for HTTP mocks; optional `supertest` if spinning a local Next server.
- **E2E**: Playwright (with project configs per browser).
- **DB/RLS**: Supabase CLI, SQL assertions, role-based sessions (anon vs service) via PostgREST or Supabase client; optional `pgTAP` for SQL logic.
- **Mocking**: MSW with fixtures; nock (optional) for Node-side HTTP mocking.
- **Coverage**: v8/istanbul via Vitest; thresholds set per module.
- **A11y**: axe-core via jest-axe or @axe-core/playwright.
- **Performance**: Playwright traces; k6 (optional) for API load.

#### 7) Test Schedule
- **Week 1**:
  - Set up CI, test env, Supabase migrations in tests; seed data.
  - Unit tests for validators/services/hooks; component tests for auth and playlist dialogs.
  - API integration tests for profile/playlists CRUD; basic RLS checks.
- **Week 2**:
  - E2E for auth, playlist CRUD/reorder/add/remove tracks.
  - Spotify OAuth/link/search/export tests using MSW + limited live tests.
  - AI generation tests with timeout/fallback and quota enforcement.
- **Week 3**:
  - Billing flows (checkout/portal/webhooks) and subscription state gating.
  - Security/a11y/performance passes; resilience tests (rate limiting, token expiry).
  - Regression suite stabilization, flake reduction, coverage improvements.
- **Ongoing**:
  - PR-gated unit/integration; nightly E2E + RLS + performance smoke.

#### 8) Acceptance Criteria
- **Functional**:
  - All P0/P1 E2E scenarios pass across Chromium/WebKit/Firefox.
  - API route tests pass with proper status codes and error bodies.
  - AI: ≤ 60s response; fallback engaged on failure; ≤ 20 deduped tracks; EN/PL supported.
  - Search: ≤ 25s; top-N; correct market scoping; dedupe.
  - Export: creates/updates playlist with correct track order and privacy settings.
- **Security**:
  - RLS denies cross-tenant access; 0 critical security defects.
  - Spotify refresh tokens encrypted at rest; secrets never exposed to client.
  - Webhooks verified and idempotent; least-privilege scopes enforced.
- **Quality**:
  - Code coverage: backend libs ≥ 80%, UI ≥ 70%, critical modules ≥ 90%.
  - No flaky tests over 3 consecutive CI runs; Playwright retries ≤ 1.
- **Performance**:
  - P95 API latencies: search ≤ 2s (server work), AI/export under global timeouts; acceptable UI TTI on playlist pages.
- **Stability**:
  - No P0/P1 open defects; P2/P3 triaged with fix plan.

#### 9) Roles and Responsibilities
- **QA Lead**: Owns test strategy, risk assessment, final sign-off; manages test data and environments.
- **QA Engineer(s)**: Implement tests, maintain fixtures and MSW handlers, own E2E.
- **Developers**: Write/maintain unit tests near code; assist with integration test harnesses; fix defects.
- **DevOps/Platform**: Maintain CI, secure secrets, ephemeral DBs, Stripe/Spotify test hooks.
- **Product Owner**: Approves acceptance criteria; prioritizes defect triage.

#### 10) Defect Reporting Procedures
- **Tracking**: GitHub Issues with labels: severity (P0–P3), area (Auth, Playlists, Spotify, AI, Billing, RLS, UI), type (Bug, Test Flake, Perf).
- **Contents**:
  - Steps to reproduce, expected vs actual, screenshots/videos, logs, API trace (request/response), env, commit SHA.
  - If API-related: include endpoint, payload, status, correlation IDs if available.
- **Severity**:
  - P0: Blocking core flows or security breach.
  - P1: Major feature impaired; workaround exists.
  - P2: Minor defect; non-critical flow.
  - P3: Cosmetic or low-impact.
- **SLAs**:
  - P0: Fix or rollback same day; hotfix CI pass required.
  - P1: 1–2 business days.
  - P2: Within sprint.
  - P3: Backlog with review each release.
- **Triage Cadence**: Daily during active sprints; pre-release full sweep.
- **Regression Policy**: Add automated test for every P0/P1 defect before closure.

#### Appendices (Execution Guidance)
- **Test Data Management**:
  - Seed users: verified/unverified, free/paid, unpaid.
  - Seed playlists with varied sizes; include edge cases (duplicates, long titles).
  - OAuth: Spotify test user tokens stored encrypted; rotate regularly.
- **Key Areas to Automate First (Risk-Based)**:
  - Auth + session refresh (middleware), playlist reorder and persistence, Spotify export, AI timeout/fallback + quotas, Stripe webhook gating, RLS isolation.
- **CI Gates**:
  - Lint + typecheck → unit/integration → lightweight Playwright smoke on PRs; full E2E+RLS nightly.
- **Rollback/Recovery Checks**:
  - Verify migrations are reversible or safe on re-run; idempotent webhook replays; safe retry semantics for playlist track ordering and export.


