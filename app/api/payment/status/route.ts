import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const url = new URL(req.url);
    const searchParams = new URLSearchParams(url.search);
    const purchaseId = searchParams.get("purchaseId");
    const courseId = searchParams.get("courseId");

    if (!purchaseId || !courseId) {
      return new NextResponse("Missing required parameters", { status: 400 });
    }

    // Return a 303 See Other redirect to the payment status page
    // This will change the request method to GET
    return NextResponse.redirect(
      new URL(`/courses/${courseId}/payment-status?purchaseId=${purchaseId}&courseId=${courseId}`, req.url),
      { status: 303 }
    );
  } catch (error) {
    console.error("[PAYMENT_STATUS] Error:", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
} 