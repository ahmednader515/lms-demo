import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { generateDRMToken } from "@/lib/bunny-stream";

export async function GET(
    req: Request,
    { params }: { params: Promise<{ courseId: string; chapterId: string }> }
) {
    try {
        const { userId } = await auth();
        const resolvedParams = await params;

        if (!userId) {
            return new NextResponse("Unauthorized", { status: 401 });
        }

        // Get chapter with video info and course data
        const chapter = await db.chapter.findUnique({
            where: {
                id: resolvedParams.chapterId,
            },
            include: {
                course: {
                    include: {
                        purchases: {
                            where: {
                                userId,
                                status: "ACTIVE"
                            }
                        },
                        user: {
                            select: {
                                id: true,
                            }
                        }
                    }
                }
            }
        });

        if (!chapter) {
            return new NextResponse("Chapter not found", { status: 404 });
        }

        // Check if user has access (purchased, free chapter, or is course owner)
        const hasAccess = 
            chapter.isFree || 
            chapter.course.purchases.length > 0 ||
            chapter.course.userId === userId;

        if (!hasAccess) {
            return new NextResponse("Access denied", { status: 403 });
        }

        // Generate DRM token if it's a Bunny Stream video
        if (chapter.videoType === "BUNNY_STREAM" && 
            chapter.bunnyStreamVideoId && 
            chapter.bunnyStreamLibraryId) {
            
            const token = generateDRMToken(
                chapter.bunnyStreamVideoId,
                chapter.bunnyStreamLibraryId,
                userId,
                3600 // 1 hour expiry
            );

            return NextResponse.json({ 
                token,
                videoId: chapter.bunnyStreamVideoId,
                libraryId: chapter.bunnyStreamLibraryId
            });
        }

        return NextResponse.json({ 
            token: null,
            message: "Not a Bunny Stream video"
        });
    } catch (error) {
        console.log("[VIDEO_TOKEN]", error);
        return new NextResponse("Internal Error", { status: 500 });
    }
}

