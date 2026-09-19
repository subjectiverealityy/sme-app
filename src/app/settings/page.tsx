"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button, Card } from "@/components/ui";
import { LuSettings } from "react-icons/lu";
import { useStore } from "@/lib/store";
import { Logo } from "@/components/Logo";

export default function SettingsPage() {
  const { user, business, logout } = useStore();
  const router = useRouter();

  async function doLogout() {
    await logout();
    router.replace("/");
  }

  return (
    <div className="py-4 animate-fade-up">
      <Logo />
      <h1 className="mt-4 text-[22px] font-extrabold text-[#0F5132]">Settings <LuSettings className="inline" size={22} /></h1>
      <Card className="mt-3">
        <p className="text-[13px] text-gray-500">ACCOUNT</p>
        <p className="mt-1 font-bold">{user?.name ?? "Guest"}</p>
        <p className="text-[14px] text-gray-600">{user?.email ?? ""}</p>
        <p className="mt-2 text-[13px] text-gray-500">BUSINESS</p>
        <p className="font-bold">{business?.name ?? "—"}</p>
      </Card>
      <Card className="mt-3 flex flex-col gap-1">
        {[
          ["Business information", "/business"],
          ["Export data", "/export"],
          ["Reports", "/reports"],
          ["Scan history", "/scan/history"],
        ].map(([label, href]) => (
          <Link key={href} href={href} className="flex items-center justify-between rounded-xl px-2 py-3 hover:bg-gray-50">
            <span className="font-semibold">{label}</span>
            <span className="text-gray-400">→</span>
          </Link>
        ))}
      </Card>
      <Button variant="danger" className="mt-4" onClick={doLogout}>Log out</Button>
      <p className="mt-3 text-center text-[12px] text-gray-400">Ledgerly v1.0 • Simple records. Smarter business.</p>
    </div>
  );
}
