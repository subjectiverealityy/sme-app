"use client";

import Link from "next/link";
import { Logo } from "@/components/Logo";

export function AuthShell({
  children,
  title,
  subtitle,
}: {
  children: React.ReactNode;
  title: string;
  subtitle: string;
}) {
  return (
    <div className="grid min-h-screen md:grid-cols-2">
      {/* Form side */}
      <div className="flex flex-col px-5 py-6 sm:px-10 md:justify-center lg:px-20">
        <Link href="/" className="w-fit text-[14px] font-bold text-[#0b938e]">← Back home</Link>
        <div className="mt-4"><Logo /></div>
        <h1 className="mt-6 text-[28px] font-extrabold leading-tight text-[#272047]">{title}</h1>
        <p className="mt-1 text-[14px] text-gray-600">{subtitle}</p>
        <div className="mt-6 w-full max-w-md">{children}</div>
      </div>
      {/* Marketing side — calm & minimal */}
      <div className="relative hidden overflow-hidden bg-[#d9f5ed] p-12 text-[#272047] md:flex md:flex-col md:justify-center">
        <div className="pointer-events-none absolute -right-20 -top-20 h-64 w-64 rounded-full bg-white/60 blur-3xl" />
        <div className="relative max-w-sm">
          <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#29224e] text-2xl text-white">✓</span>
          <h2 className="mt-6 text-[30px] font-extrabold leading-tight">Know your profit every single day.</h2>
          <p className="mt-2 text-[15px] text-[#0F5132]/70">Simple records for busy shop owners. No accounting jargon, ever.</p>
          <ul className="mt-6 flex flex-col gap-3 text-[14px] font-semibold">
            {["Record sales in 30 seconds", "Scan paper receipts in one tap", "Ask questions, get real numbers"].map((t) => (
              <li key={t} className="flex items-center gap-2.5">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#167C5A] text-[13px] font-bold text-white">✓</span>
                {t}
              </li>
            ))}
          </ul>
          <div className="mt-8 border-l-4 border-[#167C5A] pl-4">
            <p className="text-[14px] italic text-[#0F5132]/80">“For the first time I actually know my profit.”</p>
            <p className="mt-1 text-[13px] font-bold">Adaeze · Fashion Hub, Lekki</p>
          </div>
        </div>
      </div>
    </div>
  );
}
