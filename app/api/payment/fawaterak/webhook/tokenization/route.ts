import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    
    console.log("[FAWATERAK_WEBHOOK_TOKENIZATION]", JSON.stringify(body, null, 2));
    
    // Fawaterak tokenization webhook payload structure
    // This is typically used for saving payment methods for future use
    const {
      invoice_key,
      token,
      customer_id,
      payment_method,
      metaData,
    } = body;

    // Tokenization webhook is informational - we log it but don't need to update balance
    console.log("[FAWATERAK_WEBHOOK_TOKENIZATION] Tokenization event received:", {
      invoiceKey: invoice_key,
      token: token ? "***" : null,
      customerId: customer_id,
      paymentMethod: payment_method,
    });

    // If you want to store tokens for future use, you can add that logic here
    // For now, we just acknowledge receipt

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[FAWATERAK_WEBHOOK_TOKENIZATION_ERROR]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}

