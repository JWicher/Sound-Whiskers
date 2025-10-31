import { createClient } from '@supabase/supabase-js'
import { Database } from '../src/db/database.types'
import dotenv from 'dotenv'
import path from 'path'

// Load environment variables from .env.test
dotenv.config({ path: path.resolve(process.cwd(), '.env.test') })

/**
 * Global Teardown for Playwright E2E Tests
 * 
 * This script runs ONCE after all tests have completed.
 * It cleans up test data from the database for the E2E test user.
 * 
 * Usage: Configure in playwright.config.ts as globalTeardown
 */
async function globalTeardown() {
  console.log('\n🧹 Starting database cleanup after E2E tests...\n')

  // Validate required environment variables
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  const e2eUserId = process.env.E2E_USERNAME_ID

  if (!supabaseUrl) {
    console.error('❌ NEXT_PUBLIC_SUPABASE_URL is not set in .env.test')
    throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL environment variable')
  }

  if (!supabaseAnonKey) {
    console.error('❌ NEXT_PUBLIC_SUPABASE_ANON_KEY is not set in .env.test')
    throw new Error('Missing NEXT_PUBLIC_SUPABASE_ANON_KEY environment variable')
  }

  if (!e2eUserId) {
    console.error('❌ E2E_USERNAME_ID is not set in .env.test')
    throw new Error('Missing E2E_USERNAME_ID environment variable')
  }

  // Create Supabase client using public/anon key
  const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey)

  try {
    // Track cleanup statistics
    const stats = {
      playlistTracks: 0,
      playlists: 0,
      spotifyTokens: 0,
      aiSessions: 0,
      profiles: 0,
    }

    console.log(`🎯 Cleaning up data for user: ${e2eUserId}\n`)

    // 1. Delete playlist_tracks (must delete before playlists due to foreign key)
    console.log('🗑️  Deleting playlist tracks...')
    const { data: playlistsForTracks } = await supabase
      .from('playlists')
      .select('id')
      .eq('owner_id', e2eUserId)

    if (playlistsForTracks && playlistsForTracks.length > 0) {
      const playlistIds = playlistsForTracks.map((p) => p.id)
      const { error: tracksError, count: tracksCount } = await supabase
        .from('playlist_tracks')
        .delete({ count: 'exact' })
        .in('playlist_id', playlistIds)

      if (tracksError) {
        console.error('❌ Error deleting playlist_tracks:', tracksError)
      } else {
        stats.playlistTracks = tracksCount || 0
        console.log(`   ✅ Deleted ${stats.playlistTracks} playlist tracks`)
      }
    } else {
      console.log('   ℹ️  No playlist tracks to delete')
    }

    // 2. Delete playlists
    console.log('🗑️  Deleting playlists...')
    const { error: playlistsError, count: playlistsCount } = await supabase
      .from('playlists')
      .delete({ count: 'exact' })
      .eq('owner_id', e2eUserId)

    if (playlistsError) {
      console.error('❌ Error deleting playlists:', playlistsError)
    } else {
      stats.playlists = playlistsCount || 0
      console.log(`   ✅ Deleted ${stats.playlists} playlists`)
    }

    // 3. Delete spotify_tokens
    console.log('🗑️  Deleting Spotify tokens...')
    const { error: spotifyError, count: spotifyCount } = await supabase
      .from('spotify_tokens')
      .delete({ count: 'exact' })
      .eq('user_id', e2eUserId)

    if (spotifyError) {
      console.error('❌ Error deleting spotify_tokens:', spotifyError)
    } else {
      stats.spotifyTokens = spotifyCount || 0
      console.log(`   ✅ Deleted ${stats.spotifyTokens} Spotify tokens`)
    }

    // 4. Delete AI sessions from main table and partitions
    console.log('🗑️  Deleting AI sessions...')
    
    // Main ai_sessions table
    const { error: aiError, count: aiCount } = await supabase
      .from('ai_sessions')
      .delete({ count: 'exact' })
      .eq('user_id', e2eUserId)

    if (aiError) {
      console.error('❌ Error deleting ai_sessions:', aiError)
    } else {
      stats.aiSessions = aiCount || 0
      console.log(`   ✅ Deleted ${stats.aiSessions} AI sessions from main table`)
    }

    // Partitioned tables (2025_10, 2025_11, 2025_12, 2026_01)
    const partitions = ['ai_sessions_2025_10', 'ai_sessions_2025_11', 'ai_sessions_2025_12', 'ai_sessions_2026_01']
    
    for (const partition of partitions) {
      const { error: partitionError, count: partitionCount } = await supabase
        .from(partition as any)
        .delete({ count: 'exact' })
        .eq('user_id', e2eUserId)

      if (partitionError) {
        // Partition might not exist yet, which is fine
        console.log(`   ℹ️  Skipping ${partition} (might not exist yet)`)
      } else {
        const deleted = partitionCount || 0
        if (deleted > 0) {
          stats.aiSessions += deleted
          console.log(`   ✅ Deleted ${deleted} AI sessions from ${partition}`)
        }
      }
    }

    // 5. Delete profile (should be done last, but RLS might prevent this with anon key)
    console.log('🗑️  Attempting to delete profile...')
    const { error: profileError, count: profileCount } = await supabase
      .from('profiles')
      .delete({ count: 'exact' })
      .eq('user_id', e2eUserId)

    if (profileError) {
      console.warn('⚠️  Could not delete profile (RLS might prevent this with anon key):', profileError.message)
      console.log('   ℹ️  This is expected if RLS is properly configured')
    } else {
      stats.profiles = profileCount || 0
      if (stats.profiles > 0) {
        console.log(`   ✅ Deleted ${stats.profiles} profile`)
      } else {
        console.log('   ℹ️  Profile was not deleted (RLS or already deleted)')
      }
    }

    // Summary
    console.log('\n📊 Cleanup Summary:')
    console.log('─────────────────────────────────')
    console.log(`   Playlist Tracks: ${stats.playlistTracks}`)
    console.log(`   Playlists:       ${stats.playlists}`)
    console.log(`   Spotify Tokens:  ${stats.spotifyTokens}`)
    console.log(`   AI Sessions:     ${stats.aiSessions}`)
    console.log(`   Profiles:        ${stats.profiles}`)
    console.log('─────────────────────────────────')

    const totalDeleted = Object.values(stats).reduce((sum, count) => sum + count, 0)
    console.log(`   Total:           ${totalDeleted}`)
    console.log('\n✅ Database cleanup completed successfully!\n')
  } catch (error) {
    console.error('\n❌ Database cleanup failed:', error)
    throw error
  }
}

export default globalTeardown

