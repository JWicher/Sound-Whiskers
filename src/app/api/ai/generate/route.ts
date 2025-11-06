import OpenAI from "openai";
import { zodResponseFormat } from "openai/helpers/zod";
import { z } from "zod";
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { handleApiError } from "@/lib/errors/handleApiError";
import { ApiError } from "@/lib/errors/ApiError";
import { getSpotifyAccessToken } from "@/lib/utils";
import { checkAndDowngradeIfExpired } from "@/lib/services/profileService";

// Define schemas for AI playlist generation
const AITrackSchema = z.object({
  artist: z.string().min(1).max(200),
  title: z.string().min(1).max(200),
  album: z.string().min(1).max(200),
  trackUri: z.string().min(1, 'Track URI required'),
});

const AIPlaylistSchema = z.object({
  playlistName: z.string().min(1).max(120),
  playlistDescription: z.string().max(500).optional().nullable(),
  tracks: z.array(AITrackSchema).min(1).max(20),
  summary: z.string().max(200).optional().nullable(),
});

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Calculate cost based on token usage
// GPT-4o-mini pricing: $0.20/1M input tokens, $0.80/1M output tokens
function calculatePromptCost(usage: {
  prompt_tokens: number;
  completion_tokens: number;
  total_tokens: number;
}) {
  const INPUT_COST_PER_1K = 0.0002; // $0.20 per 1M = $0.0002 per 1K
  const OUTPUT_COST_PER_1K = 0.0008; // $0.80 per 1M = $0.0008 per 1K

  const inputCost = (usage.prompt_tokens / 1000) * INPUT_COST_PER_1K;
  const outputCost = (usage.completion_tokens / 1000) * OUTPUT_COST_PER_1K;
  const totalCost = inputCost + outputCost;

  return {
    inputCost,
    outputCost,
    totalCost,
    formattedCost: `$${totalCost.toFixed(6)}`,
  };
}

// Spotify API search response type
interface SpotifySearchResponse {
  tracks: {
    items: Array<{
      id: string;
      name: string;
      artists: Array<{ name: string }>;
      album: { name: string };
      uri: string;
    }>;
  };
}

/**
 * Verify if a track exists on Spotify using search
 * Returns the track if found, null otherwise
 */
async function verifyTrackOnSpotify(
  artist: string,
  title: string,
  spotifyToken: string
): Promise<{ track?: SpotifySearchResponse['tracks']['items'][0] }> {
  try {
    // Build Spotify search query
    const spotifyQuery = `track:"${title}" artist:"${artist}"`;

    const searchUrl = new URL('https://api.spotify.com/v1/search');
    searchUrl.searchParams.set('q', spotifyQuery);
    searchUrl.searchParams.set('type', 'track');
    searchUrl.searchParams.set('limit', '1');

    const searchResponse = await Promise.race([
      fetch(searchUrl.toString(), {
        headers: {
          'Authorization': `Bearer ${spotifyToken}`,
          'Content-Type': 'application/json',
        },
      }),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('Spotify search timeout')), 10000)
      ),
    ]);

    if (!searchResponse.ok) {
      return {  };
    }

    const data = (await searchResponse.json()) as SpotifySearchResponse;

    if (data.tracks.items.length > 0) {
      return {  track: data.tracks.items[0] };
    }

    return { track: data.tracks.items[0] };
  } catch (error) {
    console.error(`Error verifying track "${title}" by "${artist}":`, error);
    return { };
  }
}

/**
 * Filter tracks by verifying them on Spotify
 */
async function filterTracksWithSpotifyVerification(
  tracks: z.infer<typeof AITrackSchema>[],
  spotifyToken: string
): Promise<z.infer<typeof AITrackSchema>[]> {
  const verificationResults = await Promise.all(
    tracks.map(async (track) => {
      const result = await verifyTrackOnSpotify(track.artist, track.title, spotifyToken);
      return result.track
    })
  );

  console.log({verificationResults});
  return verificationResults
    .filter((track) => !!track)
    .map((track) => ({
      title: track.name,
      artist: track.artists[0].name,
      album: track.album.name,
      trackUri: track.uri
    }));
}

