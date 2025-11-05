import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { XCircle, ArrowLeft, HelpCircle, Crown } from 'lucide-react';

export const metadata = {
    title: 'Payment Canceled | Sound Whiskers',
    description: 'Your payment was canceled',
};

export default async function PaymentCanceledPage() {
    const supabase = createClient();

    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
        redirect('/auth/login?returnTo=/payment/canceled');
    }

    return (
        <div className="container max-w-4xl py-16 px-4 mx-auto">
            <div className="space-y-8">
                {/* Canceled Icon */}
                <div className="flex justify-center">
                    <div className="rounded-full bg-orange-100 dark:bg-orange-900/20 p-6">
                        <XCircle className="h-16 w-16 text-orange-600 dark:text-orange-500" />
                    </div>
                </div>

                {/* Main Content */}
                <div className="text-center space-y-4">
                    <h1 className="text-4xl font-bold tracking-tight">
                        Payment Canceled
                    </h1>
                    <p className="text-xl text-muted-foreground">
                        No charges were made to your account
                    </p>
                </div>

                {/* Information Card */}
                <Card>
                    <CardHeader>
                        <CardTitle>What Happened?</CardTitle>
                        <CardDescription>
                            You&apos;ve canceled the payment process before it was completed
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <p className="text-sm text-muted-foreground">
                            Your payment was not processed and no charges were made. You can try again anytime
                            or continue using Sound Whiskers with your current plan.
                        </p>

                        {/* Actions */}
                        <div className="space-y-3">
                            <div className="flex flex-col sm:flex-row gap-3">
                                <Button asChild size="lg" className="flex-1">
                                    <Link href="/profile">
                                        <Crown className="mr-2 h-4 w-4" />
                                        Try Again - Upgrade to Pro
                                    </Link>
                                </Button>
                                <Button asChild variant="outline" size="lg" className="flex-1">
                                    <Link href="/playlists">
                                        <ArrowLeft className="mr-2 h-4 w-4" />
                                        Back to Playlists
                                    </Link>
                                </Button>
                            </div>
                        </div>

                        {/* Help Section */}
                        <div className="pt-4 border-t">
                            <div className="flex items-start gap-3">
                                <HelpCircle className="h-5 w-5 text-muted-foreground mt-0.5 flex-shrink-0" />
                                <div className="space-y-1">
                                    <p className="text-sm font-medium">Need Help?</p>
                                    <p className="text-sm text-muted-foreground">
                                        If you encountered any issues during the payment process,
                                        please contact our support team or try using a different payment method.
                                    </p>
                                </div>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Pro Benefits Reminder */}
                <Card className="border-primary/20">
                    <CardHeader>
                        <CardTitle className="text-base">Pro Plan Benefits</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <ul className="space-y-2 text-sm text-muted-foreground">
                            <li className="flex items-center gap-2">
                                <span className="h-1.5 w-1.5 rounded-full bg-primary" />
                                Unlimited playlists (Free plan: limited to 3)
                            </li>
                            <li className="flex items-center gap-2">
                                <span className="h-1.5 w-1.5 rounded-full bg-primary" />
                                50 AI-generated playlists per month (Free plan: 3)
                            </li>
                            <li className="flex items-center gap-2">
                                <span className="h-1.5 w-1.5 rounded-full bg-primary" />
                                Direct Spotify export
                            </li>
                            <li className="flex items-center gap-2">
                                <span className="h-1.5 w-1.5 rounded-full bg-primary" />
                                Priority support
                            </li>
                        </ul>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}

