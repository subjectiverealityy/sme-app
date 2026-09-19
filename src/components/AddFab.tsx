"use client";

import Link from "next/link";
import { Logo } from "@/components/Logo";

export function AddFab() {
  return (
    <Link href="/transactions/new" className="fixed bottom-20 right-4 z-40 flex h-14 items-center gap-2 rounded-full bg-[#29224e] px-4 text-white shadow-xl md:hidden" aria-label="Add debtor">
      <Logo size={28} showWordmark={false} />
      <span className="font-semibold">Add debtor</span>
    </Link>
  );
}
