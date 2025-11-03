'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Loader2, Plus, Sparkles, Crown, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import Link from 'next/link';

import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog';
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
    FormDescription,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { CreatePlaylistCommand, PlaylistDto, GeneratePlaylistResponseDto, AddTracksCommand } from '@/types';
import { useProfile } from '@/lib/hooks/useProfile';

const createPlaylistSchema = z.object({
    name: z.string().min(1, 'Playlist name is required').max(100, 'Name too long'),
    description: z.string().max(500, 'Description too long').optional().nullable(),
});

const aiPromptSchema = z.object({
    prompt: z.string().min(10, 'Please provide a more detailed description (at least 10 characters)').max(500, 'Prompt is too long (max 500 characters)'),
});

type CreatePlaylistFormData = z.infer<typeof createPlaylistSchema>;
type AIPromptFormData = z.infer<typeof aiPromptSchema>;

interface CreatePlaylistDialogProps {
    onPlaylistCreated: (data: CreatePlaylistCommand) => Promise<PlaylistDto>;
    refreshPlaylists: () => Promise<void>;
    isLoading?: boolean;
}

export function CreatePlaylistDialog({
    onPlaylistCreated,
    refreshPlaylists,
    isLoading = false
}: CreatePlaylistDialogProps) {
    const [open, setOpen] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [activeTab, setActiveTab] = useState<'manual' | 'ai'>('manual');
    const [aiPreview, setAiPreview] = useState<GeneratePlaylistResponseDto | null>(null);
    const [showPreview, setShowPreview] = useState(false);
    const { profile, isLoading: isLoadingProfile } = useProfile();

    const isPro = profile?.plan === 'pro';

    const manualForm = useForm<CreatePlaylistFormData>({
        resolver: zodResolver(createPlaylistSchema),
        defaultValues: {
            name: '',
            description: '',
        },
    });

    const aiForm = useForm<AIPromptFormData>({
        resolver: zodResolver(aiPromptSchema),
        defaultValues: {
            prompt: '',
        },
    });

    const onManualSubmit = async (data: CreatePlaylistFormData) => {
        setIsSubmitting(true);

        try {
            const command: CreatePlaylistCommand = {
                name: data.name,
                description: data.description || null,
            };

            await onPlaylistCreated(command);

            toast.success('Playlist created successfully!');
            manualForm.reset();
            setOpen(false);
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Failed to create playlist';
            toast.error(message);
        } finally {
            setIsSubmitting(false);
        }
    };

    const onAISubmit = async (data: AIPromptFormData) => {
        if (!isPro) {
            toast.error('AI playlist generation is only available for PRO plan users');
            return;
        }

        setIsSubmitting(true);

        try {
            // Call AI generation API
            const response = await fetch('/api/ai/generate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ prompt: data.prompt }),
            });

            if (response.status === 403) {
                const errorData = await response.json();
                if (errorData.code === 'PRO_PLAN_REQUIRED') {
                    toast.error('This feature requires a PRO plan. Please upgrade.');
                    return;
                }
            }

            if (response.status === 429) {
                toast.error('Monthly AI generation quota exceeded. Please upgrade or wait until next month.');
                return;
            }

            if (!response.ok) {
                throw new Error('Failed to generate playlist');
            }

            const aiResult: GeneratePlaylistResponseDto = await response.json();

            // Show warning if under minimum count
            if (aiResult.warningUnderMinCount) {
                toast.warning(`Generated ${aiResult.count} tracks (recommended: 12+)`);
            }

            // Store the AI result and show preview instead of saving immediately
            setAiPreview(aiResult);
            setShowPreview(true);

            toast.success('Playlist generated! Review and approve to save.');
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Failed to generate playlist';
            toast.error(message);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleApprovePlaylist = async () => {
        if (!aiPreview) return;

        setIsSubmitting(true);

        try {
            // Create the playlist with AI-generated name and description
            const command: CreatePlaylistCommand = {
                name: aiPreview.playlistName || 'AI Generated Playlist',
                description: aiPreview.playlistDescription || aiPreview.summary || null,
            };
            const playlist = await onPlaylistCreated(command);

            // Add the AI-suggested tracks to the playlist
            toast.loading('Adding tracks to playlist...');

            const tracksCommand: AddTracksCommand = {
                tracks: aiPreview.items.map((item) => ({
                    trackUri: item.trackUri,
                    artist: item.artist,
                    title: item.title,
                    album: item.album,
                })),
                insertAfterPosition: 0,
            };

            if (tracksCommand.tracks.length > 0) {
                const addTracksResponse = await fetch(`/api/playlists/${playlist.id}/tracks`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(tracksCommand),
                });

                if (!addTracksResponse.ok) {
                    const errorData = await addTracksResponse.json();
                    console.error('Failed to add tracks:', errorData);
                    // Don't throw error - playlist was created successfully
                    toast.dismiss();
                    toast.error(`Could not add tracks to playlist.`);
                } else {
                    const response = await addTracksResponse.json();
                    toast.dismiss();
                }
            } else {
                toast.dismiss();
                toast.warning(`Playlist created, but no tracks could be found on Spotify. Add tracks manually.`);
            }

            if (aiPreview.summary) {
                toast.info(aiPreview.summary);
            }

            await refreshPlaylists();

            // Reset all states
            aiForm.reset();
            setAiPreview(null);
            setShowPreview(false);
            setOpen(false);

        } catch (error) {
            const message = error instanceof Error ? error.message : 'Failed to create playlist';
            toast.error(message);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleRejectPlaylist = () => {
        setAiPreview(null);
        setShowPreview(false);
        toast.info('Playlist discarded. You can generate a new one.');
    };

    const handleOpenChange = (newOpen: boolean) => {
        if (!isSubmitting) {
            setOpen(newOpen);
            if (!newOpen) {
                manualForm.reset();
                aiForm.reset();
                setActiveTab('manual');
                setAiPreview(null);
                setShowPreview(false);
            }
        }
    };

    return (
        <Dialog open={open} onOpenChange={handleOpenChange}>
            <DialogTrigger asChild>
                <Button disabled={isLoading}>
                    <Plus className="mr-2 h-4 w-4" />
                    Create Playlist
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[650px]">
                <DialogHeader>
                    <DialogTitle>Create New Playlist</DialogTitle>
                    <DialogDescription>
                        Create a playlist manually or let AI generate one for you.
                    </DialogDescription>
                </DialogHeader>

                <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'manual' | 'ai')} className="w-full">
                    <TabsList className="grid w-full grid-cols-2">
                        <TabsTrigger value="manual">
                            <Plus className="mr-2 h-4 w-4" />
                            Manual
                        </TabsTrigger>
                        <TabsTrigger value="ai">
                            <Sparkles className="mr-2 h-4 w-4" />
                            AI-Powered
                            {isPro && <Crown className="ml-2 h-3 w-3 text-yellow-500" />}
                        </TabsTrigger>
                    </TabsList>

                    {/* Manual Creation Tab */}
                    <TabsContent value="manual" className="space-y-4 mt-4">
                        <Form {...manualForm}>
                            <form onSubmit={manualForm.handleSubmit(onManualSubmit)} className="space-y-4">
                                <FormField
                                    control={manualForm.control}
                                    name="name"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Playlist Name</FormLabel>
                                            <FormControl>
                                                <Input
                                                    placeholder="Enter playlist name..."
                                                    {...field}
                                                    disabled={isSubmitting}
                                                />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />

                                <FormField
                                    control={manualForm.control}
                                    name="description"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Description (Optional)</FormLabel>
                                            <FormControl>
                                                <Input
                                                    placeholder="Enter playlist description..."
                                                    {...field}
                                                    value={field.value || ''}
                                                    disabled={isSubmitting}
                                                />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />

                                <div className="flex justify-end space-x-2 pt-4">
                                    <Button
                                        type="button"
                                        variant="outline"
                                        onClick={() => handleOpenChange(false)}
                                        disabled={isSubmitting}
                                    >
                                        Cancel
                                    </Button>
                                    <Button type="submit" disabled={isSubmitting}>
                                        {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                        Create Playlist
                                    </Button>
                                </div>
                            </form>
                        </Form>
                    </TabsContent>

                    {/* AI-Powered Creation Tab */}
                    <TabsContent value="ai" className="space-y-4 mt-4">
                        {!isPro ? (
                            <Alert className="border-yellow-500/50 bg-yellow-500/10">
                                {/* <Crown className="h-4 w-4 text-yellow-500" /> */}
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
                        ) : showPreview && aiPreview ? (
                            // Preview of AI-generated playlist
                            <div className="space-y-4">
                                <Alert>
                                    <Sparkles className="h-4 w-4" />
                                    <AlertDescription>
                                        Review your AI-generated playlist before saving it to your library.
                                    </AlertDescription>
                                </Alert>

                                <div className="space-y-3">
                                    <div>
                                        <h3 className="font-semibold text-lg">{aiPreview.playlistName || 'AI Generated Playlist'}</h3>
                                        {aiPreview.playlistDescription && (
                                            <p className="text-sm text-muted-foreground mt-1">{aiPreview.playlistDescription}</p>
                                        )}
                                    </div>

                                    <Separator />

                                    <div>
                                        <p className="text-sm font-medium mb-2">Tracks ({aiPreview.count}):</p>
                                        <div className="max-h-[300px] overflow-y-auto rounded-md border p-3">
                                            <ol className="list-decimal list-inside space-y-2 text-sm">
                                                {aiPreview.items.map((track, index) => (
                                                    <li key={index} className="text-foreground">
                                                        <span className="font-medium">{track.title}</span>
                                                        <span className="text-muted-foreground"> - {track.artist}</span>
                                                        {track.album && (
                                                            <span className="text-muted-foreground text-xs"> ({track.album})</span>
                                                        )}
                                                    </li>
                                                ))}
                                            </ol>
                                        </div>
                                    </div>

                                    {aiPreview.summary && (
                                        <>
                                            <Separator />
                                            <div className="rounded-md bg-muted p-3">
                                                <p className="text-xs text-muted-foreground">{aiPreview.summary}</p>
                                            </div>
                                        </>
                                    )}
                                </div>

                                <div className="flex justify-end space-x-2 pt-4">
                                    <Button
                                        type="button"
                                        variant="outline"
                                        onClick={handleRejectPlaylist}
                                        disabled={isSubmitting}
                                    >
                                        Reject
                                    </Button>
                                    <Button
                                        type="button"
                                        onClick={handleApprovePlaylist}
                                        disabled={isSubmitting}
                                    >
                                        {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                        Approve & Save
                                    </Button>
                                </div>
                            </div>
                        ) : (
                            <Form {...aiForm}>
                                <form onSubmit={aiForm.handleSubmit(onAISubmit)} className="space-y-4">
                                    <FormField
                                        control={aiForm.control}
                                        name="prompt"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Describe Your Playlist</FormLabel>
                                                <FormControl>
                                                    <Textarea
                                                        placeholder="Example: Create a playlist for a cozy rainy evening. I want mellow acoustic and lo-fi songs that feel warm and nostalgic."
                                                        className="min-h-[120px] resize-none"
                                                        {...field}
                                                        disabled={isSubmitting}
                                                    />
                                                </FormControl>
                                                <FormDescription>
                                                    Describe the mood, genre, occasion, or theme you want for your playlist. Be as creative as you like!
                                                </FormDescription>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />

                                    <Alert>
                                        <AlertCircle className="h-4 w-4" />
                                        <AlertDescription className="text-xs">
                                            AI will generate a playlist with 12-20 tracks. The playlist name and description will be created automatically based on your prompt.
                                        </AlertDescription>
                                    </Alert>

                                    <div className="flex justify-end space-x-2 pt-4">
                                        <Button
                                            type="button"
                                            variant="outline"
                                            onClick={() => handleOpenChange(false)}
                                            disabled={isSubmitting}
                                        >
                                            Cancel
                                        </Button>
                                        <Button type="submit" disabled={isSubmitting || isLoadingProfile}>
                                            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                            {!isSubmitting && <Sparkles className="mr-2 h-4 w-4" />}
                                            Generate with AI
                                        </Button>
                                    </div>
                                </form>
                            </Form>
                        )}
                    </TabsContent>
                </Tabs>
            </DialogContent>
        </Dialog>
    );
}
