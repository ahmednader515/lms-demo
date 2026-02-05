"use client";

import { useState, useEffect, useRef, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { ArrowLeft, Loader2 } from "lucide-react";
import Image from "next/image";
import { getCdnUrl } from "@/lib/cdn";

// Declare Fawaterak plugin types
declare global {
  interface Window {
    fawaterkCheckout?: (config: any) => void;
    $?: any; // jQuery
  }
  var fawaterkCheckout: ((config: any) => void) | undefined;
}

function FawaterakPluginPaymentPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { data: session } = useSession();
  const [amount, setAmount] = useState<string>("");
  const [isLoading, setIsLoading] = useState(true);
  const [isInitializing, setIsInitializing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const pluginInitialized = useRef(false);
  const scriptLoaded = useRef(false);

  // Get amount from URL query params
  useEffect(() => {
    const amountParam = searchParams.get("amount");
    if (amountParam) {
      setAmount(amountParam);
    }
  }, [searchParams]);

  // Load jQuery and Fawaterak plugin script
  useEffect(() => {
    if (scriptLoaded.current) return;

    // Load jQuery first (required by Fawaterak plugin)
    const jqueryScript = document.createElement("script");
    jqueryScript.src = "https://staging.fawaterk.com/assets_new/vendor/jquery/dist/jquery.min.js";
    jqueryScript.async = true;
    
    jqueryScript.onload = () => {
      console.log("[FAWATERAK_PLUGIN] jQuery loaded successfully");
      
      // Load Fawaterak plugin after jQuery is loaded (using staging URL)
      const pluginScript = document.createElement("script");
      pluginScript.src = "https://staging.fawaterk.com/fawaterkPlugin/fawaterkPlugin.min.js?v=1.2";
      pluginScript.async = true;
      pluginScript.onload = () => {
        console.log("[FAWATERAK_PLUGIN] Plugin script loaded successfully");
        scriptLoaded.current = true;
        setIsLoading(false);
      };
      pluginScript.onerror = () => {
        console.error("[FAWATERAK_PLUGIN] Failed to load plugin script");
        setError("فشل تحميل نظام الدفع");
        setIsLoading(false);
      };
      document.body.appendChild(pluginScript);
    };
    
    jqueryScript.onerror = () => {
      console.error("[FAWATERAK_PLUGIN] Failed to load jQuery");
      setError("فشل تحميل مكتبة jQuery المطلوبة");
      setIsLoading(false);
    };
    
    document.body.appendChild(jqueryScript);

    return () => {
      // Cleanup scripts if component unmounts
      const existingJQuery = document.querySelector('script[src*="jquery.min.js"]');
      const existingPlugin = document.querySelector('script[src*="fawaterkPlugin"]');
      if (existingJQuery) existingJQuery.remove();
      if (existingPlugin) existingPlugin.remove();
    };
  }, []);

  // Initialize plugin when script is loaded and amount is available
  useEffect(() => {
    if (!scriptLoaded.current || !amount || pluginInitialized.current || isInitializing) return;
    if (!session?.user?.id) return;

    const initializePlugin = async () => {
      setIsInitializing(true);
      setError(null);

      try {
        // Get hash key
        const hashResponse = await fetch("/api/payment/fawaterak/hash", {
          method: "POST",
        });
        if (!hashResponse.ok) {
          const errorText = await hashResponse.text();
          console.error("[FAWATERAK_PLUGIN] Hash API error:", errorText);
          throw new Error(`Failed to get hash key: ${errorText}`);
        }
        const { hashKey, domain } = await hashResponse.json();
        
        if (!hashKey) {
          throw new Error("Hash key is empty");
        }
        
        console.log("[FAWATERAK_PLUGIN] Hash key received:", {
          domain,
          hashKeyPrefix: hashKey.substring(0, 20) + "...",
        });

        // Get user data
        const userResponse = await fetch("/api/user/me");
        if (!userResponse.ok) {
          throw new Error("Failed to get user data");
        }
        const user = await userResponse.json();

        // Split full name into first and last name
        const nameParts = (user.fullName || "").trim().split(/\s+/);
        const firstName = nameParts[0] || user.fullName || "User";
        const lastName = nameParts.slice(1).join(" ") || "";

        // Create payment record first
        const paymentResponse = await fetch("/api/payment/fawaterak/prepare", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            amount: parseFloat(amount),
          }),
        });

        if (!paymentResponse.ok) {
          throw new Error("Failed to create payment record");
        }
        const { paymentId } = await paymentResponse.json();

        // Prepare plugin configuration (matching Fawaterak example)
        // Using staging environment - make sure domain is configured in Fawaterak staging dashboard
        const baseUrl = process.env.NEXT_PUBLIC_APP_URL || window.location.origin;
        const pluginConfig = {
          envType: "test", // Always use "test" for staging.fawaterk.com
          hashKey: hashKey,
          style: {
            listing: "horizontal", // "horizontal" or "vertical"
          },
          // version: "1", // Optional, commented out as in example
          requestBody: {
            cartTotal: parseFloat(amount).toString(),
            currency: "EGP",
            redirectOutIframe: false, // Keep payment in iframe, don't redirect out
            customer: {
              customer_unique_id: session.user.id, // User ID as unique identifier
              first_name: firstName,
              last_name: lastName,
              email: user.email || `${user.phoneNumber}@lms.local`,
              phone: user.phoneNumber || "",
              address: "",
            },
            redirectionUrls: {
              successUrl: `${baseUrl}/dashboard/balance?payment=${paymentId}&status=success`,
              failUrl: `${baseUrl}/dashboard/balance?payment=${paymentId}&status=fail`,
              pendingUrl: `${baseUrl}/dashboard/balance?payment=${paymentId}&status=pending`,
            },
            webhookUrl: `${baseUrl}/api/payment/fawaterak/webhook/paid`,
            cartItems: [
              {
                name: `إضافة رصيد - ${paymentId}`,
                price: parseFloat(amount).toString(),
                quantity: "1",
              },
            ],
            deduct_total_amount: 1, // Deduct total amount
            payLoad: {
              paymentId: paymentId,
              userId: session.user.id,
              timestamp: new Date().toISOString(),
            },
          },
        };

        console.log("[FAWATERAK_PLUGIN] Initializing plugin with config:", {
          ...pluginConfig,
          hashKey: hashKey.substring(0, 20) + "...", // Log partial hash for security
        });

        // Wait a bit for the plugin script and jQuery to be fully ready
        setTimeout(() => {
          // Make pluginConfig available globally (plugin might access it from global scope)
          (window as any).pluginConfig = pluginConfig;
          
          // Try both window.fawaterkCheckout and global fawaterkCheckout
          const fawaterkCheckoutFn = (window as any).fawaterkCheckout || (globalThis as any).fawaterkCheckout;
          
          if (typeof fawaterkCheckoutFn === 'function') {
            try {
              console.log("[FAWATERAK_PLUGIN] Calling fawaterkCheckout with config");
              
              // Call the plugin function directly (matching the example)
              // The plugin might access pluginConfig from global scope
              fawaterkCheckoutFn(pluginConfig);
              pluginInitialized.current = true;
              console.log("[FAWATERAK_PLUGIN] Plugin initialized successfully");
              setIsInitializing(false);
            } catch (err: any) {
              console.error("[FAWATERAK_PLUGIN] Error initializing plugin:", err);
              console.error("[FAWATERAK_PLUGIN] Error stack:", err?.stack);
              setError(err?.message || "فشل تهيئة نظام الدفع");
              setIsInitializing(false);
            }
          } else {
            console.error("[FAWATERAK_PLUGIN] fawaterkCheckout function not available");
            console.error("[FAWATERAK_PLUGIN] jQuery available:", typeof (window as any).$ !== 'undefined');
            console.error("[FAWATERAK_PLUGIN] Window keys:", Object.keys(window).filter(k => k.toLowerCase().includes('fawater')));
            console.error("[FAWATERAK_PLUGIN] Global keys:", Object.keys(globalThis).filter(k => k.toLowerCase().includes('fawater')));
            setError("نظام الدفع غير متاح. يرجى المحاولة مرة أخرى.");
            setIsInitializing(false);
          }
        }, 1500); // Increased timeout to ensure jQuery and plugin are fully loaded
      } catch (err: any) {
        console.error("[FAWATERAK_PLUGIN] Error:", err);
        setError(err?.message || "حدث خطأ أثناء تهيئة نظام الدفع");
        setIsInitializing(false);
      }
    };

    initializePlugin();
  }, [scriptLoaded.current, amount, session]);

  // Listen for messages from plugin
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.origin.includes("fawaterk.com") || event.origin.includes("fawaterak.com")) {
        console.log("[FAWATERAK_PLUGIN] Message received:", event.data);
        
        // Handle invoice key from plugin
        if (event.data?.invoice_key || event.data?.invoiceKey) {
          const invoiceKey = event.data.invoice_key || event.data.invoiceKey;
          console.log("[FAWATERAK_PLUGIN] Invoice key received:", invoiceKey);
          
          // Update payment record with invoice key if we have paymentId
          // This will be handled by the plugin's callback
        }
      }
    };

    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, []);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-[#211FC3] mx-auto mb-4" />
          <p className="text-lg text-muted-foreground">جاري تحميل نظام الدفع...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      {/* Header with Logo */}
      <div className="bg-white border-b shadow-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Image
                src={getCdnUrl("/logo.png")}
                alt="Logo"
                width={80}
                height={80}
                className="object-contain"
                unoptimized
              />
              <div>
                <h1 className="text-2xl font-bold text-[#211FC3]">مستقبلنا</h1>
                <p className="text-sm text-muted-foreground">إضافة رصيد إلى حسابك</p>
              </div>
            </div>
            <Button
              variant="ghost"
              onClick={() => router.push("/dashboard/balance")}
              className="flex items-center gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              العودة
            </Button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        {/* Payment Info Card */}
        <Card className="mb-6 shadow-lg">
          <CardHeader>
            <CardTitle className="text-2xl text-center text-[#211FC3]">
              إتمام عملية الدفع
            </CardTitle>
            <CardDescription className="text-center">
              اختر طريقة الدفع المناسبة وأكمل عملية الدفع
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between p-4 bg-blue-50 rounded-lg mb-6">
              <div>
                <p className="text-sm text-muted-foreground">المبلغ المطلوب</p>
                <p className="text-3xl font-bold text-[#211FC3]">{amount} جنيه</p>
              </div>
              <div className="text-right">
                <p className="text-sm text-muted-foreground">العملة</p>
                <p className="text-lg font-semibold">EGP</p>
              </div>
            </div>

            {/* Error Message */}
            {error && (
              <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-red-800 text-sm">{error}</p>
              </div>
            )}

            {/* Loading State */}
            {isInitializing && (
              <div className="text-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-[#211FC3] mx-auto mb-4" />
                <p className="text-muted-foreground">جاري تهيئة نظام الدفع...</p>
              </div>
            )}

            {/* Fawaterak Plugin Container */}
            <div className="mt-6">
              <div id="fawaterkDivId" className="min-h-[600px] w-full"></div>
            </div>

            {/* Info Message */}
            <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-sm text-blue-800 text-center">
                💡 بعد إتمام الدفع، سيتم تحديث رصيدك تلقائياً وإعادة توجيهك إلى صفحة الرصيد
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default function FawaterakPluginPaymentPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="text-center">
            <Loader2 className="h-12 w-12 animate-spin text-[#211FC3] mx-auto mb-4" />
            <p className="text-lg text-muted-foreground">جاري التحميل...</p>
          </div>
        </div>
      }
    >
      <FawaterakPluginPaymentPageContent />
    </Suspense>
  );
}

