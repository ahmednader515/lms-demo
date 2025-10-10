import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import bcrypt from "bcryptjs";

export async function PATCH(
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

        const { newPassword } = await req.json();

        if (!newPassword) {
            return new NextResponse("New password is required", { status: 400 });
        }

        const user = await db.user.findUnique({
            where: {
                id: params.userId
            }
        });

        if (!user) {
            return new NextResponse("User not found", { status: 404 });
        }

        const hashedPassword = await bcrypt.hash(newPassword, 12);

        await db.user.update({
            where: {
                id: params.userId
            },
            data: {
                hashedPassword
            }
        });

        return NextResponse.json({ message: "Password updated successfully" });
    } catch (error) {
        console.error("[ADMIN_USER_PASSWORD_PATCH]", error);
        return new NextResponse("Internal Error", { status: 500 });
    }
} 