import { NextResponse } from "next/server";

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const searchParams = new URLSearchParams(url.search);
    const purchaseId = searchParams.get("purchaseId");
    const courseId = searchParams.get("courseId");

    if (!purchaseId || !courseId) {
      return new NextResponse("Missing required parameters", { status: 400 });
    }

    // Redirect to the payment status page
    return NextResponse.redirect(
      new URL(`/courses/${courseId}/payment-status?purchaseId=${purchaseId}&courseId=${courseId}`, req.url)
    );
  } catch (error) {
    console.error("[PAYMENT_REDIRECT] Error:", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const url = new URL(req.url);
    const searchParams = new URLSearchParams(url.search);
    const purchaseId = searchParams.get("purchaseId");
    const courseId = searchParams.get("courseId");

    if (!purchaseId || !courseId) {
      return new NextResponse("Missing required parameters", { status: 400 });
    }

    // For POST requests, return a 307 Temporary Redirect
    // This will preserve the POST method when redirecting
    return NextResponse.redirect(
      new URL(`/courses/${courseId}/payment-status?purchaseId=${purchaseId}&courseId=${courseId}`, req.url),
      { status: 307 }
    );
  } catch (error) {
    console.error("[PAYMENT_REDIRECT] Error:", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
} 