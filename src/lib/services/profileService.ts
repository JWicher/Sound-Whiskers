import { createClient } from '@/lib/supabase/server';
import { ApiError } from '@/lib/errors/ApiError';
import type {
  ProfileDto,
  ProfileUsageDto,
  UpdateProfileCommand,
  PlanType,
} from '@/types';

// Plan limits cache to avoid recomputing static values
const PLAN_LIMITS_CACHE = {
  free: {
    playlists: 200,
    ai: 3,
  },
  pro: {
    playlists: Infinity,
    ai: 50,
  },
} as const;

export class ProfileService {
  // Lazy getter to ensure createClient() is called within request context
  private get supabase() {
    return createClient();
  }

  /**
   * Retrieves user profile information
   * If profile doesn't exist, creates it automatically (fallback for cases where trigger failed)
   */
  async getProfile(userId: string): Promise<ProfileDto> {
    // Input validation using helper method
    this.validateUserId(userId);

    try {
      const { data, error } = await this.supabase
        .from('profiles')
        .select('user_id, username, plan, pro_expires_at, created_at, updated_at')
        .eq('user_id', userId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          // Profile not found - try to create it automatically
          return await this.createMissingProfile(userId);
        }
        throw new ApiError(500, 'INTERNAL_SERVER_ERROR', error.message);
      }

      return {
        userId: data.user_id,
        username: data.username,
        plan: data.plan,
        proExpiresAt: data.pro_expires_at,
        createdAt: data.created_at,
        updatedAt: data.updated_at,
      };
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }

      throw new ApiError(500, 'INTERNAL_SERVER_ERROR', 'Failed to retrieve profile');
    }
  }

  /**
   * Creates a missing profile for a user (fallback when trigger doesn't fire)
   * This handles cases where users signed up before the trigger was created
   */
  private async createMissingProfile(userId: string): Promise<ProfileDto> {
    try {
      // Get user's email from auth to generate a username
      const { data: { user }, error: authError } = await this.supabase.auth.getUser();
      
      if (authError || !user || user.id !== userId) {
        throw new ApiError(401, 'UNAUTHORIZED', 'Unable to verify user identity');
      }

      // Generate username from email or use fallback
      const username = user.email 
        ? user.email.split('@')[0].substring(0, 64) 
        : 'User';

      // Create the profile
      const { data, error } = await this.supabase
        .from('profiles')
        .insert({
          user_id: userId,
          username: username,
          plan: 'free' as PlanType,
        })
        .select('user_id, username, plan, pro_expires_at, created_at, updated_at')
        .single();

      if (error) {
        throw new ApiError(500, 'INTERNAL_SERVER_ERROR', 'Failed to create profile');
      }

      return {
        userId: data.user_id,
        username: data.username,
        plan: data.plan,
        proExpiresAt: data.pro_expires_at,
        createdAt: data.created_at,
        updatedAt: data.updated_at,
      };
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }

      throw new ApiError(500, 'INTERNAL_SERVER_ERROR', 'Failed to create missing profile');
    }
  }

  /**
   * Updates user profile username
   */
  async updateProfile(userId: string, command: UpdateProfileCommand): Promise<ProfileDto> {
    // Input validation using helper method
    this.validateUserId(userId);

    const { username } = command;
    
    if (!username?.trim()) {
      throw new ApiError(400, 'VALIDATION_ERROR', 'Username cannot be empty');
    }

    try {

      const { data, error } = await this.supabase
        .from('profiles')
        .update({ 
          username,
          updated_at: new Date().toISOString(),
        })
        .eq('user_id', userId)
        .select('user_id, username, plan, pro_expires_at, created_at, updated_at')
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          throw new ApiError(404, 'NOT_FOUND', 'Profile not found');
        }

        if (error.code === '23505') {
          throw new ApiError(409, 'CONFLICT', 'Username already exists');
        }

        throw new ApiError(500, 'INTERNAL_SERVER_ERROR', 'Failed to update profile');
      }

      return {
        userId: data.user_id,
        username: data.username,
        plan: data.plan,
        proExpiresAt: data.pro_expires_at,
        createdAt: data.created_at,
        updatedAt: data.updated_at,
      };
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }

      throw new ApiError(500, 'INTERNAL_SERVER_ERROR', 'Failed to update profile');
    }
  }

  /**
   * Calculates usage statistics for the user (optimized with database function)
   */
  async getUsage(userId: string): Promise<ProfileUsageDto> {
    // Input validation using helper method
    this.validateUserId(userId);

    try {
      // Calculate current billing month boundaries (UTC)
      const now = new Date();
      const startOfMonth = new Date(now.getUTCFullYear(), now.getUTCMonth(), 1);
      const startOfNextMonth = new Date(now.getUTCFullYear(), now.getUTCMonth() + 1, 1);

      // Parallel execution of queries for better performance
      const [profileResult, playlistCountResult, aiUsageResult] = await Promise.all([
        // Get user's plan to determine limits
        this.supabase
          .from('profiles')
          .select('plan')
          .eq('user_id', userId)
          .single(),
        
        // Count playlists (non-deleted)
        this.supabase
          .from('playlists')
          .select('*', { count: 'exact', head: true })
          .eq('owner_id', userId)
          .eq('is_deleted', false),
        
        // Get AI usage using optimized database function
        this.supabase.rpc('get_ai_usage_summary', {
          p_user_id: userId,
          p_start_date: startOfMonth.toISOString(),
          p_end_date: startOfNextMonth.toISOString(),
        }),
      ]);

      // Handle profile query error
      if (profileResult.error) {

        if (profileResult.error.code === 'PGRST116') {
          throw new ApiError(404, 'NOT_FOUND', 'Profile not found');
        }

        throw new ApiError(500, 'INTERNAL_SERVER_ERROR', 'Failed to retrieve profile');
      }

      // Handle playlist count query error
      if (playlistCountResult.error) {
        throw new ApiError(500, 'INTERNAL_SERVER_ERROR', 'Failed to count playlists');
      }

      // Handle AI usage query error
      if (aiUsageResult.error) {
        throw new ApiError(500, 'INTERNAL_SERVER_ERROR', 'Failed to calculate AI usage');
      }

      // Get plan limits (cached)
      const planLimits = this.getPlanLimits(profileResult.data.plan);
      const playlistCount = playlistCountResult.count ?? 0;
      
      // Extract AI usage data (use succeeded_count for quota calculation)
      const aiUsageData = aiUsageResult.data?.[0];
      const aiUsedCount = aiUsageData?.succeeded_count ?? 0;

      const usageDto: ProfileUsageDto = {
        playlists: {
          count: playlistCount,
          limit: planLimits.playlists,
        },
        ai: {
          used: Number(aiUsedCount),
          limit: planLimits.ai,
          remaining: Math.max(0, planLimits.ai - Number(aiUsedCount)),
          resetAt: startOfNextMonth.toISOString(),
        },
      };

      return usageDto;
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }

      throw new ApiError(500, 'INTERNAL_SERVER_ERROR', 'Failed to calculate usage statistics');
    }
  }

  /**
   * Deletes user account and all associated data
   */
  async deleteAccount(userId: string): Promise<void> {
    // Input validation using helper method
    this.validateUserId(userId);

    try {
      // Step 1: Delete Spotify tokens (if any)
      const { error: spotifyError } = await this.supabase
        .from('spotify_tokens')
        .delete()
        .eq('user_id', userId);

      if (spotifyError && spotifyError.code !== 'PGRST116') {
        throw new ApiError(500, 'INTERNAL_SERVER_ERROR', 'Failed to delete Spotify tokens');
      }

      // Step 2: Soft delete all playlists
      const { error: playlistError } = await this.supabase
        .from('playlists')
        .update({ is_deleted: true, updated_at: new Date().toISOString() })
        .eq('owner_id', userId);

      if (playlistError) {
        throw new ApiError(500, 'INTERNAL_SERVER_ERROR', 'Failed to delete user playlists');
      }

      // Step 3: Delete profile (will cascade to AI sessions due to FK constraints)
      const { error: profileError } = await this.supabase
        .from('profiles')
        .delete()
        .eq('user_id', userId);

      if (profileError) {
        throw new ApiError(500, 'INTERNAL_SERVER_ERROR', 'Failed to delete user profile');
      }

      


    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }

      throw new ApiError(500, 'INTERNAL_SERVER_ERROR', 'Failed to delete account');
    }
  }

  /**
   * Returns plan limits based on plan type (cached for performance)
   */
  private getPlanLimits(plan: PlanType) {
    // Input validation with fallback to free plan
    if (!plan || (plan !== 'free' && plan !== 'pro')) {
      return PLAN_LIMITS_CACHE.free;
    }

    // Return cached limits
    return PLAN_LIMITS_CACHE[plan];
  }

  /**
   * Validates common input parameters and throws appropriate errors
   */
  private validateUserId(userId: string): void {
    if (!userId) {
      throw new ApiError(400, 'VALIDATION_ERROR', 'User ID is required');
    }
    
    if (typeof userId !== 'string') {
      throw new ApiError(400, 'VALIDATION_ERROR', 'User ID must be a string');
    }

    if (!userId.trim()) {
      throw new ApiError(400, 'VALIDATION_ERROR', 'User ID cannot be empty');
    }

    // UUID format validation (basic check)
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(userId)) {
      throw new ApiError(400, 'VALIDATION_ERROR', 'User ID must be a valid UUID');
    }
  }
}

