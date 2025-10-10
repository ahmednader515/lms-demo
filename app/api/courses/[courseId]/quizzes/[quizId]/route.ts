import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";
import { parseQuizOptions, stringifyQuizOptions } from "@/lib/utils";

export async function GET(
    req: Request,
    { params }: { params: Promise<{ courseId: string; quizId: string }> }
) {
    try {
        const { userId } = await auth();
        const resolvedParams = await params;

        if (!userId) {
            return new NextResponse("Unauthorized", { status: 401 });
        }

        // Check if user has access to the course
        const purchase = await db.purchase.findUnique({
            where: {
                userId_courseId: {
                    userId,
                    courseId: resolvedParams.courseId
                }
            }
        });

        if (!purchase) {
            return new NextResponse("Course access required", { status: 403 });
        }

        // Get the quiz
        const quiz = await db.quiz.findFirst({
            where: {
                id: resolvedParams.quizId,
                courseId: resolvedParams.courseId,
                isPublished: true
            },
            include: {
                questions: {
                    select: {
                        id: true,
                        text: true,
                        type: true,
                        options: true,
                        points: true,
                        imageUrl: true
                    },
                    orderBy: {
                        position: 'asc'
                    }
                }
            }
        });

        // Don't parse options here - the frontend will handle parsing
        // This keeps the original string format for consistency

        if (!quiz) {
            return new NextResponse("Quiz not found", { status: 404 });
        }

        // Check if user has already taken this quiz and if they can take it again
        const existingResults = await db.quizResult.findMany({
            where: {
                studentId: userId,
                quizId: resolvedParams.quizId
            },
            orderBy: {
                attemptNumber: 'desc'
            }
        });

        const currentAttemptNumber = existingResults.length + 1;

        if (existingResults.length >= quiz.maxAttempts) {
            return new NextResponse("Maximum attempts reached for this quiz", { status: 400 });
        }

        // Add attempt information to the quiz response
        const quizWithAttemptInfo = {
            ...quiz,
            currentAttempt: currentAttemptNumber,
            maxAttempts: quiz.maxAttempts,
            previousAttempts: existingResults.length
        };

        return NextResponse.json(quizWithAttemptInfo);
    } catch (error) {
        console.log("[QUIZ_GET]", error);
        return new NextResponse("Internal Error", { status: 500 });
    }
}

export async function PATCH(
    req: Request,
    { params }: { params: Promise<{ courseId: string; quizId: string }> }
) {
    try {
        const { userId } = await auth();
        const resolvedParams = await params;
        const { title, description, questions, position } = await req.json();

        if (!userId) {
            return new NextResponse("Unauthorized", { status: 401 });
        }

        // Verify the course belongs to the teacher
        const course = await db.course.findUnique({
            where: {
                id: resolvedParams.courseId,
                userId: userId
            }
        });

        if (!course) {
            return new NextResponse("Course not found or unauthorized", { status: 404 });
        }

        // Update the quiz
        const updatedQuiz = await db.quiz.update({
            where: {
                id: resolvedParams.quizId,
                courseId: resolvedParams.courseId
            },
            data: {
                title,
                description,
                position,
                questions: {
                    deleteMany: {},
                    create: questions.map((question: any, index: number) => ({
                        text: question.text,
                        type: question.type,
                        options: question.type === "MULTIPLE_CHOICE" ? stringifyQuizOptions(question.options) : null,
                        correctAnswer: question.correctAnswer,
                        points: question.points,
                        imageUrl: question.imageUrl || null,
                        position: index + 1
                    }))
                }
            },
            include: {
                course: {
                    select: {
                        title: true
                    }
                },
                questions: {
                    orderBy: {
                        position: 'asc'
                    }
                }
            }
        });

        return NextResponse.json(updatedQuiz);
    } catch (error) {
        console.log("[QUIZ_PATCH]", error);
        return new NextResponse("Internal Error", { status: 500 });
    }
}

export async function DELETE(
    req: Request,
    { params }: { params: Promise<{ courseId: string; quizId: string }> }
) {
    try {
        const { userId } = await auth();
        const resolvedParams = await params;

        if (!userId) {
            return new NextResponse("Unauthorized", { status: 401 });
        }

        // Verify the course belongs to the teacher
        const course = await db.course.findUnique({
            where: {
                id: resolvedParams.courseId,
                userId: userId
            }
        });

        if (!course) {
            return new NextResponse("Course not found or unauthorized", { status: 404 });
        }

        // Delete the quiz and all related data
        await db.quiz.delete({
            where: {
                id: resolvedParams.quizId,
                courseId: resolvedParams.courseId
            }
        });

        return new NextResponse(null, { status: 204 });
    } catch (error) {
        console.log("[QUIZ_DELETE]", error);
        return new NextResponse("Internal Error", { status: 500 });
    }
} 