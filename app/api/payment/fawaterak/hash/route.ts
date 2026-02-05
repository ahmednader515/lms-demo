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

    // Generate hashKey using HMAC SHA256
    // Format: Domain=YOUR_WEBSITE_DOMAIN&ProviderKey=FAWATERAK_PROVIDER_KEY
    // Note: Domain should be just the hostname (no protocol, no port, no path)
    const url = new URL(NEXT_PUBLIC_APP_URL);
    const domain = url.hostname; // Just the hostname, no port
    const queryParam = `Domain=${domain}&ProviderKey=${FAWATERAK_PROVIDER_KEY}`;
    const hashKey = crypto
      .createHmac('sha256', FAWATERAK_VENDOR_KEY)
      .update(queryParam)
      .digest('hex');
    
    console.log("[FAWATERAK_HASH]", {
      domain,
      queryParam,
      hashKeyPrefix: hashKey.substring(0, 20) + "...",
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

