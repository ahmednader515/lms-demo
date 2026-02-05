import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

const FAWATERAK_API_URL = process.env.FAWATERAK_API_URL || "https://staging.fawaterk.com/api/v2";
const FAWATERAK_API_KEY = process.env.FAWATERAK_API_KEY;
const FAWATERAK_PROVIDER_KEY = process.env.FAWATERAK_PROVIDER_KEY;

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ invoiceKey: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const resolvedParams = await params;
    const invoiceKey = resolvedParams.invoiceKey;

    if (!FAWATERAK_API_KEY || !FAWATERAK_PROVIDER_KEY) {
      return new NextResponse("Fawaterak credentials not configured", { status: 500 });
    }

    // Check payment in database first
    const payment = await db.payment.findUnique({
      where: { fawaterakInvoiceId: invoiceKey },
      include: { user: true },
    });

    if (!payment) {
      return new NextResponse("Payment not found", { status: 404 });
    }

    // Verify the payment belongs to the current user
    if (payment.userId !== session.user.id) {
      return new NextResponse("Unauthorized", { status: 403 });
    }

    // If already paid, return immediately
    if (payment.status === "PAID") {
      return NextResponse.json({
        status: "PAID",
        amount: payment.amount,
        alreadyProcessed: true,
      });
    }

    // Check with Fawaterak API
    try {
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
        Authorization: `Bearer ${FAWATERAK_API_KEY}`,
        "X-Provider-Key": FAWATERAK_PROVIDER_KEY,
      };

      const response = await fetch(`${FAWATERAK_API_URL}/getInvoiceDetails?invoice_key=${invoiceKey}`, {
        method: "GET",
        headers,
      });

      if (response.ok) {
        const invoiceData = await response.json();
        const invoiceStatus = invoiceData.data?.status || invoiceData.status || invoiceData.invoice_status;

        console.log("[FAWATERAK_CHECK]", {
          invoiceKey,
          invoiceStatus,
          invoiceData: JSON.stringify(invoiceData).substring(0, 200),
        });

        // If payment is successful, update database
        if (invoiceStatus === "paid" || invoiceStatus === "PAID" || invoiceStatus === "success" || invoiceStatus === "SUCCESS") {
          // Update payment status
          await db.payment.update({
            where: { id: payment.id },
            data: {
              status: "PAID",
              paymentMethod: invoiceData.data?.payment_method || invoiceData.payment_method || payment.paymentMethod,
            },
          });

          // Add balance to user account (only if not already added)
          if (payment.status !== "PAID") {
            await db.user.update({
              where: { id: payment.userId },
              data: {
                balance: {
                  increment: payment.amount,
                },
              },
            });

            // Create balance transaction record
            await db.balanceTransaction.create({
              data: {
                userId: payment.userId,
                amount: payment.amount,
                type: "DEPOSIT",
                description: `تم إضافة ${payment.amount} جنيه إلى الرصيد عبر Fawaterak`,
              },
            });

            console.log("[FAWATERAK_CHECK] Balance updated for payment:", payment.id);
          }

          return NextResponse.json({
            status: "PAID",
            amount: payment.amount,
            updated: true,
          });
        } else if (invoiceStatus === "failed" || invoiceStatus === "FAILED" || invoiceStatus === "cancelled" || invoiceStatus === "CANCELLED") {
          await db.payment.update({
            where: { id: payment.id },
            data: {
              status: invoiceStatus === "cancelled" || invoiceStatus === "CANCELLED" ? "CANCELLED" : "FAILED",
            },
          });

          return NextResponse.json({
            status: "FAILED",
            amount: payment.amount,
          });
        }

        // Still pending
        return NextResponse.json({
          status: "PENDING",
          amount: payment.amount,
        });
      }
    } catch (apiError) {
      console.error("[FAWATERAK_CHECK_API_ERROR]", apiError);
      // Fall back to database status
    }

    // Return database status if API check fails
    return NextResponse.json({
      status: payment.status,
      amount: payment.amount,
    });
  } catch (error) {
    console.error("[FAWATERAK_CHECK_ERROR]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}

