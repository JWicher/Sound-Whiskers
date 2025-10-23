'use client';

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
        <div className="container max-w-6xl py-8 mx-auto">
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

