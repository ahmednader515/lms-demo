import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import crypto from "crypto";

const FAWATERAK_VENDOR_KEY = process.env.FAWATERAK_API_KEY;
const FAWATERAK_PROVIDER_KEY = process.env.FAWATERAK_PROVIDER_KEY;
const NEXT_PUBLIC_APP_URL = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    if (!FAWATERAK_VENDOR_KEY || !FAWATERAK_PROVIDER_KEY) {
      return new NextResponse("Fawaterak credentials not configured", { status: 500 });
    }

    // Get domain from request headers (more reliable for production)
    // This works better with Vercel and other hosting platforms
    const host = req.headers.get("host") || req.headers.get("x-forwarded-host");
    
    // Extract domain from host header (removes port if present)
    let domain: string;
    if (host) {
      // Remove port if present (e.g., "lms-demo-phi.vercel.app:3000" -> "lms-demo-phi.vercel.app")
      domain = host.split(":")[0];
      
      // For localhost, normalize to just "localhost"
      if (domain === "localhost" || domain.startsWith("127.0.0.1")) {
        domain = "localhost";
      }
    } else {
      // Fallback to environment variable
      try {
        const url = new URL(NEXT_PUBLIC_APP_URL);
        domain = url.hostname;
        if (domain === "localhost" || domain.startsWith("127.0.0.1")) {
          domain = "localhost";
        }
      } catch {
        domain = NEXT_PUBLIC_APP_URL.replace(/^https?:\/\//, "").replace(/:\d+/, "").split("/")[0];
        if (domain === "localhost" || domain.startsWith("127.0.0.1")) {
          domain = "localhost";
        }
      }
    }
    
    // Generate hashKey using HMAC SHA256
    // Format: Domain=YOUR_WEBSITE_DOMAIN&ProviderKey=FAWATERAK_PROVIDER_KEY
    // Note: Domain should be just the hostname (no protocol, no port, no path)
    
    const queryParam = `Domain=${domain}&ProviderKey=${FAWATERAK_PROVIDER_KEY}`;
    const hashKey = crypto
      .createHmac('sha256', FAWATERAK_VENDOR_KEY)
      .update(queryParam)
      .digest('hex');
    
    console.log("[FAWATERAK_HASH]", {
      host,
      domain,
      providerKey: FAWATERAK_PROVIDER_KEY,
      queryParam,
      hashKeyPrefix: hashKey.substring(0, 20) + "...",
      vendorKeyPrefix: FAWATERAK_VENDOR_KEY?.substring(0, 10) + "...",
    });

    return NextResponse.json({
      hashKey,
      domain,
    });
  } catch (error) {
    console.error("[FAWATERAK_HASH_ERROR]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}

