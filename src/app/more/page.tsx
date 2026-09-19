"use client";

import Link from "next/link";
import { Card } from "@/components/ui";

export default function MorePage() {
  const links = [
    ["💛", "Who owes me", "Send WhatsApp reminders", "/owed"],
    ["📊", "Reports", "See summaries", "/reports"],
    ["✨", "Ask AI", "Insights about your business", "/ask"],
    ["📤", "Export", "CSV & PDF", "/export"],
    ["🏪", "Business", "Your profile", "/business"],
    ["⚙️", "Settings", "Account & logout", "/settings"],
  ] as const;
  return (
    <div className="py-4 animate-fade-up">
      <h1 className="text-[22px] font-extrabold text-[#0F5132]">More</h1>
      <div className="mt-3 flex flex-col gap-2">
        {links.map(([icon, title, sub, href]) => (
          <Link key={href} href={href}>
            <Card className="flex items-center gap-3">
              <span className="text-2xl">{icon}</span>
              <span className="flex-1">
                <span className="block font-bold">{title}</span>
                <span className="block text-[13px] text-gray-500">{sub}</span>
              </span>
              <span className="text-gray-300">→</span>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
