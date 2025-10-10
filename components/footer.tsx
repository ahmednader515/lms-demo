"use client";

import { usePathname } from "next/navigation";

export const Footer = () => {
  const pathname = usePathname();
  
  // Check if we're on a page with a sidebar
  const hasSidebar = pathname?.startsWith('/dashboard') || pathname?.startsWith('/courses');
  
  return (
    <footer className="py-6 border-t">
      <div className="container mx-auto px-4">
        <div className={`text-center text-muted-foreground ${
          hasSidebar 
            ? 'md:rtl:pr-56 md:ltr:pl-56 lg:rtl:pr-80 lg:ltr:pl-80' 
            : ''
        }`}>
          <div className="inline-block bg-[#211FC3]/10 border-2 border-[#211FC3]/20 rounded-lg px-6 py-3 mb-4">
            <p className="font-semibold text-lg text-[#211FC3]">الدعم الفني: 01559500840 - 01067774998</p>
          </div>
          <p>© {new Date().getFullYear()} Mordesu Studio. جميع الحقوق محفوظة</p>
        </div>
      </div>
    </footer>
  );
}; 