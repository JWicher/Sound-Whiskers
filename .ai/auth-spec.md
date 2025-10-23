### Sound Whiskers — Authentication Architecture Specification (MVP)

This document defines the technical specification for implementing registration, login, logout, and password recovery based on PRD US-005 and the project tech stack. It is designed to integrate with the existing codebase patterns without breaking current behavior.


## 1. User Interface Architecture

### 1.1 App-level Structure
- Root layout (`src/app/layout.tsx`):
  - Continues to render `AppHeader` for both auth and non-auth states.
  - Adds conditional header actions (Login/Register vs. Profile/Logout) via a new client component `AuthHeaderActions` (uses Supabase browser client):
    - When unauthenticated: shows "Log in" and "Sign up" buttons (shadcn/ui `Button`).
    - When authenticated: shows profile menu (username), usage badge (optional), and "Logout" action.
  - No SSR user read in layout to avoid blocking render; rely on client-side session state for header actions.

- Middleware (`src/middleware.ts`):
  - Keep the existing refresh logic `supabase.auth.getUser()` to refresh sessions 
  from cookies.
  - Enforce hard route-guarding now for protected sections (e.g., redirect unauthenticated users from `/playlists` to `/auth/login`) using middleware and/or server components.

### 1.2 Routes & Pages (App Router)
- Public routes (accessible always):
  - `/` (landing): unchanged for MVP.
  - `/auth/login`: email+password login form; link to magic link; link to reset password; link to register.
  - `/auth/register`: email+password+password confirmation; email verification notice after sign-up.
  - `/auth/verify`: email verification result page (deep link target from Supabase magic link/confirm email). Displays success/failure and CTA to log in.
  - `/auth/forgot-password`: request password reset (email input).
  - `/auth/reset-password`: set new password (visited via emailed link; requires access token from Supabase). If token invalid/expired, show actionable error.

- Auth-required routes (hard guard):
  - `/playlists` and any editor pages. Unauthenticated users are redirected server-side to `/auth/login`.
  - API routes already require auth; UI should still handle 401s by redirecting to `/auth/login` with a toast as a fallback.

- Server-protected routes should use `createClient()` in server components to redirect unauthenticated users early.

### 1.3 Components
- New components under `src/components/auth/`:
  - `AuthHeaderActions.tsx` (client): Renders header actions based on session (login/signup or profile/logout). Uses `createClient` (browser) and `supabase.auth.onAuthStateChange`.
  - `AuthCard.tsx`: Shared card layout with `Card`, `CardHeader`, `CardContent`, `CardFooter` for auth pages.
  - `EmailPasswordForm.tsx`: Controlled form for email/password with shadcn `Form`, `Input`, `Button`. Receives props for submit action, loading, errors.
  - `PasswordInput.tsx`: Input with show/hide toggle; enforces min-length and basic strength hints.
  - `MagicLinkForm.tsx`: Triggers magic link email.
  - Register form includes a required ToS/Privacy consent checkbox with links (per PRD Security & Privacy).

- Update `AppHeader.tsx`:
  - Insert `AuthHeaderActions` to the right side next to `ThemeSelector`.

- Page-level client components under `src/app/auth/...`:
  - `login/page.tsx` (client): uses `EmailPasswordForm` and links to forgot-password/register.
  - `register/page.tsx` (client): uses `EmailPasswordForm` (with confirm) and shows verification required notice on success.
  - `forgot-password/page.tsx` (client): email field; info on next steps.
  - `reset-password/page.tsx` (client): new password and confirm; extracts token type and access token from URL hash/query per Supabase docs; if missing, show error.
  - `verify/page.tsx` (client): parse URL params (`token_type`, `access_token`, `code` as needed); confirms email and shows outcome.

- UI library: All forms and dialogs use shadcn/ui (Button, Input, Form, Card, Label, Separator, Sonner for toasts). Follow current configuration in `src/components/ui/*` and `src/lib/utils.ts`.

### 1.4 Responsibilities & Data Flow
- Forms (client components):
  - Own input state, run client-side validation (zod schemas) before calling server actions.
  - Call either:
    - Supabase Auth client methods directly (login, sign up, reset) when appropriate, or
    - Next.js API routes for profile-related or non-auth operations.
  - Handle navigation after success (e.g., push to `/playlists`) using `next/navigation`.
  - Surface errors using structured messages and toasts.

- Pages (Next.js App Router):
  - Display appropriate forms and pass callbacks.
  - Avoid server-side user fetch in MVP for these routes; rely on client auth.

