"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button, Input, Select, Textarea, Card } from "@/components/ui";
import { EXPENSE_CATEGORIES, INCOME_CATEGORIES, PAYMENT_METHODS, PAYMENT_STATUSES, type PaymentStatus, type TransactionType } from "@/lib/constants";
import { useStore } from "@/lib/store";
import { toISODate } from "@/lib/utils";

function FormInner() {
  const params = useSearchParams();
  const router = useRouter();
  const { addTransaction } = useStore();
  const initialType = (params.get("type") as TransactionType) === "expense" ? "expense" : "income";
  const [type, setType] = useState<TransactionType>(initialType);
  const [desc, setDesc] = useState("");
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState(toISODate(new Date()));
  const [category, setCategory] = useState(type === "income" ? "Sales" : "Inventory / Stock");
  const [status, setStatus] = useState<PaymentStatus>("paid");
  const [method, setMethod] = useState("Cash");
  const [person, setPerson] = useState("");
  const [notes, setNotes] = useState("");
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr("");
    const amt = Number(String(amount).replace(/,/g, ""));
    if (!desc.trim()) return setErr(type === "income" ? "Tell us what you sold." : "Tell us what you spent on.");
    if (!amt || amt <= 0) return setErr("Enter a valid amount.");
    setLoading(true);
    try {
      const txn = await addTransaction({
        type,
        description: desc.trim(),
        amount: Math.round(amt),
        category,
        transaction_date: new Date(date).toISOString(),
        payment_status: status,
        payment_method: method,
        customer_or_vendor: person.trim() || undefined,
        notes: notes.trim() || undefined,
        source: "manual",
      });
      router.replace(`/success?amount=${txn.amount}&type=${txn.type}&desc=${encodeURIComponent(txn.description)}`);
    } catch (e: unknown) {
      const msg =
        e instanceof Error
          ? e.message
          : typeof e === "object" && e !== null && "message" in e
            ? String((e as { message: unknown }).message)
            : "Could not save. Try again.";
      console.error("Transaction save failed:", e);
      setErr(msg);
    } finally {
      setLoading(false);
    }
  }

  const cats = type === "income" ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;

  return (
    <div className="py-4 animate-fade-up">
      <div className="grid grid-cols-2 gap-3">
        <button
          type="button"
          onClick={() => { setType("income"); setCategory("Sales"); }}
          className={`rounded-2xl p-4 text-left ${type === "income" ? "bg-[#DDF5EA] ring-2 ring-[#167C5A]" : "bg-white"}`}
        >
          <span className="text-2xl">💰</span>
          <span className="block font-bold text-[#0F5132]">Money in</span>
          <span className="block text-[12px] text-gray-500">I received money</span>
        </button>
        <button
          type="button"
          onClick={() => { setType("expense"); setCategory("Inventory / Stock"); }}
          className={`rounded-2xl p-4 text-left ${type === "expense" ? "bg-red-50 ring-2 ring-red-400" : "bg-white"}`}
        >
          <span className="text-2xl">🧾</span>
          <span className="block font-bold">Money out</span>
          <span className="block text-[12px] text-gray-500">I spent money</span>
        </button>
      </div>

      <Card className="mt-4">
        <form onSubmit={submit} className="flex flex-col gap-4">
          <Input
            label={type === "income" ? "What did you sell? 😊" : "What did you spend on? 🧾"}
            placeholder={type === "income" ? "e.g. Ankara sales" : "e.g. Transportation"}
            value={desc}
            onChange={(e) => setDesc(e.target.value)}
          />
          <Input
            label="How much? (₦)"
            inputMode="numeric"
            placeholder="e.g. 25,000"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
          />
          <Input
            label={type === "income" ? "When did you make the sale?" : "When did you spend it?"}
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
          <Select label="Category" value={category} onChange={(e) => setCategory(e.target.value)}>
            {cats.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </Select>
          <div>
            <span className="mb-1.5 block text-[14px] font-medium">Have you been paid?</span>
            <div className="grid grid-cols-3 gap-2">
              {PAYMENT_STATUSES.map((s) => (
                <button
                  key={s.value}
                  type="button"
                  onClick={() => setStatus(s.value as PaymentStatus)}
                  className={`rounded-xl border py-2.5 text-[14px] font-semibold ${status === s.value ? "border-[#167C5A] bg-[#DDF5EA] text-[#0F5132]" : "border-gray-200 bg-white"}`}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>
          <Select label="How was it paid? (optional)" value={method} onChange={(e) => setMethod(e.target.value)}>
            {PAYMENT_METHODS.map((m) => (
              <option key={m} value={m}>{m}</option>
            ))}
          </Select>
          <Input
            label={type === "income" ? "Customer name (optional)" : "Vendor / where? (optional)"}
            placeholder="e.g. Mrs. Okafor"
            value={person}
            onChange={(e) => setPerson(e.target.value)}
          />
          <Textarea label="Notes (optional)" placeholder="Any extra detail…" value={notes} onChange={(e) => setNotes(e.target.value)} />
          {err && <p className="rounded-xl bg-red-50 px-4 py-3 text-[14px] text-red-700">{err}</p>}
          <Button disabled={loading}>{loading ? "Saving…" : `Save ${type === "income" ? "income" : "expense"} ✓`}</Button>
        </form>
      </Card>
    </div>
  );
}

export default function NewTxnPage() {
  return (
    <Suspense>
      <FormInner />
    </Suspense>
  );
}
