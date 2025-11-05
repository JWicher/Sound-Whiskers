'use client';

import { useState } from 'react';
import { Loader2, Crown, Settings, CreditCard } from 'lucide-react';
import { toast } from 'sonner';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { useProfile } from '@/lib/hooks/useProfile';

type PaymentMethod = 'card' | 'blik';

export function PlanBillingCard() {
    const { profile } = useProfile();
    const [isLoading, setIsLoading] = useState(false);
    const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('card');

    const handleUpgrade = async () => {
        setIsLoading(true);
        try {
            const res = await fetch('/api/billing/checkout', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    successUrl: `${window.location.origin}/payment/success`,
                    cancelUrl: `${window.location.origin}/payment/canceled`,
                    paymentMethod,
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
                <div className="space-y-2">
                    <div className="flex items-center gap-2">
                        <span className="text-sm font-medium">Current Plan:</span>
                        <Badge variant={isPro ? 'default' : 'secondary'} className="gap-1">
                            {isPro && <Crown className="h-3 w-3" />}
                            {isPro ? 'Pro' : 'Free'}
                        </Badge>
                    </div>

                    {isPro && profile?.proExpiresAt && (
                        <p className="text-sm text-muted-foreground">
                            Pro access expires on{' '}
                            <span className="font-medium text-foreground">
                                {new Date(profile.proExpiresAt).toLocaleDateString('en-US', {
                                    year: 'numeric',
                                    month: 'long',
                                    day: 'numeric',
                                })}
                            </span>
                        </p>
                    )}
                </div>

                {!isPro ? (
                    <div className="space-y-4">
                        <p className="text-sm text-muted-foreground">
                            Upgrade to Pro for unlimited playlists and more AI generations
                        </p>

                        <div className="space-y-3">
                            <div className="space-y-2">
                                <Label className="text-sm font-medium">Payment Method</Label>
                                <RadioGroup
                                    value={paymentMethod}
                                    onValueChange={(value) => setPaymentMethod(value as PaymentMethod)}
                                    disabled={isLoading}
                                >
                                    <div className="flex items-center space-x-2">
                                        <RadioGroupItem value="card" id="card" />
                                        <Label htmlFor="card" className="font-normal cursor-pointer">
                                            <div className="flex items-center gap-2">
                                                <CreditCard className="h-4 w-4" />
                                                Card
                                            </div>
                                        </Label>
                                    </div>
                                    <div className="flex items-center space-x-2">
                                        <RadioGroupItem value="blik" id="blik" />
                                        <Label htmlFor="blik" className="font-normal cursor-pointer">
                                            BLIK
                                        </Label>
                                    </div>
                                </RadioGroup>
                            </div>

                            <p className="text-xs text-muted-foreground">
                                {paymentMethod === 'card'
                                    ? 'Recurring monthly subscription in USD'
                                    : 'One-time payment in PLN · Checkout will open in Polish'
                                }
                            </p>
                        </div>

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

