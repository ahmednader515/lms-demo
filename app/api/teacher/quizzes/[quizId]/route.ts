import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";
import { parseQuizOptions, stringifyQuizOptions } from "@/lib/utils";

export async function GET(
    req: Request,
    { params }: { params: Promise<{ quizId: string }> }
) {
    try {
        const { userId, user } = await auth();
        const resolvedParams = await params;

        console.log("[TEACHER_QUIZ_GET] Fetching quiz:", resolvedParams.quizId, "for user:", userId);

        if (!userId) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        // Get the quiz; if not admin, ensure it belongs to the teacher
        const quiz = await db.quiz.findFirst({
            where: user?.role === "ADMIN"
                ? { id: resolvedParams.quizId }
                : {
                    id: resolvedParams.quizId,
                    course: {
                        userId: userId,
                    },
                },
            include: {
                course: {
                    select: {
                        id: true,
                        title: true
                    }
                },
                questions: {
                    select: {
                        id: true,
                        text: true,
                        type: true,
                        options: true,
                        correctAnswer: true,
                        points: true,
                        imageUrl: true,
                        position: true
                    },
                    orderBy: {
                        position: 'asc'
                    }
                }
            }
        });

        if (!quiz) {
            console.log("[TEACHER_QUIZ_GET] Quiz not found for ID:", resolvedParams.quizId);
            return NextResponse.json({ error: "Quiz not found" }, { status: 404 });
        }

        console.log("[TEACHER_QUIZ_GET] Quiz found:", quiz.id, "with", quiz.questions.length, "questions");

        // Parse options for multiple choice questions
        const quizWithParsedOptions = {
            ...quiz,
            questions: quiz.questions.map(question => {
                try {
                    return {
                        ...question,
                        options: parseQuizOptions(question.options)
                    };
                } catch (parseError) {
                    console.log("[TEACHER_QUIZ_GET] Error parsing options for question:", question.id, parseError);
                    return {
                        ...question,
                        options: question.options ? JSON.parse(question.options) : null
                    };
                }
            })
        };

        return NextResponse.json(quizWithParsedOptions);
    } catch (error) {
        console.log("[TEACHER_QUIZ_GET] Error details:", error);
        console.log("[TEACHER_QUIZ_GET] Error stack:", (error as Error).stack);
        return NextResponse.json({ error: "Internal Error" }, { status: 500 });
    }
}

