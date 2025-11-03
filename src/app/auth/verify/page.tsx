'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { CheckCircle2, XCircle, Loader2 } from 'lucide-react';

import { AuthCard } from '@/components/auth/AuthCard';
import { Button } from '@/components/ui/button';
import { createClient } from '@/lib/supabase/client';

type VerificationStatus = 'loading' | 'success' | 'error';

export default function VerifyPage() {
    const [status, setStatus] = useState<VerificationStatus>('loading');
    const [errorMessage, setErrorMessage] = useState('');
    const router = useRouter();
    const searchParams = useSearchParams();
    const supabase = createClient();

    useEffect(() => {
        const verifyEmail = async () => {
            try {
                const token_hash = searchParams.get('token_hash');
                const type = searchParams.get('type');

                // If we have a token, verify it with Supabase
                if (token_hash && type) {
                    const { error } = await supabase.auth.verifyOtp({
                        token_hash,
                        type: type as 'email' | 'signup',
                    });

                    if (error) {
                        console.error('Verification error:', error);
                        setStatus('error');
                        setErrorMessage('Failed to verify email. The link may be invalid or expired.');
                        return;
                    }

                    router.push('/playlists');
                } else {
                    // No token in URL, check if already authenticated
                    const { data: { session } } = await supabase.auth.getSession();

                    if (session) {
                        router.push('/playlists');
                    } else {
                        setStatus('error');
                        setErrorMessage('No verification token found. Please check your email for a valid link.');
                    }
                }
            } catch (error) {
                console.error('Unexpected error:', error);
                setStatus('error');
                setErrorMessage('An unexpected error occurred. Please try again.');
            }
        };

        verifyEmail();
    }, [supabase, router, searchParams]);

    if (status === 'loading') {
        return (
            <div className="container mx-auto flex min-h-[calc(100vh-3.5rem)] items-center justify-center py-8">
                <AuthCard title="Verifying your email" description="Please wait...">
                    <div className="flex justify-center py-8">
                        <Loader2 className="h-12 w-12 animate-spin text-muted-foreground" />
                    </div>
                </AuthCard>
            </div>
        );
    }

    if (status === 'error') {
        return (
            <div className="container mx-auto flex min-h-[calc(100vh-3.5rem)] items-center justify-center py-8">
                <AuthCard
                    title="Verification failed"
                    description="We couldn't verify your email"
                    footer={
                        <div className="w-full space-y-2">
                            <Button asChild className="w-full">
                                <Link href="/auth/login">Go to login</Link>
                            </Button>
                            <p className="text-center text-sm text-muted-foreground">
                                Need help?{' '}
                                <Link href="/auth/register" className="font-medium text-primary hover:underline">
                                    Sign up again
                                </Link>
                            </p>
                        </div>
                    }
                >
                    <div className="flex items-start gap-3 rounded-lg border border-destructive/50 bg-destructive/10 p-4">
                        <XCircle className="h-5 w-5 text-destructive" />
                        <div className="flex-1 space-y-1">
                            <p className="text-sm font-medium">Verification error</p>
                            <p className="text-sm text-muted-foreground">{errorMessage}</p>
                        </div>
                    </div>
                </AuthCard>
            </div>
        );
    }

    return (
        <div className="container mx-auto flex min-h-[calc(100vh-3.5rem)] items-center justify-center py-8">
            <AuthCard
                title="Email verified!"
                description="Your account has been successfully verified"
                footer={
                    <div className="w-full">
                        <Button asChild className="w-full">
                            <Link href="/playlists">Continue to playlists</Link>
                        </Button>
                    </div>
                }
            >
                <div className="flex items-start gap-3 rounded-lg border border-green-200 bg-green-50 p-4 dark:border-green-900 dark:bg-green-950">
                    <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400" />
                    <div className="flex-1 space-y-1">
                        <p className="text-sm font-medium text-green-900 dark:text-green-100">
                            Verification successful
                        </p>
                        <p className="text-sm text-green-700 dark:text-green-300">
                            Your email has been verified. You&apos;ll be redirected to your playlists shortly.
                        </p>
                    </div>
                </div>
            </AuthCard>
        </div>
    );
}

