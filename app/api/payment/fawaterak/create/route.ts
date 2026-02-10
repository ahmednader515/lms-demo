import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

const FAWATERAK_API_URL = process.env.FAWATERAK_API_URL || "https://staging.fawaterk.com/api/v2";
const FAWATERAK_API_KEY = process.env.FAWATERAK_API_KEY;
const FAWATERAK_PROVIDER_KEY = process.env.FAWATERAK_PROVIDER_KEY;

export async function POST(req: NextRequest) {
  try {
    // Check if this is a plugin proxy request
    const isPluginProxy = req.headers.get("x-plugin-proxy") === "true";
    
    if (isPluginProxy) {
      // For plugin proxy requests, we need to extract data from the plugin's request body
      // The plugin sends the full invoice data structure
      const pluginData = await req.json();
      console.log("[FAWATERAK_CREATE] Plugin proxy request:", JSON.stringify(pluginData, null, 2));
      
      // Extract amount from plugin data (might be in different locations)
      const amount = parseFloat(pluginData.cartTotal || pluginData.amount || pluginData.requestBody?.cartTotal || "0");
      
      if (!amount || amount <= 0) {
        return new NextResponse(JSON.stringify({ 
          status: "error", 
          message: { amount: ["Invalid amount"] } 
        }), { status: 400, headers: { "Content-Type": "application/json" } });
      }
      
      // Get user session (plugin should have authenticated user)
      const session = await auth();
      if (!session?.user?.id) {
        return new NextResponse(JSON.stringify({ 
          status: "error", 
          message: { token: ["Unauthorized"] } 
        }), { status: 401, headers: { "Content-Type": "application/json" } });
      }
      
      // Use the plugin's data structure directly, but we'll need to adapt it
      // For now, let's create the invoice using our existing logic but with plugin data
      const user = await db.user.findUnique({
        where: { id: session.user.id },
      });

      if (!user) {
        return new NextResponse(JSON.stringify({ 
          status: "error", 
          message: { user: ["User not found"] } 
        }), { status: 404, headers: { "Content-Type": "application/json" } });
      }

      // Cancel any existing pending payments
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

      // Create payment record
      const payment = await db.payment.create({
        data: {
          userId: session.user.id,
          amount,
          paymentMethod: pluginData.payment_method_id || null,
          status: "PENDING",
        },
      });

      // Use plugin's invoice data structure, but ensure required fields are present
      const invoiceData = {
        ...pluginData,
        // Ensure we have the required fields
        customer: pluginData.customer || {
          first_name: user.fullName?.split(' ')[0] || "User",
          last_name: user.fullName?.split(' ').slice(1).join(' ') || "",
          email: `${user.phoneNumber}@lms.local`,
          phone: user.phoneNumber || "",
        },
        cartTotal: amount.toString(),
        // Add unique reference to prevent reuse
        invoice_reference: `PLUGIN-${payment.id}-${Date.now()}`,
        order_reference: `PLUGIN-${payment.id}-${Date.now()}`,
      };

      // Make API call to Fawaterak
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${FAWATERAK_API_KEY}`,
        "X-Provider-Key": FAWATERAK_PROVIDER_KEY,
      };

      // Check which endpoint was requested (from query param or header)
      const requestedEndpoint = req.nextUrl.searchParams.get("endpoint") || "createInvoiceLink";
      
      // Use invoiceInitPay if that's what the plugin requested
      const apiEndpoint = requestedEndpoint.includes("invoiceInitPay") ? "invoiceInitPay" : "createInvoiceLink";
      
      console.log("[FAWATERAK_CREATE] Calling Fawaterak API endpoint:", apiEndpoint);
      
      const response = await fetch(`${FAWATERAK_API_URL}/${apiEndpoint}`, {
        method: "POST",
        headers,
        body: JSON.stringify(invoiceData),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error("[FAWATERAK_CREATE] Plugin proxy error:", errorText);
        return new NextResponse(errorText, {
          status: response.status,
          headers: { "Content-Type": "application/json" },
        });
      }

      const invoiceResponse = await response.json();
      
      // Update payment with invoice details
      const invoiceKey = invoiceResponse.data?.invoiceKey || invoiceResponse.data?.invoice_key || invoiceResponse.invoiceKey || invoiceResponse.invoice_key;
      const invoiceUrl = invoiceResponse.data?.invoiceUrl || invoiceResponse.data?.invoice_url || invoiceResponse.invoiceUrl || invoiceResponse.invoice_url;
      const frameUrl = invoiceResponse.data?.frame_url || invoiceResponse.data?.frameUrl;

      if (invoiceKey) {
        try {
          // Check if this invoice key already exists for another payment
          const existingPayment = await db.payment.findUnique({
            where: { fawaterakInvoiceId: invoiceKey },
            select: { id: true },
          });

          if (existingPayment && existingPayment.id !== payment.id) {
            console.warn("[FAWATERAK_CREATE] Invoice key already exists for another payment:", {
              invoiceKey,
              existingPaymentId: existingPayment.id,
              currentPaymentId: payment.id,
            });
            // Don't update if it belongs to another payment - just log and continue
          } else {
            // Safe to update
            await db.payment.update({
              where: { id: payment.id },
              data: {
                fawaterakInvoiceId: invoiceKey,
                fawaterakInvoiceUrl: frameUrl || invoiceUrl,
              },
            });
          }
        } catch (updateError: any) {
          // Handle unique constraint violation gracefully
          if (updateError.code === 'P2002') {
            console.warn("[FAWATERAK_CREATE] Invoice key already exists, skipping update:", {
              invoiceKey,
              paymentId: payment.id,
            });
            // Try to update just the URL without the invoice ID
            try {
              await db.payment.update({
                where: { id: payment.id },
                data: {
                  fawaterakInvoiceUrl: frameUrl || invoiceUrl,
                },
              });
            } catch (urlUpdateError) {
              console.error("[FAWATERAK_CREATE] Failed to update invoice URL:", urlUpdateError);
            }
          } else {
            throw updateError; // Re-throw if it's a different error
          }
        }
      }

      // Return response in format plugin expects
      return NextResponse.json(invoiceResponse);
    }
    
    // Original logic for non-plugin requests
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

    console.log("[FAWATERAK_CREATE_RESPONSE]", JSON.stringify(invoiceResponse, null, 2));

    // Fawaterak response uses camelCase: invoiceKey, invoiceId (not snake_case)
    const invoiceKey = invoiceResponse.data?.invoiceKey || invoiceResponse.data?.invoice_key || invoiceResponse.invoiceKey || invoiceResponse.invoice_key;
    const invoiceUrl = invoiceResponse.data?.url || invoiceResponse.url;
    const invoiceId = invoiceResponse.data?.invoiceId || invoiceResponse.data?.invoice_id || invoiceResponse.invoiceId || invoiceResponse.invoice_id;
    
    // For iframe embedding, Fawaterak uses the same invoice URL
    // The URL format is: https://staging.fawaterk.com/invoice/{invoice_id}/{invoice_key}
    // This should work in iframe if domain is whitelisted in Fawaterak dashboard
    // The invoice URL should be iframe-compatible when domain is configured
    
    let iframeUrl = invoiceUrl;
    
    // Check if there's a specific frame_url in the response
    if (invoiceResponse.data?.frame_url || invoiceResponse.frame_url) {
      iframeUrl = invoiceResponse.data?.frame_url || invoiceResponse.frame_url;
    } else if (invoiceUrl && invoiceKey) {
      // Use the invoice URL as-is - it should work in iframe if domain is configured
      iframeUrl = invoiceUrl;
    }

    console.log("[FAWATERAK_CREATE] Invoice URLs:", {
      invoiceUrl,
      iframeUrl,
      invoiceKey,
      invoiceId,
      note: "Iframe URL should work if domain is configured in Fawaterak dashboard",
    });

    // Update payment with invoice details
    try {
      if (invoiceKey) {
        // Check if this invoice key already exists for another payment
        const existingPayment = await db.payment.findUnique({
          where: { fawaterakInvoiceId: invoiceKey },
          select: { id: true },
        });

        if (existingPayment && existingPayment.id !== payment.id) {
          console.warn("[FAWATERAK_CREATE] Invoice key already exists for another payment:", {
            invoiceKey,
            existingPaymentId: existingPayment.id,
            currentPaymentId: payment.id,
          });
          // Only update the URL, not the invoice ID
          await db.payment.update({
            where: { id: payment.id },
            data: {
              fawaterakInvoiceUrl: invoiceUrl || null,
            },
          });
        } else {
          // Safe to update both
          await db.payment.update({
            where: { id: payment.id },
            data: {
              fawaterakInvoiceId: invoiceKey,
              fawaterakInvoiceUrl: invoiceUrl || null,
            },
          });
        }
      } else {
        // No invoice key, just update URL
        await db.payment.update({
          where: { id: payment.id },
          data: {
            fawaterakInvoiceUrl: invoiceUrl || null,
          },
        });
      }
    } catch (updateError: any) {
      // Handle unique constraint violation gracefully
      if (updateError.code === 'P2002') {
        console.warn("[FAWATERAK_CREATE] Invoice key already exists, updating URL only:", {
          invoiceKey,
          paymentId: payment.id,
        });
        // Try to update just the URL without the invoice ID
        try {
          await db.payment.update({
            where: { id: payment.id },
            data: {
              fawaterakInvoiceUrl: invoiceUrl || null,
            },
          });
        } catch (urlUpdateError) {
          console.error("[FAWATERAK_CREATE] Failed to update invoice URL:", urlUpdateError);
        }
      } else {
        throw updateError; // Re-throw if it's a different error
      }
    }

    console.log("[FAWATERAK_CREATE] Payment updated:", {
      paymentId: payment.id,
      invoiceKey,
      invoiceUrl,
    });

    return NextResponse.json({
      success: true,
      paymentId: payment.id,
      invoiceUrl: iframeUrl, // Return URL for iframe embedding
      invoiceKey: invoiceKey,
      invoiceId: invoiceId,
    });
  } catch (error) {
    console.error("[FAWATERAK_CREATE_ERROR]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}

