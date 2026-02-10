"use client";

import { useState, useEffect, useCallback, Suspense } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { useSession } from "next-auth/react";
import { useSearchParams } from "next/navigation";
import { Wallet, Plus, History, ArrowUpRight, CreditCard, Loader2 } from "lucide-react";

interface BalanceTransaction {
  id: string;
  amount: number;
  type: "DEPOSIT" | "PURCHASE";
  description: string;
  createdAt: string;
}

interface PaymentMethod {
  id: string;
  originalId?: string;
  name: string;
  icon?: string;
  commission?: number;
}

// Map payment method IDs to route slugs
const getPaymentMethodRoute = (methodId: string, methodName: string, originalId?: string): string | null => {
  const methodIdLower = String(methodId || '').toLowerCase();
  const methodNameLower = String(methodName || '').toLowerCase();
  const originalIdLower = String(originalId || '').toLowerCase();
  
  // Check original ID first (most reliable)
  if (originalIdLower.includes('vodafone') || originalIdLower === 'vodafone_cash') {
    return 'vodafone-cash';
  }
  if (originalIdLower.includes('orange') || originalIdLower === 'orange_cash') {
    return 'orange-cash';
  }
  if (originalIdLower.includes('etisalat') || originalIdLower === 'etisalat_cash') {
    return 'etisalat-cash';
  }
  if (originalIdLower.includes('we') || originalIdLower === 'we_cash') {
    return 'we-cash';
  }
  if (originalIdLower.includes('fawry') || originalIdLower === 'fawry') {
    return 'fawry';
  }
  if (originalIdLower.includes('meeza') || originalIdLower.includes('visa') || 
      originalIdLower.includes('mastercard') || originalIdLower.includes('card')) {
    return 'meeza-visa-mastercard';
  }
  
  // Fallback to method ID
  if (methodIdLower.includes('vodafone') || methodNameLower.includes('vodafone')) {
    return 'vodafone-cash';
  }
  if (methodIdLower.includes('orange') || methodNameLower.includes('orange')) {
    return 'orange-cash';
  }
  if (methodIdLower.includes('etisalat') || methodNameLower.includes('etisalat')) {
    return 'etisalat-cash';
  }
  if (methodIdLower.includes('we') || methodNameLower.includes('we cash')) {
    return 'we-cash';
  }
  if (methodIdLower.includes('fawry') || methodNameLower.includes('fawry')) {
    return 'fawry';
  }
  if (methodIdLower.includes('meeza') || methodIdLower.includes('visa') || 
      methodIdLower.includes('mastercard') || methodNameLower.includes('meeza') ||
      methodNameLower.includes('visa') || methodNameLower.includes('mastercard')) {
    return 'meeza-visa-mastercard';
  }
  
  return null;
};

