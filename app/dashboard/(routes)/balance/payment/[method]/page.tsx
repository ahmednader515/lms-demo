"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter, useParams } from "next/navigation";
import { useSession } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { ArrowRight, Loader2, ArrowLeft } from "lucide-react";

// Declare Fawaterak plugin types
declare global {
  interface Window {
    fawaterkCheckout: (config: any) => void;
  }
}

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
  const [paymentId, setPaymentId] = useState<string | null>(null);
  const [showPlugin, setShowPlugin] = useState(false);
  const [hashKey, setHashKey] = useState<string | null>(null);
  const pluginLoadedRef = useRef(false);

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

  // Intercept window.open to prevent redirects
  useEffect(() => {
    if (showPlugin && typeof window !== "undefined") {
      const originalOpen = window.open;
      
      // Override window.open to prevent redirects
      window.open = function(url?: string | URL, target?: string, features?: string) {
        console.warn("[FAWATERAK] window.open intercepted:", url);
        // If it's trying to open Fawaterak URL, log it but don't open
        if (url && typeof url === "string" && url.includes("fawaterk")) {
          console.error("[FAWATERAK] Plugin attempted to redirect. This might indicate:");
          console.error("1. Domain not configured in Fawaterak dashboard");
          console.error("2. HashKey is incorrect");
          console.error("3. Plugin configuration error");
          toast.error("حدث خطأ في تحميل نظام الدفع. يرجى التحقق من إعدادات الدومين في لوحة تحكم Fawaterak");
          return null;
        }
        // Allow other opens (like success redirects)
        return originalOpen.call(window, url, target, features);
      };

      return () => {
        // Restore original window.open
        window.open = originalOpen;
      };
    }
  }, [showPlugin]);

  // Load Fawaterak plugin script
  useEffect(() => {
    if (!pluginLoadedRef.current && typeof window !== "undefined") {
      // Check if script already exists
      const existingScript = document.querySelector('script[src*="fawaterkPlugin"]');
      if (existingScript) {
        pluginLoadedRef.current = true;
        console.log("[FAWATERAK] Plugin script already exists");
        return;
      }

      const script = document.createElement("script");
      script.src = "https://app.fawaterk.com/fawaterkPlugin/fawaterkPlugin.min.js";
      script.async = true;
      script.onload = () => {
        pluginLoadedRef.current = true;
        console.log("[FAWATERAK] Plugin script loaded successfully");
        // Verify function is available
        if (typeof window !== "undefined" && typeof window.fawaterkCheckout === "function") {
          console.log("[FAWATERAK] fawaterkCheckout function is available");
        } else {
          console.error("[FAWATERAK] fawaterkCheckout function not found after script load");
        }
      };
      script.onerror = () => {
        console.error("[FAWATERAK] Failed to load plugin script");
        toast.error("فشل تحميل نظام الدفع");
      };
      document.body.appendChild(script);

      return () => {
        // Cleanup if needed
      };
    }
  }, []);

  // Get amount from URL query params
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const amountParam = urlParams.get("amount");
    if (amountParam) {
      setAmount(amountParam);
    }
  }, []);

  // Reset plugin when amount changes
  useEffect(() => {
    setShowPlugin(false);
    setPaymentId(null);
  }, [amount]);

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
      // Step 1: Create payment record (without creating Fawaterak invoice)
      const prepareResponse = await fetch("/api/payment/fawaterak/prepare", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          amount: parseFloat(amount),
          paymentMethod: paymentMethod?.id,
        }),
      });

      if (!prepareResponse.ok) {
        const error = await prepareResponse.text();
        toast.error(error || "حدث خطأ أثناء تحضير الدفع");
        setIsProcessing(false);
        return;
      }

      const prepareData = await prepareResponse.json();
      if (!prepareData.paymentId) {
        toast.error("لم يتم إنشاء سجل الدفع");
        setIsProcessing(false);
        return;
      }

      setPaymentId(prepareData.paymentId);

      // Step 2: Get hashKey
      const hashResponse = await fetch("/api/payment/fawaterak/hash", {
        method: "POST",
      });

      if (!hashResponse.ok) {
        toast.error("حدث خطأ أثناء تحضير الدفع");
        setIsProcessing(false);
        return;
      }

      const hashData = await hashResponse.json();
      setHashKey(hashData.hashKey);

      // Step 3: Get user data for plugin config
      const userResponse = await fetch("/api/user/me");
      if (!userResponse.ok) {
        toast.error("حدث خطأ أثناء تحميل بيانات المستخدم");
        setIsProcessing(false);
        return;
      }

      const userData = await userResponse.json();
      const nameParts = (userData.fullName || "").trim().split(/\s+/);
      const firstName = nameParts[0] || userData.fullName || "";
      const lastName = nameParts.slice(1).join(" ") || "";

      // Step 4: Initialize Fawaterak plugin
      const baseUrl = process.env.NEXT_PUBLIC_APP_URL || window.location.origin;
      const pluginConfig = {
        envType: process.env.NODE_ENV === "production" ? "live" : "test",
        hashKey: hashData.hashKey,
        style: {
          listing: "horizontal",
        },
        version: "0",
        requestBody: {
          cartTotal: amount.toString(),
          currency: "EGP",
          customer: {
            first_name: firstName,
            last_name: lastName,
            email: userData.phoneNumber
              ? `${userData.phoneNumber}@lms.local`
              : `${userData.id}@lms.local`,
            phone: userData.phoneNumber || "",
            address: "",
            customer_unique_id: userData.id || session?.user?.id || "",
          },
          redirectionUrls: {
            successUrl: `${baseUrl}/dashboard/balance?payment=${prepareData.paymentId}&status=success`,
            failUrl: `${baseUrl}/dashboard/balance?payment=${prepareData.paymentId}&status=fail`,
            pendingUrl: `${baseUrl}/dashboard/balance?payment=${prepareData.paymentId}&status=pending`,
          },
          cartItems: [
            {
              name: `إضافة رصيد - ${prepareData.paymentId}`,
              price: amount.toString(),
              quantity: "1",
            },
          ],
          payLoad: {
            paymentId: prepareData.paymentId,
            userId: session?.user?.id,
            paymentMethod: paymentMethod?.id,
          },
        },
        redirectOutIframe: false, // Keep payment in iframe
      };

      // Wait for plugin to be loaded
      if (!pluginLoadedRef.current) {
        // Wait longer for script to load
        await new Promise((resolve) => setTimeout(resolve, 2000));
      }

      // Check if plugin is available
      if (typeof window !== "undefined" && typeof window.fawaterkCheckout === "function") {
        console.log("[FAWATERAK] Plugin found, initializing...");
        
        // Clear any existing content in the div first
        const pluginDiv = document.getElementById("fawaterkDivId");
        if (pluginDiv) {
          pluginDiv.innerHTML = "";
          console.log("[FAWATERAK] Plugin div cleared");
        } else {
          console.error("[FAWATERAK] Plugin div not found!");
        }
        
        setShowPlugin(true);
        setIsProcessing(false);
        
        // Initialize plugin after ensuring DOM is ready
        setTimeout(() => {
          try {
            console.log("[FAWATERAK] Calling fawaterkCheckout with config:", {
              envType: pluginConfig.envType,
              hashKeyPrefix: pluginConfig.hashKey.substring(0, 20) + "...",
              cartTotal: pluginConfig.requestBody.cartTotal,
            });
            
            window.fawaterkCheckout(pluginConfig);
            
            // Check if plugin div was populated after a delay
            setTimeout(() => {
              const div = document.getElementById("fawaterkDivId");
              if (div && div.children.length === 0) {
                console.error("[FAWATERAK] Plugin div is empty after initialization!");
                toast.error("فشل تحميل نظام الدفع. يرجى التحقق من إعدادات الدومين في Fawaterak");
              } else {
                console.log("[FAWATERAK] Plugin div populated successfully");
              }
            }, 2000);
            
            console.log("[FAWATERAK] Plugin initialized successfully");
          } catch (error) {
            console.error("[FAWATERAK_PLUGIN_ERROR]", error);
            toast.error("حدث خطأ أثناء تحميل نظام الدفع: " + (error as Error).message);
            setIsProcessing(false);
            setShowPlugin(false);
          }
        }, 500); // Increased delay to ensure DOM is ready
      } else {
        console.error("[FAWATERAK] Plugin not found on window object");
        console.error("[FAWATERAK] window.fawaterkCheckout type:", typeof window.fawaterkCheckout);
        toast.error("لم يتم تحميل نظام الدفع. يرجى تحديث الصفحة والمحاولة مرة أخرى");
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

  return (
    <div className="p-6 max-w-4xl mx-auto">
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
            {showPlugin
              ? "اختر طريقة الدفع وأكمل العملية"
              : `أكمل عملية الدفع باستخدام ${paymentMethod.name}`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!showPlugin ? (
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
          ) : (
            <div className="space-y-4">
              <div className="p-4 bg-muted rounded-lg">
                <p className="text-sm text-muted-foreground mb-2">
                  المبلغ: {amount} جنيه
                </p>
                <p className="text-sm text-muted-foreground">
                  اختر طريقة الدفع من القائمة أدناه
                </p>
              </div>
              {/* Fawaterak Plugin Container */}
              <div id="fawaterkDivId" className="min-h-[400px]"></div>
              <div className="text-center text-sm text-muted-foreground mt-4">
                <p>بعد إتمام الدفع، سيتم تحديث رصيدك تلقائياً</p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