export async function POST(request: NextRequest) {
  try {
    // 1. AUTHENTICATE USER
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      throw new ApiError(401, "Unauthorized", "UNAUTHORIZED");
    }

    // 1.1. CHECK AND DOWNGRADE IF PRO PLAN EXPIRED
    const wasDowngraded = await checkAndDowngradeIfExpired(user.id);
    
    if (wasDowngraded) {
      throw new ApiError(
        403,
        "Your Pro plan has expired. Please upgrade to continue using AI features.",
        "PLAN_EXPIRED"
      );
    }

    // 2. AUTHORIZE - CHECK PRO PLAN (PAID FEATURE)
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("plan")
      .eq("user_id", user.id)
      .single();

    if (profileError || !profile) {
      throw new ApiError(404, "Profile not found", "PROFILE_NOT_FOUND");
    }

    if (profile.plan !== "pro") {
      throw new ApiError(
          403,
        "AI playlist generation is only available for PRO plan users",
        "PRO_PLAN_REQUIRED"
      );
    }

    // 3. CHECK QUOTA
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const { count } = await supabase
      .from("ai_sessions")
      .select("*", { count: "exact", head: true })
      .eq("user_id", user.id)
      .eq("status", "succeeded")
      .gte("created_at", startOfMonth.toISOString());

    const quota = 50; // PRO plan quota

    if (count !== null && count >= quota) {
      throw new ApiError(
          429,
        "Monthly AI generation quota exceeded",
        "QUOTA_EXCEEDED"
      );
    }

    // 4. VALIDATE INPUT
    const body = await request.json();
    const { prompt } = body;

    if (!prompt || typeof prompt !== "string" || prompt.trim().length === 0) {
      throw new ApiError(400, "Prompt is required", "INVALID_INPUT");
    }

    if (prompt.length > 500) {
      throw new ApiError(
          400,
        "Prompt is too long (max 500 characters)",
        "INVALID_INPUT"
      );
    }

    // 5. GET SPOTIFY TOKEN FOR VERIFICATION
    let spotifyToken: string;
    try {
      spotifyToken = await Promise.race([
        getSpotifyAccessToken(),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('Spotify auth timeout')), 10000)
        ),
      ]);
    } catch (error) {
      console.error('Spotify authentication failed during AI generation', error);
      throw new ApiError(
        502,
        "Failed to authenticate with Spotify",
        "SPOTIFY_AUTH_ERROR"
      );
    }

    // 6. GENERATE PLAYLISTS AND COLLECT VALID TRACKS
    const allValidTracks: z.infer<typeof AITrackSchema>[] = [];
    let totalCost = 0;
    let totalTokens = 0;
    let generatedPlaylist: z.infer<typeof AIPlaylistSchema> | null = null;
    const maxRetries = 2;
    const minTracksRequired = 13;

    for (let attempt = 0; attempt < maxRetries; attempt++) {
      // Build context about already collected tracks
      let contextMessage = prompt;
      if (allValidTracks.length > 0) {
        contextMessage += `\n\n[Note: Already have ${allValidTracks.length} valid tracks. Please generate different tracks to add variety.]`;
      }

      // CALL OPENAI WITH STRUCTURED OUTPUT
      const response = await openai.chat.completions.parse({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: `You are an expert music curator that creates themed playlists. 
Your task is to generate playlist suggestions based on user prompts about mood, theme, genre, occasion, time, or location.

Rules:
- ONLY create music playlists. Refuse any non-music requests politely.
- Generate between 12 and 20 tracks maximum.
- Support both English and Polish input languages.
- Provide accurate artist names, song titles, and album names.
- Create a creative playlist name and optional description.
- Focus on real, existing songs from mainstream streaming platforms.

If the request is not about music, respond with:
"I can only help with music playlists. Here are some examples:
- Create a playlist for a chill Sunday morning with acoustic and indie tones.
- Make a road trip playlist that mixes modern rock, indie, and energetic pop.
- Build a 10-song workout playlist with high tempo tracks from 2020 onwards."`,
          },
          {
            role: "user",
            content: contextMessage,
          },
        ],
        response_format: zodResponseFormat(AIPlaylistSchema, "playlist_generation"),
        temperature: 0.8,
        max_tokens: 1000,
      });

      const result = response.choices[0].message.parsed;

      if (!result) {
        throw new ApiError(
            500,
          "Failed to generate playlist",
          "AI_GENERATION_FAILED"
        );
      }

      // Track token usage
      if (response.usage) {
        totalTokens += response.usage.total_tokens;
        const cost = calculatePromptCost(response.usage);
        totalCost += cost.totalCost;

        console.log(`AI Playlist Generation Attempt ${attempt + 1} - Prompt cost: ${cost.formattedCost}`, {
          inputTokens: response.usage.prompt_tokens,
          outputTokens: response.usage.completion_tokens,
          totalTokens: response.usage.total_tokens,
          userId: user.id,
        });
      }

      // Store first successful playlist data (name, description)
      if (!generatedPlaylist) {
        generatedPlaylist = result;
      }

      // VERIFY TRACKS ON SPOTIFY AND FILTER
      console.log(`Attempt ${attempt + 1}: Verifying ${result.tracks.length} tracks on Spotify...`);
      const validTracks = await filterTracksWithSpotifyVerification(result.tracks, spotifyToken);
      console.log(`Attempt ${attempt + 1}: ${validTracks.length}/${result.tracks.length} tracks verified on Spotify`);

      // Add valid tracks to collection
      allValidTracks.push(...validTracks);

      // Check if we have enough tracks
      if (allValidTracks.length >= minTracksRequired) {
        console.log(`Collected ${allValidTracks.length} valid tracks. Stopping retries.`);
        break;
      }

      console.log(`Have ${allValidTracks.length} valid tracks, need ${minTracksRequired}. ${attempt + 1 < maxRetries ? 'Retrying...' : 'Max retries reached.'}`);
    }

    // 7. VALIDATE WE HAVE ENOUGH TRACKS
    if (allValidTracks.length === 0) {
      throw new ApiError(
        500,
        "Could not find any valid tracks on Spotify. Please try a different playlist prompt.",
        "NO_VALID_TRACKS"
      );
    }

    if (!generatedPlaylist) {
      throw new ApiError(
        500,
        "Failed to generate playlist",
        "AI_GENERATION_FAILED"
      );
    }

    // 8. LOG TOTAL COST
    const cost = {
      totalCost,
      formattedCost: `$${totalCost.toFixed(6)}`,
    };

    console.log(`AI Playlist Generation Complete - Total cost: ${cost.formattedCost}`, {
      totalTokens,
      totalCost,
      validTracksCount: allValidTracks.length,
      userId: user.id,
    });

    // 9. RECORD AI SESSION WITH COST DATA
    const sessionId = crypto.randomUUID();
    await supabase.from("ai_sessions").insert({
      id: sessionId,
      user_id: user.id,
      prompt: prompt,
      status: "succeeded",
      cost: totalCost,
    });

    // 10. TRANSFORM TO APPLICATION FORMAT
    return NextResponse.json({
      sessionId: sessionId,
      playlistName: generatedPlaylist.playlistName,
      playlistDescription: generatedPlaylist.playlistDescription || null,
      summary: generatedPlaylist.summary,
      items: allValidTracks.map((track) => ({
        artist: track.artist,
        title: track.title,
        album: track.album,
        trackUri: track.trackUri
      })),
      count: allValidTracks.length,
      warningUnderMinCount: allValidTracks.length < 12,
    });
  } catch (error) {
    // Log OpenAI specific errors
    if (error instanceof OpenAI.APIError) {
      console.error("OpenAI API error:", error.message, error.status);
      throw new ApiError(
          error.status || 500,
        "AI service error. Please try again.",
        "AI_SERVICE_ERROR"
      );
    }

    return handleApiError(error);
  }
}

// Configure route runtime and timeout
export const runtime = "nodejs";
export const maxDuration = 60; // 60s timeout for AI operations

