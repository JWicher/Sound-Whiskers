import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { PlaylistList } from '@/components/playlists/PlaylistList';
import { getFeatureFlagForClient } from '@/features';

// Force dynamic rendering - required for cookies() access
export const dynamic = 'force-dynamic';

export default async function PlaylistsPage() {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) redirect('/auth/login');

    // Check feature flags (server-side)
    const aiFeature = getFeatureFlagForClient('generateWithAI');

    return (
        <div className="container mx-auto py-8 h-full">
            <PlaylistList aiGenerationEnabled={aiFeature.enabled} />
        </div>
    );
}
