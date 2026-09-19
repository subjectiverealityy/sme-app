"use client";

import { usePathname } from "next/navigation";
import { BottomNav, Sidebar, SidebarProvider, useSidebar } from "@/components/Nav";
import { cn } from "@/lib/utils";

const PUBLIC_ROUTES = ["/", "/login", "/signup", "/forgot-password", "/r"];

function isPublic(pathname: string | null) {
  if (!pathname) return false;
  return PUBLIC_ROUTES.some((r) => pathname === r || (r !== "/" && pathname.startsWith(r)));
}

function AppFrame({ children }: { children: React.ReactNode }) {
  const { open } = useSidebar();
  const pathname = usePathname();
  // Form-like pages stay narrow; everything else gets a wide content area
  const narrow =
    pathname === "/onboarding" ||
    pathname === "/first-transaction" ||
    pathname === "/success" ||
    pathname === "/transactions/new" ||
    pathname === "/owed/queue" ||
    (pathname?.startsWith("/owed/") && pathname !== "/owed") ||
    (pathname?.startsWith("/transactions/") && pathname !== "/transactions");
  return (
    <>
      <Sidebar />
      {/* Fixed sidebar lives at the viewport edge; content offsets by its width on desktop */}
      <div className={cn("min-h-screen transition-all duration-200", open ? "md:pl-64" : "md:pl-[68px]")}>
        <main className="min-w-0 pb-24 md:pb-10">
          <div
            className={cn(
              "mx-auto w-full px-4 pt-4 md:px-8 md:pt-8",
              narrow ? "max-w-md md:max-w-xl" : "max-w-md md:max-w-4xl xl:max-w-5xl"
            )}
          >
            {children}
          </div>
        </main>
      </div>
      <BottomNav />
    </>
  );
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const publicPage = isPublic(pathname);

  if (publicPage) {
    // Full-bleed landing/auth pages — no sidebar, no bottom nav, no width cap
    return <main className="min-h-screen w-full">{children}</main>;
  }

  return (
    <SidebarProvider>
      <AppFrame>{children}</AppFrame>
    </SidebarProvider>
  );
}
