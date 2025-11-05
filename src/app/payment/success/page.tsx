import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { CheckCircle2, Sparkles, Music } from 'lucide-react';

export const metadata = {
    title: 'Payment Successful | Sound Whiskers',
    description: 'Your payment was successful',
};

export default async function PaymentSuccessPage() {
    const supabase = createClient();

    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
        redirect('/auth/login?returnTo=/payment/success');
    }

    // Fetch user profile to show plan info
    const { data: profile } = await supabase
        .from('profiles')
        .select('plan, pro_expires_at')
        .eq('user_id', user.id)
        .single();

    const hasExpiration = profile?.pro_expires_at;

    return (
        <div className="container max-w-4xl py-16 px-4 mx-auto">
            <div className="space-y-8">
                {/* Success Icon */}
                <div className="flex justify-center">
                    <div className="rounded-full bg-green-100 dark:bg-green-900/20 p-6">
                        <CheckCircle2 className="h-16 w-16 text-green-600 dark:text-green-500" />
                    </div>
                </div>

                {/* Main Content */}
                <div className="text-center space-y-4">
                    <h1 className="text-4xl font-bold tracking-tight">
                        Payment Successful!
                    </h1>
                    <p className="text-xl text-muted-foreground">
                        Welcome to Sound Whiskers Pro
                    </p>
                </div>

                {/* Plan Details Card */}
                <Card className="border-2">
                    <CardHeader className="text-center">
                        <CardTitle className="flex items-center justify-center gap-2">
                            <Sparkles className="h-5 w-5 text-yellow-500" />
                            Your Pro Plan is Active
                        </CardTitle>
                        {hasExpiration ? (
                            <CardDescription>
                                Valid until {new Date(hasExpiration).toLocaleDateString('en-US', {
                                    year: 'numeric',
                                    month: 'long',
                                    day: 'numeric',
                                })}
                            </CardDescription>
                        ) : (
                            <CardDescription>
                                Subscription active until canceled
                            </CardDescription>
                        )}
                    </CardHeader>
                    <CardContent className="space-y-6">
                        {/* Features List */}
                        <div className="grid gap-4 sm:grid-cols-2">
                            <div className="flex items-start gap-3">
                                <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-500 mt-0.5 flex-shrink-0" />
                                <div>
                                    <p className="font-medium">Unlimited Playlists</p>
                                    <p className="text-sm text-muted-foreground">
                                        Create as many playlists as you want
                                    </p>
                                </div>
                            </div>
                            <div className="flex items-start gap-3">
                                <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-500 mt-0.5 flex-shrink-0" />
                                <div>
                                    <p className="font-medium">50 AI Generations/Month</p>
                                    <p className="text-sm text-muted-foreground">
                                        Let AI create perfect playlists for you
                                    </p>
                                </div>
                            </div>
                            <div className="flex items-start gap-3">
                                <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-500 mt-0.5 flex-shrink-0" />
                                <div>
                                    <p className="font-medium">Spotify Export</p>
                                    <p className="text-sm text-muted-foreground">
                                        Export playlists directly to Spotify
                                    </p>
                                </div>
                            </div>
                            <div className="flex items-start gap-3">
                                <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-500 mt-0.5 flex-shrink-0" />
                                <div>
                                    <p className="font-medium">Priority Support</p>
                                    <p className="text-sm text-muted-foreground">
                                        Get help when you need it
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* Next Steps */}
                        <div className="pt-4 border-t space-y-4">
                            <h3 className="font-semibold text-center">Ready to Get Started?</h3>
                            <div className="flex flex-col sm:flex-row gap-3 justify-center">
                                <Button asChild size="lg">
                                    <Link href="/playlists">
                                        <Music className="mr-2 h-4 w-4" />
                                        Create Your First Playlist
                                    </Link>
                                </Button>
                                <Button asChild variant="outline" size="lg">
                                    <Link href="/profile">
                                        View Profile
                                    </Link>
                                </Button>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Footer Note */}
                <p className="text-center text-sm text-muted-foreground">
                    A confirmation email has been sent to <strong>{user.email}</strong>
                </p>
            </div>
        </div>
    );
}

