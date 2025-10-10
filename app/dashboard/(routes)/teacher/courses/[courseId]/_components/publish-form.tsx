"use client";

import axios from "axios";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { toast } from "react-hot-toast";
import { Button } from "@/components/ui/button";
import { Eye, EyeOff } from "lucide-react";
import dynamic from "next/dynamic";

const Confetti = dynamic(() => import("react-confetti"), {
    ssr: false
});

interface PublishFormProps {
    initialData: {
        id: string;
        isPublished: boolean;
    };
    courseId: string;
}

export const PublishForm = ({
    initialData,
    courseId
}: PublishFormProps) => {
    const [isLoading, setIsLoading] = useState(false);
    const [showConfetti, setShowConfetti] = useState(false);
    const router = useRouter();

    useEffect(() => {
        if (showConfetti) {
            const timer = setTimeout(() => {
                setShowConfetti(false);
            }, 5000);
            return () => clearTimeout(timer);
        }
    }, [showConfetti]);

    const onSubmit = async () => {
        try {
            setIsLoading(true);

            await axios.patch(`/api/courses/${courseId}/publish`);

            if (!initialData.isPublished) {
                setShowConfetti(true);
            }

            toast.success(initialData.isPublished ? "Course unpublished" : "Course published");
            router.refresh();
        } catch {
            toast.error("Something went wrong");
        } finally {
            setIsLoading(false);
        }
    }

    return (
        <>
            {showConfetti && (
                <Confetti
                    width={window.innerWidth}
                    height={window.innerHeight}
                    recycle={false}
                    numberOfPieces={500}
                />
            )}
            <form
                id="course-publish-form"
                onSubmit={(e) => {
                    e.preventDefault();
                    onSubmit();
                }}
            >
                <Button
                    disabled={isLoading}
                    variant={initialData.isPublished ? "outline" : "default"}
                    type="submit"
                >
                    {initialData.isPublished ? (
                        <>
                            <EyeOff className="h-4 w-4 mr-2" />
                            Unpublish
                        </>
                    ) : (
                        <>
                            <Eye className="h-4 w-4 mr-2" />
                            Publish
                        </>
                    )}
                </Button>
            </form>
        </>
    )
} 