- Header/Auth wall:
  - Reacts to auth state (client) for conditional rendering.

### 1.5 Validation & Error Messages
- Client validation via zod:
  - `email`: required, valid email.
  - `password`: required, min 5, recommended: at least 1 letter and 1 number; show non-blocking guidance.
  - `passwordConfirm`: must match `password` where present.

- Error message guidelines:
  - Invalid credentials: "Incorrect email or password."
  - Email not confirmed: "Please confirm your email to continue. We’ve sent a verification link."
  - Weak password (client): "Use at least 8 characters." (with hints)
  - Reset email sent: "If an account exists, we’ve emailed password reset instructions."
  - Token invalid/expired: "This link is invalid or has expired. Request a new one."

- Display:
  - Inline field errors using shadcn `FormMessage`.
  - Top-level alert/toast for general errors.

### 1.6 Main Scenarios
- Login success: Navigate to `/playlists`; show welcome toast.
- Login failure (401): Show error message; keep user on page.
- Login pending email verification: Show clear instruction to verify email; button to resend.
- Registration success: Show “verification email sent”; offer link to login.
- Forgot password: Show neutral success message without confirming account existence.
- Reset password success: Navigate to `/auth/login` with success toast.
- Logout: Clear Supabase session; navigate to `/auth/login`.


## 2. Backend Logic

### 2.1 API Endpoints
- Auth flows primarily use Supabase Auth SDK; no password endpoints needed on our API for MVP. However, for consistency and rate limiting, we will create minimal wrappers that delegate to Supabase:

- `POST /api/auth/login` (Node runtime):
  - Body: `{ email: string, password: string }`.
  - Action: Call Supabase Auth `signInWithPassword` using server client (reads/writes cookies).
  - Responses:
    - 200: `{ ok: true }` on success.
    - 401: `{ error: { code: 'UNAUTHORIZED', message: 'Incorrect email or password' } }`.
    - 400: validation errors.

- `POST /api/auth/register`:
  - Body: `{ email: string, password: string }`.
  - Action: Supabase Auth `signUp` with `emailRedirectTo` set to `/auth/verify` (domain-specific). Email verification required.
  - Responses: 200 on success; 409 if user exists; 400 validation.

- `POST /api/auth/logout`:
  - Action: Supabase Auth `signOut` via server client.
  - Response: 200 on success.

- `POST /api/auth/forgot-password`:
  - Body: `{ email: string }`.
  - Action: `resetPasswordForEmail` with redirect to `/auth/reset-password`.
  - Response: 200 regardless of user existence.

- `POST /api/auth/reset-password`:
  - Body: `{ accessToken: string, newPassword: string }`.
  - Action: Use `supabase.auth.exchangeCodeForSession` (if needed) or `updateUser({ password })` when session established via link. For API wrapper, support token-based flow by setting session using provided token (Supabase supports code exchange in client; on server, flow can be completed by client without this endpoint. If implemented server-side, accept access token and call `updateUser`).
  - Response: 200 on success; 400/401 on invalid token.

- `GET /api/auth/user`:
  - Returns current user (id, email, email_confirmed_at) or 401.

- Notes:
  - Follow existing `handleApiError` and `ApiError` patterns, return structured errors.
  - Strict rate limiting to be added later; keep endpoints Node runtime.

### 2.2 Validation
- Use zod schemas in `src/lib/validators/authSchemas.ts`:
  - `loginSchema`: email, password.
  - `registerSchema`: email, password, passwordConfirm (must match).
  - `forgotPasswordSchema`: email.
  - `resetPasswordSchema`: accessToken, newPassword.

- API routes use `safeParse`, return `VALIDATION_ERROR` with issues mirroring current patterns.

### 2.3 Exception Handling
- Use `ApiError` for predictable errors; other errors map to 500 via `handleApiError`.
- Supabase errors are normalized:
  - Auth failed → 401 UNAUTHORIZED.
  - Existing user → 409 CONFLICT.
  - Token invalid → 400 VALIDATION_ERROR.

### 2.4 SSR and Runtime
- Node.js runtime for all auth API routes (implicit by default; add `export const runtime = 'nodejs'` if needed for clarity).
- Since `next.config.mjs` enables images and reactStrictMode only, no additional config required.
- For any server components that should guard access later, use `createClient()` from `src/lib/supabase/server.ts` to read session and `redirect('/auth/login')` if absent.


