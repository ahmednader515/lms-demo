import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";

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

        const { url, name } = await req.json();

        if (!url) {
            return new NextResponse("Missing URL", { status: 400 });
        }

        // Get the current position for the new attachment
        const existingAttachments = await db.chapterAttachment.findMany({
            where: {
                chapterId: resolvedParams.chapterId,
            },
            orderBy: {
                position: 'desc',
            },
            take: 1,
        });

        const newPosition = existingAttachments.length > 0 
            ? existingAttachments[0].position + 1 
            : 0;

        // Create new attachment
        const attachment = await db.chapterAttachment.create({
            data: {
                name: name || 'مستند جديد',
                url: url,
                position: newPosition,
                chapterId: resolvedParams.chapterId,
            }
        });

        return NextResponse.json(attachment);
    } catch (error) {
        console.log("[CHAPTER_ATTACHMENT_UPLOAD]", error);
        return new NextResponse("Internal Error", { status: 500 });
    }
}

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

        const courseOwner = await db.course.findUnique({
            where: {
                id: resolvedParams.courseId,
                userId,
            }
        });

        if (!courseOwner) {
            return new NextResponse("Unauthorized", { status: 401 });
        }

        const attachments = await db.chapterAttachment.findMany({
            where: {
                chapterId: resolvedParams.chapterId,
            },
            orderBy: {
                position: 'asc',
            },
        });

        return NextResponse.json(attachments);
    } catch (error) {
        console.log("[CHAPTER_ATTACHMENTS_GET]", error);
        return new NextResponse("Internal Error", { status: 500 });
    }
} 