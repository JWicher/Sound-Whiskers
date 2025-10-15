### Execution Plan — Sound Whiskers (MVP)

## Constraints & Focus
- **Time**: 4–8 h/week for 6 weeks (≈24–48 h total)
- **Primary features**: Manual Spotify search → Curate (reorder/remove) → Export to Spotify
- **Secondary (optional)**: AI single‑shot generation (EN; PL optional), quotas simple
- **Stack**: Next.js (App Router) + TypeScript + Tailwind + shadcn/ui; Supabase (Auth + Postgres); Vercel; Stripe Checkout+Portal; OpenAI (optional)

## In/Out for MVP
- **In**: Email/password auth; Spotify link; manual search (artist + partial title, top 10); playlist editor (reorder/remove); export to Spotify (private, date suffix); simple paid plan gating; account deletion (basic)
- **Out**: Playback; analytics; non‑Spotify exports; invoices/VAT/coupons; magic links (until email sender exists); advanced quotas; multi‑tenant admin

## Environment & Secrets (prepare early)
- Supabase: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE`
- Spotify: `SPOTIFY_CLIENT_ID`, `SPOTIFY_CLIENT_SECRET`, redirect: `/api/spotify/callback`
- Stripe: `STRIPE_SECRET_KEY`, `STRIPE_PRICE_ID_MONTHLY`, `STRIPE_WEBHOOK_SECRET`
- OpenAI (optional): `OPENAI_API_KEY`
- App: `NEXT_PUBLIC_APP_URL` (Vercel URL), `SPOTIFY_REDIRECT_URI` (full URL)

## Minimal Data Model
- `spotify_tokens(user_id uuid, access_token text, refresh_token text, expires_at timestamptz, scope text)`
- `users.plan text` with values: `free` | `paid` (set via Stripe webhook)

## Milestones (6 weeks)

### Week 1 — Foundation (4–6 h)
- [ ] Create Next.js app (App Router) with TypeScript, Tailwind, shadcn/ui
- [ ] Deploy skeleton to Vercel; configure env variables for Supabase
- [ ] Supabase project; enable email/password auth (skip magic links)
- [ ] Basic auth pages (sign in/out) and protected layout shell
- Acceptance: can sign up/in, reach a protected page on Vercel

### Week 2 — Spotify Linking (4–6 h)
- [ ] Spotify Developer app; set Vercel redirect URI
- [ ] Implement `/api/spotify/auth` and `/api/spotify/callback` (authorization code)
- [ ] Store refresh token in `spotify_tokens`; request `playlist-modify-private`
- [ ] Refresh helper and single retry path on 401/403; relink UI state
- Acceptance: user can link Spotify; token refresh works without re‑auth

### Week 3 — Manual Search (4–6 h)
- [ ] Double-field search UI (artist, partial title) with submit (no live query)
- [ ] Server route calls Spotify Search with `market=from_token`
- [ ] Dedupe by track ID; return top 10; actionable empty/error states
- Acceptance: search results consistently appear with top 10 relevant tracks

### Week 4 — Editor + Export (4–6 h)
- [ ] Playlist builder stores selected tracks client‑side
- [ ] Reorder/remove via drag‑and‑drop; defer rename/description
- [ ] Export creates a new private playlist with date suffix and description attribution
- [ ] Re‑export creates a new copy; UI note clarifies behavior
- Acceptance: successful export produces expected playlist in user account

### Week 5 — Stripe Minimal (5–8 h)
- [ ] Stripe product+price (monthly $10) in test mode
- [ ] Checkout integration; Customer Portal link
- [ ] Webhook sets `users.plan=paid` on successful subscription; idempotent processing
- [ ] Gating: AI generation and higher quotas shown only if `plan=paid`
- Acceptance: can upgrade/downgrade and see features gated correctly

### Week 6 — Optional AI or Hardening (4–6 h)
- Option A (AI)
  - [ ] Single‑shot prompt (EN) → candidate tracks → validate (market) → dedupe → cap 20
  - [ ] If <12 tracks, inform user; backfill via Recommendations constrained by prompt
  - [ ] Enforce music‑only policy with clear refusal and example prompts
- Option B (Polish)
  - [ ] Account deletion (revoke Spotify + delete Supabase user + purge tokens)
  - [ ] Error messages, loading states, docs/README, subtle UI polish
- Acceptance: either working AI flow or noticeably hardened UX and deletion

## Detailed Checklists

### Project Bootstrap
- [ ] Initialize Next.js + TS + Tailwind + shadcn/ui
- [ ] Configure Prettier/ESLint defaults; CI optional
- [ ] Publish to Vercel; check env injection

### Auth & DB
- [ ] Supabase email/password auth enabled; email verification optional for MVP
- [ ] Protected routes using server‑side session check
- [ ] Create `spotify_tokens` table and policies (row‑level by `user_id`)

### Spotify OAuth
- [ ] `/api/spotify/auth` builds auth URL with `playlist-modify-private`
- [ ] `/api/spotify/callback` exchanges code; saves tokens; handles errors
- [ ] Refresh helper with expiry tracking; retry once on API failure

### Search
- [ ] Server route: Spotify Search with market from token
- [ ] Dedupe tracks by ID; return normalized shape for UI
- [ ] UI: submit‑based search; show top 10; clear empty/error states

### Editor
- [ ] Client‑side builder state with add/remove
- [ ] Drag‑and‑drop reorder
- [ ] Defer rename/description to post‑MVP

### Export
- [ ] Create private playlist with name `Sound Whiskers – YYYY‑MM‑DD`
- [ ] Add description with attribution; add tracks
- [ ] Note in UI: re‑export creates a new copy

### Stripe
- [ ] Create product/price and put IDs in env
- [ ] Checkout session + return/cancel URLs
- [ ] Customer Portal link
- [ ] Webhook: set `users.plan=paid` on active; unset on canceled/unpaid

### AI (Optional)
- [ ] Prompt parser (EN, PL optional later) with policy guardrails
- [ ] Validate and backfill to reach 12–20 tracks
- [ ] Count generations for simple quota if enabled

### Account Deletion (Optional)
- [ ] Revoke Spotify token; delete `spotify_tokens` row(s)
- [ ] Delete Supabase user; purge user data

## Scope & Stack Decisions
- **Frontend**: Next.js (App Router) + Tailwind + shadcn/ui
- **Backend**: Next.js Route Handlers (no separate server)
- **Auth/DB**: Supabase (email/password for MVP)
- **Payments**: Stripe Checkout + Portal, single monthly price
- **AI**: OpenAI single model, only if time remains
- **Hosting**: Vercel; staged single environment initially

## Risks & Mitigations
- **Spotify token issues**: implement refresh + single retry; fall back to relink prompt
- **Sparse search results**: backfill via Recommendations; communicate shortfall
- **Stripe webhooks on Vercel**: use test mode, idempotency keys, store last event ID
- **No email provider**: keep email/password; add Resend/Mailtrap later and flip verification on
- **Scope creep**: treat AI as bonus; don’t block manual search+export
- **Rate limits**: debounce search, batch calls where possible

## Definition of Done (MVP)
- User can: sign in → link Spotify → search → build list (reorder/remove) → export playlist (private) → see it in Spotify
- Paid users can upgrade via Stripe and see paid‑only UI toggles (AI if implemented)
- Basic account deletion works (if Option B selected in Week 6)

## Next Actions (this week)
1) Bootstrap Next.js app and deploy to Vercel with Supabase envs
2) Create Supabase schema (`spotify_tokens`, `users.plan`) and RLS policies
3) Set up Spotify app and redirect URI; wire `/api/spotify/auth` and `/api/spotify/callback`