## 3. Authentication System (Supabase)

### 3.1 Supabase Clients
- Keep `src/lib/supabase/server.ts` and `src/lib/supabase/client.ts` as-is for SSR and browser usage.
- Middleware continues to refresh session via `supabase.auth.getUser()`.

### 3.2 Flows
- Registration:
  - Client calls `POST /api/auth/register` or directly `supabase.auth.signUp`.
  - Email verification required. `emailRedirectTo` should point to `https://<domain>/auth/verify`.
  - On success, UI shows verification message.

- Login (email/password):
  - Client calls `POST /api/auth/login` or directly `supabase.auth.signInWithPassword` from server route to get cookie-based session.
  - On success, navigate to `/playlists`.
  - On `email_confirmed_at` null, show verify notice.

- Magic link (required alongside email/password per PRD):
  - Client triggers `supabase.auth.signInWithOtp({ email, emailRedirectTo })`.
  - Landing on `/auth/verify` consumes the link; show success/failure and navigate.

- Password recovery:
  - Forgot: `resetPasswordForEmail` with redirect to `/auth/reset-password`.
  - Reset: On arrival via link, the Supabase client exchanges the code, sets a temporary session; then call `supabase.auth.updateUser({ password })`. After success, route to login.

- Logout:
  - Client posts to `/api/auth/logout` or calls `supabase.auth.signOut()` directly. Then navigate to `/auth/login`.

### 3.3 Security & Policies
- Email verification mandatory before full access to protected actions.
- Session persistence: 30-day session (configure in Supabase Auth cookie settings; middleware keeps sessions fresh).
- RLS: unchanged, all tables remain protected; APIs already enforce `getUser()`.
- Rate limiting for auth endpoints planned but not required for MVP; ensure idempotent behaviors and neutral responses for password reset requests.
- Never expose secrets; all Supabase keys remain in env vars.
 - No third-party OAuth providers for MVP (email/password and magic link only), per PRD.


## 4. Contracts and Modules

### 4.1 Validators (`src/lib/validators/authSchemas.ts`)
- `loginSchema`:
  - `{ email: string (email), password: string (min 8) }`
- `registerSchema`:
  - `{ email: string (email), password: string (min 8), passwordConfirm: string (must match) }`
- `forgotPasswordSchema`:
  - `{ email: string (email) }`
- `resetPasswordSchema`:
  - `{ accessToken: string (non-empty), newPassword: string (min 8) }`

### 4.2 API Routes (`src/app/api/auth/*/route.ts`)
- `login` POST → 200 | 400 | 401
- `register` POST → 200 | 400 | 409
- `logout` POST → 200
- `forgot-password` POST → 200
- `reset-password` POST → 200 | 400 | 401
- `user` GET → 200 | 401
- All return `ErrorResponse` on failure consistent with existing pattern.

### 4.3 UI Pages
- `src/app/auth/login/page.tsx`
- `src/app/auth/register/page.tsx`
- `src/app/auth/forgot-password/page.tsx`
- `src/app/auth/reset-password/page.tsx`
- `src/app/auth/verify/page.tsx`

### 4.4 Components
- `src/components/auth/AuthHeaderActions.tsx`
- `src/components/auth/AuthCard.tsx`
- `src/components/auth/EmailPasswordForm.tsx`
- `src/components/auth/PasswordInput.tsx`
- `src/components/auth/MagicLinkForm.tsx` (optional)


## 5. Error Handling Conventions
- Use `ApiError` and `handleApiError` utilities in new API routes.
- Map zod `safeParse` errors to `{ code: 'VALIDATION_ERROR', message, details: { issues } }`.
- Normalize Supabase errors into user-friendly messages:
  - Auth invalid: `Incorrect email or password`.
  - Email unverified: `Please confirm your email.`
  - Token problems: `Invalid or expired link.`


## 6. Non-breaking Changes & Compatibility
- Existing API behavior is preserved; new auth pages/components are additive.
- Header gains new `AuthHeaderActions` but does not alter existing theme control.
- Protected API endpoints remain enforced via `supabase.auth.getUser()` on server.
- Client hooks (e.g., `usePlaylists`) will surface 401 errors; pages should handle by redirecting or showing an auth wall.


## 7. Open Questions / Future Steps
- Add server-side route guards to `/playlists` using server client and `redirect` once UX is stable.
- Implement rate limiting for auth endpoints.
- Add resend verification email endpoint/feature.
- Localized messages (EN-only) per broader app i18n plan.
