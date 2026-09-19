"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button, Card, Input, Select } from "@/components/ui";
import { useStore } from "@/lib/store";
import { EXPENSE_CATEGORIES } from "@/lib/constants";
import { formatNaira, toISODate } from "@/lib/utils";

export default function ScanPage() {
  const router = useRouter();
  const { addScan, addTransaction } = useStore();
  const [preview, setPreview] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);
  const [result, setResult] = useState({
    type: "expense" as "income" | "expense",
    description: "",
    amount: "",
    date: toISODate(new Date()),
    category: "Inventory / Stock",
    payment_status: "paid",
    payment_method: "Cash",
  });
  const [error, setError] = useState("");
  const [showForm, setShowForm] = useState(false);

  function onFile(file: File | undefined) {
    if (!file) return;
    const url = URL.createObjectURL(file);
    setPreview(url);
    setShowForm(false);
    setError("");
    // stash file for API
    (window as unknown as { __scanFile?: File }).__scanFile = file;
  }

  async function process() {
    setProcessing(true);
    setError("");
    try {
      const file = (window as unknown as { __scanFile?: File }).__scanFile;
      let data = null;
      if (file) {
        const fd = new FormData();
        fd.append("image", file);
        const res = await fetch("/api/ocr/process", { method: "POST", body: fd });
        if (res.ok) {
          const j = await res.json();
          data = j.extracted;
        }
      }
      // fallback demo extraction
      if (!data) {
        await new Promise((r) => setTimeout(r, 1500));
        data = {
          type: "expense",
          description: "Stock purchase from photo",
          amount: 25000,
          date: toISODate(new Date()),
          category: "Inventory / Stock",
          payment_status: "paid",
          payment_method: "Cash",
        };
      }
      setResult({
        type: data.type ?? "expense",
        description: data.description ?? "",
        amount: String(data.amount ?? ""),
        date: data.date ?? toISODate(new Date()),
        category: data.category ?? "Inventory / Stock",
        payment_status: data.payment_status ?? "paid",
        payment_method: data.payment_method ?? "Cash",
      });
      setShowForm(true);
      await addScan({ status: "completed", extracted_data: data, image_url: preview ?? undefined });
    } catch {
      setError("Could not read that photo. Try a clearer image or enter details by hand.");
      await addScan({ status: "failed", extracted_data: null });
    } finally {
      setProcessing(false);
    }
  }

  async function save() {
    const amt = Number(String(result.amount).replace(/,/g, ""));
    if (!result.description || !amt) {
      setError("Please check description and amount before saving.");
      return;
    }
    await addTransaction({
      type: result.type,
      description: result.description,
      amount: Math.round(amt),
      category: result.category,
      transaction_date: new Date(result.date).toISOString(),
      payment_status: result.payment_status as "paid" | "pending" | "credit",
      payment_method: result.payment_method,
      source: "ocr",
    });
    router.replace(`/success?amount=${Math.round(amt)}&type=${result.type}&desc=${encodeURIComponent(result.description)}`);
  }

  return (
    <div className="py-4 animate-fade-up">
      <div className="flex items-center justify-between">
        <h1 className="text-[22px] font-extrabold text-[#0F5132]">Scan a Record 📷</h1>
        <Link href="/scan/history" className="text-[13px] font-bold text-[#167C5A]">History</Link>
      </div>
      <p className="mt-1 text-[14px] text-gray-600">Have paper records? Snap a photo and Ledgerly will turn them into digital transactions.</p>

      {!preview && (
        <Card className="mt-4 border-2 border-dashed !border-[#167C5A]/40 text-center">
          <p className="text-4xl">📸</p>
          <p className="mt-2 font-bold">Take a photo of your receipt or ledger</p>
          <div className="mt-3 grid grid-cols-2 gap-2">
            <label className="inline-flex min-h-[48px] cursor-pointer items-center justify-center rounded-xl bg-[#167C5A] px-4 font-bold text-white">
              Scan record
              <input type="file" accept="image/*" capture="environment" className="hidden" onChange={(e) => onFile(e.target.files?.[0])} />
            </label>
            <label className="inline-flex min-h-[48px] cursor-pointer items-center justify-center rounded-xl border border-[#167C5A] px-4 font-bold text-[#0F5132]">
              Upload
              <input type="file" accept="image/*" className="hidden" onChange={(e) => onFile(e.target.files?.[0])} />
            </label>
          </div>
        </Card>
      )}

      {preview && (
        <Card className="mt-4">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={preview} alt="Scanned record" className="max-h-64 w-full rounded-xl object-cover" />
          {!showForm && !processing && (
            <div className="mt-3 grid grid-cols-2 gap-2">
              <Button variant="outline" onClick={() => { setPreview(null); setShowForm(false); }}>Retake</Button>
              <Button onClick={process}>Read photo ✨</Button>
            </div>
          )}
          {processing && (
            <div className="mt-3 rounded-xl bg-[#DDF5EA] p-4 text-center">
              <div className="flex justify-center gap-1">
                <span className="typing-dot inline-block h-2 w-2 rounded-full bg-[#167C5A]" />
                <span className="typing-dot inline-block h-2 w-2 rounded-full bg-[#167C5A]" />
                <span className="typing-dot inline-block h-2 w-2 rounded-full bg-[#167C5A]" />
              </div>
              <p className="mt-2 text-[14px] font-semibold text-[#0F5132]">Reading your record…</p>
            </div>
          )}
        </Card>
      )}

      {error && <p className="mt-3 rounded-xl bg-red-50 px-4 py-3 text-[14px] text-red-700">{error}</p>}

      {showForm && (
        <Card className="mt-3">
          <h2 className="font-extrabold">Looks correct? 👀</h2>
          <p className="text-[13px] text-gray-500">Check and fix anything before saving.</p>
          <div className="mt-3 flex flex-col gap-3">
            <div className="rounded-xl bg-[#F8FAF9] p-3 text-[14px]">
              <p>Detected: <b>{result.description || "—"}</b></p>
              <p>Amount: <b>{result.amount ? formatNaira(Number(String(result.amount).replace(/,/g, "")) || 0) : "—"}</b></p>
              <p>Date: <b>{result.date}</b> · Type: <b>{result.type}</b></p>
            </div>
            <Input label="Description" value={result.description} onChange={(e) => setResult({ ...result, description: e.target.value })} />
            <Input label="Amount (₦)" inputMode="numeric" value={result.amount} onChange={(e) => setResult({ ...result, amount: e.target.value })} />
            <Input label="Date" type="date" value={result.date} onChange={(e) => setResult({ ...result, date: e.target.value })} />
            <Select label="Category" value={result.category} onChange={(e) => setResult({ ...result, category: e.target.value })}>
              {EXPENSE_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
            </Select>
            <div className="grid grid-cols-2 gap-2">
              <Button variant="outline" onClick={() => setShowForm(false)}>Edit details</Button>
              <Button onClick={save}>Save transaction ✓</Button>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}
