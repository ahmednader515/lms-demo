import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

/**
 * General webhook handler - routes to specific handlers based on status
 * This is kept for backward compatibility and as a fallback
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    
    console.log("[FAWATERAK_WEBHOOK_GENERAL]", JSON.stringify(body, null, 2));
    
    // Fawaterak webhook payload structure
    const {
      invoice_key,
      invoice_status,
      invoice_total,
      payment_method,
      customer_name,
      customer_phone,
      metaData,
    } = body;

    if (!invoice_key) {
      return new NextResponse("Missing invoice_key", { status: 400 });
    }

    // Find payment by invoice key
    const payment = await db.payment.findUnique({
      where: { fawaterakInvoiceId: invoice_key },
      include: { user: true },
    });

    if (!payment) {
      console.error("[FAWATERAK_WEBHOOK_GENERAL] Payment not found for invoice:", invoice_key);
      return new NextResponse("Payment not found", { status: 404 });
    }

    // Handle different invoice statuses (check multiple possible values)
    const statusLower = String(invoice_status || '').toLowerCase();
    
    if (statusLower === "paid" || statusLower === "success" || invoice_status === "PAID" || invoice_status === "SUCCESS") {
      // If payment is already processed, don't process again
      if (payment.status === "PAID") {
        return NextResponse.json({ success: true, message: "Payment already processed" });
      }

      // Update payment status
      await db.payment.update({
        where: { id: payment.id },
        data: {
          status: "PAID",
          paymentMethod: payment_method || payment.paymentMethod,
        },
      });

      // Add balance to user account
      await db.user.update({
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
          description: `تم إضافة ${payment.amount} جنيه إلى الرصيد عبر ${payment_method || "Fawaterak"}`,
        },
      });

      console.log("[FAWATERAK_WEBHOOK_GENERAL] Payment processed successfully:", payment.id);
    } else if (statusLower === "failed" || invoice_status === "FAILED") {
      // Update payment status to failed
      await db.payment.update({
        where: { id: payment.id },
        data: {
          status: "FAILED",
        },
      });
    } else if (statusLower === "cancelled" || invoice_status === "CANCELLED") {
      // Update payment status to cancelled (only if still pending)
      if (payment.status === "PENDING") {
        await db.payment.update({
          where: { id: payment.id },
          data: {
            status: "CANCELLED",
          },
        });
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[FAWATERAK_WEBHOOK_GENERAL_ERROR]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}

