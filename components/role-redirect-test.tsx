"use client";

import { useSession } from "next-auth/react";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { getDashboardUrlByRole } from "@/lib/utils";

export const RoleRedirectTest = () => {
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === "authenticated" && session?.user?.role) {
      console.log("🔍 RoleRedirectTest: User authenticated with role:", session.user.role);
      
      // Test the role-based redirection
      const dashboardUrl = getDashboardUrlByRole(session.user.role);
      console.log("🔍 RoleRedirectTest: Should redirect to:", dashboardUrl);
      
      // You can uncomment the next line to test automatic redirection
      // router.push(dashboardUrl);
    }
  }, [session, status, router]);

  if (status === "loading") {
    return <div>Loading...</div>;
  }

  if (status === "unauthenticated") {
    return <div>Please sign in to test role-based redirection</div>;
  }

  return (
    <div className="p-4 border rounded-lg bg-muted">
      <h3 className="text-lg font-semibold mb-2">Role-Based Redirection Test</h3>
      <div className="space-y-2 text-sm">
        <p><strong>Current User:</strong> {session?.user?.name}</p>
        <p><strong>Role:</strong> {session?.user?.role}</p>
        <p><strong>Should Redirect To:</strong> {getDashboardUrlByRole(session?.user?.role || "USER")}</p>
        <p><strong>Current Path:</strong> {typeof window !== "undefined" ? window.location.pathname : "Server-side"}</p>
      </div>
    </div>
  );
}; 