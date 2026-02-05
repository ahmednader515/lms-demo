import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

const FAWATERAK_API_URL = process.env.FAWATERAK_API_URL || "https://staging.fawaterk.com/api/v2";
const FAWATERAK_API_KEY = process.env.FAWATERAK_API_KEY;
const FAWATERAK_PROVIDER_KEY = process.env.FAWATERAK_PROVIDER_KEY;

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const { amount, paymentMethod, paymentDetails } = await req.json();

    if (!amount || amount <= 0) {
      return new NextResponse("Invalid amount", { status: 400 });
    }

    if (!FAWATERAK_API_KEY || !FAWATERAK_PROVIDER_KEY) {
      console.error("[FAWATERAK_CONFIG]", {
        hasApiKey: !!FAWATERAK_API_KEY,
        hasProviderKey: !!FAWATERAK_PROVIDER_KEY,
        apiKeyLength: FAWATERAK_API_KEY?.length,
        providerKey: FAWATERAK_PROVIDER_KEY,
      });
      return new NextResponse("Fawaterak credentials not configured", { status: 500 });
    }

    console.log("[FAWATERAK_REQUEST]", {
      url: `${FAWATERAK_API_URL}/createInvoiceLink`,
      apiKeyPrefix: FAWATERAK_API_KEY?.substring(0, 10) + "...",
      providerKey: FAWATERAK_PROVIDER_KEY,
    });

    // Get user details
    const user = await db.user.findUnique({
      where: { id: session.user.id },
    });

    if (!user) {
      return new NextResponse("User not found", { status: 404 });
    }

    // Cancel any existing pending payments for this user with the same amount
    // This prevents reusing old invoices
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

    // Create payment record with unique timestamp to ensure uniqueness
    const payment = await db.payment.create({
      data: {
        userId: session.user.id,
        amount,
        paymentMethod: paymentMethod || null,
        status: "PENDING",
      },
    });

    // Split full name into first and last name for Fawaterak API
    const nameParts = user.fullName.trim().split(/\s+/);
    const firstName = nameParts[0] || user.fullName;
    const lastName = nameParts.slice(1).join(' ') || '';

    // Create unique reference number for this invoice to prevent reuse
    // Use payment ID + timestamp + random to ensure absolute uniqueness
    const timestamp = Date.now();
    const randomSuffix = Math.random().toString(36).substring(2, 9);
    const uniqueReference = `PAY-${payment.id}-${timestamp}-${randomSuffix}`;

    // Create Fawaterak invoice with unique data to prevent caching/reuse
    const invoiceData: any = {
      cartTotal: amount,
      currency: "EGP",
      customer: {
        first_name: firstName,
        last_name: lastName,
        phone: user.phoneNumber,
        email: `${user.phoneNumber}+${timestamp}@lms.local`, // Unique email to prevent reuse
      },
      cartItems: [
        {
          name: `إضافة رصيد - ${uniqueReference}`,
          price: amount,
          quantity: 1,
        },
      ],
      redirectUrl: `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/dashboard/balance?payment=${payment.id}&ref=${uniqueReference}`,
      webhookUrl: `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/api/payment/fawaterak/webhook/paid`,
      metaData: {
        paymentId: payment.id,
        userId: session.user.id,
        reference: uniqueReference,
        timestamp: new Date().toISOString(),
        createdAt: timestamp,
      },
      // Add order reference if Fawaterak supports it
      order_reference: uniqueReference,
      // Add invoice reference/description to make it unique
      invoice_reference: uniqueReference,
    };

    // Add payment method if specified
    if (paymentMethod) {
      invoiceData.payment_method_id = paymentMethod;
    }

    // Fawaterak API authentication - try different formats
    // Based on error "Token Is Missing", try Bearer format
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${FAWATERAK_API_KEY}`,
      "X-Provider-Key": FAWATERAK_PROVIDER_KEY,
    };

    console.log("[FAWATERAK_REQUEST_BODY]", JSON.stringify(invoiceData, null, 2));
    console.log("[FAWATERAK_HEADERS]", {
      Authorization: FAWATERAK_API_KEY?.substring(0, 20) + "...",
      "X-Provider-Key": FAWATERAK_PROVIDER_KEY,
    });

    // Try createInvoiceLink endpoint
    let response = await fetch(`${FAWATERAK_API_URL}/createInvoiceLink`, {
      method: "POST",
      headers,
      body: JSON.stringify(invoiceData),
    });

    // Handle response
    if (!response.ok) {
      // Read error response body as text first, then parse as JSON if possible
      let errorData: any;
      try {
        const errorText = await response.text();
        try {
          errorData = JSON.parse(errorText);
        } catch {
          errorData = errorText;
        }
      } catch {
        errorData = "Unable to read error response";
      }

      // Log error details
      console.error("[FAWATERAK_ERROR]", {
        status: response.status,
        statusText: response.statusText,
        error: typeof errorData === 'string' ? errorData : JSON.stringify(errorData, null, 2),
        errorMessage: errorData?.message,
        tokenErrors: errorData?.message?.token,
      });

      // If 400 error, try alternative endpoint
      if (response.status === 400) {
        console.log("[FAWATERAK] Trying alternative endpoint: createInvoice");
        const altResponse = await fetch(`${FAWATERAK_API_URL}/createInvoice`, {
          method: "POST",
          headers,
          body: JSON.stringify(invoiceData),
        });

        // If alternative endpoint succeeded, use that response
        if (altResponse.ok) {
          response = altResponse;
        } else {
          // Alternative also failed, read its error
          try {
            const errorText = await altResponse.text();
            try {
              errorData = JSON.parse(errorText);
            } catch {
              errorData = errorText;
            }
          } catch {
            errorData = "Unable to read error response";
          }
          console.error("[FAWATERAK_ERROR_ALT]", {
            status: altResponse.status,
            error: typeof errorData === 'string' ? errorData : JSON.stringify(errorData, null, 2),
          });
          
          // Update payment status to failed
          await db.payment.update({
            where: { id: payment.id },
            data: { status: "FAILED" },
          });

          return new NextResponse(
            JSON.stringify({ 
              error: "Failed to create Fawaterak invoice", 
              details: errorData 
            }), 
            { 
              status: 500,
              headers: { "Content-Type": "application/json" }
            }
          );
        }
      } else {
        // Non-400 error, don't try alternative endpoint
        // Update payment status to failed
        await db.payment.update({
          where: { id: payment.id },
          data: { status: "FAILED" },
        });

        return new NextResponse(
          JSON.stringify({ 
            error: "Failed to create Fawaterak invoice", 
            details: errorData 
          }), 
          { 
            status: 500,
            headers: { "Content-Type": "application/json" }
          }
        );
      }
    }

    // If we reach here, response is ok (either original or alternative endpoint succeeded)
    const invoiceResponse = await response.json();

    // Update payment with invoice details
    await db.payment.update({
      where: { id: payment.id },
      data: {
        fawaterakInvoiceId: invoiceResponse.data?.invoice_key || invoiceResponse.invoice_key || null,
        fawaterakInvoiceUrl: invoiceResponse.data?.url || invoiceResponse.url || null,
      },
    });

    return NextResponse.json({
      success: true,
      paymentId: payment.id,
      invoiceUrl: invoiceResponse.data?.url || invoiceResponse.url,
      invoiceKey: invoiceResponse.data?.invoice_key || invoiceResponse.invoice_key,
    });
  } catch (error) {
    console.error("[FAWATERAK_CREATE_ERROR]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}

