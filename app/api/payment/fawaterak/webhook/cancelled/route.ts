import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    
    console.log("[FAWATERAK_WEBHOOK_CANCELLED]", JSON.stringify(body, null, 2));
    
    // Fawaterak cancellation webhook payload structure (for Fawry, Aman, Masary)
    const {
      invoice_key,
      invoice_status,
      invoice_total,
      payment_method,
      cancellation_reason,
      metaData,
    } = body;

    if (!invoice_key) {
      console.error("[FAWATERAK_WEBHOOK_CANCELLED] Missing invoice_key");
      return new NextResponse("Missing invoice_key", { status: 400 });
    }

    // Find payment by invoice key
    const payment = await db.payment.findUnique({
      where: { fawaterakInvoiceId: invoice_key },
    });

    if (!payment) {
      console.error("[FAWATERAK_WEBHOOK_CANCELLED] Payment not found for invoice:", invoice_key);
      return new NextResponse("Payment not found", { status: 404 });
    }

    // Only update if payment is still pending (don't override PAID status)
    if (payment.status === "PENDING") {
      await db.payment.update({
        where: { id: payment.id },
        data: {
          status: "CANCELLED",
          paymentMethod: payment_method || payment.paymentMethod,
        },
      });

      console.log("[FAWATERAK_WEBHOOK_CANCELLED] Payment cancelled:", {
        paymentId: payment.id,
        invoiceKey: invoice_key,
        cancellationReason: cancellation_reason,
      });
    } else {
      console.log("[FAWATERAK_WEBHOOK_CANCELLED] Payment already processed, ignoring cancellation:", payment.id);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[FAWATERAK_WEBHOOK_CANCELLED_ERROR]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}

