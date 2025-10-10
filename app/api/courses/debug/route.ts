import { db } from "@/lib/db";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    // Get all courses with their details
    const allCourses = await db.course.findMany({
      include: {
        user: true,
        chapters: {
          select: {
            id: true,
            title: true,
            isPublished: true,
          }
        },
        quizzes: {
          select: {
            id: true,
            title: true,
            isPublished: true,
          }
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    // Get only published courses (what the home page should show)
    const publishedCourses = await db.course.findMany({
      where: {
        isPublished: true,
      },
      include: {
        user: true,
        chapters: {
          where: {
            isPublished: true,
          },
          select: {
            id: true,
          }
        },
        quizzes: {
          where: {
            isPublished: true,
          },
          select: {
            id: true,
          }
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return NextResponse.json({
      allCourses: allCourses.map(course => ({
        id: course.id,
        title: course.title,
        description: course.description,
        imageUrl: course.imageUrl,
        isPublished: course.isPublished,
        price: course.price,
        chaptersCount: course.chapters.length,
        publishedChaptersCount: course.chapters.filter(ch => ch.isPublished).length,
        quizzesCount: course.quizzes.length,
        publishedQuizzesCount: course.quizzes.filter(q => q.isPublished).length,
        createdAt: course.createdAt,
      })),
      publishedCourses: publishedCourses.map(course => ({
        id: course.id,
        title: course.title,
        chaptersCount: course.chapters.length,
        quizzesCount: course.quizzes.length,
      })),
      summary: {
        totalCourses: allCourses.length,
        publishedCourses: publishedCourses.length,
        unpublishedCourses: allCourses.length - publishedCourses.length,
      }
    });
  } catch (error) {
    console.error("[COURSES_DEBUG]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
} 