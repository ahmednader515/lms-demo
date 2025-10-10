"use client";

import { useSession, signOut } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { LogOut } from "lucide-react";

export const LogoutTest = () => {
  const { data: session, status } = useSession();

  const handleLogout = () => {
    console.log("🔍 LogoutTest: Logging out user:", session?.user?.name);
    signOut({ callbackUrl: "/" });
  };

  if (status === "loading") {
    return <div>Loading...</div>;
  }

  if (status === "unauthenticated") {
    return <div>Please sign in to test logout functionality</div>;
  }

  return (
    <div className="p-4 border rounded-lg bg-muted">
      <h3 className="text-lg font-semibold mb-2">Logout Test</h3>
      <div className="space-y-2 text-sm mb-4">
        <p><strong>Current User:</strong> {session?.user?.name}</p>
        <p><strong>Role:</strong> {session?.user?.role}</p>
        <p><strong>Status:</strong> {status}</p>
      </div>
      <Button 
        size="sm" 
        variant="ghost" 
        onClick={handleLogout}
        className="text-red-600 hover:text-red-700 hover:bg-red-50 transition-colors duration-200 ease-in-out"
      >
        <LogOut className="h-4 w-4 rtl:ml-2 ltr:mr-2"/>
        تسجيل الخروج
      </Button>
    </div>
  );
}; 