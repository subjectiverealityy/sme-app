# Ledgerly — Credit & Collections for Nigerian SMEs

Mobile-first app for Nigerian micro & small businesses who sell on credit. Track debtors, follow up on promises, collect calmly.

Next.js + TypeScript + Tailwind + Supabase + Gemini.

## Product demo

[Watch the product demo video](https://drive.google.com/file/d/1S2mor93730zNmFUVs9irT6sphgEGQ0HP/view?usp=sharing)

## Quick start

```bash
npm install
cp .env.example .env.local  # fill keys
npm run dev
```

Open http://localhost:3000

- Without Supabase keys, the app runs in **demo mode** (localStorage + Nigerian sample data).
- With keys, it uses Supabase Auth + Postgres with RLS.

## Env

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
GEMINI_API_KEY=   # server only, never expose to client
```

## Supabase setup

1. Create project at supabase.com
2. Run `supabase/schema.sql` in SQL editor (tables + RLS + default categories).
3. Create storage bucket `scans` (private) for OCR uploads.
4. Add URL + anon key to `.env.local`.

## Flow

`/` (splash → welcome) → `/signup` → `/onboarding` → `/first-transaction` → `/dashboard`

Bottom nav (mobile): Home, Owed, Scan, Ask AI, More. Desktop: sidebar.

## Key routes

- `/dashboard`, `/people` (debtor list), `/people/[name]` (debtor detail)
- `/transactions/new` (record a debtor), `/transactions`, `/transactions/[id]`
- `/owed` (follow-up queue), `/owed/queue` (bulk actions), `/owed/[key]` (reply link)
- `/scan`, `/scan/history`, `/ask`, `/reports`, `/export`, `/business`, `/settings`

## Core features

- **Debtor tracking** — Record sales with payment status: `paid`, `credit` (owes), `interested` (lead), `pending`
- **Promise dates** — Capture when a debtor says they'll pay; auto-calculates overdue/due-today/upcoming
- **Follow-up queue** — See who needs a nudge today; one-tap WhatsApp reminder with pre-filled message
- **Reply links** — Share `/r/<code>` links so debtors can confirm payment/promise/dispute; updates your records
- **AI chat** — Ask "Who owes me the most?" or "Draft a reminder for Mrs. Okafor" — aggregates Supabase data server-side, calls Gemini
- **OCR** — Upload receipt/invoice images; Gemini Vision extracts structured JSON for confirmation

## Data model (simplified)

- **Transaction**: `type: "income"`, `payment_status: "paid" | "credit" | "interested" | "pending"`, `customer_or_vendor`, `customer_phone`, `due_date`, `amount (₦)`
- **CustomerSummary** (derived): `outstanding`, `totalBought`, `totalPaid`, `followUp: "overdue" | "due-today" | "upcoming" | "none"`, `daysOverdue`
- **Business**: `name`, `category`, `phone`, `location`, `description`

## Money

Amounts stored as `numeric(14,2)`, displayed as ₦. 
- Profit = paid income − expenses
- Owed = pending/credit income (outstanding balances)

## Branches

- `feat/new-ui` — current working branch
- `feat/onboarding` — onboarding flow improvements (to be merged)
- `feat/OCR` — OCR/scan feature
- `design-theme-update` — design system updates