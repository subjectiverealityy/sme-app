"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Home,
  Receipt,
  ScanLine,
  Sparkles,
  Menu,
  ChevronLeft,
  ChevronRight,
  Briefcase,
  TrendingUp,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useStore } from "@/lib/store";
import React, { createContext, useCallback, useContext, useEffect, useState } from "react";

const items = [
  { href: "/dashboard", label: "Home", icon: Home },
  { href: "/transactions", label: "Records", icon: Receipt },
  { href: "/scan", label: "Scan", icon: ScanLine, fab: true },
  { href: "/ask", label: "Ask AI", icon: Sparkles },
  { href: "/more", label: "More", icon: Menu },
];

export function BottomNav() {
  const pathname = usePathname();
  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-gray-100 bg-white pb-[env(safe-area-inset-bottom)] md:hidden">
      <div className="mx-auto grid max-w-md grid-cols-5 px-2">
        {items.map((it) => {
          const active = pathname === it.href || (it.href !== "/more" && pathname?.startsWith(it.href));
          const Icon = it.icon;
          if (it.fab) {
            return (
              <Link key={it.href} href={it.href} className="flex flex-col items-center py-1.5">
                <span
                  className={cn(
                    "flex h-12 w-12 items-center justify-center rounded-full shadow-lg transition",
                    active ? "bg-[#0F5132] text-white" : "bg-[#167C5A] text-white"
                  )}
                >
                  <Icon size={22} />
                </span>
                <span className={cn("mt-0.5 text-[11px] font-semibold", active ? "text-[#0F5132]" : "text-gray-500")}>
                  {it.label}
                </span>
              </Link>
            );
          }
          return (
            <Link key={it.href} href={it.href} className="flex flex-col items-center py-2.5">
              <Icon size={22} className={active ? "text-[#167C5A]" : "text-gray-400"} />
              <span className={cn("mt-0.5 text-[11px] font-semibold", active ? "text-[#0F5132]" : "text-gray-500")}>
                {it.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

// ---- Collapsible desktop sidebar ----
const SidebarCtx = createContext<{ open: boolean; setOpen: (v: boolean) => void }>({
  open: true,
  setOpen: () => {},
});

export function useSidebar() {
  return useContext(SidebarCtx);
}

export function SidebarProvider({ children }: { children: React.ReactNode }) {
  const [open, setOpenState] = useState(true);
  useEffect(() => {
    try {
      const saved = localStorage.getItem("ledgerly_sidebar");
      if (saved === "closed") setOpenState(false);
    } catch {
      /* ignore */
    }
  }, []);
  const setOpen = useCallback((v: boolean) => {
    setOpenState(v);
    try {
      localStorage.setItem("ledgerly_sidebar", v ? "open" : "closed");
    } catch {
      /* ignore */
    }
  }, []);
  return <SidebarCtx.Provider value={{ open, setOpen }}>{children}</SidebarCtx.Provider>;
}

const links = [
  { href: "/dashboard", label: "Home", icon: Home },
  { href: "/transactions", label: "Transactions", icon: Receipt },
  { href: "/scan", label: "Scan a Record", icon: ScanLine },
  { href: "/ask", label: "Ask Ledgerly", icon: Sparkles },
  { href: "/reports", label: "Reports", icon: TrendingUp },
  { href: "/business", label: "Business", icon: Briefcase },
];

export function Sidebar() {
  const pathname = usePathname();
  const { open, setOpen } = useSidebar();
  const { user } = useStore();
  const initial = ((user?.name || user?.email || "B").trim().charAt(0) || "B").toUpperCase();

  return (
    <aside
      className={cn(
        "fixed left-0 top-0 z-40 hidden h-screen flex-col border-r border-gray-100 bg-white transition-all duration-200 md:flex",
        open ? "w-64" : "w-[68px]"
      )}
    >
      {/* Brand row */}
      <div className="flex items-center justify-between px-4 pt-5">
        {open ? (
          <>
            <span className="flex items-center gap-2">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#167C5A]">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                  <rect x="3" y="4" width="13" height="3" rx="1.5" fill="white" />
                  <rect x="3" y="9" width="9" height="3" rx="1.5" fill="white" opacity="0.9" />
                  <rect x="3" y="14" width="11" height="3" rx="1.5" fill="white" opacity="0.9" />
                  <circle cx="18.5" cy="16.5" r="3.5" fill="#0F5132" stroke="white" strokeWidth="1.2" />
                </svg>
              </span>
              <span className="text-[19px] font-extrabold tracking-tight">
                Ledger<span className="text-[#167C5A]">ly</span>
              </span>
            </span>
            <button
              onClick={() => setOpen(false)}
              aria-label="Collapse sidebar"
              className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-[#0F5132]"
            >
              <ChevronLeft size={18} />
            </button>
          </>
        ) : (
          <button
            onClick={() => setOpen(true)}
            aria-label="Expand sidebar"
            className="mx-auto rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-[#0F5132]"
          >
            <ChevronRight size={18} />
          </button>
        )}
      </div>

      {open && (
        <div className="px-5 pb-1 pt-4 text-[12px] font-bold uppercase tracking-widest text-gray-400">Menu</div>
      )}

      {/* Links */}
      <nav className={cn("flex flex-1 flex-col gap-1 overflow-y-auto px-3", !open && "items-center pt-4")}>
        {links.map((l) => {
          const active = pathname === l.href || pathname?.startsWith(l.href + "/");
          const Icon = l.icon;
          return (
            <Link
              key={l.href}
              href={l.href}
              title={l.label}
              className={cn(
                "flex items-center gap-3 rounded-xl px-3 py-2.5 text-[15px] font-medium transition",
                open ? "w-full" : "w-11 justify-center",
                active ? "bg-[#DDF5EA] font-bold text-[#0F5132]" : "text-gray-600 hover:bg-gray-50"
              )}
            >
              <Icon size={20} className="shrink-0" />
              {open && l.label}
            </Link>
          );
        })}
      </nav>

      {/* Bottom: user profile */}
      <div className="border-t border-gray-100 p-3">
        <Link
          href="/settings"
          title={user?.name ?? "Account settings"}
          className={cn(
            "flex items-center gap-3 rounded-xl px-2 py-2 transition hover:bg-gray-50",
            !open && "justify-center"
          )}
        >
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#167C5A] text-[17px] font-extrabold text-white">
            {initial}
          </span>
          {open && (
            <span className="min-w-0 flex-1">
              <span className="block truncate text-[14px] font-bold text-[#17221D]">
                {user?.name ?? "My account"}
              </span>
              <span className="block truncate text-[12px] text-gray-500">
                {user?.email ?? "View settings →"}
              </span>
            </span>
          )}
        </Link>
      </div>
    </aside>
  );
}
