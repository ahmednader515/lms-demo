import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    // Prevent students from adding balance
    if (session.user.role === "USER") {
      return new NextResponse("Students cannot add balance to their account", { status: 403 });
    }

    const { amount } = await req.json();

    if (!amount || amount <= 0) {
      return new NextResponse("Invalid amount", { status: 400 });
    }

    // Update user balance
    const updatedUser = await db.user.update({
      where: {
        id: session.user.id,
      },
      data: {
        balance: {
          increment: amount,
        },
      },
    });

    // Create balance transaction record
    await db.balanceTransaction.create({
      data: {
        userId: session.user.id,
        amount,
        type: "DEPOSIT",
        description: `تم إضافة ${amount} جنيه إلى الرصيد`,
      },
    });

    return NextResponse.json({
      success: true,
      newBalance: updatedUser.balance,
    });
  } catch (error) {
    console.error("[BALANCE_ADD_ERROR]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
} 