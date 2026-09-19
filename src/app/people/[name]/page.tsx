"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { Badge, Button, Card, Input } from "@/components/ui";
import { useStore } from "@/lib/store";
import {
  getCustomers,
  followUpLabel,
  initials,
  normalizeName,
  nudgeText,
  waLink,
  toWaNumber,
} from "@/lib/customers";
import { formatDate, formatNaira } from "@/lib/utils";

export default function CustomerDetailPage() {
  const params = useParams<{ name: string }>();
  const { business, transactions, updateTransaction } = useStore();
  const [phoneInput, setPhoneInput] = useState("");
  const [editingPhone, setEditingPhone] = useState(false);
  const [saving, setSaving] = useState(false);
  const [payingId, setPayingId] = useState<string | null>(null);

  const customers = useMemo(() => getCustomers(transactions), [transactions]);
  const customer = customers.find((c) => c.key === normalizeName(decodeURIComponent(params.name || "")));

  async function markPaid(id: string) {
    setPayingId(id);
    try {
      await updateTransaction(id, { payment_status: "paid" });
    } finally {
      setPayingId(null);
    }
  }

  async function savePhone() {
    if (!customer) return;
    const phone = phoneInput.replace(/[\s-]/g, "");
    if (!phone) return;
    if (!toWaNumber(phone)) {
      alert("That phone number doesn't look valid. Use e.g. 0803 123 4567.");
      return;
    }
    setSaving(true);
    try {
      for (const t of customer.txns) {
        await updateTransaction(t.id, { customer_phone: phone });
      }
      setEditingPhone(false);
      setPhoneInput("");
    } finally {
      setSaving(false);
    }
  }

  if (!customer) {
    return (
      <div className="py-10 text-center">
        <p className="font-bold">Customer not found.</p>
        <Link href="/people" className="mt-2 inline-block font-bold text-[#167C5A]">
          ← Back to people
        </Link>
      </div>
    );
  }

  const unpaid = customer.txns.filter((t) => t.payment_status !== "paid");
  const paidTxns = customer.txns.filter((t) => t.payment_status === "paid");
  const wa = customer.phone ? waLink(customer.phone, nudgeText(customer.name, customer.outstanding, business?.name ?? "my business")) : null;
  const helloWa = customer.phone
    ? waLink(customer.phone, `Hello ${customer.name.split(" ")[0]} 👋, this is ${business?.name ?? "my business"}. Just checking in — hope to see you again soon!`)
    : null;

  return (
    <div className="py-4 animate-fade-up">
      <Link href="/people" className="text-[14px] font-bold text-[#167C5A]">
        ← All people
      </Link>

      <Card className="mt-3">
        <div className="flex items-center gap-3">
          <span className="flex h-14 w-14 items-center justify-center rounded-full bg-[#DDF5EA] text-[20px] font-extrabold text-[#0F5132]">
            {initials(customer.name)}
          </span>
          <div className="min-w-0 flex-1">
            <h1 className="truncate text-[20px] font-extrabold">{customer.name}</h1>
            <p className="text-[13px] text-gray-500">
              {customer.txnCount} record{customer.txnCount === 1 ? "" : "s"} · last {formatDate(customer.lastDate)}
            </p>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-3 gap-2 text-center">
          <div className="rounded-2xl bg-amber-50 p-3">
            <p className="text-[11px] font-bold uppercase text-[#b6533a]">Credit</p>
            <p className="text-[17px] font-extrabold text-[#b6533a]">{formatNaira(customer.outstanding)}</p>
          </div>
          <div className="rounded-2xl bg-[#F8FAF9] p-3">
            <p className="text-[11px] font-bold uppercase text-gray-500">Interested</p>
            <p className="text-[17px] font-extrabold">{formatNaira(customer.interestedAmount)}</p>
          </div>
          <div className="rounded-2xl bg-[#DDF5EA] p-3">
            <p className="text-[11px] font-bold uppercase text-[#0b938e]">Paid</p>
            <p className="text-[17px] font-extrabold text-[#0b938e]">{formatNaira(customer.totalPaid)}</p>
          </div>
        </div>

        {customer.outstanding > 0 && (
          <p className="mt-2 text-center text-[13px] font-semibold text-gray-600">{followUpLabel(customer)}</p>
        )}
      </Card>

      {/* WhatsApp / phone */}
      <Card className="mt-3">
        {customer.phone ? (
          <div className="flex items-center gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-full bg-green-50 text-xl">💬</span>
            <div className="min-w-0 flex-1">
              <p className="font-bold">{customer.phone}</p>
              <button onClick={() => { setPhoneInput(customer.phone!); setEditingPhone(true); }} className="text-[13px] font-semibold text-[#167C5A]">
                Change number
              </button>
            </div>
          </div>
        ) : (
          <div>
            <p className="font-bold">No phone number yet</p>
            <p className="text-[13px] text-gray-500">Add their WhatsApp number to send reminders.</p>
          </div>
        )}

        {(!customer.phone || editingPhone) && (
          <div className="mt-3 flex gap-2">
            <div className="flex-1">
              <Input
                placeholder="e.g. 0803 123 4567"
                inputMode="tel"
                value={phoneInput}
                onChange={(e) => setPhoneInput(e.target.value)}
              />
            </div>
            <Button className="!w-auto px-4" disabled={saving} onClick={savePhone}>
              {saving ? "…" : "Save"}
            </Button>
          </div>
        )}

        {wa && customer.outstanding > 0 && (
          <a
            href={wa}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-3 flex min-h-[52px] items-center justify-center gap-2 rounded-xl bg-[#25D366] px-5 font-bold text-white transition hover:brightness-95"
          >
            <span className="text-lg">💬</span> Message on WhatsApp
          </a>
        )}
        {helloWa && customer.outstanding <= 0 && (
          <a
            href={helloWa}            target="_blank"
            rel="noopener noreferrer"
            className="mt-3 flex min-h-[48px] items-center justify-center gap-2 rounded-xl border border-[#25D366] px-5 font-bold text-[#128C4B]"
          >
            <span className="text-lg">💬</span> Say hello on WhatsApp
          </a>
        )}
      </Card>

      {/* Unpaid */}
      {unpaid.length > 0 && (
        <div className="mt-4">
          <h2 className="font-extrabold">Unpaid ({unpaid.length})</h2>
          <div className="mt-2 flex flex-col gap-2">
            {unpaid.map((t) => (
              <Card key={t.id} className="!p-3">
                <div className="flex items-center gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[15px] font-bold">{t.description}</p>
                    <p className="mt-0.5 flex flex-wrap items-center gap-1.5 text-[12px] text-gray-500">
                      {formatNaira(t.amount)} · {formatDate(t.transaction_date)}
                      <Badge tone={t.payment_status === "interested" ? "amber" : "red"}>{t.payment_status === "pending" ? "credit" : t.payment_status}</Badge>
                      {t.due_date && <span>· promised {formatDate(t.due_date)}</span>}
                    </p>
                  </div>
                  <button
                    onClick={() => markPaid(t.id)}
                    disabled={payingId === t.id}
                    className="shrink-0 rounded-xl bg-[#167C5A] px-3.5 py-2.5 text-[13px] font-bold text-white disabled:opacity-60"
                  >
                    {payingId === t.id ? "…" : "Mark paid ✓"}
                  </button>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* History */}
      {paidTxns.length > 0 && (
        <div className="mt-4">
          <h2 className="font-extrabold">Paid history</h2>
          <div className="mt-2 flex flex-col gap-2">
            {paidTxns.map((t) => (
              <Link key={t.id} href={`/transactions/${t.id}`}>
                <Card className="flex items-center gap-3 !p-3">
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[14px] font-bold">{t.description}</span>
                    <span className="text-[12px] text-gray-500">{formatDate(t.transaction_date)}</span>
                  </span>
                  <span className="font-extrabold text-[#167C5A]">+{formatNaira(t.amount)}</span>
                </Card>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
