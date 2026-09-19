"use client";

import { Suspense, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import jsPDF from "jspdf";
import { useStore } from "@/lib/store";
import { Button, Card, Select } from "@/components/ui";
import { getDateRange, formatNaira } from "@/lib/utils";

function Inner() {
  const params = useSearchParams();
  const { transactions, business } = useStore();
  const [preset, setPreset] = useState(params.get("preset") ?? "month");
  const [format, setFormat] = useState<"csv" | "pdf">("csv");
  const [msg, setMsg] = useState("");

  const filtered = useMemo(() => {
    if (preset === "all") return transactions;
    const { start, end } = getDateRange(preset as "week" | "month" | "last-month" | "year" | "all");
    return transactions.filter((t) => {
      const d = new Date(t.transaction_date);
      return d >= start && d <= end;
    });
  }, [transactions, preset]);

  const totalIn = filtered.filter((t) => t.type === "income").reduce((s, t) => s + Number(t.amount), 0);
  const totalOut = filtered.filter((t) => t.type === "expense").reduce((s, t) => s + Number(t.amount), 0);

  function exportCSV() {
    const header = "Date,Type,Description,Category,Status,Method,Customer/Vendor,Customer Phone,Promise Date,Amount (NGN),Notes";
    const rows = filtered.map((t) =>
      [
        new Date(t.transaction_date).toLocaleDateString("en-GB"),
        t.type,
        `"${String(t.description).replace(/"/g, '""')}"`,
        `"${t.category}"`,
        t.payment_status,
        t.payment_method ?? "",
        `"${t.customer_or_vendor ?? ""}"`,
        `"${t.customer_phone ?? ""}"`,
        t.due_date ? new Date(t.due_date).toLocaleDateString("en-GB") : "",
        t.amount,
        `"${(t.notes ?? "").replace(/"/g, '""')}"`,
      ].join(",")
    );
    const csv = [header, ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `credyt-${preset}-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    setMsg(`CSV downloaded — ${filtered.length} records.`);
  }

  function exportPDF() {
    try {
      const doc = new jsPDF();
      doc.setFontSize(18);
      doc.setTextColor(15, 81, 50);
      doc.text("Credyt Report", 14, 18);
      doc.setFontSize(11);
      doc.setTextColor(60, 60, 60);
      doc.text(`${business?.name ?? "My Business"}`, 14, 26);
      doc.text(`Period: ${preset}  •  Generated: ${new Date().toLocaleDateString("en-GB")}`, 14, 32);
      doc.text(`Money in: NGN ${totalIn.toLocaleString()}   Money out: NGN ${totalOut.toLocaleString()}   Profit: NGN ${(totalIn - totalOut).toLocaleString()}`, 14, 38);
      let y = 48;
      doc.setFontSize(9);
      filtered.slice(0, 60).forEach((t) => {
        if (y > 280) {
          doc.addPage();
          y = 16;
        }
        const line = `${new Date(t.transaction_date).toLocaleDateString("en-GB")} | ${t.type.toUpperCase()} | ${t.description.slice(0, 34)} | NGN ${Number(t.amount).toLocaleString()}`;
        doc.text(line, 14, y);
        y += 6;
      });
      doc.save(`credyt-${preset}.pdf`);
      setMsg(`PDF downloaded — ${filtered.length} records.`);
    } catch {
      setMsg("PDF export failed. Try CSV instead.");
    }
  }

  return (
    <div className="py-4 animate-fade-up">
      <h1 className="text-[22px] font-extrabold text-[#0F5132]">Export 📤</h1>
      <p className="text-[13px] text-gray-500">Download your records for bank or safekeeping.</p>
      <Card className="mt-3 flex flex-col gap-3">
        <Select label="Period" value={preset} onChange={(e) => setPreset(e.target.value)}>
          <option value="week">This week</option>
          <option value="month">This month</option>
          <option value="last-month">Last month</option>
          <option value="year">This year</option>
          <option value="all">All time</option>
        </Select>
        <Select label="Format" value={format} onChange={(e) => setFormat(e.target.value as "csv" | "pdf")}>
          <option value="csv">CSV (Excel)</option>
          <option value="pdf">PDF (professional)</option>
        </Select>
        <div className="rounded-xl bg-[#F8FAF9] p-3 text-[14px]">
          <p><b>{filtered.length}</b> records selected</p>
          <p>Money in: <b className="text-[#167C5A]">{formatNaira(totalIn)}</b> · Money out: <b>{formatNaira(totalOut)}</b></p>
        </div>
        {msg && <p className="rounded-xl bg-[#DDF5EA] px-4 py-2 text-[13px] text-[#0F5132]">{msg}</p>}
        <Button onClick={() => (format === "csv" ? exportCSV() : exportPDF())}>
          Download {format.toUpperCase()} ⬇
        </Button>
      </Card>
    </div>
  );
}

export default function ExportPage() {
  return (
    <Suspense>
      <Inner />
    </Suspense>
  );
}