export async function PATCH(
    req: Request,
    { params }: { params: Promise<{ quizId: string }> }
) {
    try {
        const { userId, user } = await auth();
        const resolvedParams = await params;
        const { title, description, questions, position, timer, maxAttempts, courseId } = await req.json();

        if (!userId) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        // Get the current quiz to know its course and owner
        const currentQuiz = await db.quiz.findUnique({
            where: { id: resolvedParams.quizId },
            select: { courseId: true, position: true, course: { select: { userId: true } } }
        });

        if (!currentQuiz) {
            return NextResponse.json({ error: "Quiz not found" }, { status: 404 });
        }

        // Only owner or admin can modify
        if (user?.role !== "ADMIN" && currentQuiz.course.userId !== userId) {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }

        // Use the courseId from request if provided, otherwise use current quiz's courseId
        const targetCourseId = courseId || currentQuiz.courseId;

        // Validate required fields
        if (!title || !title.trim()) {
            return NextResponse.json({ error: "Title is required" }, { status: 400 });
        }

        // Handle position - use current position if not provided or invalid
        let quizPosition = position;
        if (!quizPosition || quizPosition <= 0) {
            quizPosition = currentQuiz.position;
        }

        // Validate questions
        if (!questions || questions.length === 0) {
            return NextResponse.json({ error: "At least one question is required" }, { status: 400 });
        }

        for (let i = 0; i < questions.length; i++) {
            const question = questions[i];
            
            if (!question.text || !question.text.trim()) {
                return NextResponse.json({ error: `Question ${i + 1}: Text is required` }, { status: 400 });
            }

            if (question.type === "MULTIPLE_CHOICE") {
                if (!question.options || question.options.length < 2) {
                    return NextResponse.json({ error: `Question ${i + 1}: At least 2 options are required` }, { status: 400 });
                }

                const validOptions = question.options.filter((option: string) => option && option.trim() !== "");
                if (validOptions.length < 2) {
                    return NextResponse.json({ error: `Question ${i + 1}: At least 2 valid options are required` }, { status: 400 });
                }

                // For multiple choice, correctAnswer should be an index
                if (typeof question.correctAnswer !== 'number' || question.correctAnswer < 0 || question.correctAnswer >= validOptions.length) {
                    return NextResponse.json({ error: `Question ${i + 1}: Valid correct answer index is required` }, { status: 400 });
                }
            } else if (question.type === "TRUE_FALSE") {
                if (!question.correctAnswer || (question.correctAnswer !== "true" && question.correctAnswer !== "false")) {
                    return NextResponse.json({ error: `Question ${i + 1}: Correct answer must be "true" or "false"` }, { status: 400 });
                }
            } else if (question.type === "SHORT_ANSWER") {
                if (!question.correctAnswer || !question.correctAnswer.toString().trim()) {
                    return NextResponse.json({ error: `Question ${i + 1}: Correct answer is required` }, { status: 400 });
                }
            }

            if (!question.points || question.points <= 0) {
                return NextResponse.json({ error: `Question ${i + 1}: Points must be greater than 0` }, { status: 400 });
            }
        }

        // Note: Position reordering is now handled by the separate reorder API
        // This API just updates the quiz with the provided position

        // Update the quiz without questions first
        const updatedQuiz = await db.quiz.update({
            where: {
                id: resolvedParams.quizId
            },
            data: {
                title,
                description,
                courseId: targetCourseId, // Update courseId if changed
                position: Number(quizPosition), // Explicitly cast to number
                timer: timer || null,
                maxAttempts: maxAttempts || 1
            },
            include: {
                course: {
                    select: {
                        title: true
                    }
                }
            }
        });

        // Delete existing questions
        await db.question.deleteMany({
            where: {
                quizId: resolvedParams.quizId
            }
        });

        // Add questions separately
        if (questions.length > 0) {
            await db.question.createMany({
                data: questions.map((question: any, index: number) => {
                    let correctAnswerValue = question.correctAnswer;
                    
                    // For multiple choice questions, convert index to actual option value
                    if (question.type === "MULTIPLE_CHOICE") {
                        const validOptions = question.options.filter((option: string) => option && option.trim() !== "");
                        correctAnswerValue = validOptions[question.correctAnswer];
                    }
                    
                    return {
                        text: question.text,
                        type: question.type,
                        options: question.type === "MULTIPLE_CHOICE" ? stringifyQuizOptions(question.options) : null,
                        correctAnswer: correctAnswerValue,
                        points: question.points,
                        imageUrl: question.imageUrl || null,
                        quizId: resolvedParams.quizId,
                        position: index + 1
                    };
                })
            });
        }

        // Fetch the updated quiz with questions
        const quizWithQuestions = await db.quiz.findUnique({
            where: { id: resolvedParams.quizId },
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

        if (!quizWithQuestions) {
            return NextResponse.json({ error: "Failed to update quiz" }, { status: 500 });
        }

        // Parse options for the response
        const quizWithParsedOptions = {
            ...quizWithQuestions,
            questions: quizWithQuestions.questions.map(question => ({
                ...question,
                options: parseQuizOptions(question.options)
            }))
        };

        return NextResponse.json(quizWithParsedOptions);
    } catch (error) {
        console.log("[QUIZ_PATCH]", error);
        return NextResponse.json({ error: "Internal Error" }, { status: 500 });
    }
} 