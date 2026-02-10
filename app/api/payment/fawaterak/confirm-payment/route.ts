import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const { paymentId } = await req.json();

    if (!paymentId) {
      return new NextResponse("Missing paymentId", { status: 400 });
    }

    console.log("[CONFIRM_PAYMENT] Processing payment confirmation for:", paymentId);

    // Find the payment
    const payment = await db.payment.findUnique({
      where: { id: paymentId },
      include: { user: true },
    });

    if (!payment) {
      console.error("[CONFIRM_PAYMENT] Payment not found:", paymentId);
      return new NextResponse("Payment not found", { status: 404 });
    }

    // Verify the payment belongs to the current user
    if (payment.userId !== session.user.id) {
      console.error("[CONFIRM_PAYMENT] Unauthorized payment access:", payment.userId, "vs", session.user.id);
      return new NextResponse("Unauthorized", { status: 403 });
    }

    // If payment is already PAID, just return success
    if (payment.status === "PAID") {
      console.log("[CONFIRM_PAYMENT] Payment already processed:", paymentId);
      return NextResponse.json({
        success: true,
        message: "Payment already processed",
        status: "PAID",
      });
    }

    // Update payment status to PAID
    await db.payment.update({
      where: { id: payment.id },
      data: {
        status: "PAID",
      },
    });

    // Add balance to user account
    const updatedUser = await db.user.update({
      where: { id: payment.userId },
      data: {
        balance: {
          increment: payment.amount,
        },
      },
    });

    // Create balance transaction record
    await db.balanceTransaction.create({
      data: {
        userId: payment.userId,
        amount: payment.amount,
        type: "DEPOSIT",
        description: `تم إضافة ${payment.amount} جنيه إلى الرصيد عبر Fawaterak`,
      },
    });

    console.log("[CONFIRM_PAYMENT] Payment confirmed successfully:", {
      paymentId: payment.id,
      userId: payment.userId,
      amount: payment.amount,
      newBalance: updatedUser.balance,
    });

    return NextResponse.json({
      success: true,
      message: "Payment confirmed and balance updated",
      status: "PAID",
      newBalance: updatedUser.balance,
    });
  } catch (error: any) {
    console.error("[CONFIRM_PAYMENT_ERROR]", error);
    console.error("[CONFIRM_PAYMENT_ERROR] Stack:", error?.stack);
    return new NextResponse("Internal Error", { status: 500 });
  }
}
