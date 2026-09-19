"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { Logo } from "@/components/Logo";
import { useStore } from "@/lib/store";

const SHOPS = ["Fashion", "Food vendors", "Retail shops", "Salons", "Catering", "Freelancers", "POS agents", "Boutiques"];

const TESTIMONIALS = [
  { name: "Adaeze", biz: "Fashion Hub, Lekki", text: "I finally know who needs a reminder, and I can send it without making things awkward." },
  { name: "Ibrahim", biz: "Food vendor, Abuja", text: "The scan feature turned my paper notebook into clean records. My bank statement finally makes sense." },
  { name: "Funmi", biz: "Salon, Ikeja", text: "I keep every interested customer visible, so good opportunities do not disappear in a notebook." },
];

const FAQS = [
  { q: "Do I need accounting knowledge?", a: "No. Credyt uses plain words — Paid, Credit, Interested, and Money owed. If you can use WhatsApp, you can use Credyt." },
  { q: "Does it work on my phone?", a: "Yes, it's mobile-first. Record transactions, scan receipts with your camera, and check reports — all from your phone." },
  { q: "How do reminders work?", a: "Save a debtor's phone number, then choose Remind from the People table. Credyt opens a kind, prefilled WhatsApp message for you to review and send." },
  { q: "Is my data private?", a: "Yes. Every business only sees its own records, enforced at the database level with Row Level Security." },
];

const NAV_LINKS: [string, string][] = [
  ["Live demo", "#demo"],
  ["Features", "#features"],
  ["Ask AI", "#ai"],
  ["Stories", "#stories"],
  ["FAQ", "#faq"],
];

