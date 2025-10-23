import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { ProfileClient } from '@/components/profile/ProfileClient';

export const metadata = {
    title: 'Profile | Sound Whiskers',
    description: 'Manage your account settings and preferences',
};

export default async function ProfilePage() {
    const supabase = createClient();

    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
        redirect('/auth/login?returnTo=/profile');
    }

    return <ProfileClient />;
}

