"use client";

import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Menu } from "lucide-react";
import { CourseSidebar } from "./course-sidebar";
import { DialogTitle } from "@/components/ui/dialog";

export const CourseMobileSidebar = () => {
  return (
    <Sheet>
      <SheetTrigger className="md:hidden pl-4 hover:opacity-75 transition">
        <div className="flex items-center justify-center h-10 w-10 rounded-md hover:bg-slate-100">
          <Menu className="h-6 w-6" />
        </div>
      </SheetTrigger>
      <SheetContent side="right" className="p-0 w-72">
        <DialogTitle className="sr-only">Course Menu</DialogTitle>
        <CourseSidebar />
      </SheetContent>
    </Sheet>
  );
}; 