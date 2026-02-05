"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { Video, Pencil, Upload, Youtube, Link, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FileUpload } from "@/components/file-upload";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import toast from "react-hot-toast";
import { PlyrVideoPlayer } from "@/components/plyr-video-player";

interface VideoFormProps {
    initialData: {
        videoUrl: string | null;
        videoType: string | null;
        youtubeVideoId: string | null;
        bunnyStreamVideoId: string | null;
        bunnyStreamLibraryId: string | null;
    };
    courseId: string;
    chapterId: string;
}

export const VideoForm = ({
    initialData,
    courseId,
    chapterId
}: VideoFormProps) => {
    const [isEditing, setIsEditing] = useState(false);
    const [isMounted, setIsMounted] = useState(false);
    const [youtubeUrl, setYoutubeUrl] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isUploadingBunnyStream, setIsUploadingBunnyStream] = useState(false);
    const bunnyStreamFileInputRef = useRef<HTMLInputElement>(null);
    const router = useRouter();

    useEffect(() => {
        setIsMounted(true);
    }, []);

    const onSubmitUpload = async (url: string) => {
        try {
            setIsSubmitting(true);
            const response = await fetch(`/api/courses/${courseId}/chapters/${chapterId}/upload`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ url }),
            });

            if (!response.ok) {
                throw new Error('Failed to upload video');
            }

            toast.success("تم رفع الفيديو بنجاح");
            setIsEditing(false);
            router.refresh();
        } catch (error) {
            console.error("[CHAPTER_VIDEO]", error);
            toast.error("حدث خطأ ما");
        } finally {
            setIsSubmitting(false);
        }
    }

    const onSubmitYouTube = async () => {
        if (!youtubeUrl.trim()) {
            toast.error("يرجى إدخال رابط YouTube");
            return;
        }

        try {
            setIsSubmitting(true);
            const response = await fetch(`/api/courses/${courseId}/chapters/${chapterId}/youtube`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ youtubeUrl }),
            });

            if (!response.ok) {
                const error = await response.text();
                throw new Error(error || 'Failed to add YouTube video');
            }

            toast.success("تم إضافة فيديو YouTube بنجاح");
            setIsEditing(false);
            setYoutubeUrl("");
            router.refresh();
        } catch (error) {
            console.error("[CHAPTER_YOUTUBE]", error);
            toast.error(error instanceof Error ? error.message : "حدث خطأ ما");
        } finally {
            setIsSubmitting(false);
        }
    }

    const onSubmitBunnyStream = async (file: File) => {
        try {
            setIsUploadingBunnyStream(true);
            const formData = new FormData();
            formData.append('video', file);
            formData.append('title', initialData.videoUrl || 'Chapter Video');

            const response = await fetch(`/api/courses/${courseId}/chapters/${chapterId}/bunny-stream`, {
                method: 'POST',
                body: formData,
            });

            if (!response.ok) {
                const error = await response.text();
                throw new Error(error || 'Failed to upload video to Bunny Stream');
            }

            toast.success("تم رفع الفيديو إلى Bunny Stream بنجاح");
            setIsEditing(false);
            router.refresh();
        } catch (error) {
            console.error("[BUNNY_STREAM_UPLOAD]", error);
            toast.error(error instanceof Error ? error.message : "حدث خطأ ما");
        } finally {
            setIsUploadingBunnyStream(false);
        }
    }

    if (!isMounted) {
        return null;
    }

    return (
        <div className="mt-6 border bg-card rounded-md p-4">
            <div className="font-medium flex items-center justify-between">
                فيديو الفصل
                <Button onClick={() => setIsEditing(!isEditing)} variant="ghost">
                    {isEditing ? (
                        <>إلغاء</>
                    ) : (
                        <>
                            <Pencil className="h-4 w-4 mr-2" />
                            تعديل الفيديو
                        </>
                    )}
                </Button>
            </div>
            
            {!isEditing && (
                <div className="relative aspect-video mt-2">
                    {initialData.videoUrl ? (
                        (() => {
                            console.log("🔍 VideoForm rendering PlyrVideoPlayer with:", {
                                videoUrl: initialData.videoUrl,
                                videoType: initialData.videoType,
                                youtubeVideoId: initialData.youtubeVideoId,
                                isUpload: initialData.videoType === "UPLOAD",
                                isYouTube: initialData.videoType === "YOUTUBE"
                            });
                            return (
                                <PlyrVideoPlayer
                                    videoUrl={initialData.videoType === "UPLOAD" ? initialData.videoUrl : undefined}
                                    youtubeVideoId={initialData.videoType === "YOUTUBE" ? initialData.youtubeVideoId || undefined : undefined}
                                    bunnyStreamVideoId={initialData.videoType === "BUNNY_STREAM" ? initialData.bunnyStreamVideoId || undefined : undefined}
                                    bunnyStreamLibraryId={initialData.videoType === "BUNNY_STREAM" ? initialData.bunnyStreamLibraryId || undefined : undefined}
                                    videoType={(initialData.videoType as "UPLOAD" | "YOUTUBE" | "BUNNY_STREAM") || "UPLOAD"}
                                    className="w-full h-full"
                                />
                            );
                        })()
                    ) : (
                        <div className="flex items-center justify-center h-full bg-muted rounded-md">
                            <Video className="h-8 w-8 text-muted-foreground" />
                        </div>
                    )}
                </div>
            )}
            
            {isEditing && (
                <div className="mt-4">
                    <Tabs defaultValue="bunny-stream" className="w-full">
                        <TabsList className="grid w-full grid-cols-3">
                            <TabsTrigger value="bunny-stream" className="flex items-center gap-2">
                                <Shield className="h-4 w-4" />
                                Bunny Stream (DRM)
                            </TabsTrigger>
                            <TabsTrigger value="upload" className="flex items-center gap-2">
                                <Upload className="h-4 w-4" />
                                رفع فيديو
                            </TabsTrigger>
                            <TabsTrigger value="youtube" className="flex items-center gap-2">
                                <Youtube className="h-4 w-4" />
                                رابط YouTube
                            </TabsTrigger>
                        </TabsList>
                        
                        <TabsContent value="upload" className="mt-4">
                            <div className="space-y-4">
                                <div className="text-sm text-muted-foreground">
                                    ارفع فيديو من جهازك
                                </div>
                                <FileUpload
                                    endpoint="chapterVideo"
                                    onChange={(res) => {
                                        if (res?.url) {
                                            onSubmitUpload(res.url);
                                        }
                                    }}
                                />
                            </div>
                        </TabsContent>
                        
                        <TabsContent value="bunny-stream" className="mt-4">
                            <div className="space-y-4">
                                <div className="text-sm text-muted-foreground">
                                    ارفع فيديو إلى Bunny Stream مع حماية DRM
                                </div>
                                <div className="space-y-2">
                                    <input
                                        ref={bunnyStreamFileInputRef}
                                        type="file"
                                        accept="video/*"
                                        className="hidden"
                                        onChange={(e) => {
                                            const file = e.target.files?.[0];
                                            if (file) {
                                                onSubmitBunnyStream(file);
                                            }
                                        }}
                                    />
                                    <Button
                                        onClick={() => bunnyStreamFileInputRef.current?.click()}
                                        disabled={isUploadingBunnyStream}
                                        className="w-full"
                                        variant="outline"
                                    >
                                        <Upload className="h-4 w-4 mr-2" />
                                        {isUploadingBunnyStream ? "جاري الرفع..." : "اختر ملف فيديو"}
                                    </Button>
                                </div>
                                {isUploadingBunnyStream && (
                                    <div className="text-sm text-muted-foreground">
                                        جاري الرفع إلى Bunny Stream... قد يستغرق هذا بعض الوقت
                                    </div>
                                )}
                                <div className="text-xs text-muted-foreground">
                                    سيتم رفع الفيديو إلى Bunny Stream مع تفعيل حماية DRM تلقائياً. 
                                    <br />
                                    بعد الرفع، سيتم ترميز الفيديو تلقائياً وقد يستغرق ذلك بضع دقائق.
                                </div>
                            </div>
                        </TabsContent>
                        
                        <TabsContent value="youtube" className="mt-4">
                            <div className="space-y-4">
                                <div className="text-sm text-muted-foreground">
                                    الصق رابط فيديو YouTube
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="youtube-url">رابط YouTube</Label>
                                    <div className="flex gap-2">
                                        <Input
                                            id="youtube-url"
                                            placeholder="https://www.youtube.com/watch?v=..."
                                            value={youtubeUrl}
                                            onChange={(e) => setYoutubeUrl(e.target.value)}
                                            className="flex-1"
                                        />
                                        <Button 
                                            onClick={onSubmitYouTube}
                                            disabled={isSubmitting || !youtubeUrl.trim()}
                                            className="flex items-center gap-2"
                                        >
                                            <Link className="h-4 w-4" />
                                            إضافة
                                        </Button>
                                    </div>
                                </div>
                                <div className="text-xs text-muted-foreground">
                                    يدعم الروابط التالية:
                                    <br />
                                    • https://www.youtube.com/watch?v=VIDEO_ID
                                    <br />
                                    • https://youtu.be/VIDEO_ID
                                    <br />
                                    • https://www.youtube.com/embed/VIDEO_ID
                                </div>
                            </div>
                        </TabsContent>
                    </Tabs>
                </div>
            )}
        </div>
    )
} 