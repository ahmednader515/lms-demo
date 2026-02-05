import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    
    console.log("[FAWATERAK_WEBHOOK_FAILED]", JSON.stringify(body, null, 2));
    
    // Fawaterak failed webhook payload structure
    const {
      invoice_key,
      invoice_status,
      invoice_total,
      payment_method,
      failure_reason,
      metaData,
    } = body;

    if (!invoice_key) {
      console.error("[FAWATERAK_WEBHOOK_FAILED] Missing invoice_key");
      return new NextResponse("Missing invoice_key", { status: 400 });
    }

    // Find payment by invoice key
    const payment = await db.payment.findUnique({
      where: { fawaterakInvoiceId: invoice_key },
    });

    if (!payment) {
      console.error("[FAWATERAK_WEBHOOK_FAILED] Payment not found for invoice:", invoice_key);
      return new NextResponse("Payment not found", { status: 404 });
    }

    // Update payment status to FAILED
    await db.payment.update({
      where: { id: payment.id },
      data: {
        status: "FAILED",
        paymentMethod: payment_method || payment.paymentMethod,
      },
    });

    console.log("[FAWATERAK_WEBHOOK_FAILED] Payment marked as failed:", {
      paymentId: payment.id,
      invoiceKey: invoice_key,
      failureReason: failure_reason,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[FAWATERAK_WEBHOOK_FAILED_ERROR]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}

