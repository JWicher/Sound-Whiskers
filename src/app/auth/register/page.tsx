'use client';

import { useState } from 'react';
import Link from 'next/link';
import { toast } from 'sonner';
import { AlertCircle, CheckCircle2 } from 'lucide-react';

import { AuthCard } from '@/components/auth/AuthCard';
import { EmailPasswordForm } from '@/components/auth/EmailPasswordForm';
import { Separator } from '@/components/ui/separator';
import { registerSchema, RegisterFormData } from '@/lib/validators/authSchemas';
import { createClient } from '@/lib/supabase/client';

export default function RegisterPage() {
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [emailSent, setEmailSent] = useState(false);
    const [registeredEmail, setRegisteredEmail] = useState('');
    const supabase = createClient();

    const handleRegister = async (data: RegisterFormData) => {
        setIsSubmitting(true);
        try {
            const { error } = await supabase.auth.signUp({
                email: data.email,
                password: data.password,
                options: {
                    emailRedirectTo: `${window.location.origin}/auth/verify`,
                },
            });

            if (error) {
                if (error.message.includes('already registered')) {
                    toast.error('An account with this email already exists.');
                } else {
                    toast.error('Failed to create account. Please try again.');
                }
                return;
            }

            setRegisteredEmail(data.email);
            setEmailSent(true);
            toast.success('Account created! Please check your email.');
        } catch (error) {
            toast.error('An error occurred. Please try again.');
        } finally {
            setIsSubmitting(false);
        }
    };

    if (emailSent) {
        return (
            <div className="container mx-auto flex min-h-[calc(100vh-3.5rem)] items-center justify-center py-8">
                <AuthCard
                    title="Check your email"
                    description="We've sent you a verification link"
                    footer={
                        <div className="w-full text-center text-sm text-muted-foreground">
                            Already verified?{' '}
                            <Link href="/auth/login" className="font-medium text-primary hover:underline">
                                Sign in
                            </Link>
                        </div>
                    }
                >
                    <div className="space-y-4">
                        <div className="flex items-start gap-3 rounded-lg border border-green-200 bg-green-50 p-4 dark:border-green-900 dark:bg-green-950">
                            <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400" />
                            <div className="flex-1 space-y-1">
                                <p className="text-sm font-medium text-green-900 dark:text-green-100">
                                    Verification email sent
                                </p>
                                <p className="text-sm text-green-700 dark:text-green-300">
                                    We&apos;ve sent a verification link to <strong>{registeredEmail}</strong>.
                                    Click the link in the email to verify your account.
                                </p>
                            </div>
                        </div>

                        <div className="flex items-start gap-3 rounded-lg border border-blue-200 bg-blue-50 p-4 dark:border-blue-900 dark:bg-blue-950">
                            <AlertCircle className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                            <div className="flex-1 space-y-1">
                                <p className="text-sm font-medium text-blue-900 dark:text-blue-100">
                                    Didn&apos;t receive the email?
                                </p>
                                <p className="text-sm text-blue-700 dark:text-blue-300">
                                    Check your spam folder, or try signing up again if the email doesn&apos;t arrive
                                    within a few minutes.
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
                title="Create an account"
                description="Sign up to start managing your playlists"
                footer={
                    <div className="w-full space-y-4">
                        <Separator />
                        <div className="text-center text-sm text-muted-foreground">
                            Already have an account?{' '}
                            <Link href="/auth/login" className="font-medium text-primary hover:underline">
                                Sign in
                            </Link>
                        </div>
                    </div>
                }
            >
                <EmailPasswordForm
                    schema={registerSchema}
                    onSubmit={handleRegister}
                    submitLabel="Create account"
                    isSubmitting={isSubmitting}
                    showPasswordConfirm
                    showPasswordHints
                />
            </AuthCard>
        </div>
    );
}

