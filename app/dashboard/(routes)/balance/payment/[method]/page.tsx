"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { useSession } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { ArrowRight, Loader2, ArrowLeft } from "lucide-react";
import Image from "next/image";
// Removed CDN import - using local images

interface PaymentMethodInfo {
  id: string;
  name: string;
  icon?: string;
  fields: {
    label: string;
    name: string;
    type: string;
    placeholder: string;
    required: boolean;
  }[];
}

const paymentMethodsConfig: Record<string, PaymentMethodInfo> = {
  "vodafone-cash": {
    id: "vodafone_cash",
    name: "Vodafone Cash",
    fields: [
      {
        label: "رقم المحفظة",
        name: "wallet_number",
        type: "tel",
        placeholder: "أدخل رقم محفظة Vodafone Cash",
        required: true,
      },
    ],
  },
  "orange-cash": {
    id: "orange_cash",
    name: "Orange Cash",
    fields: [
      {
        label: "رقم المحفظة",
        name: "wallet_number",
        type: "tel",
        placeholder: "أدخل رقم محفظة Orange Cash",
        required: true,
      },
    ],
  },
  "etisalat-cash": {
    id: "etisalat_cash",
    name: "Etisalat Cash",
    fields: [
      {
        label: "رقم المحفظة",
        name: "wallet_number",
        type: "tel",
        placeholder: "أدخل رقم محفظة Etisalat Cash",
        required: true,
      },
    ],
  },
  "we-cash": {
    id: "we_cash",
    name: "We Cash",
    fields: [
      {
        label: "رقم المحفظة",
        name: "wallet_number",
        type: "tel",
        placeholder: "أدخل رقم محفظة We Cash",
        required: true,
      },
    ],
  },
  "fawry": {
    id: "fawry",
    name: "Fawry",
    fields: [
      {
        label: "رقم الهاتف",
        name: "phone_number",
        type: "tel",
        placeholder: "أدخل رقم الهاتف",
        required: true,
      },
    ],
  },
  "meeza-visa-mastercard": {
    id: "meeza",
    name: "Meeza / Visa / Mastercard",
    fields: [
      {
        label: "رقم البطاقة",
        name: "card_number",
        type: "text",
        placeholder: "أدخل رقم البطاقة",
        required: true,
      },
      {
        label: "تاريخ الانتهاء",
        name: "expiry_date",
        type: "text",
        placeholder: "MM/YY",
        required: true,
      },
      {
        label: "CVV",
        name: "cvv",
        type: "text",
        placeholder: "CVV",
        required: true,
      },
      {
        label: "اسم حامل البطاقة",
        name: "cardholder_name",
        type: "text",
        placeholder: "اسم حامل البطاقة",
        required: true,
      },
    ],
  },
};

