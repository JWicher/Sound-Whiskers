### Product Requirements Document — Sound Whiskers (MVP)

## Overview
- **Goal**: Help users create playlists by manual search or AI generation, leveraging Spotify.
- **Primary persona**: Casual listeners building background music while studying, exercising, or relaxing.

## Problem Statement
- **Main problem**: Building playlists is slow; users want quick lists based on known track info or broader themes via AI.

## Objectives and Success Criteria
- **Core outcomes**
  - Manual playlist creation and management.
  - Simple Spotify search (author + partial title).
  - Spotify account linking and playlist export.
  - Subscription with paid AI generation.
- **MVP success metrics**
  - **Activation**: User creates ≥1 playlist.

## Persona
- **Casual Listener**: Knows artist and part of title; wants quick background playlists for current activity.

## Scope
- **In**: Manual search, playlist editor, AI generation (paid), export to Spotify (all plans), auth, billing, account deletion.
- **Out**: Music playback, exports beyond Spotify, advanced payments, non-web clients.

## Key Features
- **Manual search**: Double-field search (artist; partial title), top 10 results, fuzzy matching, no pagination.
- **Playlist editor**: Rename, description, drag-and-drop reorder, remove/add (Scope cut: limit to reorder/remove if needed.)
- **AI generation (paid)**: EN/PL input; transforms theme/mood/genre/occasion/geo/time prompts into at most 20-track suggestions only; refuses non-music requests; input guidance with examples; single-shot (no variants).
- **Export to Spotify**: Available to both free and paid; creates a new playlist per export with date suffix; default private; shows note that re-export creates a new copy.
- **Quotas**: Free: 3 AI playlists/month; Paid: 50 AI playlists/month; Manual playlists: up to 200 (hidden cap).
- **Account deletion**: Self-serve delete; confirm identity purge user data (prompts/playlists/usage).

## User Flow
- **Onboarding → Search → Editor → Export → Manage lists**
  - Link Spotify on first export attempt (if not already linked).
  - Re-export creates a new copy on Spotify (not a sync).

## Functional Requirements

### Authentication & Accounts
- Magic link + email/password; mandatory email verification.
- Session lifetime 30 days; skip refresh for MVP.

### Subscriptions & Billing
- Price: $10 USD/month, tax-inclusive per locale; no trial.
- Cancellation: at period end; no prorated refunds.
- Failed payments: upgrade only if payment was successfull; auto-downgrade at renewal if unpaid.

### Spotify Integration & Export
- Request only playlist-modify scopes.
- Link on first export; store refresh tokens securely; auto-refresh on expiry.
- Default playlists private; description includes attribution; create a new playlist per export with date suffix.

### Search
- Double input field; fuzzy matching; top 10 results; no UI filters.
- Use Spotify search operators; filter by user market; dedupe by track ID.

### AI Playlist Generation (Paid)
- Input languages: EN/PL; output strictly up to 20-track list.
- Refusal: “Music playlists only” with 3 EN/PL example prompts.
- Validate tracks in user market; dedupe; backfill up to 20 via Spotify Recommendations constrained by the prompt.
- If <12 tracks found, inform user and allow export anyway.

### Playlist Editor
- Rename, description, reorder (drag-and-drop), remove/add.
- Scope cut if behind schedule: only reorder/remove.

### Quotas & Limits
- Manual playlists: soft cap 200; show subtle count in profile; deletions free capacity.
- AI quota: count each successful server-side generation as 1 (exclude auto-retries).
- Reset: UTC billing day.

### Account Deletion
- Self-serve; revoke Spotify and auth tokens; purge user data promptly.

### Performance/SLOs
- Not defined for MVP

### Operations
- Synchronous actions; user waits for results.
- Server timeouts: search 25s, AI 60s, export 60s.
- Manual retry by user on failure; basic error handling with actionable messages.

### Security & Privacy
- Scope minimization for Spotify; secure token storage; least-privilege access.
- Consent to ToS/Privacy links at sign-up; global availability where Spotify is available.

### Platform & Localization
- Web app only; latest Chrome support.
- UI language: EN only; EN input guidance and refusal messages.
- Responsive layouts for desktop/tablet/phone (Chrome).

### Observability & Analytics
- No observability and analytics for MVP.

### Support contact
- use email contact: email@address.com.

### Playlist naming convention
- use naming template: “Sound Whiskers – {YYYY-MM-DD}”.

## Milestones & Timeline (3 weeks, 1 developer)
- **Week 1**: Auth / Spotify linking / Search.
- **Week 2**: Editor / Export to Spotify.
- **Week 3**: Payments / AI generation (paid) / Quotas.

## Risks & Mitigations
- **Spotify availability/limits**: Market-filtered search, dedupe, backfill via Recommendations.
- **AI quality/refusals**: Clear guidance + policy; strict “music-only” refusal with examples.
- **Time constraints**: Predefined scope cuts (editor limited to reorder/remove; AI single-shot; payments without invoices/coupons; basic profile delete-only).
- **Payment failures**: auto-downgrade at renewal if unpaid.

## OpenAI model and settings
- Model name: GPT-4.1-Nano
- Temperature: 0.7 to 0.9
- Max tokens: 350–500
- Prompt length cap: 1,000–4,000 tokens.

User promppt examples:
- Create a playlist for a chill Sunday morning with acoustic and indie tones.
- Create a playlist for a cozy rainy evening. I want mellow acoustic and lo-fi songs that feel warm and nostalgic. Include about 12 tracks and give the playlist a creative name.
- Make a road trip playlist that mixes modern rock, indie, and energetic pop. I’ll be driving for five hours — keep the energy varied but upbeat. Add a one-line summary at the end.
- Imagine a mustached jazz cat DJing at a 1920s speakeasy. Create a playlist he would spin — include swing, jazz, and retro remixes. Give it a playful, themed title.
- Build a 10-song playlist for workout motivation with no songs older than 2020. Focus on pop-rap and dance tracks that keep high tempo (120+ BPM). Include tempo notes if possible.

