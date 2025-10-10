"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search } from "lucide-react";
import { useEffect, useState } from "react";

export const SearchInput = () => {
    const router = useRouter();
    const searchParams = useSearchParams();
    const [searchValue, setSearchValue] = useState("");

    useEffect(() => {
        const title = searchParams.get("title");
        if (title) {
            setSearchValue(title);
        }
    }, [searchParams]);

    const onSubmit = (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();

        const formData = new FormData(e.currentTarget);
        const title = formData.get("title") as string;

        if (title) {
            router.push(`/dashboard/search?title=${encodeURIComponent(title)}`);
        } else {
            router.push("/dashboard/search");
        }
    };

    return (
        <form onSubmit={onSubmit} className="flex items-center gap-x-2">
            <Input
                name="title"
                placeholder="ابحث عن كورسات..."
                value={searchValue}
                onChange={(e) => setSearchValue(e.target.value)}
                className="h-10"
            />
            <Button type="submit" size="sm">
                <Search className="h-4 w-4" />
            </Button>
        </form>
    );
}; 