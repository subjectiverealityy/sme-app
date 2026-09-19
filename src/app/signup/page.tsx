"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button, Input } from "@/components/ui";
import { AuthShell } from "@/components/AuthShell";
import { useStore } from "@/lib/store";
import { getSupabaseBrowser, isSupabaseConfigured } from "@/lib/supabase/client";
import { uid } from "@/lib/utils";

export default function SignupPage() {
  const router = useRouter();
  const { setUser } = useStore();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [pw, setPw] = useState("");
  const [pw2, setPw2] = useState("");
  const [show, setShow] = useState(false);
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);
  const [sentEmail, setSentEmail] = useState<string | null>(null);
  const [resending, setResending] = useState(false);
  const [resentMsg, setResentMsg] = useState("");

  async function resend() {
    if (!sentEmail) return;
    setResending(true);
    setResentMsg("");
    try {
      const supabase = getSupabaseBrowser()!;
      const { error } = await supabase.auth.resend({ type: "signup", email: sentEmail });
      if (error) throw error;
      setResentMsg("Verification email sent again — check your inbox and spam folder.");
    } catch (e: unknown) {
      setResentMsg(e instanceof Error ? e.message : "Could not resend. Try again.");
    } finally {
      setResending(false);
    }
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr("");
    if (!name.trim()) return setErr("Please enter your full name.");
    if (!email.includes("@")) return setErr("Please enter a valid email.");
    if (pw.length < 6) return setErr("Password must be at least 6 characters.");
    if (pw !== pw2) return setErr("Passwords do not match.");
    setLoading(true);
    try {
      if (isSupabaseConfigured()) {
        const supabase = getSupabaseBrowser()!;
        const { data, error } = await supabase.auth.signUp({
          email: email.trim(),
          password: pw,
          options: { data: { full_name: name.trim() } },
        });
        if (error) throw error;
        const u = data.user;
        // If email confirmation is ON, there is no session yet — don't block signup on profile insert.
        if (u) {
          const { error: profileError } = await supabase
            .from("profiles")
            .upsert({ id: u.id, full_name: name.trim(), email: email.trim() });
          if (profileError) {
            console.warn("Profile upsert failed (non-fatal):", profileError);
            // still continue — profile can be created on first login
          }
          setUser({ id: u.id, name: name.trim(), email: email.trim() });
        }
        if (!data.session) {
          // Email confirmation required — show verify screen instead of redirecting
          setSentEmail(email.trim());
          return;
        }
      } else {
        // demo mode
        await new Promise((r) => setTimeout(r, 600));
        setUser({ id: uid("user"), name: name.trim(), email: email.trim() });
      }
      router.replace("/onboarding");
    } catch (e: unknown) {
      const msg =
        e instanceof Error
          ? e.message
          : typeof e === "object" && e !== null && "message" in e
            ? String((e as { message: unknown }).message)
            : "Could not create account. Try again.";
      console.error("Signup failed:", e);
      setErr(msg);
    } finally {
      setLoading(false);
    }
  }

  if (sentEmail) {
    return (
      <AuthShell title="Check your email ✉️" subtitle="We sent you a verification link.">
        <div className="flex flex-col items-center rounded-3xl bg-white p-6 text-center shadow-sm">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[#DDF5EA] text-3xl">✉️</div>
          <h2 className="mt-3 text-[19px] font-extrabold text-[#0F5132]">Verify your email</h2>
          <p className="mt-1 text-[14px] text-gray-600">
            We sent a verification link to <b>{sentEmail}</b>. Click it, then come back and log in.
          </p>
          {resentMsg && <p className="mt-3 w-full rounded-xl bg-[#DDF5EA] px-4 py-2.5 text-[13px] text-[#0F5132]">{resentMsg}</p>}
          <Button variant="outline" className="mt-4" onClick={resend} disabled={resending}>
            {resending ? "Sending…" : "Resend email"}
          </Button>
          <Link href="/login" className="mt-3 inline-flex min-h-[48px] w-full items-center justify-center rounded-xl bg-[#167C5A] px-5 font-semibold text-white">
            Go to login →
          </Link>
        </div>
      </AuthShell>
    );
  }

  return (
    <AuthShell title="Create your account" subtitle="Start keeping simple business records today.">
      <form onSubmit={submit} className="flex flex-col gap-4">
        <Input label="Full name" placeholder="e.g. Adaeze Okonkwo" value={name} onChange={(e) => setName(e.target.value)} />
        <Input label="Email" type="email" placeholder="you@business.com" value={email} onChange={(e) => setEmail(e.target.value)} />
        <div>
          <Input
            label="Password"
            type={show ? "text" : "password"}
            placeholder="At least 6 characters"
            value={pw}
            onChange={(e) => setPw(e.target.value)}
          />
          <button type="button" onClick={() => setShow((v) => !v)} className="mt-1 text-[13px] font-semibold text-[#167C5A]">
            {show ? "Hide password" : "Show password"}
          </button>
        </div>
        <Input
          label="Confirm password"
          type={show ? "text" : "password"}
          placeholder="Repeat password"
          value={pw2}
          onChange={(e) => setPw2(e.target.value)}
        />
        {err && <p className="rounded-xl bg-red-50 px-4 py-3 text-[14px] text-red-700">{err}</p>}
        <Button disabled={loading}>{loading ? "Creating account…" : "Create account"}</Button>
      </form>

      <p className="mt-5 text-center text-[14px] text-gray-600">
        Already have an account?{" "}
        <Link href="/login" className="font-bold text-[#167C5A]">
          Log in
        </Link>
      </p>
      {!isSupabaseConfigured() && (
        <p className="mt-3 rounded-xl bg-[#DDF5EA] px-4 py-2 text-center text-[12px] text-[#0F5132]">
          Demo mode — no Supabase keys detected. Data saves on this device.
        </p>
      )}
    </AuthShell>
  );
}
