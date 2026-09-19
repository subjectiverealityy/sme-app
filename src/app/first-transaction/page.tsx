"use client";

import Link from "next/link";
import { Logo } from "@/components/Logo";

export default function FirstTxnPage() {
  return (
    <div className="py-6 animate-fade-up">
      <Logo />
      <h1 className="mt-8 text-center text-[26px] font-extrabold text-[#272047]">Let&apos;s record your first debtor.</h1>
      <p className="mt-1 text-center text-[14px] text-[#756f84]">Add the details and keep every promise visible.</p>

      <div className="mt-6 flex flex-col gap-4">
        <Link href="/transactions/new" className="rounded-2xl bg-[#29224e] p-5 text-white transition hover:scale-[1.01]">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#70d7c0] text-2xl text-[#272047]">₦</div>
          <h2 className="mt-3 text-[19px] font-extrabold">Add debtor details</h2>
          <p className="text-[14px] text-white/75">Record who they are, what they want, and their status.</p>
          <span className="mt-3 inline-block rounded-full bg-[#70d7c0] px-4 py-2 text-[14px] font-bold text-[#272047]">Continue →</span>
        </Link>

        <Link href="/dashboard" className="text-center text-[14px] font-semibold text-gray-500">
          Skip for now
        </Link>
      </div>
    </div>
  );
}
