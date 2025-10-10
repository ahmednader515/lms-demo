"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function AdminRedirect() {
    const router = useRouter();

    useEffect(() => {
        router.replace("/dashboard/admin/users");
    }, [router]);

    return (
        <div className="h-full flex items-center justify-center">
            <div className="text-center">
                <div className="text-lg">جاري التوجيه...</div>
            </div>
        </div>
    );
} 