function BalancePageContent() {
  const { data: session } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [balance, setBalance] = useState(0);
  const [amount, setAmount] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [transactions, setTransactions] = useState<BalanceTransaction[]>([]);
  const [isLoadingTransactions, setIsLoadingTransactions] = useState(true);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<string | null>(null);
  const [isLoadingMethods, setIsLoadingMethods] = useState(false);
  const [isCreatingPayment, setIsCreatingPayment] = useState(false);
  const [paymentRedirectHandled, setPaymentRedirectHandled] = useState(false);

  // Check if user is a student (USER role)
  const isStudent = session?.user?.role === "USER";

  useEffect(() => {
    fetchBalance();
    fetchTransactions();

    // Fetch payment methods for students
    if (isStudent) {
      fetchPaymentMethods();
    }

    // Handle payment redirect status from Fawaterak plugin
    const paymentId = searchParams?.get("payment");
    const status = searchParams?.get("status");
    
    if (paymentId && status && !paymentRedirectHandled) {
      setPaymentRedirectHandled(true);
      
      if (status === "success") {
        // Verify payment status and update balance if needed
        verifyAndUpdateBalance(paymentId);
      } else if (status === "fail") {
        toast.error("فشلت عملية الدفع");
        router.replace("/dashboard/balance");
      } else if (status === "pending") {
        toast.info("قيد معالجة الدفع... سيتم تحديث الرصيد تلقائياً عند اكتمال الدفع");
        router.replace("/dashboard/balance");
      }
    }
  }, [isStudent, searchParams, router, paymentRedirectHandled]);

  // Payment status is handled by webhooks, no need to track activePaymentId

  const fetchBalance = async () => {
    try {
      const response = await fetch("/api/user/balance");
      if (response.ok) {
        const data = await response.json();
        setBalance(data.balance);
      }
    } catch (error) {
      console.error("Error fetching balance:", error);
    }
  };

  const fetchTransactions = async () => {
    try {
      const response = await fetch("/api/balance/transactions");
      if (response.ok) {
        const data = await response.json();
        setTransactions(data);
      }
    } catch (error) {
      console.error("Error fetching transactions:", error);
    } finally {
      setIsLoadingTransactions(false);
    }
  };

  const fetchPaymentMethods = async () => {
    setIsLoadingMethods(true);
    try {
      const response = await fetch("/api/payment/fawaterak/methods");
      if (response.ok) {
        const data = await response.json();
        setPaymentMethods(data.methods || []);
      }
    } catch (error) {
      console.error("Error fetching payment methods:", error);
    } finally {
      setIsLoadingMethods(false);
    }
  };

  // Verify payment status and update balance if needed
  const verifyAndUpdateBalance = async (paymentId: string) => {
    try {
      console.log("[BALANCE] Verifying payment status for:", paymentId);
      
      // First, refresh the balance from the server to get the latest data
      await fetchBalance();
      
      // Then verify the payment status
      const response = await fetch(`/api/payment/fawaterak/status/${paymentId}`);
      
      if (response.ok) {
        const paymentData = await response.json();
        console.log("[BALANCE] Payment status:", paymentData.status);
        
        if (paymentData.status === "PAID") {
          // Payment is confirmed as PAID, refresh balance and transactions again
          toast.success("تم إتمام عملية الدفع بنجاح");
          await fetchBalance();
          await fetchTransactions();
        } else if (paymentData.status === "PENDING") {
          // Payment is still pending, check again after a delay
          toast.info("قيد معالجة الدفع... سيتم تحديث الرصيد تلقائياً عند اكتمال الدفع");
          // Try again after 3 seconds
          setTimeout(async () => {
            console.log("[BALANCE] Retrying payment verification...");
            await verifyAndUpdateBalance(paymentId);
          }, 3000);
        } else {
          // Payment failed or was cancelled, but we already refreshed the balance
          console.log("[BALANCE] Payment status is:", paymentData.status);
        }
      } else {
        console.error("[BALANCE] Failed to verify payment status");
        // Balance was already refreshed above
      }
      
      // Clean URL after verification is complete
      router.replace("/dashboard/balance");
    } catch (error) {
      console.error("[BALANCE] Error verifying payment:", error);
      // Fallback: just refresh balance and show success
      await fetchBalance();
      await fetchTransactions();
      toast.success("تم إتمام عملية الدفع بنجاح");
      // Clean URL even on error
      router.replace("/dashboard/balance");
    }
  };

  // No polling needed - webhooks handle payment updates automatically

  const handleAddBalance = async () => {
    if (!amount || parseFloat(amount) <= 0) {
      toast.error("يرجى إدخال مبلغ صحيح");
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch("/api/balance/add", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ amount: parseFloat(amount) }),
      });

      if (response.ok) {
        const data = await response.json();
        setBalance(data.newBalance);
        setAmount("");
        toast.success("تم إضافة الرصيد بنجاح");
        fetchTransactions(); // Refresh transactions
      } else {
        const error = await response.text();
        toast.error(error || "حدث خطأ أثناء إضافة الرصيد");
      }
    } catch (error) {
      console.error("Error adding balance:", error);
      toast.error("حدث خطأ أثناء إضافة الرصيد");
    } finally {
      setIsLoading(false);
    }
  };

  const handleFawaterakPayment = async () => {
    if (!amount || parseFloat(amount) <= 0) {
      toast.error("يرجى إدخال مبلغ صحيح");
      return;
    }

    if (parseFloat(amount) < 1) {
      toast.error("الحد الأدنى للمبلغ هو 1 جنيه");
      return;
    }

    if (!selectedPaymentMethod) {
      toast.error("يرجى اختيار طريقة الدفع");
      return;
    }

    // Find the selected payment method
    const selectedMethod = paymentMethods.find(m => {
      const methodId = String(m.id || '');
      return methodId === selectedPaymentMethod || m.id === selectedPaymentMethod;
    });

    if (!selectedMethod) {
      toast.error("طريقة الدفع غير صحيحة");
      return;
    }

    // Get the route for the payment method
    const paymentRoute = getPaymentMethodRoute(selectedMethod.id, selectedMethod.name, selectedMethod.originalId);

    // Navigate to Fawaterak plugin payment page
    router.push(`/dashboard/balance/payment-plugin?amount=${amount}`);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("ar-EG", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">إدارة الرصيد</h1>
          <p className="text-muted-foreground">
            {isStudent 
              ? "أضف رصيد إلى حسابك عبر طرق الدفع المتاحة" 
              : "أضف رصيد إلى حسابك لشراء الكورسات"
            }
          </p>
        </div>
      </div>

      {/* Balance Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Wallet className="h-5 w-5" />
            رصيد الحساب
          </CardTitle>
          <CardDescription>
            الرصيد المتاح في حسابك
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-bold text-[#211FC3]">
            {balance.toFixed(2)} جنيه
          </div>
        </CardContent>
      </Card>

      {/* Add Balance Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Plus className="h-5 w-5" />
            {isStudent ? "إضافة رصيد عبر الدفع الإلكتروني" : "إضافة رصيد"}
          </CardTitle>
          <CardDescription>
            {isStudent 
              ? "اختر طريقة الدفع وأدخل المبلغ لإضافة رصيد إلى حسابك"
              : "أضف مبلغ إلى رصيد حسابك"
            }
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-4">
            <Input
              type="number"
              placeholder="أدخل المبلغ (الحد الأدنى: 1 جنيه)"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              min="1"
              step="0.01"
              className="flex-1"
            />
            {!isStudent && (
              <Button 
                onClick={handleAddBalance}
                disabled={isLoading}
                className="bg-[#211FC3] hover:bg-[#211FC3]/90"
              >
                {isLoading ? "جاري الإضافة..." : "إضافة الرصيد"}
              </Button>
            )}
          </div>

          {/* Payment Methods for Students */}
          {isStudent && (
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium mb-2 block">
                  اختر طريقة الدفع
                </label>
                {isLoadingMethods ? (
                  <div className="flex items-center justify-center py-4">
                    <Loader2 className="h-5 w-5 animate-spin text-[#211FC3]" />
                    <span className="ml-2 text-sm text-muted-foreground">جاري تحميل طرق الدفع...</span>
                  </div>
                ) : paymentMethods.length > 0 ? (
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    {paymentMethods.map((method, index) => {
                      // Ensure unique ID for each method
                      const methodId = String(method.id || `method-${index}`);
                      // Strict comparison - only match exact string
                      const isSelected = selectedPaymentMethod === methodId;
                      
                      return (
                        <button
                          key={`payment-method-${index}-${methodId}`}
                          type="button"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            console.log("Selected method:", {
                              id: method.id,
                              methodId,
                              name: method.name,
                              currentSelected: selectedPaymentMethod
                            });
                            setSelectedPaymentMethod(methodId);
                          }}
                          className={`p-8 border-2 rounded-lg text-center transition-all flex flex-col items-center justify-center min-h-[180px] ${
                            isSelected
                              ? "border-[#211FC3] bg-[#211FC3]/10 shadow-md ring-2 ring-[#211FC3]/20"
                              : "border-gray-200 hover:border-gray-300 hover:shadow-sm"
                          }`}
                        >
                          {method.icon ? (
                            <img 
                              src={method.icon} 
                              alt={method.name} 
                              className="h-32 w-32 object-contain mx-auto mb-4"
                              onError={(e) => {
                                // Fallback to icon if image fails to load
                                e.currentTarget.style.display = 'none';
                              }}
                            />
                          ) : (
                            <CreditCard className={`h-32 w-32 ${isSelected ? "text-[#211FC3]" : "text-gray-600"}`} />
                          )}
                        </button>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-center py-4 text-muted-foreground">
                    <p>لا توجد طرق دفع متاحة حالياً</p>
                  </div>
                )}
              </div>

              <Button
                onClick={handleFawaterakPayment}
                disabled={isCreatingPayment || !amount || parseFloat(amount) < 1}
                className="w-full bg-[#211FC3] hover:bg-[#211FC3]/90"
              >
                {isCreatingPayment ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    جاري إنشاء رابط الدفع...
                  </>
                ) : (
                  "الانتقال إلى صفحة الدفع"
                )}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Transaction History */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <History className="h-5 w-5" />
            سجل المعاملات
          </CardTitle>
          <CardDescription>
            تاريخ جميع المعاملات المالية
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoadingTransactions ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#211FC3] mx-auto"></div>
              <p className="mt-2 text-muted-foreground">جاري التحميل...</p>
            </div>
          ) : transactions.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground">لا توجد معاملات حتى الآن</p>
            </div>
          ) : (
            <div className="space-y-4">
              {transactions.map((transaction) => (
                <div
                  key={transaction.id}
                  className="flex items-center justify-between p-4 border rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-full ${
                      transaction.type === "DEPOSIT" 
                        ? "bg-green-100 text-green-600" 
                        : "bg-red-100 text-red-600"
                    }`}>
                      {transaction.type === "DEPOSIT" ? (
                        <Plus className="h-4 w-4" />
                      ) : (
                        <ArrowUpRight className="h-4 w-4" />
                      )}
                    </div>
                                         <div>
                       <p className="font-medium">
                         {transaction.description.includes("Added") && transaction.type === "DEPOSIT" 
                           ? transaction.description.replace(/Added (\d+(?:\.\d+)?) EGP to balance/, "تم إضافة $1 جنيه إلى الرصيد")
                           : transaction.description.includes("Purchased course:") && transaction.type === "PURCHASE"
                           ? transaction.description.replace(/Purchased course: (.+)/, "تم شراء الكورس: $1")
                           : transaction.description
                         }
                       </p>
                       <p className="text-sm text-muted-foreground">
                         {formatDate(transaction.createdAt)}
                       </p>
                       <p className="text-xs text-muted-foreground">
                         {transaction.type === "DEPOSIT" ? "إيداع" : "شراء كورس"}
                       </p>
                     </div>
                  </div>
                  <div className={`font-bold ${
                    transaction.type === "DEPOSIT" ? "text-green-600" : "text-red-600"
                  }`}>
                    {transaction.type === "DEPOSIT" ? "+" : "-"}
                    {Math.abs(transaction.amount).toFixed(2)} جنيه
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default function BalancePage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-[#211FC3]" />
      </div>
    }>
      <BalancePageContent />
    </Suspense>
  );
} 