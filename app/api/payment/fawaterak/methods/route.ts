import { NextRequest, NextResponse } from "next/server";

const FAWATERAK_API_URL = process.env.FAWATERAK_API_URL || "https://staging.fawaterk.com/api/v2";
const FAWATERAK_API_KEY = process.env.FAWATERAK_API_KEY;
const FAWATERAK_PROVIDER_KEY = process.env.FAWATERAK_PROVIDER_KEY;

export async function GET(req: NextRequest) {
  try {
    if (!FAWATERAK_API_KEY || !FAWATERAK_PROVIDER_KEY) {
      return new NextResponse("Fawaterak credentials not configured", { status: 500 });
    }

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      Authorization: `Bearer ${FAWATERAK_API_KEY}`,
      "X-Provider-Key": FAWATERAK_PROVIDER_KEY,
    };

    const response = await fetch(`${FAWATERAK_API_URL}/getPaymentmethods`, {
      method: "GET",
      headers,
    });

    if (!response.ok) {
      let errorData;
      try {
        errorData = await response.json();
      } catch {
        errorData = await response.text();
      }
      console.error("[FAWATERAK_METHODS_ERROR]", {
        status: response.status,
        error: errorData,
      });
      return new NextResponse(
        JSON.stringify({ error: "Failed to fetch payment methods", details: errorData }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }

    const methods = await response.json();
    
    console.log("[FAWATERAK_METHODS_RESPONSE]", JSON.stringify(methods, null, 2));

    // Check if this is a request from the plugin (via proxy)
    // If so, return the raw Fawaterak response format
    const userAgent = req.headers.get("user-agent") || "";
    const referer = req.headers.get("referer") || "";
    
    // If request is from plugin proxy, return raw response
    if (referer.includes("payment-plugin") || req.headers.get("x-plugin-proxy")) {
      console.log("[FAWATERAK_METHODS] Returning raw response for plugin");
      return NextResponse.json(methods);
    }

    // Otherwise, return formatted response for our frontend
    // Map payment methods to Arabic names
    const paymentMethodsMap: Record<string, string> = {
      vodafone_cash: "Vodafone Cash",
      orange_cash: "Orange Cash",
      etisalat_cash: "Etisalat Cash",
      we_cash: "We Cash",
      fawry: "Fawry",
      meeza: "Meeza",
      visa: "Visa",
      mastercard: "Mastercard",
      // Arabic names
      "محافظ اليكترونية": "محافظ اليكترونية",
      "بطاقات الائتمان": "بطاقات الائتمان",
    };

    // Handle different response structures
    let methodsArray = [];
    if (Array.isArray(methods)) {
      methodsArray = methods;
    } else if (methods.data && Array.isArray(methods.data)) {
      methodsArray = methods.data;
    } else if (methods.payment_methods && Array.isArray(methods.payment_methods)) {
      methodsArray = methods.payment_methods;
    }

    // Filter and format payment methods with unique IDs
    const availableMethods = methodsArray.map((method: any, index: number) => {
      const methodId = method.id || method.payment_method_id || method.method_id || method.name || method.title || `method-${index}`;
      const methodName = method.name || method.title || method.payment_method_name || methodId;
      const methodIdLower = String(methodId || '').toLowerCase();
      const methodNameLower = String(methodName || '').toLowerCase();
      
      // Determine display name based on method ID or name
      let displayName = methodName;
      
      // Check for Arabic names first
      if (methodNameLower.includes('محافظ') || methodNameLower.includes('إلكترونية') || 
          methodIdLower.includes('wallet') || methodIdLower.includes('cash')) {
        if (methodIdLower.includes('vodafone') || methodIdLower.includes('orange') || 
            methodIdLower.includes('etisalat') || methodIdLower.includes('we')) {
          displayName = "محافظ اليكترونية";
        } else {
          displayName = "محافظ اليكترونية";
        }
      } else if (methodNameLower.includes('meeza') || methodNameLower.includes('visa') || 
                 methodNameLower.includes('mastercard') || methodNameLower.includes('بطاقات')) {
        displayName = "Meeza/Visa/Mastercard";
      } else if (methodNameLower.includes('fawry') || methodIdLower.includes('fawry')) {
        displayName = "Fawry";
      } else {
        // Use mapping or original name
        displayName = paymentMethodsMap[methodId] || paymentMethodsMap[methodName] || methodName || methodId;
      }

      // Ensure unique ID by appending index if needed
      const uniqueId = `${methodId}-${index}`;

      return {
        id: uniqueId,
        originalId: methodId, // Keep original for API calls
        name: displayName,
        icon: method.icon || method.image || method.logo || null,
        commission: method.commission || method.commission_percentage || method.fee || 0,
      };
    });

    return NextResponse.json({ methods: availableMethods });
  } catch (error) {
    console.error("[FAWATERAK_METHODS_ERROR]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}

