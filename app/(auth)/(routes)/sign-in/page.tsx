"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { LoadingButton } from "@/components/ui/loading-button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import Link from "next/link";
import { signIn } from "next-auth/react";
import { Eye, EyeOff, ChevronLeft } from "lucide-react";
import Image from "next/image";
import { getDashboardUrlByRole } from "@/lib/utils";
import { getCdnUrl } from "@/lib/cdn";

export default function SignInPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({
    phoneNumber: "",
    password: "",
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const result = await signIn("credentials", {
        phoneNumber: formData.phoneNumber,
        password: formData.password,
        redirect: false,
      });

      if (result?.error) {
        if (result.error === "CredentialsSignin") {
          toast.error("رقم الهاتف أو كلمة المرور غير صحيحة");
        } else {
          toast.error("حدث خطأ أثناء تسجيل الدخول");
        }
        return;
      }

      toast.success("تم تسجيل الدخول بنجاح");
      
      // Get user data to determine role and redirect accordingly
      const response = await fetch("/api/auth/session", { cache: "no-store" });
      const sessionData = await response.json();
      const userRole = sessionData?.user?.role || "USER";
      const dashboardUrl = getDashboardUrlByRole(userRole);

      // Force a full reload to ensure fresh session on the dashboard
      const target = `${dashboardUrl}?t=${Date.now()}`;
      if (typeof window !== "undefined") {
        window.location.replace(target);
      } else {
        router.replace(target);
      }
    } catch {
      toast.error("حدث خطأ أثناء تسجيل الدخول");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen bg-background overflow-y-auto">
      <div className="absolute top-4 left-4 z-10">
        <Button variant="ghost" size="lg" asChild>
          <Link href="/">
            <ChevronLeft className="h-10 w-10" />
          </Link>
        </Button>
      </div>
      
      {/* Right Side - Image */}
      <div className="hidden lg:flex flex-1 bg-gradient-to-br from-[#211FC3]/10 to-[#211FC3]/5 relative overflow-hidden">
        <div className="absolute inset-0 bg-[#211FC3]/5"></div>
        <div className="relative z-10 flex items-center justify-center w-full">
          <div className="text-center space-y-6 p-8">
            <div className="relative w-64 h-64 mx-auto">
              <Image
                src={getCdnUrl("/logo.png")}
                alt="Teacher"
                fill
                className="object-cover rounded-full border-4 border-[#211FC3]/20 shadow-2xl"
                unoptimized
              />
            </div>
            <div className="space-y-4">
              <h3 className="text-2xl font-bold text-[#211FC3]">
                مرحباً بك مرة أخرى
              </h3>
              <p className="text-lg text-muted-foreground max-w-md">
                سجل دخولك واستكشف الكورسات التعليمية المميزة
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Left Side - Form */}
      <div className="flex-1 flex items-start justify-center p-8">
        <div className="w-full max-w-md space-y-6 py-8 mt-8">
          <div className="space-y-2 text-center">
            <h2 className="text-3xl font-bold tracking-tight">
              تسجيل الدخول
            </h2>
            <p className="text-sm text-muted-foreground">
              أدخل رقم هاتفك وكلمة المرور للدخول إلى حسابك
            </p>
          </div>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="phoneNumber">رقم الهاتف</Label>
              <Input
                id="phoneNumber"
                name="phoneNumber"
                type="tel"
                autoComplete="tel"
                required
                disabled={isLoading}
                className="h-10"
                value={formData.phoneNumber}
                onChange={handleInputChange}
                placeholder="+20XXXXXXXXXX"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">كلمة المرور</Label>
              <div className="relative">
                <Input
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  required
                  disabled={isLoading}
                  className="h-10"
                  value={formData.password}
                  onChange={handleInputChange}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute left-0 top-1/2 -translate-y-1/2 h-8 w-8 p-0 hover:bg-transparent"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <Eye className="h-4 w-4 text-muted-foreground" />
                  )}
                </Button>
              </div>
            </div>

            <LoadingButton
              type="submit"
              loading={isLoading}
              loadingText="جاري تسجيل الدخول..."
              className="w-full h-10 bg-[#211FC3] hover:bg-[#211FC3]/90 text-white"
            >
              تسجيل الدخول
            </LoadingButton>
          </form>
          <div className="text-center text-sm">
            <span className="text-muted-foreground">ليس لديك حساب؟ </span>
            <Link 
              href="/sign-up" 
              className="text-primary hover:underline transition-colors"
            >
              إنشاء حساب جديد
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
} 