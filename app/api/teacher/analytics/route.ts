import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { Course, Purchase, Chapter, UserProgress } from "@prisma/client";

type CourseWithRelations = Course & {
  purchases: (Purchase & {
    user: {
      id: string;
      fullName: string;
      phoneNumber: string;
    };
  })[];
  chapters: (Chapter & {
    userProgress: UserProgress[];
  })[];
};

export async function GET() {
  try {
    const { userId } = await auth();

    if (!userId) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    // Get all published courses by the user
    const courses = await db.course.findMany({
      where: {
        userId,
        isPublished: true,
      },
      include: {
        purchases: {
                  include: {
          user: true,
        },
        },
        chapters: {
          where: {
            isPublished: true,
          },
          include: {
            userProgress: true,
          },
        },
      },
    }) as CourseWithRelations[];

    console.log("[ANALYTICS] Found courses:", courses.length);

    // If no published courses, return empty analytics
    if (!courses || courses.length === 0) {
      console.log("[ANALYTICS] No published courses found");
      return NextResponse.json({
        totalRevenue: 0,
        totalSales: 0,
        courseCount: 0,
        courseAnalytics: [],
        revenueData: {
          labels: [],
          datasets: [
            {
              label: "Revenue",
              data: [],
              backgroundColor: "rgba(75, 192, 192, 0.5)",
            },
          ],
        },
        salesData: {
          labels: [],
          datasets: [
            {
              label: "Sales",
              data: [],
              backgroundColor: [
                "rgba(255, 99, 132, 0.6)",
                "rgba(54, 162, 235, 0.6)",
                "rgba(255, 206, 86, 0.6)",
                "rgba(75, 192, 192, 0.6)",
                "rgba(153, 102, 255, 0.6)",
              ],
            },
          ],
        },
      });
    }

    // Calculate analytics for each course
    const courseAnalytics = courses.map((course) => {
      try {
        // Calculate revenue for this course (using course price for each purchase)
        const courseRevenue = course.purchases.reduce((total: number, purchase) => {
          if (purchase.status === "ACTIVE") {
            return total + (course.price || 0);
          }
          return total;
        }, 0);

        // Calculate completion rate
        let completedChaptersCount = 0;
        let totalUserProgressCount = 0;

        course.chapters.forEach((chapter) => {
          const completedCount = chapter.userProgress.filter(
            (progress) => progress.isCompleted
          ).length;

          completedChaptersCount += completedCount;
          totalUserProgressCount += chapter.userProgress.length;
        });

        const completionRate =
          totalUserProgressCount > 0
            ? Math.round((completedChaptersCount / totalUserProgressCount) * 100)
            : 0;

        return {
          id: course.id,
          title: course.title,
          sales: course.purchases.length,
          revenue: courseRevenue,
          completionRate,
        };
      } catch (error) {
        console.error(`[ANALYTICS] Error processing course ${course.id}:`, error);
        return {
          id: course.id,
          title: course.title,
          sales: 0,
          revenue: 0,
          completionRate: 0,
        };
      }
    });

    // Sort courses by revenue (highest first)
    courseAnalytics.sort((a, b) => b.revenue - a.revenue);

    // Calculate total revenue and sales
    const totalRevenue = courseAnalytics.reduce(
      (total, course) => total + course.revenue,
      0
    );
    const totalSales = courseAnalytics.reduce(
      (total, course) => total + course.sales,
      0
    );

    console.log("[ANALYTICS] Calculated totals:", { totalRevenue, totalSales });

    // Prepare data for Bar chart (Revenue by Course)
    const revenueData = {
      labels: courseAnalytics.map((course) => course.title),
      datasets: [
        {
          label: "Revenue ($)",
          data: courseAnalytics.map((course) => course.revenue),
          backgroundColor: "rgba(75, 192, 192, 0.5)",
        },
      ],
    };

    // Prepare data for Pie chart (Sales Distribution)
    const salesData = {
      labels: courseAnalytics.map((course) => course.title),
      datasets: [
        {
          label: "Sales",
          data: courseAnalytics.map((course) => course.sales),
          backgroundColor: [
            "rgba(255, 99, 132, 0.6)",
            "rgba(54, 162, 235, 0.6)",
            "rgba(255, 206, 86, 0.6)",
            "rgba(75, 192, 192, 0.6)",
            "rgba(153, 102, 255, 0.6)",
            "rgba(255, 159, 64, 0.6)",
            "rgba(201, 203, 207, 0.6)",
          ],
          borderColor: [
            "rgba(255, 99, 132, 1)",
            "rgba(54, 162, 235, 1)",
            "rgba(255, 206, 86, 1)",
            "rgba(75, 192, 192, 1)",
            "rgba(153, 102, 255, 1)",
            "rgba(255, 159, 64, 1)",
            "rgba(201, 203, 207, 1)",
          ],
          borderWidth: 1,
        },
      ],
    };

    return NextResponse.json({
      totalRevenue,
      totalSales,
      courseCount: courses.length,
      courseAnalytics,
      revenueData,
      salesData,
    });
  } catch (error) {
    console.error("[TEACHER_ANALYTICS_ERROR]", error);
    return new NextResponse(
      JSON.stringify({ 
        error: "Internal Server Error",
        details: error instanceof Error ? error.message : "Unknown error"
      }), 
      { 
        status: 500,
        headers: {
          'Content-Type': 'application/json'
        }
      }
    );
  }
} 