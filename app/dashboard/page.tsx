import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { authOptions } from "@/lib/auth";
import { getDashboardUrlByRole } from "@/lib/utils";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { BookOpen, Play, Clock, Trophy, Wallet, TrendingUp, BookOpen as BookOpenIcon } from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { Course, Purchase, Chapter } from "@prisma/client";
import { getAssetUrl, getCdnUrl } from "@/lib/cdn";

type CourseWithProgress = Course & {
  chapters: { id: string }[];
  quizzes: { id: string }[];
  purchases: Purchase[];
  progress: number;
}

type LastWatchedChapter = {
  id: string;
  title: string;
  courseId: string;
  courseTitle: string;
  courseImageUrl: string | null;
  position: number;
}

type StudentStats = {
  totalCourses: number;
  totalChapters: number;
  completedChapters: number;
  totalQuizzes: number;
  completedQuizzes: number;
  averageScore: number;
}

const CoursesPage = async () => {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return redirect("/");
  }

  // Redirect non-students to their role-specific dashboard
  if (session.user.role !== "USER") {
    const dashboardUrl = getDashboardUrlByRole(session.user.role);
    return redirect(dashboardUrl);
  }

  // Get user's current balance
  const user = await db.user.findUnique({
    where: { id: session.user.id },
    select: { balance: true }
  });

  // Get last watched chapter
  const lastWatchedChapter = await db.userProgress.findFirst({
    where: {
      userId: session.user.id,
      isCompleted: false // Get the last incomplete chapter
    },
    include: {
      chapter: {
        include: {
          course: {
            select: {
              title: true,
              imageUrl: true
            }
          }
        }
      }
    },
    orderBy: {
      updatedAt: "desc"
    }
  });

  // Get student statistics
  const totalCourses = await db.purchase.count({
    where: {
      userId: session.user.id,
      status: "ACTIVE"
    }
  });

  const totalChapters = await db.userProgress.count({
    where: {
      userId: session.user.id
    }
  });

  const completedChapters = await db.userProgress.count({
    where: {
      userId: session.user.id,
      isCompleted: true
    }
  });

  // Get total quizzes from courses the student has purchased
  const totalQuizzes = await db.quiz.count({
    where: {
      course: {
        purchases: {
          some: {
            userId: session.user.id,
            status: "ACTIVE"
          }
        }
      },
      isPublished: true
    }
  });

  // Get unique completed quizzes by using findMany and counting the results
  const completedQuizResults = await db.quizResult.findMany({
    where: {
      studentId: session.user.id
    },
    select: {
      quizId: true
    }
  });

  // Count unique quizIds
  const uniqueQuizIds = new Set(completedQuizResults.map(result => result.quizId));
  const completedQuizzes = uniqueQuizIds.size;

  // Calculate average score from quiz results (using best attempt for each quiz)
  const quizResults = await db.quizResult.findMany({
    where: {
      studentId: session.user.id
    },
    select: {
      quizId: true,
      percentage: true
    },
    orderBy: {
      percentage: 'desc' // Order by percentage descending to get best attempts first
    }
  });

  // Get only the best attempt for each quiz
  const bestAttempts = new Map();
  quizResults.forEach(result => {
    if (!bestAttempts.has(result.quizId)) {
      bestAttempts.set(result.quizId, result.percentage);
    }
  });

  const averageScore = bestAttempts.size > 0 
    ? Math.round(Array.from(bestAttempts.values()).reduce((sum, percentage) => sum + percentage, 0) / bestAttempts.size)
    : 0;

  const studentStats: StudentStats = {
    totalCourses,
    totalChapters,
    completedChapters,
    totalQuizzes,
    completedQuizzes,
    averageScore
  };

  const courses = await db.course.findMany({
    where: {
      purchases: {
        some: {
          userId: session.user.id,
          status: "ACTIVE"
        }
      }
    },
    include: {
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
      purchases: {
        where: {
          userId: session.user.id,
        }
      }
    },
    orderBy: {
      createdAt: "desc",
    }
  });

  const coursesWithProgress = await Promise.all(
    courses.map(async (course) => {
      const totalChapters = course.chapters.length;
      const totalQuizzes = course.quizzes.length;
      const totalContent = totalChapters + totalQuizzes;

      const completedChapters = await db.userProgress.count({
        where: {
          userId: session.user.id,
          chapterId: {
            in: course.chapters.map(chapter => chapter.id)
          },
          isCompleted: true
        }
      });

      // Get unique completed quizzes by using findMany and counting the results
      const completedQuizResults = await db.quizResult.findMany({
        where: {
          studentId: session.user.id,
          quizId: {
            in: course.quizzes.map(quiz => quiz.id)
          }
        },
        select: {
          quizId: true
        }
      });

      // Count unique quizIds
      const uniqueQuizIds = new Set(completedQuizResults.map(result => result.quizId));
      const completedQuizzes = uniqueQuizIds.size;

      const completedContent = completedChapters + completedQuizzes;

      const progress = totalContent > 0 
        ? (completedContent / totalContent) * 100 
        : 0;

      return {
        ...course,
        progress
      } as CourseWithProgress;
    })
  );

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">مرحباً بك في لوحة التحكم</h1>
        <p className="text-muted-foreground">استمر من حيث وقفت في رحلة التعلم</p>
      </div>

      {/* Stats and Balance Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {/* Balance Card */}
        <div className="bg-gradient-to-r from-blue-500 to-blue-600 rounded-xl p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-blue-100 text-sm">الرصيد الحالي</p>
              <p className="text-2xl font-bold">{user?.balance?.toFixed(2) || "0.00"} جنيه</p>
            </div>
            <Wallet className="h-8 w-8 text-blue-200" />
          </div>
        </div>

        {/* Total Courses */}
        <div className="bg-gradient-to-r from-green-500 to-green-600 rounded-xl p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-green-100 text-sm">الكورسات المشتراة</p>
              <p className="text-2xl font-bold">{studentStats.totalCourses}</p>
            </div>
            <BookOpenIcon className="h-8 w-8 text-green-200" />
          </div>
        </div>

        {/* Completed Chapters */}
        <div className="bg-gradient-to-r from-purple-500 to-purple-600 rounded-xl p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-purple-100 text-sm">الفصول المكتملة</p>
              <p className="text-2xl font-bold">{studentStats.completedChapters}</p>
            </div>
            <Trophy className="h-8 w-8 text-purple-200" />
          </div>
        </div>

        {/* Average Score */}
        <div className="bg-gradient-to-r from-orange-500 to-orange-600 rounded-xl p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-orange-100 text-sm">متوسط الدرجات</p>
              <p className="text-2xl font-bold">{studentStats.averageScore}%</p>
            </div>
            <TrendingUp className="h-8 w-8 text-orange-200" />
          </div>
        </div>
      </div>

      {/* Last Watched Chapter - Big Square */}
      {lastWatchedChapter && (
        <div className="mb-8">
          <h2 className="text-xl font-semibold mb-4">آخر فصل كنت تشاهده</h2>
          <div className="bg-card rounded-xl overflow-hidden border shadow-lg">
            <div className="grid grid-cols-1 lg:grid-cols-2">
              {/* Image Section */}
              <div className="relative h-64 lg:h-full">
                <Image
                  src={lastWatchedChapter.chapter.course.imageUrl ? getAssetUrl(lastWatchedChapter.chapter.course.imageUrl) : getCdnUrl("/placeholder.png")}
                  alt={lastWatchedChapter.chapter.course.title}
                  fill
                  className="object-cover"
                />
                <div className="absolute inset-0 bg-black/30" />
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="bg-white/20 backdrop-blur-sm rounded-full p-4">
                    <Play className="h-8 w-8 text-white" />
                  </div>
                </div>
              </div>

              {/* Content Section */}
              <div className="p-6 flex flex-col justify-center">
                <div className="mb-4">
                  <p className="text-sm text-muted-foreground mb-2">
                    {lastWatchedChapter.chapter.course.title}
                  </p>
                  <h3 className="text-2xl font-bold mb-2">
                    {lastWatchedChapter.chapter.title}
                  </h3>
                  <p className="text-muted-foreground">
                    الفصل رقم {lastWatchedChapter.chapter.position}
                  </p>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Clock className="h-4 w-4" />
                    <span>آخر مشاهدة منذ ساعة</span>
                  </div>
                  
                  <Button 
                    className="w-full bg-[#211FC3] hover:bg-[#211FC3]/90 text-white" 
                    size="lg"
                    asChild
                  >
                    <Link href={`/courses/${lastWatchedChapter.chapter.courseId}/chapters/${lastWatchedChapter.chapter.id}`}>
                      <Play className="h-4 w-4 ml-2" />
                      متابعة المشاهدة
                    </Link>
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Detailed Statistics */}
      <div className="mb-8">
        <h2 className="text-xl font-semibold mb-4">إحصائيات التعلم</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <div className="bg-card rounded-xl p-6 border">
            <div className="flex items-center gap-3 mb-4">
              <div className="bg-blue-100 p-3 rounded-full">
                <BookOpenIcon className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">إجمالي الفصول</p>
                <p className="text-2xl font-bold">{studentStats.totalChapters}</p>
              </div>
            </div>
            <Progress value={(studentStats.completedChapters / Math.max(studentStats.totalChapters, 1)) * 100} className="h-2" />
            <p className="text-sm text-muted-foreground mt-2">
              {studentStats.completedChapters} من {studentStats.totalChapters} مكتمل
            </p>
          </div>

          <div className="bg-card rounded-xl p-6 border">
            <div className="flex items-center gap-3 mb-4">
              <div className="bg-green-100 p-3 rounded-full">
                <Trophy className="h-6 w-6 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">الاختبارات المكتملة</p>
                <p className="text-2xl font-bold">{studentStats.completedQuizzes}</p>
              </div>
            </div>
            <Progress value={(studentStats.completedQuizzes / Math.max(studentStats.totalQuizzes, 1)) * 100} className="h-2" />
            <p className="text-sm text-muted-foreground mt-2">
              {studentStats.completedQuizzes} من {studentStats.totalQuizzes} مكتمل
            </p>
          </div>
        </div>
      </div>

            {/* My Courses Section */}
      <div>
        <h2 className="text-xl font-semibold mb-6">كورساتي</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {coursesWithProgress.map((course) => (
            <div
              key={course.id}
              className="group bg-card rounded-2xl overflow-hidden border shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-[1.02]"
            >
              <div className="relative w-full aspect-[16/9]">
                <Image
                  src={course.imageUrl ? getAssetUrl(course.imageUrl) : getCdnUrl("/placeholder.png")}
                  alt={course.title}
                  fill
                  className="object-cover group-hover:scale-105 transition-transform duration-300"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                <div className="absolute top-4 right-4">
                  <div className="bg-white/90 backdrop-blur-sm rounded-full px-3 py-1 text-sm font-medium text-gray-800">
                    {Math.round(course.progress)}%
                  </div>
                </div>
              </div>
              <div className="p-6">
                <div className="mb-4">
                  <h3 className="text-xl font-bold mb-3 line-clamp-2 min-h-[3rem] text-gray-900">
                    {course.title}
                  </h3>
                  <div className="flex items-center gap-3 text-sm text-muted-foreground mb-4">
                    <div className="flex items-center gap-1">
                      <BookOpen className="h-4 w-4" />
                      <span>
                        {course.chapters.length} {course.chapters.length === 1 ? "فصل" : "فصول"}
                      </span>
                    </div>
                    {course.quizzes.length > 0 && (
                      <div className="flex items-center gap-1">
                        <span className="w-1 h-1 bg-muted-foreground rounded-full"></span>
                        <span>
                          {course.quizzes.length} {course.quizzes.length === 1 ? "اختبار" : "اختبارات"}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
                
                <div className="space-y-4">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground font-medium">التقدم</span>
                      <span className="font-bold text-[#211FC3]">{Math.round(course.progress)}%</span>
                    </div>
                    <div className="relative">
                      <div className="w-full bg-gray-200 rounded-full h-3">
                        <div 
                          className="bg-gradient-to-r from-[#211FC3] to-[#211FC3]/80 h-3 rounded-full transition-all duration-300"
                          style={{ width: `${course.progress}%` }}
                        ></div>
                      </div>
                    </div>
                  </div>
                  
                  <Button 
                    className="w-full bg-[#211FC3] hover:bg-[#211FC3]/90 text-white font-semibold py-3 text-base transition-all duration-200 hover:scale-105" 
                    variant="default"
                    asChild
                  >
                    <Link href={course.chapters.length > 0 ? `/courses/${course.id}/chapters/${course.chapters[0].id}` : `/courses/${course.id}`}>
                      متابعة التعلم
                    </Link>
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
        {coursesWithProgress.length === 0 && (
          <div className="text-center py-16">
            <div className="bg-muted/50 rounded-2xl p-8 max-w-md mx-auto">
              <BookOpen className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">لم تقم بشراء أي كورسات بعد</h3>
              <p className="text-muted-foreground mb-6">ابدأ رحلة التعلم بشراء أول كورس لك</p>
              <Button asChild className="bg-[#211FC3] hover:bg-[#211FC3]/90 text-white font-semibold">
                <Link href="/dashboard/search">
                  استكشف الكورسات المتاحة
                </Link>
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default CoursesPage; 