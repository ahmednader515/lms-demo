"use client";

import { useSession } from "next-auth/react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";

export const BalanceTest = () => {
  const { data: session, status } = useSession();
  const [amount, setAmount] = useState("");
  const [isLoading, setIsLoading] = useState(false);

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
        toast.success("تم إضافة الرصيد بنجاح");
        setAmount("");
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

  if (status === "loading") {
    return <div>Loading...</div>;
  }

  if (status === "unauthenticated") {
    return <div>Please sign in to test balance functionality</div>;
  }

  const isStudent = session?.user?.role === "USER";
  const canAddBalance = !isStudent;

  return (
    <div className="p-4 border rounded-lg bg-muted">
      <h3 className="text-lg font-semibold mb-4">Balance Test</h3>
      <div className="space-y-4">
        <div className="space-y-2 text-sm">
          <p><strong>Current User:</strong> {session?.user?.name}</p>
          <p><strong>Role:</strong> {session?.user?.role}</p>
          <p><strong>Can Add Balance:</strong> {canAddBalance ? "Yes" : "No"}</p>
        </div>
        
        {canAddBalance ? (
          <Card>
            <CardHeader>
              <CardTitle>Add Balance Test</CardTitle>
              <CardDescription>Test adding balance to account</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex gap-4">
                <Input
                  type="number"
                  placeholder="Enter amount"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  min="0"
                  step="0.01"
                  className="flex-1"
                />
                <Button 
                  onClick={handleAddBalance}
                  disabled={isLoading}
                  className="bg-[#211FC3] hover:bg-[#211FC3]/90"
                >
                  {isLoading ? "Adding..." : "Add Balance"}
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle>Student Balance Access</CardTitle>
              <CardDescription>Students cannot add balance to their account</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                As a student, you can only view your balance and transaction history. 
                You cannot add balance to your account.
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}; 