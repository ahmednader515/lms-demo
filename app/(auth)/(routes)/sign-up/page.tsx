"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import Link from "next/link";
import axios, { AxiosError } from "axios";
import { Check, X, Eye, EyeOff, ChevronLeft } from "lucide-react";
import Image from "next/image";
// Removed CDN import - using local images

export default function SignUpPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [formData, setFormData] = useState({
    fullName: "",
    phoneNumber: "",
    parentPhoneNumber: "",
    password: "",
    confirmPassword: "",
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const validatePasswords = () => {
    return {
      match: formData.password === formData.confirmPassword,
      isValid: formData.password === formData.confirmPassword && formData.password.length > 0,
    };
  };

  const passwordChecks = validatePasswords();

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);

    if (!passwordChecks.isValid) {
      toast.error("كلمات المرور غير متطابقة");
      setIsLoading(false);
      return;
    }

    try {
      const response = await axios.post("/api/auth/register", formData);
      
      if (response.data.success) {
        toast.success("تم إنشاء الحساب بنجاح");
        router.push("/sign-in");
      }
    } catch (error) {
      const axiosError = error as AxiosError;
      if (axiosError.response?.status === 400) {
        const errorMessage = axiosError.response.data as string;
        if (errorMessage.includes("Phone number already exists")) {
          toast.error("رقم الهاتف مسجل مسبقاً");
        } else if (errorMessage.includes("Parent phone number already exists")) {
          toast.error("رقم هاتف الوالد مسجل مسبقاً");
        } else if (errorMessage.includes("Passwords do not match")) {
          toast.error("كلمات المرور غير متطابقة");
        } else {
          toast.error("حدث خطأ أثناء إنشاء الحساب");
        }
      } else {
        toast.error("حدث خطأ أثناء إنشاء الحساب");
      }
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
                src="/logo.png"
                alt="Teacher"
                fill
                className="object-cover rounded-full border-4 border-[#211FC3]/20 shadow-2xl"
                unoptimized
              />
            </div>
            <div className="space-y-4">
              <h3 className="text-2xl font-bold text-[#211FC3]">
                مرحباً بك في منصة مستقبلنا التعليمية
              </h3>
              <p className="text-lg text-muted-foreground max-w-md">
                انضم إلينا اليوم وابدأ رحلة التعلم مع أفضل المدرسين
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Left Side - Form */}
      <div className="flex-1 flex items-start justify-center p-8">
        <div className="w-full max-w-md space-y-6 py-8 mt-8">
          <div className="space-y-2 text-center">
            <h2 className="text-3xl font-bold tracking-tight mt-8">
              إنشاء حساب جديد
            </h2>
            <p className="text-sm text-muted-foreground">
              أدخل بياناتك لإنشاء حساب جديد
            </p>
          </div>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="fullName">الاسم الكامل</Label>
              <Input
                id="fullName"
                name="fullName"
                type="text"
                autoComplete="name"
                required
                disabled={isLoading}
                className="h-10"
                value={formData.fullName}
                onChange={handleInputChange}
              />
            </div>
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
              <Label htmlFor="parentPhoneNumber">رقم هاتف الوالد</Label>
              <Input
                id="parentPhoneNumber"
                name="parentPhoneNumber"
                type="tel"
                autoComplete="tel"
                required
                disabled={isLoading}
                className="h-10"
                value={formData.parentPhoneNumber}
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
                  autoComplete="new-password"
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

            <div className="space-y-2">
              <Label htmlFor="confirmPassword">تأكيد كلمة المرور</Label>
              <div className="relative">
                <Input
                  id="confirmPassword"
                  name="confirmPassword"
                  type={showConfirmPassword ? "text" : "password"}
                  autoComplete="new-password"
                  required
                  disabled={isLoading}
                  className="h-10"
                  value={formData.confirmPassword}
                  onChange={handleInputChange}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute left-0 top-1/2 -translate-y-1/2 h-8 w-8 p-0 hover:bg-transparent"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                >
                  {showConfirmPassword ? (
                    <EyeOff className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <Eye className="h-4 w-4 text-muted-foreground" />
                  )}
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-2">
                {passwordChecks.match ? (
                  <Check className="h-4 w-4 text-green-500" />
                ) : (
                  <X className="h-4 w-4 text-red-500" />
                )}
                <span className="text-sm text-muted-foreground">كلمات المرور متطابقة</span>
              </div>
            </div>

            <Button
              type="submit"
              className="w-full h-10 bg-[#211FC3] hover:bg-[#211FC3]/90 text-white"
              disabled={isLoading || !passwordChecks.isValid}
            >
              {isLoading ? "جاري إنشاء الحساب..." : "إنشاء حساب"}
            </Button>
          </form>
          <div className="text-center text-sm">
            <span className="text-muted-foreground">لديك حساب بالفعل؟ </span>
            <Link 
              href="/sign-in" 
              className="text-primary hover:underline transition-colors"
            >
              تسجيل الدخول
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
} 