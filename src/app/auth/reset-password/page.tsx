'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import { Loader2, AlertCircle } from 'lucide-react';
import { z } from 'zod';

import { AuthCard } from '@/components/auth/AuthCard';
import { PasswordInput } from '@/components/auth/PasswordInput';
import { Button } from '@/components/ui/button';
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
    FormDescription,
} from '@/components/ui/form';
import { Separator } from '@/components/ui/separator';
import { createClient } from '@/lib/supabase/client';

const resetPasswordFormSchema = z.object({
    newPassword: z.string().min(8, 'Password must be at least 8 characters'),
    passwordConfirm: z.string(),
}).refine((data) => data.newPassword === data.passwordConfirm, {
    message: 'Passwords do not match',
    path: ['passwordConfirm'],
});

type ResetPasswordFormData = z.infer<typeof resetPasswordFormSchema>;

export default function ResetPasswordPage() {
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [hasValidToken, setHasValidToken] = useState<boolean | null>(null);
    const router = useRouter();
    const searchParams = useSearchParams();
    const supabase = createClient();

    const form = useForm<ResetPasswordFormData>({
        resolver: zodResolver(resetPasswordFormSchema),
        defaultValues: {
            newPassword: '',
            passwordConfirm: '',
        },
    });

    useEffect(() => {
        // Check if we have a valid session from the reset link
        const checkToken = async () => {
            const token_hash = searchParams.get('token_hash');
            const type = searchParams.get('type');

            // If we have a token, verify it with Supabase
            if (token_hash && type === 'recovery') {
                const { error } = await supabase.auth.verifyOtp({
                    token_hash,
                    type: 'recovery',
                });

                if (error) {
                    console.error('Token verification error:', error);
                    setHasValidToken(false);
                    return;
                }

                setHasValidToken(true);
            } else {
                // Check if already has a session
                const { data: { session } } = await supabase.auth.getSession();
                setHasValidToken(!!session);
            }
        };

        checkToken();
    }, [supabase, searchParams]);

    const handleSubmit = async (data: ResetPasswordFormData) => {
        setIsSubmitting(true);
        try {
            const { error } = await supabase.auth.updateUser({
                password: data.newPassword,
            });

            if (error) {
                toast.error(error.message || 'Failed to reset password. Please try again.');

                setIsSubmitting(false);

                return;
            }

            // Sign out the user to clear the recovery session
            await supabase.auth.signOut();

            toast.success('Password reset successfully! Please sign in with your new password.');

            // Use router.refresh() to clear cache then navigate
            router.refresh();
            router.push('/auth/login');
        } catch (error) {
            toast.error('An error occurred. Please try again.');
        } finally {
            setIsSubmitting(false);
        }
    };

    if (hasValidToken === null) {
        return (
            <div className="container mx-auto flex min-h-[calc(100vh-3.5rem)] items-center justify-center py-8">
                <AuthCard title="Reset Password" description="Verifying your reset link...">
                    <div className="flex justify-center py-8">
                        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                    </div>
                </AuthCard>
            </div>
        );
    }

    if (!hasValidToken) {
        return (
            <div className="container mx-auto flex min-h-[calc(100vh-3.5rem)] items-center justify-center py-8">
                <AuthCard
                    title="Invalid or expired link"
                    description="This password reset link is no longer valid"
                    footer={
                        <div className="w-full text-center text-sm text-muted-foreground">
                            <Link
                                href="/auth/forgot-password"
                                className="font-medium text-primary hover:underline"
                            >
                                Request a new reset link
                            </Link>
                        </div>
                    }
                >
                    <div className="flex items-start gap-3 rounded-lg border border-destructive/50 bg-destructive/10 p-4">
                        <AlertCircle className="h-5 w-5 text-destructive" />
                        <div className="flex-1 space-y-1">
                            <p className="text-sm font-medium">Link expired</p>
                            <p className="text-sm text-muted-foreground">
                                This password reset link is invalid or has expired. Please request a new one.
                            </p>
                        </div>
                    </div>
                </AuthCard>
            </div>
        );
    }

    return (
        <div className="container mx-auto flex min-h-[calc(100vh-3.5rem)] items-center justify-center py-8">
            <AuthCard
                title="Set new password"
                description="Enter your new password below"
                footer={
                    <div className="w-full space-y-4">
                        <Separator />
                        <div className="text-center text-sm text-muted-foreground">
                            Remember your password?{' '}
                            <Link href="/auth/login" className="font-medium text-primary hover:underline">
                                Sign in
                            </Link>
                        </div>
                    </div>
                }
            >
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
                        <FormField
                            control={form.control}
                            name="newPassword"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>New Password</FormLabel>
                                    <FormControl>
                                        <PasswordInput
                                            value={field.value}
                                            onChange={field.onChange}
                                            placeholder="Enter new password..."
                                            disabled={isSubmitting}
                                            autoComplete="new-password"
                                        />
                                    </FormControl>
                                    <FormDescription>
                                        Use at least 8 characters with a mix of letters and numbers
                                    </FormDescription>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <FormField
                            control={form.control}
                            name="passwordConfirm"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Confirm Password</FormLabel>
                                    <FormControl>
                                        <PasswordInput
                                            value={field.value}
                                            onChange={field.onChange}
                                            placeholder="Confirm new password..."
                                            disabled={isSubmitting}
                                            autoComplete="new-password"
                                        />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <Button type="submit" className="w-full" disabled={isSubmitting}>
                            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Reset password
                        </Button>
                    </form>
                </Form>
            </AuthCard>
        </div>
    );
}

