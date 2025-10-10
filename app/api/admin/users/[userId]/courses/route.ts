import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET(
  req: Request,
  { params }: { params: { userId: string } }
) {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const user = await db.user.findUnique({
      where: { id: params.userId, role: "USER" },
    });

    if (!user) {
      return NextResponse.json({ error: "Student not found" }, { status: 404 });
    }

    const purchases = await db.purchase.findMany({
      where: { userId: params.userId, status: "ACTIVE" },
      include: {
        course: {
          select: {
            id: true,
            title: true,
            price: true,
            isPublished: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    const ownedCourses = purchases.map((p) => p.course);

    return NextResponse.json({ courses: ownedCourses });
  } catch (error) {
    console.error("[ADMIN_USER_COURSES]", error);
    return NextResponse.json({ error: "Internal Error" }, { status: 500 });
  }
}


