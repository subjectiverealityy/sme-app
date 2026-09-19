"use client";

import Link from "next/link";
import type { ComponentType } from "react";
import { LuHandCoins, LuChartLine, LuSparkles, LuUpload, LuStore, LuSettings, LuArrowRight } from "react-icons/lu";
import { Card } from "@/components/ui";

export default function MorePage() {
  const links: { icon: ComponentType<{ size?: number; className?: string }>; title: string; sub: string; href: string }[] = [
    { icon: LuHandCoins, title: "Who owes me", sub: "Send WhatsApp reminders", href: "/owed" },
    { icon: LuChartLine, title: "Reports", sub: "See summaries", href: "/reports" },
    { icon: LuSparkles, title: "Ask AI", sub: "Insights about your business", href: "/ask" },
    { icon: LuUpload, title: "Export", sub: "CSV & PDF", href: "/export" },
    { icon: LuStore, title: "Business", sub: "Your profile", href: "/business" },
    { icon: LuSettings, title: "Settings", sub: "Account & logout", href: "/settings" },
  ];
  return (
    <div className="py-4 animate-fade-up">
      <h1 className="text-[22px] font-extrabold text-[#0F5132]">More</h1>
      <div className="mt-3 flex flex-col gap-2">
        {links.map(({ icon: Icon, title, sub, href }) => (
          <Link key={href} href={href}>
            <Card className="flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#DDF5EA] text-[#0F5132]">
                <Icon size={20} />
              </span>
              <span className="flex-1">
                <span className="block font-bold">{title}</span>
                <span className="block text-[13px] text-gray-500">{sub}</span>
              </span>
              <LuArrowRight size={16} className="text-gray-300" />
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
