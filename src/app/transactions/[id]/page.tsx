"use client";

import { Suspense, useEffect, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Badge, Button, Card, Input, Select, Textarea } from "@/components/ui";
import { useStore } from "@/lib/store";
import { EXPENSE_CATEGORIES, INCOME_CATEGORIES } from "@/lib/constants";
import { formatDate, formatNaira } from "@/lib/utils";

function DetailInner() {
  const params = useParams<{ id: string }>();
  const search = useSearchParams();
  const router = useRouter();
  const { transactions, updateTransaction, deleteTransaction } = useStore();
  const txn = transactions.find((t) => t.id === params.id);
  const [editing, setEditing] = useState(false);
  const [confirmDel, setConfirmDel] = useState(false);
  const [form, setForm] = useState({ description: "", amount: "", category: "", notes: "" });

  // ?edit=1 opens straight into edit mode (from dashboard table)
  useEffect(() => {
    if (txn && search.get("edit") === "1") {
      setForm({ description: txn.description, amount: String(txn.amount), category: txn.category, notes: txn.notes ?? "" });
      setEditing(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [txn?.id]);

  if (!txn) {
    return (
      <div className="py-10 text-center">
        <p className="font-bold">Transaction not found.</p>
        <Link href="/transactions" className="mt-2 inline-block font-bold text-[#167C5A]">Back to records</Link>
      </div>
    );
  }

  const startEdit = () => {
    setForm({ description: txn.description, amount: String(txn.amount), category: txn.category, notes: txn.notes ?? "" });
    setEditing(true);
  };

  const saveEdit = async () => {
    await updateTransaction(txn.id, {
      description: form.description,
      amount: Number(form.amount) || txn.amount,
      category: form.category,
      notes: form.notes,
    });
    setEditing(false);
  };

  const doDelete = async () => {
    await deleteTransaction(txn.id);
    router.replace("/transactions");
  };

  const cats = txn.type === "income" ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;

  return (
    <div className="py-4 animate-fade-up">
      <Link href="/transactions" className="text-[14px] font-bold text-[#167C5A]">← All records</Link>
      <Card className="mt-3">
        <div className="flex items-center justify-between">
          <Badge tone={txn.type === "income" ? "green" : "red"}>{txn.type === "income" ? "Money in" : "Money out"}</Badge>
          <Badge tone={txn.payment_status === "paid" ? "green" : txn.payment_status === "pending" ? "amber" : "red"}>{txn.payment_status}</Badge>
        </div>
        <h1 className="mt-2 text-[22px] font-extrabold">{txn.description}</h1>
        <p className={`text-[28px] font-extrabold ${txn.type === "income" ? "text-[#167C5A]" : "text-red-600"}`}>
          {txn.type === "income" ? "+" : "−"}{formatNaira(txn.amount)}
        </p>
        <dl className="mt-4 space-y-2.5 text-[14px]">
          {[
            ["Date", formatDate(txn.transaction_date)],
            ["Category", txn.category],
            ["Payment method", txn.payment_method ?? "—"],
            [(txn.type === "income" ? "Customer" : "Vendor"), txn.customer_or_vendor ?? "—"],
            ["Notes", txn.notes || "—"],
            ["Source", txn.source === "ocr" ? "Scanned 📷" : "Added by hand ✍️"],
          ].map(([k, v]) => (
            <div key={k} className="flex justify-between gap-4 border-b border-gray-50 pb-2">
              <dt className="text-gray-500">{k}</dt>
              <dd className="text-right font-semibold">{v}</dd>
            </div>
          ))}
        </dl>
        {!editing && (
          <div className="mt-4 grid grid-cols-2 gap-2">
            <Button variant="outline" onClick={startEdit}>Edit</Button>
            <Button variant="danger" onClick={() => setConfirmDel(true)}>Delete</Button>
          </div>
        )}
      </Card>

      {editing && (
        <Card className="mt-3">
          <div className="flex flex-col gap-3">
            <Input label="Description" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
            <Input label="Amount (₦)" inputMode="numeric" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} />
            <Select label="Category" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
              {cats.map((c) => <option key={c} value={c}>{c}</option>)}
            </Select>
            <Textarea label="Notes" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
            <div className="grid grid-cols-2 gap-2">
              <Button variant="ghost" onClick={() => setEditing(false)}>Cancel</Button>
              <Button onClick={saveEdit}>Save</Button>
            </div>
          </div>
        </Card>
      )}

      {confirmDel && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 md:items-center">
          <div className="w-full max-w-sm rounded-2xl bg-white p-5">
            <h3 className="font-extrabold">Delete this record?</h3>
            <p className="mt-1 text-[14px] text-gray-600">This cannot be undone.</p>
            <div className="mt-4 grid grid-cols-2 gap-2">
              <Button variant="outline" onClick={() => setConfirmDel(false)}>Keep</Button>
              <Button variant="danger" onClick={doDelete}>Delete</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function TxnDetailPage() {
  return (
    <Suspense>
      <DetailInner />
    </Suspense>
  );
}
