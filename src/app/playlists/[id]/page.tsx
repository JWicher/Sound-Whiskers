import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { PlaylistDetailClient } from '@/components/playlists/PlaylistDetailClient';

// Force dynamic rendering - required for cookies() access
export const dynamic = 'force-dynamic';

interface PageProps {
    params: { id: string };
}

export default async function PlaylistDetailPage({ params }: PageProps) {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) redirect('/auth/login');

    return (
        <div className="container mx-auto py-8 h-[calc(100vh-4rem)] flex flex-col">
            <PlaylistDetailClient id={params.id} />
        </div>
    );
}


