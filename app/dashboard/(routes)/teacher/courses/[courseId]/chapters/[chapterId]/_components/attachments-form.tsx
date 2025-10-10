"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { FileText, Pencil, Upload, X, Download, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FileUpload } from "@/components/file-upload";
import toast from "react-hot-toast";

interface ChapterAttachment {
    id: string;
    name: string;
    url: string;
    position: number;
    createdAt: Date;
}

interface AttachmentsFormProps {
    initialData: {
        attachments: ChapterAttachment[];
    };
    courseId: string;
    chapterId: string;
}

export const AttachmentsForm = ({
    initialData,
    courseId,
    chapterId
}: AttachmentsFormProps) => {
    const [isEditing, setIsEditing] = useState(false);
    const [isMounted, setIsMounted] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [attachments, setAttachments] = useState<ChapterAttachment[]>(initialData.attachments || []);
    const router = useRouter();

    useEffect(() => {
        setIsMounted(true);
    }, []);

    // Helper function to extract filename from URL
    const getFilenameFromUrl = (url: string): string => {
        try {
            const urlObj = new URL(url);
            const pathname = urlObj.pathname;
            const filename = pathname.split('/').pop();
            
            if (filename) {
                const decodedFilename = decodeURIComponent(filename);
                const cleanFilename = decodedFilename.split('?')[0];
                return cleanFilename || 'مستند الفصل';
            }
            return 'مستند الفصل';
        } catch {
            return 'مستند الفصل';
        }
    };

    // Helper function to download document
    const downloadDocument = async (url: string, name: string) => {
        try {
            // For uploadthing URLs, we'll use a different approach
            // First, try to fetch the file with proper CORS handling
            const response = await fetch(url, {
                method: 'GET',
                mode: 'cors',
            });
            
            if (response.ok) {
                const blob = await response.blob();
                const downloadUrl = window.URL.createObjectURL(blob);
                
                const link = document.createElement('a');
                link.href = downloadUrl;
                link.download = name || getFilenameFromUrl(url);
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                
                window.URL.revokeObjectURL(downloadUrl);
                toast.success("تم بدء تحميل الملف");
            } else {
                throw new Error('Failed to fetch file');
            }
        } catch (error) {
            console.error('Download failed:', error);
            
            // If CORS fails or any other error, use the browser's native download behavior
            const link = document.createElement('a');
            link.href = url;
            link.download = name || getFilenameFromUrl(url);
            link.target = '_blank';
            link.rel = 'noopener noreferrer';
            
            // Try to trigger download
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            
            toast.success("تم فتح الملف في تبويب جديد للتحميل");
        }
    };

    const onSubmitUpload = async (url: string, name: string) => {
        try {
            setIsSubmitting(true);
            const response = await fetch(`/api/courses/${courseId}/chapters/${chapterId}/attachments`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ url, name }),
            });

            if (!response.ok) {
                throw new Error('Failed to upload attachment');
            }

            const newAttachment = await response.json();
            setAttachments(prev => [...prev, newAttachment]);
            toast.success("تم رفع المستند بنجاح");
        } catch (error) {
            console.error("[CHAPTER_ATTACHMENT]", error);
            toast.error("حدث خطأ ما");
        } finally {
            setIsSubmitting(false);
        }
    };

    const onDelete = async (attachmentId: string) => {
        try {
            setIsSubmitting(true);
            const response = await fetch(`/api/courses/${courseId}/chapters/${chapterId}/attachments/${attachmentId}`, {
                method: 'DELETE',
            });

            if (!response.ok) {
                throw new Error('Failed to delete attachment');
            }

            setAttachments(prev => prev.filter(att => att.id !== attachmentId));
            toast.success("تم حذف المستند بنجاح");
        } catch (error) {
            console.error("[CHAPTER_ATTACHMENT_DELETE]", error);
            toast.error("حدث خطأ ما");
        } finally {
            setIsSubmitting(false);
        }
    };

    if (!isMounted) {
        return null;
    }

    return (
        <div className="mt-6 border bg-card rounded-md p-4">
            <div className="font-medium flex items-center justify-between">
                مستندات الفصل
                <Button onClick={() => setIsEditing(!isEditing)} variant="ghost">
                    {isEditing ? (
                        <>إلغاء</>
                    ) : (
                        <>
                            <Pencil className="h-4 w-4 mr-2" />
                            إدارة المستندات
                        </>
                    )}
                </Button>
            </div>
            
            {!isEditing && (
                <div className="mt-2">
                    {attachments.length > 0 ? (
                        <div className="space-y-2">
                            {attachments.map((attachment) => (
                                <div key={attachment.id} className="flex items-center p-3 w-full bg-secondary/50 border-secondary/50 border text-secondary-foreground rounded-md">
                                    <FileText className="h-4 w-4 mr-2 flex-shrink-0" />
                                    <div className="flex flex-col min-w-0 flex-1">
                                        <p className="text-sm font-medium truncate">
                                            {attachment.name || getFilenameFromUrl(attachment.url)}
                                        </p>
                                        <p className="text-xs text-muted-foreground">مستند الفصل</p>
                                    </div>
                                    <div className="ml-auto flex items-center gap-2 flex-shrink-0">
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => window.open(attachment.url, '_blank')}
                                        >
                                            عرض
                                        </Button>
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => downloadDocument(attachment.url, attachment.name)}
                                            className="flex items-center gap-1"
                                        >
                                            <Download className="h-3 w-3" />
                                            تحميل
                                        </Button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <p className="text-sm mt-2 text-muted-foreground italic">
                            لا توجد مستندات مرفوعة
                        </p>
                    )}
                </div>
            )}
            
            {isEditing && (
                <div className="mt-4 space-y-4">
                    <div className="space-y-2">
                        {attachments.map((attachment) => (
                            <div key={attachment.id} className="flex items-center p-3 w-full bg-secondary/50 border-secondary/50 border text-secondary-foreground rounded-md">
                                <FileText className="h-4 w-4 mr-2 flex-shrink-0" />
                                <div className="flex flex-col min-w-0 flex-1">
                                    <p className="text-sm font-medium truncate">
                                        {attachment.name || getFilenameFromUrl(attachment.url)}
                                    </p>
                                    <p className="text-xs text-muted-foreground">مستند الفصل</p>
                                </div>
                                <div className="ml-auto flex items-center gap-2 flex-shrink-0">
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => window.open(attachment.url, '_blank')}
                                    >
                                        عرض
                                    </Button>
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => downloadDocument(attachment.url, attachment.name)}
                                        className="flex items-center gap-1"
                                    >
                                        <Download className="h-3 w-3" />
                                        تحميل
                                    </Button>
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => onDelete(attachment.id)}
                                        disabled={isSubmitting}
                                    >
                                        {isSubmitting ? (
                                            <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                                        ) : (
                                            <X className="h-4 w-4" />
                                        )}
                                    </Button>
                                </div>
                            </div>
                        ))}
                    </div>
                    
                    <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-4">
                        <FileUpload
                            endpoint="courseAttachment"
                            onChange={(res) => {
                                if (res) {
                                    onSubmitUpload(res.url, res.name);
                                }
                            }}
                        />
                        <div className="text-xs text-muted-foreground mt-2 text-center">
                            أضف مستندات إضافية قد يحتاجها الطلاب لفهم الفصل بشكل أفضل.
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}; 