"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

const RedirectPage = () => {
  const router = useRouter();

  useEffect(() => {
    router.replace("/dashboard/dashboard/teacher/analytics");
  }, [router]);

  return (
    <div className="h-full flex items-center justify-center">
      <p className="text-muted-foreground">Redirecting...</p>
    </div>
  );
};

export default RedirectPage;