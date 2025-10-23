'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { toast } from 'sonner';
import { Mail, CheckCircle2 } from 'lucide-react';

import { AuthCard } from '@/components/auth/AuthCard';
import { EmailPasswordForm } from '@/components/auth/EmailPasswordForm';
import { MagicLinkForm } from '@/components/auth/MagicLinkForm';
import { Separator } from '@/components/ui/separator';
import { Button } from '@/components/ui/button';
import { loginSchema, LoginFormData, MagicLinkFormData } from '@/lib/validators/authSchemas';
import { createClient } from '@/lib/supabase/client';

export default function LoginPage() {
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [showMagicLink, setShowMagicLink] = useState(false);
    const [magicLinkSent, setMagicLinkSent] = useState(false);
    const [sentEmail, setSentEmail] = useState('');
    const router = useRouter();
    const supabase = createClient();

    const handlePasswordLogin = async (data: LoginFormData) => {
        setIsSubmitting(true);
        try {
            const { error } = await supabase.auth.signInWithPassword({
                email: data.email,
                password: data.password,
            });

            if (error) {
                if (error.message.includes('Email not confirmed')) {
                    toast.error('Please confirm your email to continue. We\'ve sent a verification link.');
                } else {
                    toast.error('Incorrect email or password.');
                }
                return;
            }

            toast.success('Welcome back!');
            router.push('/playlists');
        } catch (error) {
            toast.error('An error occurred. Please try again.');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleMagicLink = async (data: MagicLinkFormData) => {
        setIsSubmitting(true);
        try {
            const { error } = await supabase.auth.signInWithOtp({
                email: data.email,
                options: {
                    emailRedirectTo: `${window.location.origin}/auth/verify`,
                },
            });

            if (error) {
                toast.error('Failed to send magic link. Please try again.');
                return;
            }

            toast.success('Magic link sent! Check your email.');
            setSentEmail(data.email);
            setMagicLinkSent(true);
        } catch (error) {
            toast.error('An error occurred. Please try again.');
        } finally {
            setIsSubmitting(false);
        }
    };

    // Show confirmation message after magic link is sent
    if (magicLinkSent) {
        return (
            <div className="container mx-auto flex min-h-[calc(100vh-3.5rem)] items-center justify-center py-8">
                <AuthCard
                    title="Check your email"
                    description="We've sent you a magic link to sign in"
                    footer={
                        <div className="w-full space-y-2">
                            <Button
                                variant="outline"
                                className="w-full"
                                onClick={() => {
                                    setMagicLinkSent(false);
                                    setSentEmail('');
                                }}
                            >
                                Back to login
                            </Button>
                            <p className="text-center text-sm text-muted-foreground">
                                Didn&apos;t receive the email?{' '}
                                <button
                                    type="button"
                                    onClick={() => setMagicLinkSent(false)}
                                    className="font-medium text-primary hover:underline"
                                >
                                    Try again
                                </button>
                            </p>
                        </div>
                    }
                >
                    <div className="space-y-4">
                        <div className="flex items-start gap-3 rounded-lg border border-green-200 bg-green-50 p-4 dark:border-green-900 dark:bg-green-950">
                            <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400" />
                            <div className="flex-1 space-y-1">
                                <p className="text-sm font-medium text-green-900 dark:text-green-100">
                                    Magic link sent!
                                </p>
                                <p className="text-sm text-green-700 dark:text-green-300">
                                    We&apos;ve sent a sign-in link to <strong>{sentEmail}</strong>
                                </p>
                            </div>
                        </div>

                        <div className="flex items-start gap-3 rounded-lg border bg-muted/50 p-4">
                            <Mail className="h-5 w-5 text-muted-foreground" />
                            <div className="flex-1 space-y-2">
                                <p className="text-sm font-medium">What to do next:</p>
                                <ol className="list-decimal space-y-1 pl-4 text-sm text-muted-foreground">
                                    <li>Check your inbox for an email from Sound Whiskers</li>
                                    <li>Click the magic link in the email</li>
                                    <li>You&apos;ll be automatically signed in</li>
                                </ol>
                                <p className="text-xs text-muted-foreground">
                                    The link will expire in 1 hour for security reasons.
                                </p>
                            </div>
                        </div>
                    </div>
                </AuthCard>
            </div>
        );
    }

    return (
        <div className="container mx-auto flex min-h-[calc(100vh-3.5rem)] items-center justify-center py-8">
            <AuthCard
                title={showMagicLink ? 'Sign in with Magic Link' : 'Welcome back'}
                description={
                    showMagicLink
                        ? 'Enter your email to receive a magic link'
                        : 'Sign in to your account to continue'
                }
                footer={
                    <div className="w-full space-y-4">
                        <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                            <button
                                type="button"
                                onClick={() => setShowMagicLink(!showMagicLink)}
                                className="font-medium text-primary hover:underline"
                            >
                                {showMagicLink ? 'Use password instead' : 'Use magic link instead'}
                            </button>
                        </div>

                        <Separator />

                        <div className="flex flex-col gap-2 text-center text-sm">
                            <Link
                                href="/auth/forgot-password"
                                className="text-muted-foreground hover:text-primary hover:underline"
                            >
                                Forgot your password?
                            </Link>
                            <div className="text-muted-foreground">
                                Don&apos;t have an account?{' '}
                                <Link href="/auth/register" className="font-medium text-primary hover:underline">
                                    Sign up
                                </Link>
                            </div>
                        </div>
                    </div>
                }
            >
                {showMagicLink ? (
                    <MagicLinkForm onSubmit={handleMagicLink} isSubmitting={isSubmitting} />
                ) : (
                    <EmailPasswordForm
                        schema={loginSchema}
                        onSubmit={handlePasswordLogin}
                        submitLabel="Sign in"
                        isSubmitting={isSubmitting}
                    />
                )}
            </AuthCard>
        </div>
    );
}

