# Sound Whiskers

> **AI-powered playlist maker with seamless Spotify export**

![Next.js](https://img.shields.io/badge/Next.js-14-blue?logo=nextdotjs&logoColor=white)
![Status](https://img.shields.io/badge/status-WIP-yellow)
![License](https://img.shields.io/badge/license-All%20rights%20reserved-lightgrey)

Sound Whiskers helps music lovers craft the perfect playlist in seconds. Create lists manually or let our AI suggest up-to-20 track mixes from a short theme prompt, then export them straight to your Spotify account.

---

## Table of Contents
1. [Tech Stack](#tech-stack)
2. [Getting Started Locally](#getting-started-locally)
3. [Available Scripts](#available-scripts)
4. [Project Scope](#project-scope)
5. [Project Status](#project-status)
6. [License](#license)

---

## Tech Stack

**Frontend**
- Next.js 14 (App Router) & React 18
- TypeScript 5
- Tailwind CSS 4 & shadcn/ui (New-York variant)

**Backend / APIs**
- Supabase (Auth + Postgres w/ RLS)
- Node.js API routes
- Stripe (Subscriptions)
- `spotify-web-api-node` (OAuth & playlist export)

**AI Services**
- OpenRouter (LLM)

**Testing**
- Vitest (Unit & Integration tests)
- React Testing Library
- Playwright (E2E tests)
- MSW (API mocking)

**Tooling & DX**
- ESLint, Prettier, TypeScript strict mode
- Tailwind Merge, CVA, clsx

Hosting is optimised for Vercel, but the app can run anywhere **Node 22+** is available.

---

## Getting Started Locally

### Prerequisites
- Node **22** (see `.nvmrc`)
- pnpm / npm / yarn (examples use **npm**)
- A Spotify developer application (for OAuth credentials)
- Supabase project & Stripe keys (only needed when implementing those features)

> Environment variables are not included in this README—add your own `.env.local` following your infrastructure setup.

### Installation & Running
```bash
# clone the repo
git clone https://github.com/jwicher/sound-whiskers.git
cd sound-whiskers

# install dependencies
npm install

# start the dev server
npm run dev

# open http://localhost:3000 in your browser
```

To create an optimised production build:
```bash
npm run build
npm start
```

---

## Available Scripts

| Script        | Description                      |
|---------------|----------------------------------|
| `dev`         | Start Next.js dev server (hot reload) |
| `build`       | Build the Next.js production bundle |
| `start`       | Run the compiled production server |
| `lint`        | Lint all source files with ESLint |
| `test`        | Run unit and integration tests with Vitest |
| `test:e2e`    | Run end-to-end tests with Playwright |

---

## Project Scope

MVP features (derived from the Product Requirements Document):
- **Manual Search & Playlist Editor**  
  Simple double-field search (artist + partial title), drag-and-drop reorder, track removal, rename & description.
- **AI Playlist Generation** (paid)  
  Theme prompts in EN/PL, up to 20 tracks, single-shot generation with refusal policy for non-music requests.
- **Spotify Export**  
  Playlist-modify scopes only, default private playlist, date-suffixed name, creates a fresh playlist on each export.
- **Authentication & Billing**  
  Supabase Auth (email/password or magic link) with 30-day sessions; Stripe subscriptions ($10/mo) gating AI quota.
- **Quotas & Limits**  
  Free: 3 AI playlists/month.  Paid: 50 AI playlists/month.  Manual playlists soft-cap: 200.
- **Security & Privacy**  
  RLS-protected tables, encrypted Spotify refresh tokens, least-privilege API scopes, optional account deletion.

---

## License

© 2025 Author Name. **All rights reserved.**

This repository is proprietary and may not be redistributed or used without explicit permission. A formal license file will be added in a future release.
