import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';

/**
 * Redirect route for Spotify OAuth callback
 * This route exists for compatibility with the actual callback handler at /api/spotify/callback
 */
export async function GET(request: NextRequest) {
  // Extract query parameters from the incoming request
  const searchParams = request.nextUrl.searchParams;
  
  // Construct the URL for the actual callback handler
  const redirectUrl = new URL('/api/spotify/callback', process.env.NEXT_PUBLIC_APP_URL);
  
  // Copy all query parameters
  searchParams.forEach((value, key) => {
    redirectUrl.searchParams.append(key, value);
  });

  // Redirect to the actual callback handler
  return NextResponse.redirect(redirectUrl.toString());
}
