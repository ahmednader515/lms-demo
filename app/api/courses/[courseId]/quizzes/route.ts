import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";

export async function GET(
    req: Request,
    { params }: { params: Promise<{ courseId: string }> }
) {
    try {
        const { userId } = await auth();
        const resolvedParams = await params;

        if (!userId) {
            return new NextResponse("Unauthorized", { status: 401 });
        }

        // Get all quizzes for the specific course
        const quizzes = await db.quiz.findMany({
            where: {
                courseId: resolvedParams.courseId
            },
            include: {
                course: {
                    select: {
                        id: true,
                        title: true
                    }
                }
            },
            orderBy: {
                position: "asc"
            }
        });

        return NextResponse.json(quizzes);
    } catch (error) {
        console.log("[COURSE_QUIZZES_GET]", error);
        return new NextResponse("Internal Error", { status: 500 });
    }
} 