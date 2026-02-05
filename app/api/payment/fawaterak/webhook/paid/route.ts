import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    
    console.log("[FAWATERAK_WEBHOOK_PAID] Full payload:", JSON.stringify(body, null, 2));
    
    // Fawaterak paid webhook payload structure
    // Try different possible field names
    const invoice_key = body.invoice_key || body.invoiceKey || body.invoice_id || body.invoiceId || body.key;
    const invoice_status = body.invoice_status || body.status || body.invoiceStatus || body.invoice_status_name;
    const invoice_total = body.invoice_total || body.total || body.amount || body.cartTotal || body.invoice_total_amount;
    const payment_method = body.payment_method || body.paymentMethod || body.payment_method_name || body.paymentMethodName;
    const customer_name = body.customer_name || body.customerName || body.name;
    const customer_phone = body.customer_phone || body.customerPhone || body.phone || body.customer_phone_number;
    const customer_email = body.customer_email || body.customerEmail || body.email;
    // Handle both camelCase and snake_case for payload
    const metaData = body.metaData || body.metadata || body.meta || body.payload || body.payLoad || {};

    console.log("[FAWATERAK_WEBHOOK_PAID] Parsed fields:", {
      invoice_key,
      invoice_status,
      invoice_total,
      payment_method,
      metaDataKeys: Object.keys(metaData),
      allBodyKeys: Object.keys(body),
    });

    if (!invoice_key) {
      console.error("[FAWATERAK_WEBHOOK_PAID] Missing invoice_key in payload");
      console.error("[FAWATERAK_WEBHOOK_PAID] Available keys:", Object.keys(body));
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
      console.error("[FAWATERAK_WEBHOOK_PAID] Full body:", JSON.stringify(body, null, 2));
      console.error("[FAWATERAK_WEBHOOK_PAID] metaData:", JSON.stringify(metaData, null, 2));
      console.error("[FAWATERAK_WEBHOOK_PAID] invoice_total:", invoice_total);
      console.error("[FAWATERAK_WEBHOOK_PAID] customer_phone:", customer_phone);
      
      // Try to find any pending payment with matching amount (last resort)
      if (invoice_total) {
        console.log("[FAWATERAK_WEBHOOK_PAID] Attempting last resort lookup by amount:", invoice_total);
        const amountPayments = await db.payment.findMany({
          where: {
            amount: parseFloat(invoice_total),
            status: "PENDING",
          },
          include: { user: true },
          orderBy: { createdAt: "desc" },
          take: 5, // Get last 5 pending payments with this amount
        });
        console.log("[FAWATERAK_WEBHOOK_PAID] Found pending payments with amount:", amountPayments.length);
        
        if (amountPayments.length > 0) {
          // Use the most recent one
          payment = amountPayments[0];
          await db.payment.update({
            where: { id: payment.id },
            data: { fawaterakInvoiceId: invoice_key },
          });
          console.log("[FAWATERAK_WEBHOOK_PAID] Using most recent pending payment:", payment.id);
        }
      }
      
      if (!payment) {
        return NextResponse.json(
          { 
            error: "Payment not found",
            invoice_key,
            invoice_total,
            metaData,
          },
          { status: 404 }
        );
      }
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
    const updatedUser = await db.user.update({
      where: { id: payment.userId },
      data: {
        balance: {
          increment: payment.amount,
        },
      },
      select: { balance: true },
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
      oldBalance: payment.user.balance,
      newBalance: updatedUser.balance,
    });

    return NextResponse.json({ 
      success: true,
      paymentId: payment.id,
      newBalance: updatedUser.balance,
    });
  } catch (error: any) {
    console.error("[FAWATERAK_WEBHOOK_PAID_ERROR]", error);
    console.error("[FAWATERAK_WEBHOOK_PAID_ERROR] Stack:", error?.stack);
    console.error("[FAWATERAK_WEBHOOK_PAID_ERROR] Message:", error?.message);
    
    // Return detailed error for debugging
    return NextResponse.json(
      { 
        error: "Internal Error",
        message: error?.message || "Unknown error",
        stack: process.env.NODE_ENV === "development" ? error?.stack : undefined,
      },
      { status: 500 }
    );
  }
}

