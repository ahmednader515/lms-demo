import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { CoursesTable } from "@/app/dashboard/(routes)/teacher/courses/_components/courses-table";
import { columns as teacherColumns } from "@/app/dashboard/(routes)/teacher/courses/_components/columns";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { PlusCircle } from "lucide-react";
import { AdminCoursesTable } from "./_components/admin-courses-table";

const AdminCoursesPage = async () => {
  const { userId } = await auth();
  if (!userId) return redirect("/");

  const courses = await db.course.findMany({
    include: {
      chapters: { select: { id: true, isPublished: true } },
      quizzes: { select: { id: true, isPublished: true } },
    },
    orderBy: { createdAt: "desc" },
  }).then(courses => courses.map(course => ({
    ...course,
    price: course.price || 0,
    publishedChaptersCount: course.chapters.filter(ch => ch.isPublished).length,
    publishedQuizzesCount: course.quizzes.filter(q => q.isPublished).length,
  })));

  return (
    <div className="p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">كل الكورسات</h1>
        <Link href="/dashboard/admin/courses/create">
          <Button className="bg-[#211FC3] hover:bg-[#211FC3]/90 text-white">
            <PlusCircle className="h-4 w-4 mr-2" />
            إنشاء كورس جديدة
          </Button>
        </Link>
      </div>

      <div className="mt-6">
        <AdminCoursesTable courses={courses as any} />
      </div>
    </div>
  );
};

export default AdminCoursesPage;


