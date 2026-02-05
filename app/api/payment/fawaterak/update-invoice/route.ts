import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const { paymentId, invoiceKey } = await req.json();

    if (!paymentId || !invoiceKey) {
      return new NextResponse("Missing paymentId or invoiceKey", { status: 400 });
    }

    // Update payment with invoice key
    const payment = await db.payment.update({
      where: { id: paymentId },
      data: { fawaterakInvoiceId: invoiceKey },
    });

    // Verify payment belongs to user
    if (payment.userId !== session.user.id) {
      return new NextResponse("Unauthorized", { status: 403 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[FAWATERAK_UPDATE_INVOICE_ERROR]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}

