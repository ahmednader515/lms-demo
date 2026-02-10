import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

const FAWATERAK_API_URL = process.env.FAWATERAK_API_URL || "https://staging.fawaterk.com/api/v2";
const FAWATERAK_API_KEY = process.env.FAWATERAK_API_KEY;
const FAWATERAK_PROVIDER_KEY = process.env.FAWATERAK_PROVIDER_KEY;

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ paymentId: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const resolvedParams = await params;
    const paymentId = resolvedParams.paymentId;

    const payment = await db.payment.findUnique({
      where: { id: paymentId },
      include: { user: true },
    });

    if (!payment) {
      return new NextResponse("Payment not found", { status: 404 });
    }

    // Verify the payment belongs to the current user
    if (payment.userId !== session.user.id) {
      return new NextResponse("Unauthorized", { status: 403 });
    }

    // If payment has invoice key, check with Fawaterak API to verify status
    if (payment.fawaterakInvoiceId && FAWATERAK_API_KEY && FAWATERAK_PROVIDER_KEY) {
      try {
        const headers: Record<string, string> = {
          "Content-Type": "application/json",
          Authorization: `Bearer ${FAWATERAK_API_KEY}`,
          "X-Provider-Key": FAWATERAK_PROVIDER_KEY,
        };

        const response = await fetch(`${FAWATERAK_API_URL}/getInvoiceDetails?invoice_key=${payment.fawaterakInvoiceId}`, {
          method: "GET",
          headers,
        });

        if (response.ok) {
          const invoiceData = await response.json();
          const invoiceStatus = invoiceData.data?.status || invoiceData.status || invoiceData.invoice_status;

          // If payment is successful, update database
          if (invoiceStatus === "paid" || invoiceStatus === "PAID" || invoiceStatus === "success" || invoiceStatus === "SUCCESS") {
            // Update payment status if not already PAID
            if (payment.status !== "PAID") {
              await db.payment.update({
                where: { id: payment.id },
                data: {
                  status: "PAID",
                  paymentMethod: invoiceData.data?.payment_method || invoiceData.payment_method || payment.paymentMethod,
                },
              });

              // Add balance to user account
              const updatedUser = await db.user.update({
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

              console.log("[PAYMENT_STATUS] Balance updated for payment:", payment.id, "New balance:", updatedUser.balance);
            }

            // Refresh payment data
            const updatedPayment = await db.payment.findUnique({
              where: { id: paymentId },
            });

            return NextResponse.json({
              id: updatedPayment?.id || payment.id,
              amount: updatedPayment?.amount || payment.amount,
              status: "PAID",
              paymentMethod: updatedPayment?.paymentMethod || payment.paymentMethod,
              createdAt: updatedPayment?.createdAt || payment.createdAt,
              updatedAt: updatedPayment?.updatedAt || payment.updatedAt,
            });
          } else if (invoiceStatus === "failed" || invoiceStatus === "FAILED" || invoiceStatus === "cancelled" || invoiceStatus === "CANCELLED") {
            await db.payment.update({
              where: { id: payment.id },
              data: {
                status: invoiceStatus === "cancelled" || invoiceStatus === "CANCELLED" ? "CANCELLED" : "FAILED",
              },
            });

            return NextResponse.json({
              id: payment.id,
              amount: payment.amount,
              status: "FAILED",
              paymentMethod: payment.paymentMethod,
              createdAt: payment.createdAt,
              updatedAt: payment.updatedAt,
            });
          }
        }
      } catch (apiError) {
        console.error("[PAYMENT_STATUS_API_ERROR]", apiError);
        // Fall through to return database status
      }
    }

    return NextResponse.json({
      id: payment.id,
      amount: payment.amount,
      status: payment.status,
      paymentMethod: payment.paymentMethod,
      createdAt: payment.createdAt,
      updatedAt: payment.updatedAt,
    });
  } catch (error) {
    console.error("[PAYMENT_STATUS_ERROR]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}