export const profileService = new ProfileService();

/**
 * Checks if user's Pro plan has expired and downgrades to Free if necessary.
 * This function is called only in strategic places:
 * - Profile endpoint (GET /api/profile)
 * - AI dialog opening (CreatePlaylistDialog component)
 * - AI generation endpoint (POST /api/ai/generate)
 * 
 * @param userId - Supabase user ID
 * @returns true if downgrade was performed, false otherwise
 */
export async function checkAndDowngradeIfExpired(userId: string): Promise<boolean> {
  const supabase = createClient();
  
  try {
    const { data: profile, error } = await supabase
      .from('profiles')
      .select('plan, pro_expires_at')
      .eq('user_id', userId)
      .single();
    
    if (error || !profile) {
      // Profile might not exist yet (race condition during user creation)
      // This is expected and not an error - just return false
      if (error?.code === 'PGRST116') {
        // "Cannot coerce result to a single JSON object" - profile doesn't exist yet
        return false;
      }
      console.error('Failed to check pro expiration:', error);
      return false;
    }
    
    // Check if Pro plan has expired
    const isExpired = 
      profile.plan === 'pro' && 
      profile.pro_expires_at && 
      new Date(profile.pro_expires_at) < new Date();
    
    if (isExpired) {
      // Downgrade to Free
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ 
          plan: 'free',
          pro_expires_at: null,
          updated_at: new Date().toISOString(),
        })
        .eq('user_id', userId);
      
      if (updateError) {
        console.error('Failed to downgrade expired Pro plan:', updateError);
        return false;
      }
      
      console.log(`User ${userId} downgraded from Pro to Free (expired: ${profile.pro_expires_at})`);
      return true;
    }
    
    return false;
  } catch (error) {
    console.error('Error checking/downgrading expired plan:', error);
    return false;
  }
}

