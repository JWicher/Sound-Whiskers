'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Loader2, Mail } from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { magicLinkSchema, MagicLinkFormData } from '@/lib/validators/authSchemas';

interface MagicLinkFormProps {
    onSubmit: (data: MagicLinkFormData) => Promise<void>;
    isSubmitting?: boolean;
}

export function MagicLinkForm({ onSubmit, isSubmitting = false }: MagicLinkFormProps) {
    const form = useForm<MagicLinkFormData>({
        resolver: zodResolver(magicLinkSchema),
        defaultValues: {
            email: '',
        },
    });

    const handleSubmit = async (data: MagicLinkFormData) => {
        await onSubmit(data);
    };

    return (
        <Form {...form}>
            <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
                <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Email</FormLabel>
                            <FormControl>
                                <Input
                                    type="email"
                                    placeholder="Enter your email..."
                                    autoComplete="email"
                                    disabled={isSubmitting}
                                    {...field}
                                />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />

                <Button type="submit" className="w-full" disabled={isSubmitting}>
                    {isSubmitting ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                        <Mail className="mr-2 h-4 w-4" />
                    )}
                    Send Magic Link
                </Button>
            </form>
        </Form>
    );
}