function useCountUp(target: number, start: boolean, duration = 1400) {
  const [val, setVal] = useState(0);
  useEffect(() => {
    if (!start) return;
    let raf = 0;
    const t0 = performance.now();
    const tick = (t: number) => {
      const p = Math.min(1, (t - t0) / duration);
      setVal(Math.round(target * (1 - Math.pow(1 - p, 3))));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [start, target, duration]);
  return val;
}

function LandingNav({ loggedIn }: { loggedIn: boolean }) {
  const [open, setOpen] = useState(false);
  return (
    <header className="sticky top-0 z-50 border-b border-gray-100/80 bg-white/90 text-[#17221D] backdrop-blur-lg">
      <div className="mx-auto flex h-16 w-full max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <Link href="/" className="flex items-center gap-2" aria-label="Credyt home">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#29224e] shadow-[0_3px_0_#160f4b]">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
              <path d="M18.3 7.1A7.2 7.2 0 1 0 17.7 17" stroke="#70D7C0" strokeWidth="2.7" strokeLinecap="round" />
              <path d="M8.1 9.4c2.4-.1 5.5.7 6.7 2.7 1.1 1.8.3 3.9-1.9 4.8" stroke="#70D7C0" strokeWidth="2.2" strokeLinecap="round" />
              <circle cx="18.5" cy="6.4" r="1.55" fill="#70D7C0" />
            </svg>
          </span>
          <span className="text-xl font-extrabold tracking-tight text-[#18122f]">Cred<span className="text-[#11b7ab]">yt</span></span>
        </Link>
        <nav className="hidden items-center gap-6 text-[14px] font-semibold text-gray-600 md:flex" aria-label="Main">
          {NAV_LINKS.map(([label, href]) => (
            <a key={href} href={href} className="rounded-lg px-2 py-1.5 transition-colors hover:text-[#29224e]">{label}</a>
          ))}
        </nav>
        <div className="hidden items-center gap-3 md:flex">
          {loggedIn ? (
            <Link href="/dashboard" className="rounded-xl bg-[#29224e] px-4 py-2.5 text-[14px] font-bold text-white shadow-sm transition hover:bg-[#3b3267]">
              Open dashboard →
            </Link>
          ) : (
            <>
              <Link href="/login" className="rounded-xl px-4 py-2.5 text-[14px] font-bold text-gray-600 transition-colors hover:text-[#29224e]">
                Log in
              </Link>
              <Link href="/signup" className="rounded-xl bg-[#29224e] px-4 py-2.5 text-[14px] font-bold text-white shadow-sm transition hover:bg-[#3b3267]">
                Get started free
              </Link>
            </>
          )}
        </div>
        <button
          className="rounded-lg p-2 -mr-1 text-[#29224e] md:hidden"
          onClick={() => setOpen((v) => !v)}
          aria-label="Toggle menu"
          aria-expanded={open}
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            {open ? <path d="M6 6l12 12M18 6L6 18" /> : <path d="M4 7h16M4 12h16M4 17h16" />}
          </svg>
        </button>
      </div>
      {open && (
        <div className="border-t border-gray-100 bg-white px-4 py-4 md:hidden">
          <nav className="flex flex-col gap-1 text-[15px] font-semibold" aria-label="Mobile">
            {NAV_LINKS.map(([label, href]) => (
              <a key={href} href={href} onClick={() => setOpen(false)} className="rounded-lg px-3 py-3 transition-colors hover:bg-[#d9f5ed]">{label}</a>
            ))}
            <div className="mt-2 border-t border-gray-100 pt-3">
              {loggedIn ? (
                <Link href="/dashboard" onClick={() => setOpen(false)} className="rounded-xl bg-[#29224e] px-4 py-3 text-center font-bold text-white">Open dashboard →</Link>
              ) : (
                <div className="grid grid-cols-2 gap-2">
                  <Link href="/login" onClick={() => setOpen(false)} className="rounded-xl border border-gray-200 px-4 py-3 text-center font-bold">Log in</Link>
                  <Link href="/signup" onClick={() => setOpen(false)} className="rounded-xl bg-[#29224e] px-4 py-3 text-center font-bold text-white">Get started</Link>
                </div>
              )}
            </div>
          </nav>
        </div>
      )}
    </header>
  );
}

function Hero({ loggedIn }: { loggedIn: boolean }) {
  return (
    <section className="relative overflow-hidden bg-[#faf7f2] text-[#272047]">
      <div className="pointer-events-none absolute -left-24 -top-24 h-80 w-80 rounded-full bg-[#d9f5ed] blur-3xl" />
      <div className="pointer-events-none absolute -right-24 top-32 h-72 w-72 rounded-full bg-[#fce0d3]/70 blur-3xl" />
      <div className="relative mx-auto grid w-full max-w-7xl grid-cols-1 items-center gap-10 px-4 pb-14 pt-12 sm:px-6 md:grid-cols-2 md:gap-8 md:pt-20 lg:px-8">
        <div className="animate-fade-up">
          <span className="inline-flex items-center gap-2 rounded-full border border-[#11b7ab]/20 bg-[#d9f5ed] px-3 py-1.5 text-[12px] font-bold tracking-wide text-[#272047]">
            <span className="h-2 w-2 animate-pulse rounded-full bg-[#11b7ab]" /> BUILT FOR NIGERIAN SMALL BUSINESSES
          </span>
          <h1 className="mt-4 text-balance text-[34px] font-extrabold leading-[1.08] tracking-tight text-[#29224e] sm:text-[42px] md:text-[52px] lg:text-[56px]">
            Know who owes you, <span className="text-[#0b938e]">without the awkwardness.</span>
          </h1>
          <p className="mt-3 max-w-md text-pretty text-[15px] leading-relaxed text-gray-600 sm:text-[16px] md:text-[17px]">
            Keep debtor details, payment status, promises, and gentle WhatsApp reminders in one calm place.
          </p>
          <div className="mt-6 flex flex-col gap-2 sm:max-w-md sm:flex-row sm:items-center">
            <Link href={loggedIn ? "/dashboard" : "/signup"} className="rounded-2xl bg-[#29224e] px-6 py-3.5 text-center text-[16px] font-extrabold text-white shadow-lg shadow-[#29224e]/20 transition hover:scale-[1.02] hover:bg-[#3b3267]">
              {loggedIn ? "Continue to dashboard →" : "Create free account →"}
            </Link>
            <a href="#demo" className="rounded-2xl border border-[#11b7ab]/40 bg-white px-6 py-3.5 text-center text-[16px] font-bold text-[#29224e] transition hover:bg-[#d9f5ed]">
              ▶ See how it works
            </a>
          </div>
          <div className="mt-5 flex items-center gap-3 text-[13px] text-gray-500">
            <div className="flex -space-x-2">
              {["AO", "IM", "FK"].map((i) => (
                <span key={i} className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-white bg-[#d9f5ed] text-[11px] font-extrabold text-[#272047]">{i}</span>
              ))}
            </div>
            <span className="text-pretty">Loved by shops, vendors &amp; freelancers</span>
          </div>
        </div>

        <div className="animate-pop-in mx-auto w-full max-w-md rounded-3xl border border-[#e9e3da] bg-white p-5 text-[#272047] shadow-xl md:max-w-none">
          <div className="flex items-center justify-between">
            <p className="text-[13px] font-bold uppercase tracking-wide text-gray-400">A calmer way to collect</p>
            <span className="rounded-full bg-[#d9f5ed] px-2.5 py-1 text-[12px] font-bold text-[#272047]">CREDYT</span>
          </div>
          <div className="mt-4 grid grid-cols-1 gap-2 min-[420px]:grid-cols-2">
            <div className="rounded-2xl bg-[#29224e] p-4 text-white">
              <p className="text-[11px] font-bold uppercase opacity-70">Money owed</p>
              <p className="mt-2 text-[25px] font-extrabold tracking-tight">₦173,500</p>
              <p className="mt-1 text-[11px] opacity-70">3 open balances</p>
            </div>
            <div className="rounded-2xl bg-[#70d7c0] p-4 text-[#272047]">
              <p className="text-[11px] font-bold uppercase opacity-70">Due today</p>
              <p className="mt-2 text-[25px] font-extrabold tracking-tight">2</p>
              <p className="mt-1 text-[11px] opacity-70">gentle follow-ups</p>
            </div>
          </div>
          <div className="mt-3 rounded-2xl border border-[#eee9e3] p-3">
            <div className="flex items-center gap-3">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#70d7c0] text-[11px] font-extrabold">AO</span>
              <span className="min-w-0 flex-1">
                <b className="block truncate text-[13px]">Amaka Okafor</b>
                <span className="text-[11px] text-gray-500">45 days old · no reminder yet</span>
              </span>
              <b className="text-[13px]">₦127,000</b>
            </div>
            <div className="mt-3 flex items-center justify-between rounded-xl bg-[#d9f5ed] px-3 py-2 text-[12px] font-bold text-[#272047]">
              <span>Send a kind reminder</span>
              <span>WhatsApp →</span>
            </div>
          </div>
        </div>
      </div>
      {/* marquee */}
      <div className="relative border-t border-gray-100 bg-[#DDF5EA]/50 py-3">
        <div className="flex overflow-hidden">
          <div className="animate-marquee flex shrink-0 gap-8 pr-8 text-[14px] font-bold text-[#0F5132]/80">
            {[...SHOPS, ...SHOPS].map((s, i) => (
              <span key={i} className="whitespace-nowrap">✦ {s}</span>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function Stats() {
  const ref = useRef<HTMLDivElement>(null);
  const [start, setStart] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(([e]) => e.isIntersecting && setStart(true), { threshold: 0.4 });
    obs.observe(el);
    return () => obs.disconnect();
  }, []);
  const a = useCountUp(30, start);
  const b = useCountUp(500, start);
  const c = useCountUp(100, start);
  const items = [
    [`${a}s`, "to record a sale"],
    [`₦${b}k+`, "tracked by demo shops"],
    [`${c}%`, "no accounting jargon"],
  ];
  return (
    <section ref={ref} className="mx-auto grid w-full max-w-7xl grid-cols-3 gap-2 px-4 py-8 sm:gap-4 sm:px-6 lg:px-8">
      {items.map(([v, l]) => (
        <div key={l} className="rounded-2xl bg-white p-4 text-center shadow-sm sm:p-5">
          <p className="text-[22px] font-extrabold tracking-tight text-[#0F5132] sm:text-[26px] md:text-[30px]">{v}</p>
          <p className="mt-0.5 text-[12px] text-gray-500 md:text-[14px]">{l}</p>
        </div>
      ))}
    </section>
  );
}

function FeatureTabs() {
  const [tab, setTab] = useState<"record" | "scan" | "ask">("record");
  const content = {
    record: { icon: "⚡", title: "Record in seconds", body: "Add a debtor with friendly questions, not ledger codes. Works great one-handed at the shop.", points: ["Name and what they want", "Paid / Credit / Interested tracking", "Money owed at a glance"] },
    scan: { icon: "📷", title: "Keep records tidy", body: "See everyone in one table, then open a full detail view whenever you need context.", points: ["Search by debtor", "View complete history", "Quick WhatsApp follow-up"] },
    ask: { icon: "✨", title: "Ask about your business", body: "Chat with your own data. Real figures calculated from your records, explained in plain language.", points: ["How much did I make?", "Where did I spend most?", "Compare this vs last month"] },
  }[tab];
  return (
    <section id="features" className="mx-auto w-full max-w-7xl scroll-mt-20 px-4 py-10 sm:px-6 lg:px-8">
      <h2 className="text-balance text-center text-[26px] font-extrabold tracking-tight text-[#0F5132] sm:text-[30px] md:text-[34px]">Everything, minus the headache</h2>
      <div className="mx-auto mt-5 flex w-full max-w-md gap-1 rounded-2xl bg-white p-1.5 shadow-sm">
        {(["record", "scan", "ask"] as const).map((t) => (
          <button key={t} onClick={() => setTab(t)} className={`flex-1 truncate rounded-xl px-2 py-2.5 text-[13px] font-bold transition sm:px-3 sm:text-[14px] ${tab === t ? "bg-[#167C5A] text-white shadow" : "text-gray-500 hover:text-[#0F5132]"}`}>
            {t === "record" ? "⚡ Record" : t === "scan" ? "📷 Scan" : "✨ Ask AI"}
          </button>
        ))}
      </div>
      <div key={tab} className="animate-pop-in mx-auto mt-4 w-full max-w-2xl rounded-3xl bg-white p-6 shadow-sm sm:p-8">
        <p className="text-4xl" aria-hidden>{content.icon}</p>
        <h3 className="mt-2 text-[20px] font-extrabold tracking-tight sm:text-[22px]">{content.title}</h3>
        <p className="mt-1 text-pretty text-[15px] text-gray-600">{content.body}</p>
        <ul className="mt-3 flex flex-col gap-2">
          {content.points.map((p) => (
            <li key={p} className="flex items-center gap-2 rounded-xl bg-[#F8FAF9] px-3 py-2.5 text-[14px] font-medium">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#DDF5EA] text-[13px] font-bold text-[#0F5132]">✓</span>{p}
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

function Steps() {
  const steps = [
    ["1", "Create account", "30 seconds. Just name, email, password."],
    ["2", "Add your business", "Shop name, type, phone — that's it."],
    ["3", "Add your first debtor", "Name → status → reminder-ready details."],
  ];
  return (
    <section className="bg-white py-12">
      <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
        <h2 className="text-balance text-center text-[24px] font-extrabold tracking-tight text-[#0F5132] sm:text-[28px] md:text-[30px]">From download to dashboard in 2 minutes</h2>
        <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3">
          {steps.map(([n, t, d]) => (
            <div key={n} className="rounded-2xl bg-[#F8FAF9] p-5 transition hover:-translate-y-1 hover:shadow-md">
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-[#167C5A] text-lg font-extrabold text-white">{n}</span>
              <p className="mt-3 font-extrabold">{t}</p>
              <p className="text-pretty text-[14px] text-gray-600">{d}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

const AI_QA: Record<string, string> = {
  "How much am I owed?": "You are owed ₦173,500 across 3 open balances. Two follow-ups are due today.",
  "Who needs a reminder?": "Amaka Okafor and Chinedu Eze have open balances and no reminder sent yet.",
};

function AiDemo() {
  const [active, setActive] = useState<string | null>(null);
  const [typing, setTyping] = useState(false);
  const [shown, setShown] = useState("");
  const ask = (q: string) => {
    setActive(q);
    setTyping(true);
    setShown("");
    const full = AI_QA[q];
    let i = 0;
    const timer = setInterval(() => {
      i += 3;
      setShown(full.slice(0, i));
      if (i >= full.length) {
        clearInterval(timer);
        setTyping(false);
      }
    }, 30);
  };
  return (
    <section id="ai" className="mx-auto w-full max-w-7xl scroll-mt-20 px-4 py-10 sm:px-6 lg:px-8">
      <div className="grid gap-6 overflow-hidden rounded-3xl border border-[#11b7ab]/20 bg-white p-6 shadow-sm sm:p-8 md:grid-cols-2 md:gap-8 md:p-10">
        <div>
          <span className="rounded-full bg-[#d9f5ed] px-3 py-1 text-[12px] font-bold text-[#272047]">✨ ASK CREDYT — LIVE PREVIEW</span>
          <h2 className="mt-3 text-balance text-[26px] font-extrabold leading-tight tracking-tight text-[#29224e] sm:text-[30px] md:text-[32px]">Ask in plain English. Get clear answers.</h2>
          <p className="mt-2 text-pretty text-[14px] text-gray-600">Tap a question to see how Credyt answers from actual debtor records — never made-up figures.</p>
          <div className="mt-4 flex flex-col gap-2">
            {Object.keys(AI_QA).map((q) => (
              <button key={q} onClick={() => ask(q)} className={`rounded-2xl border px-4 py-3 text-left text-[14px] font-semibold transition ${active === q ? "border-[#167C5A] bg-[#DDF5EA] text-[#0F5132]" : "border-gray-100 bg-[#F8FAF9] hover:border-[#167C5A]/40"}`}>
                “{q}”
              </button>
            ))}
          </div>
        </div>
        <div className="flex min-h-[220px] flex-col rounded-2xl bg-white p-4 text-[#17221D]">
          {!active && <p className="m-auto text-center text-[14px] text-gray-400">👆 Tap a question to see the magic</p>}
          {active && (
            <>
              <p className="max-w-[80%] self-end rounded-2xl bg-[#167C5A] px-4 py-2.5 text-[14px] font-medium text-white">{active}</p>
              <p className="mt-2 max-w-[85%] self-start rounded-2xl bg-[#F8FAF9] px-4 py-2.5 text-[14px] leading-relaxed shadow-sm">
                {shown}
                {typing && <span className="ml-1 inline-block h-3 w-1 animate-pulse bg-[#167C5A]" />}
              </p>
            </>
          )}
          <Link href="/signup" className="mt-auto pt-4 text-center text-[14px] font-bold text-[#167C5A]">Try with my own data →</Link>
        </div>
      </div>
    </section>
  );
}

function DemoStrip() {
  const txns = useMemo(
    () => [
      { icon: "AO", d: "Amaka Okafor", t: "45 days old · no reminder", a: "₦127,000", status: "Credit" },
      { icon: "CE", d: "Chinedu Eze", t: "26 days old · no reminder", a: "₦28,000", status: "Credit" },
      { icon: "BS", d: "Bola Stores", t: "Interested in Ankara", a: "—", status: "Interested" },
    ],
    []
  );
  return (
    <section id="demo" className="mx-auto w-full max-w-7xl scroll-mt-20 px-4 py-6 sm:px-6 lg:px-8">
      <div className="grid gap-4 md:grid-cols-2">
        <div className="animate-float rounded-3xl border border-gray-100 bg-white p-5 shadow-lg">
          <p className="text-[13px] font-bold text-gray-400">GOOD MORNING, ADA</p>
          <div className="mt-2 grid grid-cols-3 gap-2 text-center">
            <div className="rounded-2xl bg-[#29224e] p-3 text-white"><p className="text-[11px] font-bold opacity-80">Money owed</p><p className="text-[16px] font-extrabold tracking-tight">₦173k</p></div>
            <div className="rounded-2xl bg-[#70d7c0] p-3"><p className="text-[11px] font-bold text-[#272047]">Follow-ups</p><p className="text-[16px] font-extrabold tracking-tight text-[#272047]">2 due</p></div>
            <div className="rounded-2xl bg-[#f69a72] p-3"><p className="text-[11px] font-bold text-[#272047]">Reminders</p><p className="text-[16px] font-extrabold tracking-tight text-[#272047]">0 sent</p></div>
          </div>
          <div className="mt-3 rounded-2xl border border-[#eee9e3] p-3 text-[12px] text-gray-500">A clear little list of who needs a nudge, without the awkwardness.</div>
        </div>
        <div className="animate-float-delay rounded-3xl border border-gray-100 bg-white p-5 shadow-lg">
          <p className="font-extrabold">Largest balances</p>
          <div className="mt-2 flex flex-col gap-2">
            {txns.map((t) => (
              <div key={t.d} className="flex items-center gap-3 rounded-2xl bg-[#F8FAF9] p-3 transition hover:scale-[1.01]">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#70d7c0] text-[11px] font-extrabold text-[#272047]">{t.icon}</span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[14px] font-bold">{t.d}</span>
                  <span className="truncate text-[12px] text-gray-500">{t.t}</span>
                </span>
                <span className="shrink-0 text-right">
                  <span className="block text-[14px] font-extrabold">{t.a}</span>
                  <span className="text-[11px] text-[#0b938e]">{t.status}</span>
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function Stories() {
  const [i, setI] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setI((v) => (v + 1) % TESTIMONIALS.length), 4500);
    return () => clearInterval(t);
  }, []);
  const s = TESTIMONIALS[i];
  return (
    <section id="stories" className="bg-white py-12">
      <div className="mx-auto w-full max-w-3xl px-4 text-center sm:px-6">
        <h2 className="text-balance text-center text-[24px] font-extrabold tracking-tight text-[#0F5132] sm:text-[28px] md:text-[30px]">Shop owners are keeping better records</h2>
        <div key={i} className="animate-pop-in mt-6 rounded-3xl bg-[#F8FAF9] p-6 sm:p-8">
          <p className="text-pretty text-[16px] leading-relaxed sm:text-[17px]">“{s.text}”</p>
          <p className="mt-3 font-extrabold text-[#0F5132]">{s.name} <span className="font-normal text-gray-500">· {s.biz}</span></p>
        </div>
        <div className="mt-4 flex justify-center gap-2">
          {TESTIMONIALS.map((_, d) => (
            <button key={d} onClick={() => setI(d)} aria-label={`Story ${d + 1}`} className={`h-2.5 rounded-full transition ${d === i ? "w-8 bg-[#167C5A]" : "w-2.5 bg-gray-200"}`} />
          ))}
        </div>
      </div>
    </section>
  );
}

function Faq() {
  const [open, setOpen] = useState<number | null>(0);
  return (
    <section id="faq" className="mx-auto w-full max-w-3xl scroll-mt-20 px-4 py-10 sm:px-6">
      <h2 className="text-balance text-center text-[24px] font-extrabold tracking-tight text-[#0F5132] sm:text-[28px]">Questions? Answered.</h2>
      <div className="mt-4 flex flex-col gap-2">
        {FAQS.map((f, idx) => (
          <div key={f.q} className="overflow-hidden rounded-2xl bg-white shadow-sm">
            <button onClick={() => setOpen(open === idx ? null : idx)} className="flex w-full items-center justify-between gap-3 px-4 py-4 text-left font-bold" aria-expanded={open === idx}>
              {f.q}<span className={`shrink-0 transition ${open === idx ? "rotate-45" : ""}`}>＋</span>
            </button>
            {open === idx && <p className="animate-fade-up text-pretty px-4 pb-4 text-[14px] text-gray-600">{f.a}</p>}
          </div>
        ))}
      </div>
    </section>
  );
}

export default function Home() {
  const { user } = useStore();
  return (
    <div className="flex min-h-screen flex-col bg-white">
      <LandingNav loggedIn={!!user} />
      <main className="flex-1">
        <Hero loggedIn={!!user} />
        <Stats />
        <DemoStrip />
        <FeatureTabs />
        <Steps />
        <AiDemo />
        <Stories />
        <Faq />
        <section className="px-4 pb-10 sm:px-6 lg:px-8">
          <div className="relative mx-auto max-w-7xl overflow-hidden rounded-3xl bg-[#167C5A] p-8 text-center text-white sm:p-10 md:p-12">
            <div className="animate-blob pointer-events-none absolute -right-10 -top-10 h-48 w-48 rounded-full bg-white/10 blur-2xl" />
            <h2 className="text-balance mx-auto max-w-2xl text-[26px] font-extrabold leading-tight tracking-tight sm:text-[32px] md:text-[36px]">Start tonight. Collect more calmly tomorrow.</h2>
            <p className="mx-auto mt-2 max-w-md text-pretty text-white/85">Join small businesses keeping their debtor records clear with Credyt.</p>
            <div className="mx-auto mt-5 flex w-full max-w-sm flex-col gap-2 sm:flex-row">
              <Link href={user ? "/dashboard" : "/signup"} className="flex-1 rounded-2xl bg-white px-6 py-3.5 text-center font-extrabold text-[#0F5132] shadow-sm transition hover:bg-white/90">
                {user ? "Open dashboard →" : "Get started free →"}
              </Link>
              {!user && (
                <Link href="/login" className="flex-1 rounded-2xl border border-white/40 px-6 py-3.5 text-center font-bold transition hover:bg-white/10">
                  Log in
                </Link>
              )}
            </div>
          </div>
        </section>
      </main>
      <footer className="border-t border-gray-100 bg-white py-8">
        <div className="mx-auto flex w-full max-w-7xl flex-col items-center justify-between gap-3 px-4 text-center sm:px-6 md:flex-row md:text-left lg:px-8">
          <Logo />
          <p className="text-pretty text-[13px] text-gray-500">Simple records. Smarter business. · Made for Nigerian SMEs 🇳🇬</p>
          <div className="flex gap-4 text-[14px] font-semibold text-gray-600">
            <Link href="/login" className="transition-colors hover:text-[#29224e]">Log in</Link>
            <Link href="/signup" className="transition-colors hover:text-[#29224e]">Sign up</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}