"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { CheckCircle2 } from "lucide-react";
import { useRouter } from "next/navigation";

function PaymentSuccessContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const paymentId = searchParams?.get("payment");
  const [countdown, setCountdown] = useState(5); // Increased to 5 seconds for better visibility

  useEffect(() => {
    // Store payment status in sessionStorage for cross-context communication
    if (paymentId && typeof sessionStorage !== 'undefined') {
      try {
        sessionStorage.setItem('fawaterak_payment_status', JSON.stringify({
          paymentId,
          status: 'success',
          timestamp: Date.now()
        }));
        console.log('[PAYMENT_SUCCESS] Stored payment status in sessionStorage');
      } catch (e) {
        console.error('[PAYMENT_SUCCESS] Failed to store in sessionStorage:', e);
      }
    }
  }, [paymentId]);

  useEffect(() => {
    // Countdown timer for redirect
    if (countdown > 0) {
      const timer = setTimeout(() => {
        setCountdown(prev => prev - 1);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [countdown]);

  useEffect(() => {
    // Redirect after countdown reaches 0
    if (countdown === 0) {
      const redirectUrl = `/dashboard/balance?payment=${paymentId}&status=success`;
      
      // Try various methods to redirect
      try {
        // Method 1: Try to access top window (works if same origin)
        if (window.top && window.top !== window) {
          window.top.location.href = redirectUrl;
        }
        // Method 2: Try parent (works in iframe)
        else if (window.parent !== window) {
          window.parent.location.href = redirectUrl;
        }
        // Method 3: Direct redirect
        else {
          window.location.href = redirectUrl;
        }
      } catch (e) {
        console.error('[PAYMENT_SUCCESS] Redirect error:', e);
        // Fallback to direct redirect
        window.location.href = redirectUrl;
      }
    }
  }, [countdown, paymentId]);

  useEffect(() => {
    // Notify parent window about successful payment immediately via postMessage
    if (typeof window !== "undefined") {
      // Try to send message to parent (works in same-origin iframe)
      if (window.parent !== window) {
        try {
          window.parent.postMessage(
            {
              type: "FAWATERAK_PAYMENT_SUCCESS",
              paymentId: paymentId,
            },
            "*"
          );
          console.log('[PAYMENT_SUCCESS] Sent postMessage to parent');
        } catch (e) {
          console.error('[PAYMENT_SUCCESS] postMessage error:', e);
        }
      }
      
      // Also try to send to top window
      if (window.top && window.top !== window) {
        try {
          window.top.postMessage(
            {
              type: "FAWATERAK_PAYMENT_SUCCESS",
              paymentId: paymentId,
            },
            "*"
          );
          console.log('[PAYMENT_SUCCESS] Sent postMessage to top');
        } catch (e) {
          console.error('[PAYMENT_SUCCESS] postMessage to top error:', e);
        }
      }
    }
  }, [paymentId]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-green-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-lg p-8 max-w-md w-full text-center">
        <CheckCircle2 className="h-16 w-16 text-green-500 mx-auto mb-4" />
        <h1 className="text-2xl font-bold text-gray-900 mb-2">تم إتمام عملية الدفع بنجاح</h1>
        <p className="text-gray-600 mb-4">
          سيتم تحديث رصيدك تلقائياً وإعادة توجيهك إلى صفحة الرصيد
        </p>
        <p className="text-sm text-gray-500 mb-4">
          جاري التوجيه خلال {countdown} ثوانٍ...
        </p>
        {paymentId && (
          <p className="text-xs text-gray-400">رقم العملية: {paymentId}</p>
        )}
      </div>
    </div>
  );
}

export default function PaymentSuccessPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-lg text-muted-foreground">جاري التحميل...</p>
        </div>
      </div>
    }>
      <PaymentSuccessContent />
    </Suspense>
  );
}

