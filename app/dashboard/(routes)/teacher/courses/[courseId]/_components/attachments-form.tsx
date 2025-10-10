"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { File, Loader2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import axios from "axios";
import { UploadButton } from "@/lib/uploadthing";

interface AttachmentsFormProps {
    initialData: {
        id: string;
        attachments: {
            id: string;
            name: string;
            url: string;
        }[];
    };
    courseId: string;
}

export const AttachmentsForm = ({
    initialData,
    courseId
}: AttachmentsFormProps) => {
    const [isDeleting, setIsDeleting] = useState<string | null>(null);
    const router = useRouter();

    const onDelete = async (id: string) => {
        try {
            setIsDeleting(id);
            await axios.delete(`/api/courses/${courseId}/attachments/${id}`);
            toast.success("تم حذف الملف");
            router.refresh();
        } catch {
            toast.error("حدث خطأ");
        } finally {
            setIsDeleting(null);
        }
    }

    return (
        <div className="mt-6 border bg-card rounded-md p-4">
            <div className="font-medium flex items-center justify-between">
                <div className="flex items-center gap-x-2">
                    <File className="h-5 w-5" />
                    <h2 className="text-lg font-medium">
                        الملفات والمرفقات
                    </h2>
                </div>
                <UploadButton
                    endpoint="courseAttachment"
                    onClientUploadComplete={async (res) => {
                        if (res && res[0]) {
                            try {
                                await axios.post(`/api/courses/${courseId}/attachments`, {
                                    url: res[0].url,
                                    name: res[0].name
                                });
                                toast.success("تم رفع الملف");
                                router.refresh();
                            } catch {
                                toast.error("حدث خطأ");
                            }
                        }
                    }}
                    onUploadError={(error: Error) => {
                        toast.error(`حدث خطأ: ${error.message}`);
                    }}
                />
            </div>
            {initialData.attachments.length === 0 && (
                <div className="flex items-center justify-center h-60 bg-muted rounded-md mt-4">
                    <p className="text-sm text-muted-foreground">
                        لا يوجد ملفات حاليا
                    </p>
                </div>
            )}
            {initialData.attachments.length > 0 && (
                <div className="space-y-2 mt-4">
                    {initialData.attachments.map((attachment) => (
                        <div
                            key={attachment.id}
                            className="flex items-center p-3 w-full bg-muted rounded-md border"
                        >
                            <File className="h-4 w-4 mr-2 flex-shrink-0 text-muted-foreground" />
                            <p className="text-sm line-clamp-1">
                                {attachment.name}
                            </p>
                            <div className="ml-auto flex items-center gap-x-2">
                                {isDeleting === attachment.id && (
                                    <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                                )}
                                {isDeleting !== attachment.id && (
                                    <Button
                                        onClick={() => onDelete(attachment.id)}
                                        variant="ghost"
                                        size="sm"
                                        className="h-8 w-8 p-0"
                                    >
                                        <X className="h-4 w-4" />
                                    </Button>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}; 