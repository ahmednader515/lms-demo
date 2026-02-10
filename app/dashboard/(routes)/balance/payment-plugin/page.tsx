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
  const { data: session, status: sessionStatus } = useSession();
  const [amount, setAmount] = useState<string>("");
  const [isLoading, setIsLoading] = useState(true);
  const [isInitializing, setIsInitializing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const pluginInitialized = useRef(false);
  const scriptLoaded = useRef(false);
  const domainRef = useRef<string>("localhost"); // Store domain for error messages

  // Don't redirect here - let middleware handle it to preserve redirect URL

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
        console.log("[FAWATERAK_PLUGIN] jQuery version:", (window as any).$?.fn?.jquery || "unknown");
        
        // Load Fawaterak plugin after jQuery is loaded (using staging URL)
        const pluginScript = document.createElement("script");
        pluginScript.src = "https://staging.fawaterk.com/fawaterkPlugin/fawaterkPlugin.min.js?v=1.2";
        pluginScript.async = true;
        pluginScript.onload = () => {
          console.log("[FAWATERAK_PLUGIN] Plugin script loaded successfully");
          console.log("[FAWATERAK_PLUGIN] Checking if fawaterkCheckout function exists:", typeof (window as any).fawaterkCheckout);
          if (typeof (window as any).fawaterkCheckout === 'function') {
            console.log("[FAWATERAK_PLUGIN] ✓ fawaterkCheckout function is available");
          } else {
            console.error("[FAWATERAK_PLUGIN] ✗ fawaterkCheckout function NOT found");
          }
          scriptLoaded.current = true;
          setIsLoading(false);
        };
        pluginScript.onerror = (error) => {
          console.error("[FAWATERAK_PLUGIN] Failed to load plugin script", error);
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
    // Wait for session to load
    if (sessionStatus === "loading") return;
    
    // Don't initialize if not authenticated - middleware will handle redirect
    if (sessionStatus === "unauthenticated") {
      return;
    }
    
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
        
        // Store domain in ref for use in error messages
        domainRef.current = domain;
        
        console.log("[FAWATERAK_PLUGIN] Hash key received:", {
          domain,
          hashKeyPrefix: hashKey.substring(0, 20) + "...",
          hashKeyLength: hashKey.length,
        });
        
        // Log the exact domain being used - this must match Fawaterak dashboard
        console.log("[FAWATERAK_PLUGIN] IMPORTANT: Domain used for hash:", domain);
        console.log("[FAWATERAK_PLUGIN] Make sure this domain is configured in Fawaterak staging dashboard → Integrations → Fawaterak → IFRAM Domains");

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
            redirectOutIframe: true, // Redirect to top-level window for better handling
            customer: {
              customer_unique_id: session.user.id, // User ID as unique identifier
              first_name: firstName,
              last_name: lastName,
              email: user.email || `${user.phoneNumber}@lms.local`,
              phone: user.phoneNumber || "",
              address: "",
            },
            redirectionUrls: {
              successUrl: `${baseUrl}/payment/success?payment=${paymentId}`,
              failUrl: `${baseUrl}/payment/fail?payment=${paymentId}`,
              pendingUrl: `${baseUrl}/payment/pending?payment=${paymentId}`,
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
          envType: pluginConfig.envType,
          domain: domain,
          hashKeyPrefix: hashKey.substring(0, 30) + "...",
          hashKeyLength: hashKey.length,
          baseUrl: baseUrl,
          paymentId: paymentId,
          amount: amount,
        });
        
        console.log("[FAWATERAK_PLUGIN] ⚠️ IMPORTANT: Domain used for hash:", domain);
        console.log("[FAWATERAK_PLUGIN] ⚠️ Make sure this EXACT domain is configured in:");
        console.log("[FAWATERAK_PLUGIN] ⚠️ Fawaterak Staging Dashboard → Integrations → Fawaterak → IFRAM Domains");
        console.log("[FAWATERAK_PLUGIN] ⚠️ Domain should be:", domain);
        
        // Log the full hash key for debugging (only in development)
        if (process.env.NODE_ENV === 'development') {
          console.log("[FAWATERAK_PLUGIN] Full hashKey (DEV ONLY):", hashKey);
        }

        // Wait a bit for the plugin script and jQuery to be fully ready
        setTimeout(() => {
          // Make pluginConfig available globally (plugin might access it from global scope)
          (window as any).pluginConfig = pluginConfig;
          
          // Check if jQuery is loaded
          if (typeof (window as any).$ === 'undefined' && typeof (window as any).jQuery === 'undefined') {
            console.error("[FAWATERAK_PLUGIN] jQuery not loaded");
            setError("فشل تحميل مكتبة jQuery المطلوبة");
            setIsInitializing(false);
            return;
          }
          
          // Try both window.fawaterkCheckout and global fawaterkCheckout
          const fawaterkCheckoutFn = (window as any).fawaterkCheckout || (globalThis as any).fawaterkCheckout;
          
          if (typeof fawaterkCheckoutFn === 'function') {
            try {
              console.log("[FAWATERAK_PLUGIN] Calling fawaterkCheckout");
              console.log("[FAWATERAK_PLUGIN] Config summary:", {
                envType: pluginConfig.envType,
                domain: domain,
                hashKeyLength: pluginConfig.hashKey.length,
                hashKeyPrefix: pluginConfig.hashKey.substring(0, 30) + "...",
                cartTotal: pluginConfig.requestBody.cartTotal,
                customerEmail: pluginConfig.requestBody.customer.email,
              });
              
              // Log the exact hashKey being sent (for debugging - only in dev)
              if (process.env.NODE_ENV === 'development') {
                console.log("[FAWATERAK_PLUGIN] Full hashKey (DEV ONLY):", pluginConfig.hashKey);
              }
              console.log("[FAWATERAK_PLUGIN] Domain being used:", domainRef.current);
              
              // Call the plugin function directly (matching the example)
              // The plugin will validate the hashKey internally
              console.log("[FAWATERAK_PLUGIN] About to call fawaterkCheckout with config");
              console.log("[FAWATERAK_PLUGIN] HashKey length:", pluginConfig.hashKey.length);
              console.log("[FAWATERAK_PLUGIN] HashKey (first 40 chars):", pluginConfig.hashKey.substring(0, 40));
              
              fawaterkCheckoutFn(pluginConfig);
              
              // Don't set initialized immediately - wait for plugin to confirm
              // The plugin might throw an error asynchronously
              setTimeout(() => {
                pluginInitialized.current = true;
                console.log("[FAWATERAK_PLUGIN] Plugin call completed");
                setIsInitializing(false);
              }, 1000);
            } catch (err: any) {
              console.error("[FAWATERAK_PLUGIN] Error initializing plugin:", err);
              console.error("[FAWATERAK_PLUGIN] Error message:", err?.message);
              console.error("[FAWATERAK_PLUGIN] Error stack:", err?.stack);
              
              // Check if error is about invalid token
              if (err?.message?.includes("Invalid Token") || err?.message?.includes("inactive vendor")) {
                setError(`خطأ في التكوين: ${err.message}. تأكد من إضافة "${domain}" في لوحة تحكم Fawaterak → Integrations → Fawaterak → IFRAM Domains`);
              } else {
                setError(err?.message || "فشل تهيئة نظام الدفع");
              }
              setIsInitializing(false);
            }
          } else {
            console.error("[FAWATERAK_PLUGIN] fawaterkCheckout function not available");
            console.error("[FAWATERAK_PLUGIN] jQuery available:", typeof (window as any).$ !== 'undefined');
            console.error("[FAWATERAK_PLUGIN] Checking for plugin script...");
            
            // Check if script is loaded
            const pluginScript = document.querySelector('script[src*="fawaterkPlugin"]');
            console.error("[FAWATERAK_PLUGIN] Plugin script found:", !!pluginScript);
            
            if (pluginScript) {
              console.error("[FAWATERAK_PLUGIN] Script loaded but function not available - might be a script error");
              setError("فشل تحميل نظام الدفع. يرجى التحقق من إعدادات Fawaterak.");
            } else {
              setError("نظام الدفع غير متاح. يرجى المحاولة مرة أخرى.");
            }
            setIsInitializing(false);
          }
        }, 2000); // Increased timeout to ensure jQuery and plugin are fully loaded
      } catch (err: any) {
        console.error("[FAWATERAK_PLUGIN] Error:", err);
        setError(err?.message || "حدث خطأ أثناء تهيئة نظام الدفع");
        setIsInitializing(false);
      }
    };

    initializePlugin();
  }, [scriptLoaded.current, amount, session, sessionStatus, router]);

  // Listen for messages from plugin and payment status pages
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      console.log("[FAWATERAK_PLUGIN] Message received:", event.data, "from:", event.origin);
      
      // Handle messages from Fawaterak plugin
      if (event.origin.includes("fawaterk.com") || event.origin.includes("fawaterak.com")) {
        // Handle invoice key from plugin
        if (event.data?.invoice_key || event.data?.invoiceKey) {
          const invoiceKey = event.data.invoice_key || event.data.invoiceKey;
          console.log("[FAWATERAK_PLUGIN] Invoice key received:", invoiceKey);
          
          // Update payment record with invoice key if we have paymentId
          // This will be handled by the plugin's callback
        }
        
        // Handle errors from plugin
        if (event.data?.error || event.data?.status === "error") {
          console.error("[FAWATERAK_PLUGIN] Error from plugin:", event.data);
          setError(event.data?.message || "حدث خطأ في نظام الدفع");
        }
      }
      
      // Handle messages from our payment status pages (success/fail/pending)
      if (event.data?.type) {
        const { type, paymentId: msgPaymentId } = event.data;
        
        if (type === "FAWATERAK_PAYMENT_SUCCESS") {
          console.log("[FAWATERAK_PLUGIN] Payment successful:", msgPaymentId);
          toast.success("تم إتمام عملية الدفع بنجاح");
          // Redirect to balance page after a short delay
          setTimeout(() => {
            router.push(`/dashboard/balance?payment=${msgPaymentId}&status=success`);
          }, 2000);
        } else if (type === "FAWATERAK_PAYMENT_FAIL") {
          console.log("[FAWATERAK_PLUGIN] Payment failed:", msgPaymentId);
          toast.error("فشلت عملية الدفع");
          setTimeout(() => {
            router.push(`/dashboard/balance?payment=${msgPaymentId}&status=fail`);
          }, 2000);
        } else if (type === "FAWATERAK_PAYMENT_PENDING") {
          console.log("[FAWATERAK_PLUGIN] Payment pending:", msgPaymentId);
          toast.info("قيد معالجة الدفع... سيتم تحديث الرصيد تلقائياً عند اكتمال الدفع");
          setTimeout(() => {
            router.push(`/dashboard/balance?payment=${msgPaymentId}&status=pending`);
          }, 2000);
        }
      }
    };

    // Listen for unhandled errors
    const handleError = (event: ErrorEvent) => {
      if (event.message?.includes("Invalid Token") || event.message?.includes("inactive vendor")) {
        console.error("[FAWATERAK_PLUGIN] Plugin error caught:", event.message);
        setError(`خطأ في التكوين: ${event.message}. تأكد من إعدادات Fawaterak`);
      }
    };

    // Intercept fetch requests to catch API errors and log request details
    const originalFetch = window.fetch;
    window.fetch = async (...args) => {
      const url = args[0] as string;
      // Intercept ALL Fawaterak API calls (not just getPaymentmethods)
      if (typeof url === 'string' && url.includes('fawaterk.com') && url.includes('/api/v2/')) {
        console.log("[FAWATERAK_PLUGIN] Intercepted API call to:", url);
        
        // Log request details (headers, method, etc.)
        const requestInit = args[1] as RequestInit | undefined;
        const headersObj: Record<string, string> = {};
        if (requestInit?.headers) {
          if (requestInit.headers instanceof Headers) {
            requestInit.headers.forEach((value, key) => {
              headersObj[key] = value;
            });
          } else if (Array.isArray(requestInit.headers)) {
            requestInit.headers.forEach(([key, value]) => {
              headersObj[key] = value;
            });
          } else {
            Object.assign(headersObj, requestInit.headers);
          }
        }
        
        // Extract the API endpoint from the URL
        const urlObj = new URL(url);
        const endpoint = urlObj.pathname.split('/api/v2/')[1] || '';
        
        console.log("[FAWATERAK_PLUGIN] Request details:", {
          method: requestInit?.method || 'GET',
          headers: headersObj,
          body: requestInit?.body,
          url,
          endpoint,
        });
        
        // Determine which backend route to proxy to
        let proxyUrl = '';
        if (endpoint.includes('getPaymentmethods') || endpoint === 'getPaymentmethods') {
          proxyUrl = '/api/payment/fawaterak/methods';
        } else if (endpoint.includes('createInvoice') || endpoint.includes('createInvoiceLink') || endpoint.includes('invoiceInitPay')) {
          proxyUrl = '/api/payment/fawaterak/create';
        } else {
          // For other endpoints, log and let them through (might be needed by plugin)
          console.log("[FAWATERAK_PLUGIN] Unknown endpoint, allowing original request:", endpoint);
          return originalFetch(...args);
        }
        
        // Instead of letting the plugin call the API directly, proxy it through our backend
        // This way we can use the API key securely
        try {
          console.log("[FAWATERAK_PLUGIN] Proxying API call through backend:", proxyUrl);
          
          // Get request body if it's a POST/PUT request
          let requestBody: string | undefined = undefined;
          if (requestInit?.body) {
            if (typeof requestInit.body === 'string') {
              requestBody = requestInit.body;
            } else if (requestInit.body instanceof FormData) {
              // FormData can't be JSON stringified, let it through
              console.log("[FAWATERAK_PLUGIN] FormData body detected, allowing original request");
              return originalFetch(...args);
            } else {
              requestBody = JSON.stringify(requestInit.body);
            }
          }
          
          // Add endpoint to query params so backend knows which endpoint was called
          const proxyUrlWithEndpoint = proxyUrl.includes('?') 
            ? `${proxyUrl}&endpoint=${encodeURIComponent(endpoint)}`
            : `${proxyUrl}?endpoint=${encodeURIComponent(endpoint)}`;
          
          console.log("[FAWATERAK_PLUGIN] Proxying to:", proxyUrlWithEndpoint);
          
          const proxyResponse = await fetch(proxyUrlWithEndpoint, {
            method: requestInit?.method || 'GET',
            headers: {
              "X-Plugin-Proxy": "true", // Signal that this is a plugin proxy request
              "Content-Type": "application/json",
              ...(headersObj as Record<string, string>),
            },
            body: requestBody,
          });
          
          if (proxyResponse.ok) {
            const responseData = await proxyResponse.json();
            console.log("[FAWATERAK_PLUGIN] Successfully proxied API call through backend");
            
            // Return a mock Response that the plugin can use
            return new Response(JSON.stringify(responseData), {
              status: 200,
              statusText: "OK",
              headers: {
                "Content-Type": "application/json",
              },
            });
          } else {
            const errorText = await proxyResponse.text();
            console.error("[FAWATERAK_PLUGIN] Backend proxy failed:", errorText);
            
            // Try to parse error message
            try {
              const errorJson = JSON.parse(errorText);
              if (errorJson.message) {
                const errorMsg = typeof errorJson.message === 'object' 
                  ? JSON.stringify(errorJson.message) 
                  : errorJson.message;
                setError(`خطأ في نظام الدفع: ${errorMsg}`);
              }
            } catch {
              setError(`خطأ في نظام الدفع (${proxyResponse.status}): ${errorText.substring(0, 100)}`);
            }
            
            // Return error response
            return new Response(errorText, {
              status: proxyResponse.status,
              statusText: proxyResponse.statusText,
              headers: {
                "Content-Type": "application/json",
              },
            });
          }
        } catch (proxyErr: any) {
          console.error("[FAWATERAK_PLUGIN] Proxy error:", proxyErr);
          setError(`خطأ في الاتصال بنظام الدفع: ${proxyErr.message}`);
          
          // Return error response
          return new Response(JSON.stringify({ 
            status: "error", 
            message: { error: [proxyErr.message] } 
          }), {
            status: 500,
            statusText: "Internal Server Error",
            headers: {
              "Content-Type": "application/json",
            },
          });
        }
      }
      return originalFetch(...args);
    };

    window.addEventListener("message", handleMessage);
    window.addEventListener("error", handleError);
    
    return () => {
      window.removeEventListener("message", handleMessage);
      window.removeEventListener("error", handleError);
      window.fetch = originalFetch; // Restore original fetch
    };
  }, []);

  // Redirect if not authenticated - use full page reload to bypass Next.js routing
  useEffect(() => {
    if (sessionStatus === "unauthenticated") {
      const currentUrl = window.location.pathname + window.location.search;
      window.location.href = `/sign-in?redirect=${encodeURIComponent(currentUrl)}`;
    }
  }, [sessionStatus]);

  // Listen for payment status changes from storage events
  // This helps detect redirects from iframe/context changes
  useEffect(() => {
    const handleStorageChange = (event: StorageEvent) => {
      if (event.key === 'fawaterak_payment_status') {
        try {
          const paymentData = JSON.parse(event.newValue || '{}');
          console.log('[FAWATERAK_PLUGIN] Storage event received:', paymentData);
          
          if (paymentData.status === 'success') {
            router.push(`/dashboard/balance?payment=${paymentData.paymentId}&status=success`);
          } else if (paymentData.status === 'fail') {
            router.push(`/dashboard/balance?payment=${paymentData.paymentId}&status=fail`);
          } else if (paymentData.status === 'pending') {
            router.push(`/dashboard/balance?payment=${paymentData.paymentId}&status=pending`);
          }
        } catch (e) {
          console.error('[FAWATERAK_PLUGIN] Error parsing storage event:', e);
        }
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, [router]);

  // Check URL for payment status on mount and periodically
  useEffect(() => {
    const checkUrlForPaymentStatus = () => {
      const urlParams = new URLSearchParams(window.location.search);
      const paymentId = urlParams.get('payment');
      const status = urlParams.get('status');
      
      if (paymentId && status) {
        console.log('[FAWATERAK_PLUGIN] URL payment status detected:', { paymentId, status });
        // The balance page will handle this via useEffect
      }
    };

    // Check immediately
    checkUrlForPaymentStatus();

    // Also set up a periodic check in case URL changes without page reload
    const intervalId = setInterval(checkUrlForPaymentStatus, 1000);
    return () => clearInterval(intervalId);
  }, []);

  // Show loading while session is loading or scripts are loading
  if (isLoading || sessionStatus === "loading") {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-[#211FC3] mx-auto mb-4" />
          <p className="text-lg text-muted-foreground">
            {sessionStatus === "loading" ? "جاري التحقق من الجلسة..." : "جاري تحميل نظام الدفع..."}
          </p>
        </div>
      </div>
    );
  }
  
  // Show loading while redirecting if not authenticated
  if (sessionStatus === "unauthenticated") {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-[#211FC3] mx-auto mb-4" />
          <p className="text-lg text-muted-foreground">جاري إعادة التوجيه...</p>
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

