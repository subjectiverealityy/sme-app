"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Button, Input } from "@/components/ui";
import { AuthShell } from "@/components/AuthShell";
import { useStore } from "@/lib/store";
import { getSupabaseBrowser, isSupabaseConfigured } from "@/lib/supabase/client";
import { uid } from "@/lib/utils";

function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const { setUser, refresh } = useStore();
  const [email, setEmail] = useState("");
  const [pw, setPw] = useState("");
  const [show, setShow] = useState(false);
  const [err, setErr] = useState("");
  const [info, setInfo] = useState("");
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);

  const needsConfirmation = /confirm/i.test(err);

  async function resend() {
    if (!email.includes("@")) return setErr("Enter your email first, then resend.");
    setResending(true);
    setInfo("");
    try {
      const supabase = getSupabaseBrowser()!;
      const { error } = await supabase.auth.resend({ type: "signup", email: email.trim() });
      if (error) throw error;
      setInfo("Confirmation email sent — check your inbox (and spam), then click the link.");
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : "Could not resend. Try again.");
    } finally {
      setResending(false);
    }
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr("");
    if (!email.includes("@")) return setErr("Enter a valid email.");
    if (!pw) return setErr("Enter your password.");
    setLoading(true);
    try {
      if (isSupabaseConfigured()) {
        const supabase = getSupabaseBrowser()!;
        const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password: pw });
        if (error) throw error;
        await refresh();
        router.replace("/dashboard");
      } else {
        await new Promise((r) => setTimeout(r, 500));
        // demo: accept anything, restore saved user or create
        const saved = localStorage.getItem("ledgerly_user");
        if (saved) setUser(JSON.parse(saved));
        else setUser({ id: uid("user"), name: email.split("@")[0], email: email.trim() });
        router.replace("/dashboard");
      }
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : "Login failed. Check your details.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthShell title="Welcome back 👋" subtitle="Log in to continue your records.">
      {params.get("checkEmail") && !err && !info && (
        <p className="mb-4 rounded-xl bg-[#DDF5EA] px-4 py-3 text-[14px] text-[#0F5132]">
          ✉️ Account created — <b>check your email for the verification link</b>, then log in here.
        </p>
      )}
      <form onSubmit={submit} className="flex flex-col gap-4">
        <Input label="Email" type="email" placeholder="you@business.com" value={email} onChange={(e) => setEmail(e.target.value)} />
        <div>
          <Input label="Password" type={show ? "text" : "password"} placeholder="Your password" value={pw} onChange={(e) => setPw(e.target.value)} />
          <div className="mt-1 flex justify-between">
            <button type="button" onClick={() => setShow((v) => !v)} className="text-[13px] font-semibold text-[#167C5A]">
              {show ? "Hide" : "Show"}
            </button>
            <Link href="/forgot-password" className="text-[13px] font-semibold text-[#167C5A]">
              Forgot password?
            </Link>
          </div>
        </div>
        {err && (
          <div className="rounded-xl bg-red-50 px-4 py-3 text-[14px] text-red-700">
            <p>{err}</p>
            {needsConfirmation && isSupabaseConfigured() && (
              <button
                type="button"
                onClick={resend}
                disabled={resending}
                className="mt-2 font-bold text-[#167C5A] underline"
              >
                {resending ? "Sending…" : "Resend confirmation email"}
              </button>
            )}
          </div>
        )}
        {info && <p className="rounded-xl bg-[#DDF5EA] px-4 py-3 text-[14px] text-[#0F5132]">{info}</p>}
        <Button disabled={loading}>{loading ? "Logging in…" : "Log in"}</Button>
      </form>
      <p className="mt-5 text-center text-[14px] text-gray-600">
        New to Ledgerly?{" "}
        <Link href="/signup" className="font-bold text-[#167C5A]">
          Create account
        </Link>
      </p>
    </AuthShell>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
