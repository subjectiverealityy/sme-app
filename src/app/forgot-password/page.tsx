"use client";

import { useState } from "react";
import Link from "next/link";
import { Button, Input } from "@/components/ui";
import { AuthShell } from "@/components/AuthShell";
import { getSupabaseBrowser, isSupabaseConfigured } from "@/lib/supabase/client";

export default function ForgotPage() {
  const [email, setEmail] = useState("");
  const [msg, setMsg] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      if (isSupabaseConfigured()) {
        const supabase = getSupabaseBrowser()!;
        const { error } = await supabase.auth.resetPasswordForEmail(email.trim());
        if (error) throw error;
      }
      setMsg("If an account exists for that email, a reset link has been sent.");
    } catch (e: unknown) {
      setMsg(e instanceof Error ? e.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthShell title="Reset password" subtitle="We'll email you a reset link.">
      <form onSubmit={submit} className="flex flex-col gap-4">
        <Input label="Email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@business.com" />
        {msg && <p className="rounded-xl bg-[#DDF5EA] px-4 py-3 text-[14px] text-[#0F5132]">{msg}</p>}
        <Button disabled={loading}>{loading ? "Sending…" : "Send reset link"}</Button>
      </form>
      <p className="mt-4 text-center text-[14px]">
        <Link href="/login" className="font-bold text-[#167C5A]">Back to login</Link>
      </p>
    </AuthShell>
  );
}
