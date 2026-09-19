"use client";

import Link from "next/link";
import { Plus } from "lucide-react";
import { useState } from "react";

export function AddFab() {
  const [open, setOpen] = useState(false);
  return (
    <>
      {open && (
        <div className="fixed inset-0 z-40 bg-black/30 md:hidden" onClick={() => setOpen(false)}>
          <div className="absolute inset-x-4 bottom-24 rounded-2xl bg-white p-3 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <Link
              href="/transactions/new?type=income"
              className="flex items-center gap-3 rounded-xl p-3 hover:bg-[#DDF5EA]"
              onClick={() => setOpen(false)}
            >
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-[#DDF5EA] text-lg">💰</span>
              <span>
                <span className="block font-bold text-[#0F5132]">Income</span>
                <span className="block text-[13px] text-gray-500">I received money</span>
              </span>
            </Link>
            <Link
              href="/transactions/new?type=expense"
              className="flex items-center gap-3 rounded-xl p-3 hover:bg-red-50"
              onClick={() => setOpen(false)}
            >
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-red-100 text-lg">🧾</span>
              <span>
                <span className="block font-bold">Expense</span>
                <span className="block text-[13px] text-gray-500">I spent money</span>
              </span>
            </Link>
          </div>
        </div>
      )}
      <button
        onClick={() => setOpen((v) => !v)}
        className="fixed bottom-20 right-4 z-40 flex h-14 items-center gap-2 rounded-full bg-[#167C5A] px-5 text-white shadow-xl md:hidden"
        aria-label="Add transaction"
      >
        <Plus size={20} />
        <span className="font-semibold">Add</span>
      </button>
    </>
  );
}
