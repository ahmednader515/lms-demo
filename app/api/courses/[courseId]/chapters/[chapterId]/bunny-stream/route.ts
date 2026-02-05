import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { uploadVideoToBunnyStream } from "@/lib/bunny-stream";

export async function POST(
    req: Request,
    { params }: { params: Promise<{ courseId: string; chapterId: string }> }
) {
    try {
        const { userId } = await auth();
        const resolvedParams = await params;

        if (!userId) {
            return new NextResponse("Unauthorized", { status: 401 });
        }

        const courseOwner = await db.course.findUnique({
            where: {
                id: resolvedParams.courseId,
                userId,
            }
        });

        if (!courseOwner) {
            return new NextResponse("Unauthorized", { status: 401 });
        }

        const formData = await req.formData();
        const videoFile = formData.get('video') as File;
        const title = formData.get('title') as string;

        if (!videoFile) {
            return new NextResponse("Missing video file", { status: 400 });
        }

        // Get chapter title for video title if not provided
        const chapter = await db.chapter.findUnique({
            where: {
                id: resolvedParams.chapterId,
            },
            select: {
                title: true,
            }
        });

        const videoTitle = title || chapter?.title || 'Chapter Video';

        // Upload to Bunny Stream
        const { videoId, libraryId } = await uploadVideoToBunnyStream(
            videoFile,
            videoTitle
        );

        // Update chapter with Bunny Stream video
        await db.chapter.update({
            where: {
                id: resolvedParams.chapterId,
                courseId: resolvedParams.courseId,
            },
            data: {
                videoUrl: `bunny-stream://${videoId}`,
                videoType: "BUNNY_STREAM",
                bunnyStreamVideoId: videoId,
                bunnyStreamLibraryId: libraryId,
                youtubeVideoId: null, // Clear any YouTube video ID
            }
        });

        return NextResponse.json({ 
            success: true,
            videoId,
            libraryId
        });
    } catch (error: any) {
        console.error("[BUNNY_STREAM_UPLOAD]", error);
        const errorMessage = error instanceof Error ? error.message : "Internal Error";
        return NextResponse.json(
            { error: errorMessage },
            { status: errorMessage.includes("401") ? 401 : errorMessage.includes("404") ? 404 : 500 }
        );
    }
}

