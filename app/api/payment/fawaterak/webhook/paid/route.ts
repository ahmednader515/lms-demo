import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    
    console.log("[FAWATERAK_WEBHOOK_PAID]", JSON.stringify(body, null, 2));
    
    // Fawaterak paid webhook payload structure
    const {
      invoice_key,
      invoice_status,
      invoice_total,
      payment_method,
      customer_name,
      customer_phone,
      customer_email,
      metaData,
    } = body;

    if (!invoice_key) {
      console.error("[FAWATERAK_WEBHOOK_PAID] Missing invoice_key");
      return new NextResponse("Missing invoice_key", { status: 400 });
    }

    // Find payment by invoice key or metaData.paymentId
    let payment = await db.payment.findUnique({
      where: { fawaterakInvoiceId: invoice_key },
      include: { user: true },
    });

    // If not found by invoice key, try finding by paymentId in metaData
    if (!payment && metaData?.paymentId) {
      console.log("[FAWATERAK_WEBHOOK_PAID] Looking up payment by paymentId from metaData:", metaData.paymentId);
      payment = await db.payment.findUnique({
        where: { id: metaData.paymentId },
        include: { user: true },
      });
      
      // Update payment with invoice key for future lookups
      if (payment) {
        await db.payment.update({
          where: { id: payment.id },
          data: { fawaterakInvoiceId: invoice_key },
        });
        console.log("[FAWATERAK_WEBHOOK_PAID] Updated payment with invoice key:", invoice_key);
      }
    }

    // Last resort: try to find by customer phone/email and amount if metaData has userId
    if (!payment && metaData?.userId && invoice_total) {
      console.log("[FAWATERAK_WEBHOOK_PAID] Trying to find payment by userId and amount:", metaData.userId, invoice_total);
      const pendingPayments = await db.payment.findMany({
        where: {
          userId: metaData.userId,
          amount: parseFloat(invoice_total),
          status: "PENDING",
        },
        include: { user: true },
        orderBy: { createdAt: "desc" },
        take: 1,
      });
      
      if (pendingPayments.length > 0) {
        payment = pendingPayments[0];
        // Update with invoice key
        await db.payment.update({
          where: { id: payment.id },
          data: { fawaterakInvoiceId: invoice_key },
        });
        console.log("[FAWATERAK_WEBHOOK_PAID] Found payment by userId/amount and updated with invoice key");
      }
    }

    if (!payment) {
      console.error("[FAWATERAK_WEBHOOK_PAID] Payment not found for invoice:", invoice_key);
      console.error("[FAWATERAK_WEBHOOK_PAID] metaData:", JSON.stringify(metaData, null, 2));
      console.error("[FAWATERAK_WEBHOOK_PAID] invoice_total:", invoice_total);
      console.error("[FAWATERAK_WEBHOOK_PAID] customer_phone:", customer_phone);
      return new NextResponse("Payment not found", { status: 404 });
    }

    // If payment is already processed, don't process again
    if (payment.status === "PAID") {
      console.log("[FAWATERAK_WEBHOOK_PAID] Payment already processed:", payment.id);
      return NextResponse.json({ success: true, message: "Payment already processed" });
    }

    // Update payment status to PAID
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

    console.log("[FAWATERAK_WEBHOOK_PAID] Payment processed successfully:", {
      paymentId: payment.id,
      userId: payment.userId,
      amount: payment.amount,
      invoiceKey: invoice_key,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[FAWATERAK_WEBHOOK_PAID_ERROR]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}

