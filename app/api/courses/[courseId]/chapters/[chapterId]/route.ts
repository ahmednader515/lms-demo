import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ courseId: string; chapterId: string }> }
) {
  try {
    const resolvedParams = await params;
    const { courseId, chapterId } = resolvedParams;
    
    const { userId } = await auth();

    if (!userId) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const chapter = await db.chapter.findUnique({
      where: {
        id: chapterId,
        courseId: courseId,
      },
      include: {
        course: {
          select: {
            userId: true,
          }
        },
        userProgress: {
          where: {
            userId,
          }
        },
        attachments: {
          orderBy: {
            position: 'asc',
          },
        }
      }
    });

    if (!chapter) {
      return new NextResponse("Chapter not found", { status: 404 });
    }

    // Get all content (chapters and quizzes) for this course
    const [chapters, quizzes] = await db.$transaction([
      db.chapter.findMany({
        where: {
          courseId: courseId,
          isPublished: true
        },
        select: {
          id: true,
          position: true
        },
        orderBy: {
          position: "asc"
        }
      }),
      db.quiz.findMany({
        where: {
          courseId: courseId,
          isPublished: true
        },
        select: {
          id: true,
          position: true
        },
        orderBy: {
          position: "asc"
        }
      })
    ]);

    // Add type to each item and combine
    const chaptersWithType = chapters.map(chapter => ({ ...chapter, type: 'chapter' as const }));
    const quizzesWithType = quizzes.map(quiz => ({ ...quiz, type: 'quiz' as const }));

    // Combine and sort by position
    const sortedContent = [...chaptersWithType, ...quizzesWithType].sort((a, b) => a.position - b.position);

    // Find current chapter index
    const currentIndex = sortedContent.findIndex(content => 
      content.id === chapterId && content.type === 'chapter'
    );

    // Find next and previous content
    const nextContent = currentIndex !== -1 && currentIndex < sortedContent.length - 1 
      ? sortedContent[currentIndex + 1] 
      : null;
    
    const previousContent = currentIndex > 0 
      ? sortedContent[currentIndex - 1] 
      : null;

    const response = {
      ...chapter,
      nextChapterId: nextContent?.id || null,
      previousChapterId: previousContent?.id || null,
      nextContentType: nextContent?.type || null,
      previousContentType: previousContent?.type || null,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error("[CHAPTER_ID] Detailed error:", error);
    if (error instanceof Error) {
      return new NextResponse(`Internal Error: ${error.message}\nStack: ${error.stack}`, { status: 500 });
    }
    return new NextResponse("Internal Error", { status: 500 });
  }
}

export async function PATCH(
    req: Request,
    { params }: { params: Promise<{ courseId: string; chapterId: string }> }
) {
    try {
        const { userId } = await auth();
        const resolvedParams = await params;
        const values = await req.json();

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

        const chapter = await db.chapter.update({
            where: {
                id: resolvedParams.chapterId,
                courseId: resolvedParams.courseId,
            },
            data: {
                ...values,
            }
        });

        return NextResponse.json(chapter);
    } catch (error) {
        console.log("[CHAPTER_ID]", error);
        return new NextResponse("Internal Error", { status: 500 });
    }
}

export async function DELETE(
    req: Request,
    { params }: { params: Promise<{ courseId: string; chapterId: string }> }
) {
    try {
        const { userId } = await auth();
        const resolvedParams = await params;

        if (!userId) {
            return new NextResponse("Unauthorized", { status: 401 });
        }

        // Check if user owns the course
        const courseOwner = await db.course.findUnique({
            where: {
                id: resolvedParams.courseId,
                userId: userId,
            }
        });

        if (!courseOwner) {
            return new NextResponse("Unauthorized", { status: 401 });
        }

        // Check if chapter exists
        const existingChapter = await db.chapter.findUnique({
            where: {
                id: resolvedParams.chapterId,
                courseId: resolvedParams.courseId,
            }
        });

        if (!existingChapter) {
            return new NextResponse("Chapter not found", { status: 404 });
        }

        // Delete the chapter (this will cascade delete related data due to Prisma relations)
        await db.chapter.delete({
            where: {
                id: resolvedParams.chapterId,
                courseId: resolvedParams.courseId,
            }
        });

        return new NextResponse("Chapter deleted successfully", { status: 200 });
    } catch (error) {
        console.error("[CHAPTER_DELETE]", error);
        return new NextResponse("Internal Error", { status: 500 });
    }
} 