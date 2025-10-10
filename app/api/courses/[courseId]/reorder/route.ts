import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export async function PUT(
    req: Request,
    { params }: { params: Promise<{ courseId: string }> }
) {
    try {
        const { userId } = await auth();
        const resolvedParams = await params;
        const { list } = await req.json();

        if (!userId) {
            return new NextResponse("Unauthorized", { status: 401 });
        }

        const courseOwner = await db.course.findUnique({
            where: {
                id: resolvedParams.courseId,
                userId: userId,
            }
        });

        if (!courseOwner) {
            return new NextResponse("Unauthorized", { status: 401 });
        }

        // Separate chapters and quizzes
        const chapters = list.filter((item: any) => item.type === "chapter");
        const quizzes = list.filter((item: any) => item.type === "quiz");

        // Update chapters
        for (const item of chapters) {
            await db.chapter.update({
                where: { id: item.id },
                data: { position: item.position }
            });
        }

        // Update quizzes
        for (const item of quizzes) {
            await db.quiz.update({
                where: { id: item.id },
                data: { position: item.position }
            });
        }

        return new NextResponse("Success", { status: 200 });
    } catch (error) {
        console.log("[MIXED_REORDER]", error);
        return new NextResponse("Internal Error", { status: 500 });
    }
} 