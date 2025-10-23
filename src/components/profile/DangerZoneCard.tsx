'use client';

import { useState } from 'react';
import { AlertTriangle, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';

export function DangerZoneCard() {
    const [showDeleteDialog, setShowDeleteDialog] = useState(false);
    const [confirmText, setConfirmText] = useState('');
    const [isDeleting, setIsDeleting] = useState(false);

    const handleDeleteAccount = async () => {
        if (confirmText !== 'DELETE') {
            toast.error('Please type DELETE to confirm');
            return;
        }

        setIsDeleting(true);
        try {
            const res = await fetch('/api/profile', {
                method: 'DELETE',
            });

            if (!res.ok) {
                const error = await res.json();
                toast.error(error.error?.message || 'Failed to delete account');
                setIsDeleting(false);
                return;
            }

            // Account and auth user are deleted on the server
            // Session is already signed out by the API
            toast.success('Account deleted successfully. Goodbye!');

            // Small delay to let the user see the success message
            setTimeout(() => {
                window.location.href = '/auth/login';
            }, 1500);
        } catch {
            toast.error('Something went wrong. Please try again.');
            setIsDeleting(false);
        }
    };

    return (
        <>
            <Card className="border-destructive">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-destructive">
                        <AlertTriangle className="h-5 w-5" />
                        Danger Zone
                    </CardTitle>
                    <CardDescription>
                        Permanently delete your account and all associated data
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <Alert variant="destructive">
                        <AlertTriangle className="h-4 w-4" />
                        <AlertDescription>
                            This action cannot be undone. This will permanently delete your account,
                            all your playlists, and remove all associated data from our servers.
                        </AlertDescription>
                    </Alert>

                    <Button
                        variant="destructive"
                        onClick={() => setShowDeleteDialog(true)}
                        className="w-full sm:w-auto"
                    >
                        Delete Account
                    </Button>
                </CardContent>
            </Card>

            <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2 text-destructive">
                            <AlertTriangle className="h-5 w-5" />
                            Delete Account
                        </DialogTitle>
                        <DialogDescription className="space-y-2">
                            <p>
                                This action cannot be undone. This will permanently delete your account
                                and all associated data.
                            </p>
                            <p className="font-medium">
                                Please type <span className="font-bold">DELETE</span> to confirm.
                            </p>
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-2">
                        <Label htmlFor="confirm-delete">Confirmation</Label>
                        <Input
                            id="confirm-delete"
                            placeholder="Type DELETE"
                            value={confirmText}
                            onChange={(e) => setConfirmText(e.target.value)}
                            disabled={isDeleting}
                        />
                    </div>

                    <DialogFooter>
                        <Button
                            variant="outline"
                            onClick={() => {
                                setShowDeleteDialog(false);
                                setConfirmText('');
                            }}
                            disabled={isDeleting}
                        >
                            Cancel
                        </Button>
                        <Button
                            variant="destructive"
                            onClick={handleDeleteAccount}
                            disabled={confirmText !== 'DELETE' || isDeleting}
                        >
                            {isDeleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Delete My Account
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
}

