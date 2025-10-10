import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";
import { parseQuizOptions, stringifyQuizOptions } from "@/lib/utils";

export async function GET(req: Request) {
    try {
        const { userId } = await auth();

        if (!userId) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const quizzes = await db.quiz.findMany({
            where: {
                course: {
                    userId: userId
                }
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
            },
            orderBy: {
                position: "asc"
            }
        });

        // Parse options for multiple choice questions
        const quizzesWithParsedOptions = quizzes.map(quiz => ({
            ...quiz,
            questions: quiz.questions.map(question => ({
                ...question,
                options: parseQuizOptions(question.options)
            }))
        }));

        return NextResponse.json(quizzesWithParsedOptions);
    } catch (error) {
        console.log("[TEACHER_QUIZZES_GET]", error);
        return NextResponse.json({ error: "Internal Error" }, { status: 500 });
    }
}

export async function POST(req: Request) {
    try {
        const { userId } = await auth();
        const { title, description, courseId, questions, position, timer, maxAttempts } = await req.json();

        console.log("Received position:", position, "Type:", typeof position);

        if (!userId) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        // Validate required fields
        if (!title || !title.trim()) {
            return NextResponse.json({ error: "Title is required" }, { status: 400 });
        }

        if (!courseId) {
            return NextResponse.json({ error: "Course ID is required" }, { status: 400 });
        }

        // Verify the course belongs to the teacher
        const course = await db.course.findUnique({
            where: {
                id: courseId,
                userId: userId
            }
        });

        if (!course) {
            return NextResponse.json({ error: "Course not found or unauthorized" }, { status: 404 });
        }

        // Get the next position if not provided
        let quizPosition = position;
        console.log("Initial quizPosition:", quizPosition);
        if (!quizPosition || quizPosition <= 0) {
            const lastQuiz = await db.quiz.findFirst({
                where: {
                    courseId: courseId
                },
                orderBy: {
                    position: 'desc'
                }
            });
            quizPosition = lastQuiz ? lastQuiz.position + 1 : 1;
            console.log("Calculated quizPosition:", quizPosition, "Last quiz position:", lastQuiz?.position);
        }
        console.log("Final quizPosition:", quizPosition);

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

        // Create the quiz
        console.log("Creating quiz with position:", quizPosition);
        console.log("Quiz data object:", {
            title,
            description,
            position: quizPosition,
            courseId,
            timer: timer || null,
            maxAttempts: maxAttempts || 1
        });
        
        const quizData = {
            title,
            description,
            position: Number(quizPosition), // Explicitly cast to number
            courseId,
            timer: timer || null, // Timer in minutes, null means no time limit
            maxAttempts: maxAttempts || 1, // Default to 1 attempt if not specified
                            questions: {
                    create: questions.map((question: any, index: number) => {
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
                            position: index + 1
                        };
                    })
                }
        };
        
        console.log("Final quiz data:", JSON.stringify(quizData, null, 2));
        
        // Try creating the quiz without questions first
        const quizDataWithoutQuestions = {
            title,
            description,
            position: Number(quizPosition),
            courseId,
            timer: timer || null,
            maxAttempts: maxAttempts || 1
        };
        
        console.log("Quiz data without questions:", JSON.stringify(quizDataWithoutQuestions, null, 2));
        
        const quiz = await db.quiz.create({
            data: quizDataWithoutQuestions,
            include: {
                course: {
                    select: {
                        title: true
                    }
                }
            }
        });
        
        // Now add the questions separately
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
                        quizId: quiz.id,
                        position: index + 1
                    };
                })
            });
        }
        
        // Fetch the quiz with questions
        const quizWithQuestions = await db.quiz.findUnique({
            where: { id: quiz.id },
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
            return NextResponse.json({ error: "Failed to create quiz" }, { status: 500 });
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
        console.log("[TEACHER_QUIZZES_POST]", error);
        return NextResponse.json({ error: "Internal Error" }, { status: 500 });
    }
} 