export default function PaymentMethodPage() {
  const router = useRouter();
  const params = useParams();
  const { data: session } = useSession();
  const [amount, setAmount] = useState("");
  const [formData, setFormData] = useState<Record<string, string>>({});
  const [isProcessing, setIsProcessing] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethodInfo | null>(null);
  const [invoiceUrl, setInvoiceUrl] = useState<string | null>(null);
  const [paymentId, setPaymentId] = useState<string | null>(null);

  useEffect(() => {
    const methodParam = params?.method as string;
    if (methodParam && paymentMethodsConfig[methodParam]) {
      setPaymentMethod(paymentMethodsConfig[methodParam]);
      // Initialize form data with empty values
      const initialData: Record<string, string> = {};
      paymentMethodsConfig[methodParam].fields.forEach((field) => {
        initialData[field.name] = "";
      });
      setFormData(initialData);
    } else {
      toast.error("طريقة الدفع غير صحيحة");
      router.push("/dashboard/balance");
    }
  }, [params, router]);

  // Get amount from URL query params
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const amountParam = urlParams.get("amount");
    if (amountParam) {
      setAmount(amountParam);
    }
  }, []);

  // Hide loading indicator when iframe loads
  useEffect(() => {
    if (invoiceUrl) {
      const timer = setTimeout(() => {
        const loadingEl = document.getElementById("iframe-loading");
        if (loadingEl) {
          loadingEl.style.display = "none";
        }
      }, 2000); // Hide after 2 seconds or when iframe loads
      
      return () => clearTimeout(timer);
    }
  }, [invoiceUrl]);

  // Prevent Fawaterak from breaking out of iframe
  useEffect(() => {
    if (!invoiceUrl) return;

    const originalOpen = window.open;
    const originalLocation = window.location;
    
    // Override window.open to prevent Fawaterak from opening new tabs
    window.open = function(url?: string | URL, target?: string, features?: string) {
      console.log("[FAWATERAK] window.open intercepted:", url);
      
      // If it's trying to open any Fawaterak URL in a new tab, update iframe instead
      if (url && typeof url === "string" && (url.includes("fawaterk.com") || url.includes("fawaterak.com"))) {
        console.log("[FAWATERAK] Fawaterak attempted to open URL in new tab:", url);
        console.log("[FAWATERAK] Updating iframe src instead of opening new tab");
        
        // Try to update iframe src instead of opening new tab
        const iframe = document.getElementById("fawaterak-iframe") as HTMLIFrameElement;
        if (iframe) {
          iframe.src = url;
          toast.info("تم تحديث صفحة الدفع");
          return null; // Prevent new tab
        }
        
        // If iframe not found, log error
        console.error("[FAWATERAK] Iframe not found, cannot update src");
        return null; // Still prevent new tab
      }
      
      // Allow other opens (like success redirects to our site)
      return originalOpen.call(window, url, target, features);
    };

    // Prevent top-level navigation from iframe
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      // Don't prevent, but log it
      console.log("[FAWATERAK] Before unload event");
    };

    // Listen for messages from iframe
    const handleMessage = (event: MessageEvent) => {
      if (event.origin.includes("fawaterk.com") || event.origin.includes("fawaterak.com")) {
        console.log("[FAWATERAK] Message from iframe:", event.data);
        
        // If Fawaterak sends a redirect message, handle it
        if (event.data?.type === "redirect" || event.data?.redirect || event.data?.url) {
          const redirectUrl = event.data.url || event.data.redirect;
          if (redirectUrl && (redirectUrl.includes("fawaterk.com") || redirectUrl.includes("fawaterak.com"))) {
            // Update iframe src instead of redirecting
            const iframe = document.getElementById("fawaterak-iframe") as HTMLIFrameElement;
            if (iframe) {
              console.log("[FAWATERAK] Updating iframe src from message:", redirectUrl);
              iframe.src = redirectUrl;
            }
          }
        }
      }
    };

    window.addEventListener("message", handleMessage);
    window.addEventListener("beforeunload", handleBeforeUnload);

    return () => {
      window.open = originalOpen;
      window.removeEventListener("message", handleMessage);
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, [invoiceUrl]);

  // Poll payment status when invoice is shown
  useEffect(() => {
    if (!paymentId || !invoiceUrl) return;

    const checkPaymentStatus = async () => {
      try {
        const response = await fetch(`/api/payment/fawaterak/status/${paymentId}`);
        if (response.ok) {
          const data = await response.json();
          if (data.status === 'PAID') {
            toast.success("تم الدفع بنجاح! سيتم تحديث الرصيد تلقائياً");
            // Redirect back to balance page after a short delay
            setTimeout(() => {
              router.push(`/dashboard/balance?payment=${paymentId}&status=success`);
            }, 2000);
          }
        }
      } catch (error) {
        console.error("Error checking payment status:", error);
      }
    };

    // Check every 3 seconds
    const interval = setInterval(checkPaymentStatus, 3000);
    return () => clearInterval(interval);
  }, [paymentId, invoiceUrl, router]);

  const handleInputChange = (name: string, value: string) => {
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!amount || parseFloat(amount) <= 0) {
      toast.error("يرجى إدخال مبلغ صحيح");
      return;
    }

    if (parseFloat(amount) < 1) {
      toast.error("الحد الأدنى للمبلغ هو 1 جنيه");
      return;
    }

    // Validate required fields
    if (paymentMethod) {
      for (const field of paymentMethod.fields) {
        if (field.required && !formData[field.name]) {
          toast.error(`يرجى إدخال ${field.label}`);
          return;
        }
      }
    }

    setIsProcessing(true);
    try {
      // Create Fawaterak invoice
      const response = await fetch("/api/payment/fawaterak/create", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          amount: parseFloat(amount),
          paymentMethod: paymentMethod?.id,
          paymentDetails: formData,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        if (data.invoiceUrl && data.paymentId) {
          // Store invoice URL and payment ID for iframe embedding
          console.log("[FAWATERAK] Invoice created:", {
            invoiceUrl: data.invoiceUrl,
            paymentId: data.paymentId,
            invoiceKey: data.invoiceKey,
          });
          setInvoiceUrl(data.invoiceUrl);
          setPaymentId(data.paymentId);
          setIsProcessing(false);
          toast.success("تم إنشاء رابط الدفع بنجاح");
          
          // Scroll to iframe after a short delay
          setTimeout(() => {
            const iframe = document.getElementById("fawaterak-iframe");
            if (iframe) {
              iframe.scrollIntoView({ behavior: "smooth", block: "start" });
            }
          }, 100);
        } else {
          toast.error("لم يتم إنشاء رابط الدفع");
          setIsProcessing(false);
        }
      } else {
        const error = await response.text();
        toast.error(error || "حدث خطأ أثناء إنشاء رابط الدفع");
        setIsProcessing(false);
      }
    } catch (error) {
      console.error("Error processing payment:", error);
      toast.error("حدث خطأ أثناء معالجة الدفع");
      setIsProcessing(false);
    }
  };

  if (!paymentMethod) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-[#211FC3]" />
      </div>
    );
  }

  // Show payment iframe if invoice URL is available
  if (invoiceUrl) {
    return (
      <div className="min-h-screen bg-gray-50">
        {/* Header with Logo */}
        <div className="bg-white border-b shadow-sm">
          <div className="container mx-auto px-4 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <Image
                  src="/logo.png"
                  alt="Logo"
                  width={80}
                  height={80}
                  className="object-contain"
                  unoptimized
                />
                <div>
                  <h1 className="text-2xl font-bold text-[#211FC3]">مستقبلنا</h1>
                  <p className="text-sm text-muted-foreground">إضافة رصيد - {paymentMethod.name}</p>
                </div>
              </div>
              <Button
                variant="ghost"
                onClick={() => router.push("/dashboard/balance")}
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                العودة
              </Button>
            </div>
          </div>
        </div>

        {/* Payment Info */}
        <div className="container mx-auto px-4 py-6">
          <Card className="mb-4">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">المبلغ</p>
                  <p className="text-2xl font-bold text-[#211FC3]">{amount} جنيه</p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-muted-foreground">طريقة الدفع</p>
                  <p className="text-lg font-semibold">{paymentMethod.name}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Fawaterak Invoice Iframe */}
          <Card>
            <CardHeader>
              <CardTitle>إتمام عملية الدفع</CardTitle>
              <CardDescription>
                أكمل عملية الدفع باستخدام {paymentMethod.name}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="w-full" style={{ minHeight: '800px', position: 'relative' }}>
                <iframe
                  id="fawaterak-iframe"
                  src={invoiceUrl}
                  className="w-full border-0 rounded-lg"
                  style={{ 
                    minHeight: '800px', 
                    width: '100%',
                    border: '1px solid #e5e7eb',
                    display: 'block',
                  }}
                  title="Fawaterak Payment"
                  allow="payment *; camera *; microphone *"
                  sandbox="allow-forms allow-scripts allow-same-origin allow-popups allow-popups-to-escape-sandbox allow-top-navigation-by-user-activation allow-modals"
                  referrerPolicy="no-referrer-when-downgrade"
                  scrolling="yes"
                  loading="eager"
                  importance="high"
                  onLoad={(e) => {
                    console.log("[FAWATERAK_IFRAME] Iframe loaded successfully");
                    // Hide loading indicator
                    const loadingEl = document.getElementById("iframe-loading");
                    if (loadingEl) {
                      loadingEl.style.display = "none";
                    }
                    
                    const iframe = e.currentTarget;
                    // Check if iframe content loaded (will be null for cross-origin, which is expected)
                    try {
                      const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;
                      if (iframeDoc) {
                        console.log("[FAWATERAK_IFRAME] Same-origin iframe (unexpected but OK)");
                      } else {
                        console.log("[FAWATERAK_IFRAME] Cross-origin iframe (expected - Fawaterak domain)");
                      }
                    } catch (error) {
                      // Expected error for cross-origin - this is normal
                      console.log("[FAWATERAK_IFRAME] Cross-origin access (expected)");
                    }
                  }}
                  onError={(e) => {
                    console.error("[FAWATERAK_IFRAME] Iframe load error:", e);
                    toast.error("حدث خطأ في تحميل صفحة الدفع");
                    const loadingEl = document.getElementById("iframe-loading");
                    if (loadingEl) {
                      loadingEl.style.display = "none";
                    }
                  }}
                />
                {/* Loading indicator */}
                <div 
                  id="iframe-loading" 
                  className="absolute inset-0 flex items-center justify-center bg-white bg-opacity-90 z-10"
                  style={{ display: 'flex' }}
                >
                  <div className="text-center">
                    <Loader2 className="h-8 w-8 animate-spin text-[#211FC3] mx-auto mb-2" />
                    <p className="text-sm text-muted-foreground">جاري تحميل صفحة الدفع...</p>
                  </div>
                </div>
              </div>
              {/* Info message */}
              <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-sm text-blue-800 mb-2">
                  💡 إذا لم تظهر صفحة الدفع في الإطار أعلاه، يمكنك فتحها في تبويب جديد:
                </p>
                <a
                  href={invoiceUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-blue-600 hover:underline font-medium inline-flex items-center gap-1"
                >
                  <span>فتح صفحة الدفع في تبويب جديد</span>
                  <ArrowRight className="h-4 w-4" />
                </a>
              </div>
              <div className="mt-4 text-center text-sm text-muted-foreground">
                <p>بعد إتمام الدفع، سيتم تحديث رصيدك تلقائياً</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <Button
        variant="ghost"
        onClick={() => router.push("/dashboard/balance")}
        className="mb-6"
      >
        <ArrowLeft className="h-4 w-4 mr-2" />
        العودة إلى صفحة الرصيد
      </Button>

      <Card>
        <CardHeader>
          <CardTitle className="text-2xl">دفع عبر {paymentMethod.name}</CardTitle>
          <CardDescription>
            أكمل عملية الدفع باستخدام {paymentMethod.name}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Amount Input */}
            <div>
              <label className="text-sm font-medium mb-2 block">
                المبلغ (جنيه)
              </label>
              <Input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="أدخل المبلغ"
                min="1"
                step="0.01"
                required
                className="text-lg"
              />
              <p className="text-xs text-muted-foreground mt-1">
                الحد الأدنى: 1 جنيه
              </p>
            </div>

            {/* Payment Method Specific Fields */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">معلومات الدفع</h3>
              {paymentMethod.fields.map((field) => (
                <div key={field.name}>
                  <label className="text-sm font-medium mb-2 block">
                    {field.label}
                    {field.required && <span className="text-red-500">*</span>}
                  </label>
                  <Input
                    type={field.type}
                    value={formData[field.name] || ""}
                    onChange={(e) => handleInputChange(field.name, e.target.value)}
                    placeholder={field.placeholder}
                    required={field.required}
                    className="w-full"
                  />
                </div>
              ))}
            </div>

            {/* Submit Button */}
            <Button
              type="submit"
              disabled={isProcessing}
              className="w-full bg-[#211FC3] hover:bg-[#211FC3]/90 text-lg py-6"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                  جاري المعالجة...
                </>
              ) : (
                <>
                  المتابعة إلى الدفع
                  <ArrowRight className="h-5 w-5 mr-2" />
                </>
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
