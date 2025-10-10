"use client";

import { cn } from "@/lib/utils";
import { LucideIcon } from "lucide-react";
import { usePathname } from "next/navigation";
import { useRouter } from "next/navigation";
import { SheetClose } from "@/components/ui/sheet";

interface SidebarItemProps {
    icon: LucideIcon;
    label: string;
    href: string;
    closeOnClick?: boolean;
}

export const SidebarItem = ({
    icon: Icon,
    label,
    href,
    closeOnClick = false
}: SidebarItemProps) => {

    const pathName = usePathname();
    const router = useRouter();
    

    const isActive = pathName === href;

    const onClick = () => {
        if (!isActive) router.push(href);
    }

    const ButtonEl = (
        <button
            onClick={onClick}
            type="button"
            className={cn(
                "flex items-center gap-x-2 text-muted-foreground text-sm font-[500] rtl:pr-6 ltr:pl-6 transition-all hover:text-primary hover:bg-primary/10",
                isActive && "text-primary bg-primary/10 hover:bg-primary/10"
            )}
        >
            <div className="flex items-center gap-x-2 py-3">
                <Icon 
                    size={22} 
                    className={cn(
                        "text-muted-foreground",
                        isActive && "text-primary"
                    )} 
                />
                {label}
            </div>

            <div 
                className={cn(
                    "rtl:mr-auto ltr:ml-auto opacity-0 border-2 border-primary h-full transition-all",
                    isActive && "opacity-100"
                )}
            />
        </button>
    );

    return closeOnClick ? (
        <SheetClose asChild>
            {ButtonEl}
        </SheetClose>
    ) : (
        ButtonEl
    );
}