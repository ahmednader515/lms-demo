import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    
    console.log("[FAWATERAK_WEBHOOK_REFUND]", JSON.stringify(body, null, 2));
    
    // Fawaterak refund webhook payload structure
    const {
      invoice_key,
      refund_amount,
      refund_reason,
      payment_method,
      metaData,
    } = body;

    if (!invoice_key) {
      console.error("[FAWATERAK_WEBHOOK_REFUND] Missing invoice_key");
      return new NextResponse("Missing invoice_key", { status: 400 });
    }

    // Find payment by invoice key
    const payment = await db.payment.findUnique({
      where: { fawaterakInvoiceId: invoice_key },
      include: { user: true },
    });

    if (!payment) {
      console.error("[FAWATERAK_WEBHOOK_REFUND] Payment not found for invoice:", invoice_key);
      return new NextResponse("Payment not found", { status: 404 });
    }

    // Only process refund if payment was previously PAID
    if (payment.status !== "PAID") {
      console.log("[FAWATERAK_WEBHOOK_REFUND] Payment not in PAID status, ignoring refund:", payment.id);
      return NextResponse.json({ success: true, message: "Payment not eligible for refund" });
    }

    const refundAmount = parseFloat(refund_amount || payment.amount);

    // Update payment status
    await db.payment.update({
      where: { id: payment.id },
      data: {
        status: "REFUNDED",
      },
    });

    // Deduct balance from user account
    await db.user.update({
      where: { id: payment.userId },
      data: {
        balance: {
          decrement: refundAmount,
        },
      },
    });

    // Create balance transaction record for refund
    await db.balanceTransaction.create({
      data: {
        userId: payment.userId,
        amount: -refundAmount,
        type: "PURCHASE", // Using PURCHASE type for negative amount
        description: `استرداد ${refundAmount} جنيه - ${refund_reason || "استرداد الدفع"}`,
      },
    });

    console.log("[FAWATERAK_WEBHOOK_REFUND] Refund processed:", {
      paymentId: payment.id,
      userId: payment.userId,
      refundAmount,
      invoiceKey: invoice_key,
      reason: refund_reason,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[FAWATERAK_WEBHOOK_REFUND_ERROR]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}

