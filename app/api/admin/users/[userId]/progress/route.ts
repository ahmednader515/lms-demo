import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET(
    req: NextRequest,
    { params }: { params: { userId: string } }
) {
    try {
        const session = await getServerSession(authOptions);

        if (!session?.user) {
            return new NextResponse("Unauthorized", { status: 401 });
        }

        if (session.user.role !== "ADMIN") {
            return new NextResponse("Forbidden", { status: 403 });
        }

        const user = await db.user.findUnique({
            where: {
                id: params.userId
            }
        });

        if (!user) {
            return new NextResponse("User not found", { status: 404 });
        }

        const userProgress = await db.userProgress.findMany({
            where: {
                userId: params.userId
            },
            include: {
                chapter: {
                    include: {
                        course: {
                            select: {
                                id: true,
                                title: true
                            }
                        }
                    }
                }
            },
            orderBy: {
                updatedAt: "desc"
            }
        });

        const purchases = await db.purchase.findMany({
            where: {
                userId: params.userId
            },
            include: {
                course: {
                    select: {
                        id: true,
                        title: true,
                        price: true
                    }
                }
            },
            orderBy: {
                createdAt: "desc"
            }
        });

        // Get all chapters from purchased courses
        const courseIds = purchases.map(purchase => purchase.course.id);
        const allChapters = await db.chapter.findMany({
            where: {
                courseId: {
                    in: courseIds
                },
                isPublished: true
            },
            include: {
                course: {
                    select: {
                        id: true,
                        title: true
                    }
                }
            },
            orderBy: [
                {
                    course: {
                        title: "asc"
                    }
                },
                {
                    position: "asc"
                }
            ]
        });

        return NextResponse.json({
            userProgress,
            purchases,
            allChapters
        });
    } catch (error) {
        console.error("[ADMIN_USER_PROGRESS_GET]", error);
        return new NextResponse("Internal Error", { status: 500 });
    }
} 