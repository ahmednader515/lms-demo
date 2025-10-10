import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";

const CreatePage = async () => {
    const { userId } = await auth();

    if (!userId) {
        return redirect("/");
    }

    const course = await db.course.create({
        data: {
            userId,
            title: "كورس غير معرفة",
        }
    });

    return redirect(`/dashboard/teacher/courses/${course.id}`);
};

export default CreatePage; 