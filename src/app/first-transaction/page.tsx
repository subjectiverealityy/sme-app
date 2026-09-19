"use client";

import Link from "next/link";
import { Logo } from "@/components/Logo";

export default function FirstTxnPage() {
  return (
    <div className="py-6 animate-fade-up">
      <Logo />
      <h1 className="mt-8 text-center text-[26px] font-extrabold text-[#0F5132]">Let&apos;s record your first transaction.</h1>
      <p className="mt-1 text-center text-[14px] text-gray-600">Pick one to get started — it takes seconds.</p>

      <div className="mt-6 flex flex-col gap-4">
        <Link href="/transactions/new?type=income" className="rounded-2xl bg-[#DDF5EA] p-5 transition hover:scale-[1.01]">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#167C5A] text-2xl text-white">₦</div>
          <h2 className="mt-3 text-[19px] font-extrabold text-[#0F5132]">Income</h2>
          <p className="text-[14px] text-[#0F5132]/80">I received money from my business.</p>
          <span className="mt-3 inline-block rounded-full bg-[#167C5A] px-4 py-2 text-[14px] font-bold text-white">Record money in →</span>
        </Link>

        <Link href="/transactions/new?type=expense" className="rounded-2xl bg-white p-5 shadow-sm transition hover:scale-[1.01]">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-100 text-2xl">🧾</div>
          <h2 className="mt-3 text-[19px] font-extrabold">Expense</h2>
          <p className="text-[14px] text-gray-600">I spent money on my business.</p>
          <span className="mt-3 inline-block rounded-full bg-[#17221D] px-4 py-2 text-[14px] font-bold text-white">Record money out →</span>
        </Link>

        <Link href="/dashboard" className="text-center text-[14px] font-semibold text-gray-500">
          Skip for now
        </Link>
      </div>
    </div>
  );
}
