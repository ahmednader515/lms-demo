import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";

const AdminCreateCoursePage = async () => {
  const { userId } = await auth();

  if (!userId) {
    return redirect("/");
  }

  const course = await db.course.create({
    data: {
      userId,
      title: "كورس غير معرفة",
    },
  });

  // Reuse the teacher editor UI for course setup
  return redirect(`/dashboard/teacher/courses/${course.id}`);
};

export default AdminCreateCoursePage;


