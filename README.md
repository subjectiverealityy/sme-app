# Credyt — The cash-recovery assistant for Nigerian SMEs

Small businesses don't only have a sales problem. They have a "where is my money?" problem. Credyt helps them know who owes them, follow up without awkwardness, understand customer replies, and turn promises into collected cash.

Mobile-first app for Nigerian micro & small businesses who sell on credit. Track debtors, follow up on promises, collect calmly.

Next.js + TypeScript + Tailwind + Supabase + Gemini.

## Product demo

[Watch the product demo video](https://drive.google.com/file/d/1S2mor93730zNmFUVs9irT6sphgEGQ0HP/view?usp=sharing)

Auto-playing slide deck:

<iframe src="https://docs.google.com/presentation/d/1aEDf3s5Qcz5976U_xHGEUxZ4S7ftY3qD/embed?start=true&loop=true&delayms=3000" frameborder="0" width="760" height="427" allowfullscreen="true" mozallowfullscreen="true" webkitallowfullscreen="true"></iframe>

If the deck doesn't render above, [open it on Google Slides](https://docs.google.com/presentation/d/1aEDf3s5Qcz5976U_xHGEUxZ4S7ftY3qD/edit?usp=sharing).

## The problem

Selling is easy. Collecting is hard.

Customer buys on credit → "I'll pay tomorrow." → Tomorrow becomes Friday → Friday becomes next week → Business owner forgets → Cashflow suffers.

Today, many owners are stitching together WhatsApp chats, POS transactions, bank alerts, notebooks, memory, spreadsheets, and accounting apps — and the critical question remains: **"Who still owes me money?"**

Nigeria is deeply mobile-first: ~150M cellular connections and ~107M internet users at the start of 2025, while SMEDAN categorizes nano businesses as operating below ₦3M turnover with minimal infrastructure. The right product doesn't force the business owner into complicated accounting — it builds around the tools they already use.

## The solution

Credyt turns unpaid sales into an actionable collection workflow.

1. **Know** — Who owes me? Credyt automatically groups outstanding transactions by customer.
2. **Remind** — One tap → WhatsApp opens with the right message. No copying, no rewriting, no awkward "Hello sir, please…". Human still presses Send.
3. **Understand** — Customer replies "I go pay Friday." Credyt understands the promise + amount; the owner confirms it.
4. **Follow up** — Friday arrives. Credyt says "Follow up today." Promises become actionable tasks, not forgotten chats.
5. **Collect** — Customer pays. Owner records the part-payment; Credyt updates the remaining balance everywhere.

> "Credyt doesn't just tell you what happened to your money. It helps you act on what hasn't happened yet."

## Why Credyt is different

| Typical business software | Credyt |
|---|---|
| Records transactions | Records **+ acts on** unpaid transactions |
| Shows reports | Shows **who needs attention** |
| Requires accounting knowledge | Plain English |
| Owner checks manually | Follow-up queue |
| WhatsApp is separate | WhatsApp is part of the workflow |
| Customer replies are just chats | Replies become structured actions |
| Payment is recorded | Part-payments reduce the actual balance |
| Designed around accounting | Designed around how Nigerian businesses actually operate |

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

## Tech

- **Supabase** — Auth, Postgres, RLS (owner-scoped data)
- **Next.js + TypeScript** — fast web app, server-side validation
- **Gemini** — reply understanding, controlled message phrasing, OCR
- **WhatsApp** — Phase 1: official `wa.me` links; human confirms Send; no unofficial automation
- **Offline-first** — works with patchy connectivity; queues actions locally, syncs when online

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


## Video Demo
https://drive.google.com/file/d/1S2mor93730zNmFUVs9irT6sphgEGQ0HP/view?usp=sharing
