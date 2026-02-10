import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

// Helper function to get dashboard URL by role
function getDashboardUrlByRole(role: string): string {
  switch (role) {
    case "TEACHER":
      return "/dashboard/teacher/courses";
    case "ADMIN":
      return "/dashboard/admin/users";
    case "USER":
    default:
      return "/dashboard";
  }
}

export default withAuth(
  function middleware(req) {
    const isTeacherRoute = req.nextUrl.pathname.startsWith("/dashboard/teacher");
    const isTeacher = req.nextauth.token?.role === "TEACHER";
    const isAuthPage = req.nextUrl.pathname.startsWith("/sign-in") || 
                      req.nextUrl.pathname.startsWith("/sign-up") ||
                      req.nextUrl.pathname.startsWith("/forgot-password") ||
                      req.nextUrl.pathname.startsWith("/reset-password");
    
    // Add check for payment status page and public payment pages
    const isPaymentStatusPage = req.nextUrl.pathname.includes("/payment-status");
    const isPublicPaymentPage = req.nextUrl.pathname.startsWith("/payment/");

    // If user is on auth page and is authenticated, redirect to appropriate dashboard
    // But check for redirect parameter first
    if (isAuthPage && req.nextauth.token) {
      const redirectUrl = req.nextUrl.searchParams.get("redirect") || req.nextUrl.searchParams.get("callbackUrl");
      
      if (redirectUrl) {
        // Redirect to the specified URL
        try {
          const redirect = new URL(redirectUrl, req.url);
          // Only allow redirects to same origin
          if (redirect.origin === new URL(req.url).origin) {
            return NextResponse.redirect(redirect);
          }
        } catch (e) {
          // Invalid URL, fall through to default redirect
        }
      }
      
      const userRole = req.nextauth.token?.role || "USER";
      const dashboardUrl = getDashboardUrlByRole(userRole);
      return NextResponse.redirect(new URL(dashboardUrl, req.url));
    }

    // If user is not authenticated and trying to access protected routes
    // But exclude payment status page and public payment pages from this check
    if (!req.nextauth.token && !isAuthPage && !isPaymentStatusPage && !isPublicPaymentPage) {
      // Preserve the current URL as redirect parameter
      const signInUrl = new URL("/sign-in", req.url);
      signInUrl.searchParams.set("redirect", req.nextUrl.pathname + req.nextUrl.search);
      return NextResponse.redirect(signInUrl, { status: 302 });
    }

    // Check for admin routes
    const isAdminRoute = req.nextUrl.pathname.startsWith("/dashboard/admin");
    const isAdmin = req.nextauth.token?.role === "ADMIN";

    // If user is not a teacher or admin but trying to access teacher routes
    if (isTeacherRoute && !(isTeacher || isAdmin)) {
      return NextResponse.redirect(new URL("/dashboard", req.url));
    }

    // If user is not an admin but trying to access admin routes
    if (isAdminRoute && !isAdmin) {
      return NextResponse.redirect(new URL("/dashboard", req.url));
    }

    // If user accesses main dashboard, redirect to role-specific dashboard
    if (req.nextUrl.pathname === "/dashboard" && req.nextauth.token) {
      const userRole = req.nextauth.token?.role || "USER";
      const dashboardUrl = getDashboardUrlByRole(userRole);
      
      // Only redirect if the user's role-specific dashboard is different from the main dashboard
      if (userRole !== "USER") {
        return NextResponse.redirect(new URL(dashboardUrl, req.url));
      }
    }

    // Handle POST requests to payment status page
    if (isPaymentStatusPage && req.method === "POST") {
      // Convert POST to GET by redirecting to the same URL
      return NextResponse.redirect(req.url, { status: 303 });
    }

    return NextResponse.next();
  },
  {
    callbacks: {
      authorized: ({ token }) => true, // We'll handle authorization in the middleware function
    },
  }
);

export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico|teacher-image.png|logo.png|male.png|eraser.png|pencil.png|ruler.png|$).*)",
  ],
};