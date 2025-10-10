import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";
import { parseQuizOptions } from "@/lib/utils";

export async function POST(
    req: Request,
    { params }: { params: Promise<{ courseId: string; quizId: string }> }
) {
    try {
        const { userId } = await auth();
        const resolvedParams = await params;
        const { answers } = await req.json();

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

        // Get the quiz with questions
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
                        correctAnswer: true,
                        points: true,
                        imageUrl: true
                    },
                    orderBy: {
                        position: 'asc'
                    }
                }
            }
        });

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

        // Calculate score
        let totalScore = 0;
        let totalPoints = 0;
        const quizAnswers = [];

        for (const question of quiz.questions) {
            totalPoints += question.points;
            const studentAnswer = answers.find((a: any) => a.questionId === question.id)?.answer || "";
            
            let isCorrect = false;
            let pointsEarned = 0;

            if (question.type === "MULTIPLE_CHOICE") {
                // Parse options to get the correct answer format
                const options = parseQuizOptions(question.options);
                const correctAnswer = question.correctAnswer.trim();
                
                // Check if student answer matches any of the correct options
                isCorrect = options.some(option => 
                    option.trim() === correctAnswer && 
                    option.trim() === studentAnswer.trim()
                );
            } else if (question.type === "TRUE_FALSE") {
                isCorrect = studentAnswer.toLowerCase() === question.correctAnswer.toLowerCase();
            } else if (question.type === "SHORT_ANSWER") {
                // For short answer, do a case-insensitive comparison
                isCorrect = studentAnswer.trim().toLowerCase() === question.correctAnswer.trim().toLowerCase();
            }

            if (isCorrect) {
                pointsEarned = question.points;
                totalScore += question.points;
            }

            quizAnswers.push({
                questionId: question.id,
                studentAnswer,
                correctAnswer: question.correctAnswer,
                isCorrect,
                pointsEarned
            });
        }

        const percentage = totalPoints > 0 ? (totalScore / totalPoints) * 100 : 0;

        // Create quiz result
        const quizResult = await db.quizResult.create({
            data: {
                studentId: userId,
                quizId: resolvedParams.quizId,
                score: totalScore,
                totalPoints,
                percentage,
                attemptNumber: currentAttemptNumber,
                answers: {
                    create: quizAnswers
                }
            },
            include: {
                answers: {
                    include: {
                        question: true
                    }
                }
            }
        });

        return NextResponse.json({
            ...quizResult,
            answers: quizResult.answers.map(answer => ({
                ...answer,
                question: {
                    ...answer.question,
                    options: parseQuizOptions(answer.question.options)
                }
            }))
        });
    } catch (error) {
        console.log("[QUIZ_SUBMIT]", error);
        return new NextResponse("Internal Error", { status: 500 });
    }
} 