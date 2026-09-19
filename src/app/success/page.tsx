"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui";
import { formatNaira } from "@/lib/utils";

function Inner() {
  const params = useSearchParams();
  const amount = Number(params.get("amount") || 0);
  const desc = params.get("desc") || "debtor record";
  return (
    <div className="flex min-h-[70vh] flex-col items-center justify-center py-8 text-center animate-fade-up">
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[#DDF5EA] text-3xl">🎉</div>
      <h1 className="mt-4 text-[24px] font-extrabold text-[#272047]">Debtor saved</h1>
      <p className="mt-1 text-[15px] text-gray-600">
        {decodeURIComponent(desc)} with {formatNaira(amount)} has been added to your debtor records.
      </p>
      <div className="mt-6 w-full max-w-[300px]">
        <Link href="/transactions/new">
          <Button variant="outline">Add another</Button>
        </Link>
        <Link href="/dashboard" className="mt-3 block">
          <Button>View dashboard</Button>
        </Link>
      </div>
    </div>
  );
}

export default function SuccessPage() {
  return (
    <Suspense>
      <Inner />
    </Suspense>
  );
}
