"use client";

import { formatPrice } from "@/lib/format";
import Link from "next/link";
import Image from "next/image";
import { Progress } from "@/components/ui/progress";

interface CourseCardProps {
    id: string;
    title: string;
    imageUrl: string;
    chaptersLength: number;
    quizzesLength?: number;
    price: number;
    progress: number | null;
    user: {
        name: string;
        image: string;
    };
}

export const CourseCard = ({
    id,
    title,
    imageUrl,
    chaptersLength,
    quizzesLength = 0,
    price,
    progress,
    user,
}: CourseCardProps) => {
    return (
        <Link href={`/courses/${id}`}>
            <div className="group hover:shadow-sm transition overflow-hidden border rounded-lg p-3 h-full">
                <div className="relative w-full aspect-video rounded-md overflow-hidden">
                    <Image
                        fill
                        className="object-cover"
                        alt={title}
                        src={imageUrl}
                    />
                </div>
                <div className="flex flex-col pt-2">
                    <div className="text-lg md:text-base font-medium group-hover:text-sky-700 transition line-clamp-2">
                        {title}
                    </div>
                    <p className="text-xs text-muted-foreground">
                        {chaptersLength} {chaptersLength === 1 ? "فصل" : "فصول"}
                        {quizzesLength > 0 && (
                            <span>، {quizzesLength} {quizzesLength === 1 ? "اختبار" : "اختبارات"}</span>
                        )}
                    </p>
                    {progress !== null ? (
                        <Progress
                            value={progress}
                            className="h-2"
                        />
                    ) : (
                        <p className="text-md md:text-sm font-medium text-slate-700">
                            {formatPrice(price)}
                        </p>
                    )}
                    <div className="flex items-center gap-x-2 mt-2">
                        <Image
                            src={user.image}
                            alt={user.name}
                            width={24}
                            height={24}
                            className="rounded-full"
                        />
                        <p className="text-xs text-muted-foreground">
                            {user.name}
                        </p>
                    </div>
                </div>
            </div>
        </Link>
    );
}; 