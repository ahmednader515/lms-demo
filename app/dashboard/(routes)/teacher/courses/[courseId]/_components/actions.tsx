"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, Info } from "lucide-react";
import toast from "react-hot-toast";
import axios from "axios";

import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface ActionsProps {
    disabled: boolean;
    courseId: string;
    isPublished: boolean;
}

export const Actions = ({
    disabled,
    courseId,
    isPublished,
}: ActionsProps) => {
    const router = useRouter();
    const [isLoading, setIsLoading] = useState(false);

    const onClick = async () => {
        try {
            setIsLoading(true);

            if (isPublished) {
                await axios.patch(`/api/courses/${courseId}/unpublish`);
                toast.success("تم إلغاء النشر");
            } else {
                await axios.patch(`/api/courses/${courseId}/publish`);
                toast.success("تم نشر الكورس");
            }

            router.refresh();
        } catch {
            toast.error("حدث خطأ");
        } finally {
            setIsLoading(false);
        }
    }

    const publishButton = (
        <Button
            onClick={onClick}
            disabled={disabled || isLoading}
            variant="outline"
            size="sm"
        >
            {isPublished ? (
                <>
                    <EyeOff className="h-4 w-4 mr-2" />
                    إلغاء النشر
                </>
            ) : (
                <>
                    <Eye className="h-4 w-4 mr-2" />
                    نشر الكورس
                </>
            )}
        </Button>
    );

    return (
        <div className="flex items-center gap-x-2">
            {disabled && !isPublished ? (
                <TooltipProvider>
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <div className="relative">
                                {publishButton}
                                <Info className="h-4 w-4 absolute -top-1 -right-1 text-orange-500" />
                            </div>
                        </TooltipTrigger>
                        <TooltipContent className="max-w-xs">
                            <div className="text-sm">
                                <p className="font-semibold mb-2">لا يمكن نشر الكورس حتى:</p>
                                <ul className="space-y-1 text-xs">
                                    <li>• إضافة عنوان للكورس</li>
                                    <li>• إضافة وصف للكورس</li>
                                    <li>• إضافة صورة للكورس</li>
                                    <li>• تحديد سعر للكورس (يمكن أن يكون مجاني)</li>
                                    <li>• إضافة فصل واحد على الأقل ونشره</li>
                                </ul>
                            </div>
                        </TooltipContent>
                    </Tooltip>
                </TooltipProvider>
            ) : (
                publishButton
            )}
        </div>
    )
} 