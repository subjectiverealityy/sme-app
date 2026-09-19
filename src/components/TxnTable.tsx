"use client";

import { useState } from "react";
import Link from "next/link";
import { LuEye, LuPencil, LuTrash2, LuCircleDot } from "react-icons/lu";
import { Badge, Button, Card } from "@/components/ui";
import { useStore } from "@/lib/store";
import type { Transaction } from "@/lib/constants";
import { formatDate, formatNaira } from "@/lib/utils";

function statusTone(s: string): "green" | "amber" | "red" {
  return s === "paid" ? "green" : s === "interested" ? "amber" : "red";
}

function displayStatus(status: string) {
  return status === "pending" ? "credit" : status;
}

/** Shared transaction table — same on dashboard and Records page. */
export function TxnTable({ transactions }: { transactions: Transaction[] }) {
  const { deleteTransaction } = useStore();
  const [delId, setDelId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  async function confirmDelete() {
    if (!delId) return;
    setDeleting(true);
    try {
      await deleteTransaction(delId);
      setDelId(null);
    } finally {
      setDeleting(false);
    }
  }

  return (
    <>
      <Card className="!p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-left text-[14px]">
            <thead>
              <tr className="border-b border-gray-100 bg-[#F8FAF9] text-[12px] uppercase tracking-wide text-gray-500">
                <th className="px-4 py-3 font-bold">Transaction</th>
                <th className="px-4 py-3 font-bold">Date</th>
                <th className="px-4 py-3 font-bold">Status</th>
                <th className="px-4 py-3 text-right font-bold">Amount</th>
                <th className="px-4 py-3 text-right font-bold">Actions</th>
              </tr>
            </thead>
            <tbody>
              {transactions.map((t) => (
                <tr key={t.id} className="border-b border-gray-50 last:border-0 hover:bg-gray-50/60">
                  <td className="px-4 py-3">
                    <span className="flex items-center gap-2.5">
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#d9f5ed] text-[#272047]">
                        <LuCircleDot size={16} />
                      </span>
                      <span className="min-w-0">
                        <span className="block truncate font-bold">{t.description}</span>
                        <span className="block text-[12px] text-gray-500">{t.category}</span>
                      </span>
                    </span>
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-gray-600">{formatDate(t.transaction_date)}</td>
                  <td className="whitespace-nowrap px-4 py-3">
                    <Badge tone={statusTone(t.payment_status)}>{displayStatus(t.payment_status)}</Badge>
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-right font-extrabold text-[#272047]">
                    {formatNaira(t.amount)}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3">
                    <span className="flex justify-end gap-1">
                      <Link
                        href={`/transactions/${t.id}`}
                        title="View"
                        aria-label={`View ${t.description}`}
                        className="rounded-lg p-2 text-gray-500 hover:bg-[#d9f5ed] hover:text-[#272047]"
                      >
                        <LuEye size={17} />
                      </Link>
                      <Link
                        href={`/transactions/${t.id}?edit=1`}
                        title="Edit"
                        aria-label={`Edit ${t.description}`}
                        className="rounded-lg p-2 text-gray-500 hover:bg-[#d9f5ed] hover:text-[#272047]"
                      >
                        <LuPencil size={17} />
                      </Link>
                      <button
                        title="Delete"
                        aria-label={`Delete ${t.description}`}
                        onClick={() => setDelId(t.id)}
                        className="rounded-lg p-2 text-gray-500 hover:bg-red-50 hover:text-red-600"
                      >
                        <LuTrash2 size={17} />
                      </button>
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {delId && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 md:items-center">
          <div className="w-full max-w-sm rounded-2xl bg-white p-5">
            <h3 className="font-extrabold">Delete this record?</h3>
            <p className="mt-1 text-[14px] text-gray-600">This cannot be undone.</p>
            <div className="mt-4 grid grid-cols-2 gap-2">
              <Button variant="outline" onClick={() => setDelId(null)}>Keep</Button>
              <Button variant="danger" onClick={confirmDelete} disabled={deleting}>
                {deleting ? "Deleting…" : "Delete"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
