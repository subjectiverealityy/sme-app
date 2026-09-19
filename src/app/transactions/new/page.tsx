"use client";

import { Suspense, useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Input, Select, Textarea, Card } from "@/components/ui";
import { PAYMENT_STATUSES, type PaymentStatus } from "@/lib/constants";
import { useStore } from "@/lib/store";
import { toISODate } from "@/lib/utils";

function FormInner() {
  const router = useRouter();
  const { addTransaction } = useStore();
  const [desc, setDesc] = useState("");
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState(toISODate(new Date()));
  const [status, setStatus] = useState<PaymentStatus>("paid");
  const [person, setPerson] = useState("");
  const [phone, setPhone] = useState("");
  const [promiseDate, setPromiseDate] = useState("");
  const [notes, setNotes] = useState("");
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);

  const needsPromise = status === "credit" && person.trim().length > 0;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr("");
    const amt = Number(String(amount).replace(/,/g, ""));
    if (!person.trim()) return setErr("Enter the debtor's name.");
    if (!desc.trim()) return setErr("Tell us what they are interested in or received.");
    if (!amt || amt <= 0) return setErr("Enter a valid amount.");
    setLoading(true);
    try {
      const txn = await addTransaction({
        type: "income",
        description: desc.trim(),
        amount: Math.round(amt),
        category: "Sales",
        transaction_date: new Date(date).toISOString(),
        payment_status: status,
        customer_or_vendor: person.trim(),
        customer_phone: phone.replace(/[\s-]/g, "") || undefined,
        due_date: status === "credit" && promiseDate ? promiseDate : undefined,
        notes: notes.trim() || undefined,
        source: "manual",
      });
      router.replace(`/success?amount=${txn.amount}&desc=${encodeURIComponent(txn.description)}`);
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

  return (
    <div className="py-4 animate-fade-up">
      <h1 className="text-[24px] font-extrabold text-[#272047]">Record a debtor</h1>
      <p className="mt-1 text-[13px] text-[#756f84]">Keep the person, amount, and next step in one place.</p>
      <Card className="mt-4">
        <form onSubmit={submit} className="flex flex-col gap-4">
          <Input label="Debtor name" placeholder="e.g. Mrs. Okafor" value={person} onChange={(e) => setPerson(e.target.value)} />
          <Input
            label="What did they receive or ask about?"
            placeholder="e.g. Ankara set"
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
            label="When did this happen?"
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
          <div>
            <span className="mb-1.5 block text-[14px] font-medium">What is their status?</span>
            <div className="grid grid-cols-3 gap-2">
              {PAYMENT_STATUSES.map((s) => (
                <button
                  key={s.value}
                  type="button"
                  onClick={() => setStatus(s.value as PaymentStatus)}
                  className={`rounded-xl border py-2.5 text-[14px] font-semibold ${status === s.value ? "border-[#11b7ab] bg-[#d9f5ed] text-[#272047]" : "border-gray-200 bg-white"}`}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>
          <Input label="WhatsApp / phone (optional)" placeholder="e.g. 0803 123 4567" inputMode="tel" value={phone} onChange={(e) => setPhone(e.target.value)} hint="Useful when you need to follow up." />
          {needsPromise && (
            <Input
              label="When will they pay? (promise date)"
              type="date"
              value={promiseDate}
              onChange={(e) => setPromiseDate(e.target.value)}
              hint="We'll remind you to follow up on that day."
            />
          )}
          <Textarea label="Notes (optional)" placeholder="Any extra detail…" value={notes} onChange={(e) => setNotes(e.target.value)} />
          {err && <p className="rounded-xl bg-red-50 px-4 py-3 text-[14px] text-red-700">{err}</p>}
          <Button disabled={loading}>{loading ? "Saving…" : "Save debtor ✓"}</Button>
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
