import { AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";

interface BannerProps {
    label: string;
    variant?: "default" | "warning" | "success";
}

export const Banner = ({
    label,
    variant = "default"
}: BannerProps) => {
    return (
        <div className={cn(
            "flex items-center gap-x-2 p-3 text-sm rounded-md",
            variant === "default" && "bg-primary/10 text-primary",
            variant === "warning" && "bg-destructive/10 text-destructive",
            variant === "success" && "bg-emerald-500/10 text-emerald-500"
        )}>
            <AlertTriangle className="h-4 w-4" />
            {label}
        </div>
    );
}; 