"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search } from "lucide-react";

export const SearchInput = () => {
    const router = useRouter();
    const searchParams = useSearchParams();

    const onSubmit = (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();

        const formData = new FormData(e.currentTarget);
        const title = formData.get("title") as string;

        if (title) {
            router.push(`/dashboard/search?title=${title}`);
        } else {
            router.push("/dashboard/search");
        }
    };

    return (
        <form onSubmit={onSubmit} className="flex items-center gap-x-3 w-full max-w-2xl">
            <div className="relative flex-1">
                <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                    name="title"
                    placeholder="ابحث عن كورسات تعليمية..."
                    defaultValue={searchParams.get("title") || ""}
                    className="h-12 pr-10 pl-4 text-base border-2 focus:border-[#211FC3] transition-colors"
                />
            </div>
            <Button 
                type="submit" 
                className="h-12 px-6 bg-[#211FC3] hover:bg-[#211FC3]/90 text-white font-semibold transition-all duration-200 hover:scale-105"
            >
                <Search className="h-4 w-4 ml-2" />
                بحث
            </Button>
        </form>
    );
}; 