"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LuHouse,
  LuReceipt,
  LuScanLine,
  LuHandCoins,
  LuSparkles,
  LuMenu,
  LuChevronLeft,
  LuChevronRight,
  LuBriefcase,
  LuTrendingUp,
  LuUsers,
} from "react-icons/lu";
import { cn } from "@/lib/utils";
import { useStore } from "@/lib/store";
import { Logo } from "@/components/Logo";
import React, { createContext, useCallback, useContext, useEffect, useState } from "react";

const items = [
  { href: "/dashboard", label: "Home", icon: LuHouse },
  { href: "/transactions", label: "Records", icon: LuReceipt },
  { href: "/scan", label: "Scan", icon: LuScanLine, fab: true },
  { href: "/owed", label: "Collect", icon: LuHandCoins },
  { href: "/more", label: "More", icon: LuMenu },
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
                    active ? "bg-[#29224e] text-white" : "bg-[#11b7ab] text-[#272047]"
                  )}
                >
                  <Logo size={30} showWordmark={false} />
                </span>
                <span className={cn("mt-0.5 text-[11px] font-semibold", active ? "text-[#29224e]" : "text-gray-500")}>
                  {it.label}
                </span>
              </Link>
            );
          }
          return (
            <Link key={it.href} href={it.href} className="flex flex-col items-center py-2.5">
              <Icon size={22} className={active ? "text-[#11b7ab]" : "text-gray-400"} />
              <span className={cn("mt-0.5 text-[11px] font-semibold", active ? "text-[#29224e]" : "text-gray-500")}>
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
  { href: "/dashboard", label: "Home", icon: LuHouse },
  { href: "/owed", label: "Who owes me", icon: LuHandCoins },
  { href: "/transactions", label: "Transactions", icon: LuReceipt },
  { href: "/scan", label: "Scan a Record", icon: LuScanLine },
  { href: "/ask", label: "Ask Ledgerly", icon: LuSparkles },
  { href: "/reports", label: "Reports", icon: LuTrendingUp },
  { href: "/business", label: "Business", icon: LuBriefcase },
];

export function Sidebar() {
  const pathname = usePathname();
  const { open, setOpen } = useSidebar();
  const { user } = useStore();
  const initial = ((user?.name || user?.email || "B").trim().charAt(0) || "B").toUpperCase();

  return (
    <aside
      className={cn(
        "fixed left-0 top-0 z-40 hidden h-screen flex-col border-r border-white/10 bg-[#272047] transition-all duration-200 md:flex",
        open ? "w-64" : "w-[68px]"
      )}
    >
      {/* Brand row */}
      <div className="flex items-center justify-between px-4 pt-5">
        {open ? (
          <>
            <Logo size={36} inverse />
            <button
              onClick={() => setOpen(false)}
              aria-label="Collapse sidebar"
              className="rounded-lg p-1.5 text-white/50 hover:bg-white/10 hover:text-white"
            >
              <LuChevronLeft size={18} />
            </button>
          </>
        ) : (
          <button
            onClick={() => setOpen(true)}
            aria-label="Expand sidebar"
            className="mx-auto rounded-lg p-1.5 text-white/50 hover:bg-white/10 hover:text-white"
          >
            <LuChevronRight size={18} />
          </button>
        )}
      </div>

      {open && (
        <div className="px-5 pb-1 pt-4 text-[12px] font-bold uppercase tracking-widest text-white/45">Menu</div>
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
                active ? "bg-white/12 font-bold text-[#70D7C0]" : "text-white/70 hover:bg-white/8 hover:text-white"
              )}
            >
              <Icon size={20} className="shrink-0" />
              {open && l.label}
            </Link>
          );
        })}
      </nav>

      {/* Bottom: user profile */}
      <div className="border-t border-white/10 p-3">
        <Link
          href="/settings"
          title={user?.name ?? "Account settings"}
          className={cn(
            "flex items-center gap-3 rounded-xl px-2 py-2 transition hover:bg-white/8",
            !open && "justify-center"
          )}
        >
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#70D7C0] text-[17px] font-extrabold text-[#272047]">
            {initial}
          </span>
          {open && (
            <span className="min-w-0 flex-1">
              <span className="block truncate text-[14px] font-bold text-white">
                {user?.name ?? "My account"}
              </span>
                <span className="block truncate text-[12px] text-white/55">
                {user?.email ?? "View settings →"}
              </span>
            </span>
          )}
        </Link>
      </div>
    </aside>
  );
}
