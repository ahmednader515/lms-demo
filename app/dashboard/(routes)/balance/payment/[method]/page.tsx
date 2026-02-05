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
import { getCdnUrl } from "@/lib/cdn";

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
          setInvoiceUrl(data.invoiceUrl);
          setPaymentId(data.paymentId);
          setIsProcessing(false);
          toast.success("تم إنشاء رابط الدفع بنجاح");
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
                  src={getCdnUrl("/logo.png")}
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
              <div className="w-full" style={{ minHeight: '800px' }}>
                <iframe
                  src={invoiceUrl}
                  className="w-full border-0 rounded-lg"
                  style={{ minHeight: '800px', width: '100%' }}
                  title="Fawaterak Payment"
                  allow="payment *"
                  sandbox="allow-forms allow-scripts allow-same-origin allow-popups allow-top-navigation allow-modals"
                />
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
