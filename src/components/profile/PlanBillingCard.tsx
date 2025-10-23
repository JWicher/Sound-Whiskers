'use client';

import { useState } from 'react';
import { Loader2, Crown, Settings } from 'lucide-react';
import { toast } from 'sonner';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useProfile } from '@/lib/hooks/useProfile';

export function PlanBillingCard() {
    const { profile } = useProfile();
    const [isLoading, setIsLoading] = useState(false);

    const handleUpgrade = async () => {
        setIsLoading(true);
        try {
            const res = await fetch('/api/billing/checkout', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    successUrl: `${window.location.origin}/profile?success=true`,
                    cancelUrl: `${window.location.origin}/profile`,
                }),
            });

            if (!res.ok) {
                const error = await res.json();
                toast.error(error.error?.message || 'Failed to start checkout');
                return;
            }

            const { url } = await res.json();
            window.location.href = url;
        } catch {
            toast.error('Something went wrong. Please try again.');
        } finally {
            setIsLoading(false);
        }
    };

    const handleManageBilling = async () => {
        setIsLoading(true);
        try {
            const res = await fetch('/api/billing/portal', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    returnUrl: `${window.location.origin}/profile`,
                }),
            });

            if (!res.ok) {
                const error = await res.json();
                toast.error(error.error?.message || 'Failed to open billing portal');
                return;
            }

            const { url } = await res.json();
            window.location.href = url;
        } catch {
            toast.error('Something went wrong. Please try again.');
        } finally {
            setIsLoading(false);
        }
    };

    const isPro = profile?.plan === 'pro';

    return (
        <Card>
            <CardHeader>
                <CardTitle>Plan & Billing</CardTitle>
                <CardDescription>
                    Manage your subscription and billing information
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">Current Plan:</span>
                    <Badge variant={isPro ? 'default' : 'secondary'} className="gap-1">
                        {isPro && <Crown className="h-3 w-3" />}
                        {isPro ? 'Pro' : 'Free'}
                    </Badge>
                </div>

                {!isPro ? (
                    <div className="space-y-2">
                        <p className="text-sm text-muted-foreground">
                            Upgrade to Pro for unlimited playlists and more AI generations
                        </p>
                        <Button onClick={handleUpgrade} disabled={isLoading} className="w-full sm:w-auto">
                            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            <Crown className="mr-2 h-4 w-4" />
                            Upgrade to Pro
                        </Button>
                    </div>
                ) : (
                    <Button
                        onClick={handleManageBilling}
                        disabled={isLoading}
                        variant="outline"
                        className="w-full sm:w-auto"
                    >
                        {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        <Settings className="mr-2 h-4 w-4" />
                        Manage Billing
                    </Button>
                )}
            </CardContent>
        </Card>
    );
}

