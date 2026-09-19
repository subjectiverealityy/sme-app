"use client";

import Link from "next/link";
import { LuNotebookTabs } from "react-icons/lu";

export default function OfflinePage() {
  return (
    <div className="flex min-h-[75vh] flex-col items-center justify-center gap-4 px-6 py-12 text-center animate-fade-up">
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-mint-light text-ink"><LuNotebookTabs size={32} /></div>
      <h1 className="text-[22px] font-extrabold text-ink">You&apos;re offline</h1>
      <p className="max-w-[280px] text-[14px] text-gray-600">
        Credyt kept your recent pages saved, but new records need a connection. Reconnect and try again.
      </p>
      <div className="flex w-full max-w-[280px] flex-col gap-2">
        <button
          onClick={() => window.location.reload()}
          className="inline-flex min-h-[48px] w-full items-center justify-center rounded-xl bg-primary px-5 font-semibold text-white transition hover:bg-primary-dark"
        >
          Try again
        </button>
        <Link
          href="/"
          className="inline-flex min-h-[48px] w-full items-center justify-center rounded-xl border border-gray-200 bg-white px-5 font-semibold text-ink transition hover:bg-gray-50"
        >
          Back to home
        </Link>
      </div>
    </div>
  );
}