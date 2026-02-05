import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import crypto from "crypto";

const FAWATERAK_VENDOR_KEY = process.env.FAWATERAK_API_KEY;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    
    console.log("[FAWATERAK_WEBHOOK_PAID] Full payload:", JSON.stringify(body, null, 2));
    
    // Fawaterak paid webhook payload structure (from documentation)
    const invoice_key = body.invoice_key;
    const invoice_id = body.invoice_id;
    const payment_method = body.payment_method;
    const invoice_status = body.invoice_status;
    const pay_load = body.pay_load || body.payLoad || body.payload || body.metaData || body.metadata || {};
    const referenceNumber = body.referenceNumber;
    const received_hashKey = body.hashKey;
    
    // Validate required fields
    if (!invoice_key || !invoice_id || !payment_method) {
      console.error("[FAWATERAK_WEBHOOK_PAID] Missing required fields", {
        hasInvoiceKey: !!invoice_key,
        hasInvoiceId: !!invoice_id,
        hasPaymentMethod: !!payment_method,
      });
      return new NextResponse("Missing required fields", { status: 400 });
    }
    
    // Validate hashKey
    if (!FAWATERAK_VENDOR_KEY) {
      console.error("[FAWATERAK_WEBHOOK_PAID] FAWATERAK_API_KEY not configured");
      return new NextResponse("Server configuration error", { status: 500 });
    }
    
    // Generate hashKey for validation
    // Format: InvoiceId={invoice_id}&InvoiceKey={invoice_key}&PaymentMethod={payment_method}
    const queryParam = `InvoiceId=${invoice_id}&InvoiceKey=${invoice_key}&PaymentMethod=${payment_method}`;
    const expected_hashKey = crypto
      .createHmac('sha256', FAWATERAK_VENDOR_KEY)
      .update(queryParam)
      .digest('hex');
    
    // Validate hashKey
    if (received_hashKey !== expected_hashKey) {
      console.error("[FAWATERAK_WEBHOOK_PAID] Hash key validation failed", {
        received: received_hashKey?.substring(0, 20) + "...",
        expected: expected_hashKey.substring(0, 20) + "...",
        queryParam,
      });
      return new NextResponse("Invalid hash key", { status: 401 });
    }
    
    console.log("[FAWATERAK_WEBHOOK_PAID] Hash key validated successfully");
    
    // Parse pay_load if it's a string
    let metaData = pay_load;
    if (typeof pay_load === 'string') {
      try {
        metaData = JSON.parse(pay_load);
      } catch {
        metaData = {};
      }
    }

    console.log("[FAWATERAK_WEBHOOK_PAID] Parsed fields:", {
      invoice_key,
      invoice_id,
      invoice_status,
      payment_method,
      referenceNumber,
      metaDataKeys: Object.keys(metaData),
    });
    
    // Only process if status is "paid"
    if (invoice_status !== "paid" && invoice_status !== "Paid" && invoice_status !== "PAID") {
      console.log("[FAWATERAK_WEBHOOK_PAID] Invoice status is not paid:", invoice_status);
      return NextResponse.json({ success: true, message: "Status is not paid, ignoring" });
    }

    // Find payment by invoice key first
    let payment = await db.payment.findUnique({
      where: { fawaterakInvoiceId: invoice_key },
      include: { user: true },
    });

    // If not found by invoice key, try finding by paymentId in pay_load
    if (!payment && metaData?.paymentId) {
      console.log("[FAWATERAK_WEBHOOK_PAID] Looking up payment by paymentId from pay_load:", metaData.paymentId);
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

    if (!payment) {
      console.error("[FAWATERAK_WEBHOOK_PAID] Payment not found for invoice:", invoice_key);
      console.error("[FAWATERAK_WEBHOOK_PAID] Full body:", JSON.stringify(body, null, 2));
      console.error("[FAWATERAK_WEBHOOK_PAID] pay_load:", JSON.stringify(metaData, null, 2));
      
      return NextResponse.json(
        { 
          error: "Payment not found",
          invoice_key,
          invoice_id,
          pay_load: metaData,
        },
        { status: 404 }
      );
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

