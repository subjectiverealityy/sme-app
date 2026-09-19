"use client";

import Link from "next/link";
import { useStore } from "@/lib/store";
import { Badge, Card, EmptyState } from "@/components/ui";
import { formatDate } from "@/lib/utils";

export default function ScanHistoryPage() {
  const { scans } = useStore();
  return (
    <div className="py-4 animate-fade-up">
      <Link href="/scan" className="text-[14px] font-bold text-[#167C5A]">← Scan</Link>
      <h1 className="mt-1 text-[22px] font-extrabold text-[#0F5132]">Scan history</h1>
      {scans.length === 0 ? (
        <div className="mt-3">
          <EmptyState title="No scans yet" body="Your scanned records will appear here." />
        </div>
      ) : (
        <div className="mt-3 flex flex-col gap-2">
          {scans.map((s) => (
            <Card key={s.id} className="!p-3">
              <div className="flex items-center justify-between">
                <span className="text-[14px] font-bold">{formatDate(s.created_at)}</span>
                <Badge tone={s.status === "completed" ? "green" : s.status === "failed" ? "red" : "amber"}>{s.status.replace("_", " ")}</Badge>
              </div>
              <p className="mt-1 text-[13px] text-gray-600">
                {typeof s.extracted_data === "object" && s.extracted_data
                  ? JSON.stringify(s.extracted_data).slice(0, 120)
                  : "No data extracted"}
              </p>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
