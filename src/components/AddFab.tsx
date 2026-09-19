"use client";

import Link from "next/link";
import { Plus } from "lucide-react";

export function AddFab() {
  return (
    <Link href="/transactions/new" className="fixed bottom-20 right-4 z-40 flex h-14 items-center gap-2 rounded-full bg-[#29224e] px-5 text-white shadow-xl md:hidden" aria-label="Add debtor">
      <Plus size={20} />
      <span className="font-semibold">Add debtor</span>
    </Link>
  );
}
