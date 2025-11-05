'use client';

import Link from 'next/link';
import { Crown } from 'lucide-react';

import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';

export function AIProFeatureAlert() {
    return (
        <Alert className="border-yellow-500/50 bg-yellow-500/10">
            <AlertDescription className="space-y-3">
                <div>
                    <p className="font-semibold text-foreground mb-2">
                        AI Playlist Generation is a PRO Feature
                    </p>
                    <p className="text-sm text-muted-foreground mb-3">
                        Let our AI create personalized playlists based on your mood, genre preferences, or any creative prompt. Simply describe what you want to listen to, and AI will generate a curated playlist with 12-20 tracks.
                    </p>
                    <p className="text-sm text-muted-foreground mb-3">
                        <strong>Examples of what you can ask:</strong>
                    </p>
                    <ul className="text-sm text-muted-foreground list-disc list-inside space-y-1 mb-3">
                        <li>&quot;Create a playlist for a chill Sunday morning with acoustic and indie tones&quot;</li>
                        <li>&quot;Make a road trip playlist that mixes modern rock, indie, and energetic pop&quot;</li>
                        <li>&quot;Build a workout playlist with high tempo tracks from 2020 onwards&quot;</li>
                    </ul>
                    <p className="text-sm text-muted-foreground mb-3">
                        <strong>PRO Plan benefits:</strong>
                    </p>
                    <ul className="text-sm text-muted-foreground list-disc list-inside space-y-1">
                        <li>Generate up to 50 AI playlists per month</li>
                        <li>Unlimited manual playlists</li>
                        <li>Priority support</li>
                    </ul>
                </div>
                <Button asChild className="w-full mt-2">
                    <Link href="/profile#billing">
                        <Crown className="mr-2 h-4 w-4" />
                        Upgrade to PRO
                    </Link>
                </Button>
            </AlertDescription>
        </Alert>
    );
}

