'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Loader2 } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useProfile } from '@/lib/hooks/useProfile';

const usernameSchema = z.object({
    username: z
        .string()
        .trim()
        .min(3, 'Username must be at least 3 characters')
        .max(30, 'Username must be 30 characters or less')
        .regex(
            /^[A-Za-z0-9_-]+$/,
            'Username can only contain letters, numbers, underscores, and hyphens'
        ),
});

type UsernameFormData = z.infer<typeof usernameSchema>;

export function AccountCard() {
    const { profile, updateUsername } = useProfile();
    const [isSaving, setIsSaving] = useState(false);

    const {
        register,
        handleSubmit,
        formState: { errors, isDirty },
        reset,
    } = useForm<UsernameFormData>({
        resolver: zodResolver(usernameSchema),
        values: {
            username: profile?.username || '',
        },
    });

    const onSubmit = async (data: UsernameFormData) => {
        setIsSaving(true);
        const success = await updateUsername(data);
        setIsSaving(false);

        if (success) {
            reset(data);
        }
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle>Account Information</CardTitle>
                <CardDescription>
                    Update your account details and personal information
                </CardDescription>
            </CardHeader>
            <CardContent>
                <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="username">Username</Label>
                        <Input
                            id="username"
                            placeholder="Enter your username"
                            {...register('username')}
                            disabled={isSaving}
                            aria-describedby={errors.username ? 'username-error' : undefined}
                        />
                        {errors.username && (
                            <p id="username-error" className="text-sm text-destructive">
                                {errors.username.message}
                            </p>
                        )}
                    </div>
                    <Button type="submit" disabled={!isDirty || isSaving}>
                        {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Save Changes
                    </Button>
                </form>
            </CardContent>
        </Card>
    );
}

