import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { ChapterForm } from "./_components/chapter-form";
import { VideoForm } from "./_components/video-form";
import { AttachmentsForm } from "./_components/attachments-form";
import Link from "next/link";
import { ArrowLeft, Video, Files } from "lucide-react";
import { Button } from "@/components/ui/button";
import { IconBadge } from "@/components/icon-badge";

export default async function ChapterPage({
    params,
}: {
    params: Promise<{ courseId: string; chapterId: string }>
}) {
    const resolvedParams = await params;
    const { courseId, chapterId } = resolvedParams;

    const { userId } = await auth();

    if (!userId) {
        return redirect("/");
    }

    const chapter = await db.chapter.findUnique({
        where: {
            id: chapterId,
            courseId: courseId
        },
        include: {
            attachments: {
                orderBy: {
                    position: 'asc',
                },
            },
        }
    });

    if (!chapter) {
        return redirect("/");
    }

    const requiredFields = [
        chapter.title,
        chapter.description,
        chapter.videoUrl
    ];

    const totalFields = requiredFields.length;
    const completedFields = requiredFields.filter(Boolean).length;

    const completionText = `(${completedFields}/${totalFields})`;

    return (
        <div className="p-6">
            <div className="flex items-center justify-between">
                <div className="flex flex-col gap-y-2">
                    <Link href={`/dashboard/teacher/courses/${courseId}`}>
                        <Button variant="ghost" className="mb-4">
                            <ArrowLeft className="h-4 w-4 mr-2" />
                            الرجوع إلى إعدادات الكورس
                        </Button>
                    </Link>
                    <h1 className="text-2xl font-medium">
                        إعدادات الفصل
                    </h1>
                    <span className="text-sm text-muted-foreground">
                        أكمل جميع الحقول {completionText}
                    </span>
                </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-16">
                <div>
                    <ChapterForm
                        initialData={chapter}
                        courseId={courseId}
                        chapterId={chapterId}
                    />
                </div>
                <div className="space-y-6">
                    <div>
                        <div className="flex items-center gap-x-2">
                            <IconBadge icon={Video} />
                            <h2 className="text-xl">
                                إضافة فيديو
                            </h2>
                        </div>
                        <VideoForm
                            initialData={chapter}
                            courseId={courseId}
                            chapterId={chapterId}
                        />
                    </div>
                    <div>
                        <div className="flex items-center gap-x-2">
                            <IconBadge icon={Files} />
                            <h2 className="text-xl">
                                مستندات الفصل
                            </h2>
                        </div>
                        <AttachmentsForm
                            initialData={chapter}
                            courseId={courseId}
                            chapterId={chapterId}
                        />
                    </div>
                </div>
            </div>
        </div>
    );
} 