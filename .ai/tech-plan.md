# Technical Setup Plan - Sound Whiskers MVP

## Overview
This plan outlines the step-by-step installation and setup process for the Sound Whiskers MVP, following the execution timeline from `task.md` and tech stack recommendations from `tech-stack.md`.

## Tech Stack Summary
- **Frontend**: Next.js 14 + TypeScript + Tailwind CSS + shadcn/ui
- **Backend**: Next.js API Routes + Supabase
- **Auth/DB**: Supabase (PostgreSQL with RLS)
- **Payments**: Stripe
- **AI**: OpenAI (via OpenRouter - optional)
- **Hosting**: Vercel

## Installation Timeline

### Week 1 - Foundation Setup (Install Now)

#### Core Next.js Application
```bash
# Create Next.js app with TypeScript and Tailwind CSS
npx create-next-app@14 . --typescript --tailwind --eslint --app --src-dir --import-alias "@/*"

# Essential dependencies for Supabase integration
npm install @supabase/supabase-js @supabase/ssr

# Development tools
npm install -D prettier
```

#### shadcn/ui Setup
```bash
# Initialize shadcn/ui component system
npx shadcn@latest init

# Install essential UI components
npx shadcn@latest add button
npx shadcn@latest add input  
npx shadcn@latest add form
npx shadcn@latest add card
npx shadcn@latest add toast
npx shadcn@latest add dialog
npx shadcn@latest add label
npx shadcn@latest add separator
```

#### Configuration Files
```bash
# Create environment variables file
touch .env.local

# Create Prettier configuration
echo '{
  "semi": false,
  "singleQuote": true,
  "tabWidth": 2,
  "trailingComma": "es5"
}' > .prettierrc
```

### Week 2 - Spotify Integration
```bash
# Spotify Web API client
npm install spotify-web-api-node
npm install @types/spotify-web-api-node -D
```

### Week 4 - Playlist Editor (Drag & Drop)
```bash
# Drag and drop functionality for playlist reordering
npm install @dnd-kit/core @dnd-kit/sortable @dnd-kit/utilities
```

### Week 5 - Stripe Payment Integration
```bash
# Stripe payment processing
npm install stripe
npm install @stripe/stripe-js
```

### Week 6 - Optional AI Features
```bash
# OpenAI integration (only if implementing AI features)
npm install openai
```

## Environment Variables Required

Create these in `.env.local`:

```env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE=your_supabase_service_role_key

# Spotify API
SPOTIFY_CLIENT_ID=your_spotify_client_id
SPOTIFY_CLIENT_SECRET=your_spotify_client_secret

# Stripe Payment
STRIPE_SECRET_KEY=your_stripe_secret_key
STRIPE_PRICE_ID_MONTHLY=your_stripe_monthly_price_id
STRIPE_WEBHOOK_SECRET=your_stripe_webhook_secret

# Application URLs
NEXT_PUBLIC_APP_URL=http://localhost:3000
SPOTIFY_REDIRECT_URI=http://localhost:3000/api/spotify/callback

# Optional: OpenAI (for AI features)
OPENAI_API_KEY=your_openai_api_key
```

## Deployment Setup (Vercel)

### Initial Deployment
```bash
# Install Vercel CLI (if not already installed)
npm i -g vercel

# Deploy to Vercel
vercel

# Set environment variables in Vercel dashboard
# Configure Spotify redirect URI to use Vercel URL
```

## Development Workflow

### Week 1 Acceptance Criteria
- Next.js app created with TypeScript and Tailwind
- shadcn/ui components installed and configured
- Deployed to Vercel with environment variables
- Supabase project created and connected
- Basic auth pages functional
- Protected route accessible after sign-in


## Security Considerations
- Enable Row Level Security (RLS) on all Supabase tables
- Encrypt Spotify refresh tokens in database
- Verify Stripe webhook signatures
- Use least-privilege Spotify scopes (`playlist-modify-private`)
- Implement rate limiting on API routes

## Troubleshooting Notes
- Use Next.js 14 for stability (avoid Next.js 15 during MVP)
- Pin to React 18 and Tailwind 3.4 for compatibility
- Use Vercel for hosting to reduce DevOps overhead
- Implement token refresh with single retry for Spotify API
- Store Stripe webhook events with idempotency keys

## Next Steps After Setup
1. Configure Supabase authentication policies
2. Set up Spotify Developer app with correct redirect URIs
3. Create Stripe products and pricing in dashboard
4. Implement basic auth flow and protected routes
5. Test deployment pipeline with Vercel

---

*This plan follows the conservative/stable approach recommended in `tech-stack.md` to minimize delivery risks while maintaining scalability for the MVP.*