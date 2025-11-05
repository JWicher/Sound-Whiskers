'use client';

import { useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { toast } from 'sonner';
import { AccountCard } from './AccountCard';
import { PlanBillingCard } from './PlanBillingCard';
import { UsageCard } from './UsageCard';
import { SpotifyCard } from './SpotifyCard';
import { DangerZoneCard } from './DangerZoneCard';
import { Skeleton } from '@/components/ui/skeleton';
import { useProfile } from '@/lib/hooks/useProfile';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle } from 'lucide-react';

export function ProfileClient() {
    const { profile, isLoading, error } = useProfile();
    const searchParams = useSearchParams();

    // Handle Spotify OAuth and Stripe checkout success/error messages
    useEffect(() => {
        const spotifyParam = searchParams.get('spotify');
        const errorParam = searchParams.get('error');
        const details = searchParams.get('details');
        const successParam = searchParams.get('success');
        const canceledParam = searchParams.get('canceled');

        // Handle Stripe checkout success
        if (successParam === 'true') {
            toast.success('Successfully upgraded to Pro! Your account has been updated.', {
                duration: 5000,
            });
            // Clean up URL
            window.history.replaceState({}, document.title, '/profile');
        }
        // Handle Stripe checkout cancellation
        else if (canceledParam === 'true') {
            toast.info('Payment was canceled. You can try again anytime.', {
                duration: 4000,
            });
            // Clean up URL
            window.history.replaceState({}, document.title, '/profile');
        }
        // Handle Spotify OAuth success
        else if (spotifyParam === 'linked') {
            toast.success('Spotify account linked successfully! You can now export playlists.');
            // Clean up URL
            window.history.replaceState({}, document.title, '/profile');
        }
        // Handle Spotify OAuth errors
        else if (errorParam?.startsWith('spotify_')) {
            const errorMessages: Record<string, string> = {
                'spotify_auth_denied': 'Spotify authorization was denied.',
                'spotify_invalid_callback': 'Invalid Spotify callback. Please try again.',
                'spotify_state_mismatch': 'Security validation failed. Please try again.',
                'spotify_token_exchange_failed': 'Failed to link Spotify account.',
            };

            const message = errorMessages[errorParam] || 'Failed to link Spotify account.';
            const fullMessage = details ? `${message} ${details}` : message;
            toast.error(fullMessage);

            // Clean up URL
            window.history.replaceState({}, document.title, '/profile');
        }
    }, [searchParams]);

    if (error) {
        return (
            <div className="container max-w-6xl py-8">
                <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                        Failed to load profile. Please try refreshing the page.
                    </AlertDescription>
                </Alert>
            </div>
        );
    }

    if (isLoading || !profile) {
        return (
            <div className="container max-w-6xl py-8">
                <div className="space-y-6">
                    <div className="space-y-2">
                        <Skeleton className="h-8 w-48" />
                        <Skeleton className="h-4 w-96" />
                    </div>
                    <div className="grid gap-6 md:grid-cols-2">
                        <Skeleton className="h-64" />
                        <Skeleton className="h-64" />
                        <Skeleton className="h-64" />
                        <Skeleton className="h-64" />
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="container max-w-6xl py-8 px-4 mx-auto">
            <div className="space-y-6">
                {/* Header */}
                <div className="space-y-2">
                    <h1 className="text-3xl font-bold tracking-tight">Profile</h1>
                    <p className="text-muted-foreground">
                        Manage your account settings and preferences
                    </p>
                </div>

                {/* Cards Grid */}
                <div className="grid gap-6 md:grid-cols-2">
                    <AccountCard />
                    <PlanBillingCard />
                    <UsageCard />
                    <SpotifyCard />
                </div>

                {/* Danger Zone - Full Width */}
                <DangerZoneCard />
            </div>
        </div>
    );
}

