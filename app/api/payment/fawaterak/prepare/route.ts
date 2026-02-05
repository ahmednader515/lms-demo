import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const { amount, paymentMethod } = await req.json();

    if (!amount || amount <= 0) {
      return new NextResponse("Invalid amount", { status: 400 });
    }

    // Get user details
    const user = await db.user.findUnique({
      where: { id: session.user.id },
    });

    if (!user) {
      return new NextResponse("User not found", { status: 404 });
    }

    // Cancel any existing pending payments for this user with the same amount
    await db.payment.updateMany({
      where: {
        userId: session.user.id,
        amount: amount,
        status: "PENDING",
      },
      data: {
        status: "CANCELLED",
      },
    });

    // Create payment record (without creating Fawaterak invoice - plugin will do that)
    const payment = await db.payment.create({
      data: {
        userId: session.user.id,
        amount,
        paymentMethod: paymentMethod || null,
        status: "PENDING",
      },
    });

    return NextResponse.json({
      success: true,
      paymentId: payment.id,
    });
  } catch (error) {
    console.error("[FAWATERAK_PREPARE_ERROR]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}

