"use client";

import { Course, Chapter } from "@prisma/client";
import { cn } from "@/lib/utils";
import { CheckCircle, Lock } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

interface CourseSidebarProps {
  course: Course & {
    chapters: Chapter[];
  };
  progress: number;
}

export const CourseSidebar = ({
  course,
  progress,
}: CourseSidebarProps) => {
  const pathname = usePathname();

  return (
    <div className="h-full border-r flex flex-col overflow-y-auto shadow-sm">
      <div className="p-8 flex flex-col border-b">
        <h1 className="font-semibold">
          {course.title}
        </h1>
        <div className="mt-4">
          <div className="flex items-center gap-x-2">
            <div className="text-sm font-medium">
              التقدم: {progress}%
            </div>
          </div>
        </div>
      </div>
      <div className="flex flex-col w-full">
        {course.chapters.map((chapter) => {
          const isActive = pathname === `/courses/${course.id}/chapter/${chapter.id}`;
          const isLocked = !chapter.isFree;

          return (
            <Link
              key={chapter.id}
              href={isLocked ? "#" : `/courses/${course.id}/chapter/${chapter.id}`}
              className={cn(
                "flex items-center gap-x-2 text-slate-500 text-sm font-[500] pl-6 transition-all hover:text-slate-600 hover:bg-slate-300/20",
                isActive && "text-slate-700 bg-slate-200/20 hover:bg-slate-200/20 hover:text-slate-700",
                isLocked && "text-slate-400 hover:text-slate-400 hover:bg-transparent cursor-not-allowed"
              )}
            >
              <div className="flex items-center gap-x-2 py-4">
                {isLocked ? (
                  <Lock
                    className="h-4 w-4 text-slate-400"
                  />
                ) : (
                  <CheckCircle
                    className={cn(
                      "h-4 w-4",
                      isActive ? "text-slate-700" : "text-slate-400"
                    )}
                  />
                )}
                <span>
                  {chapter.title}
                </span>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
};

export default CourseSidebar; 