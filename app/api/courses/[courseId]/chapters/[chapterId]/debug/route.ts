import { db } from "@/lib/db";
import { NextResponse } from "next/server";

export async function GET(
    req: Request,
    { params }: { params: Promise<{ courseId: string; chapterId: string }> }
) {
    try {
        const resolvedParams = await params;
        const { courseId, chapterId } = resolvedParams;

        const chapter = await db.chapter.findUnique({
            where: {
                id: chapterId,
                courseId: courseId
            },
            select: {
                id: true,
                title: true,
                videoUrl: true,
                videoType: true,
                youtubeVideoId: true,
                isPublished: true,
                createdAt: true,
                updatedAt: true
            }
        });

        if (!chapter) {
            return new NextResponse("Chapter not found", { status: 404 });
        }

        return NextResponse.json({
            chapter,
            debug: {
                hasVideoUrl: !!chapter.videoUrl,
                hasVideoType: !!chapter.videoType,
                hasYoutubeVideoId: !!chapter.youtubeVideoId,
                isYouTube: chapter.videoType === "YOUTUBE",
                isUpload: chapter.videoType === "UPLOAD"
            }
        });
    } catch (error) {
        console.error("[CHAPTER_DEBUG]", error);
        return new NextResponse("Internal Error", { status: 500 });
    }
} 