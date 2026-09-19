# Credyt — Product Overview

> Simple records. Smarter business.
> Mobile-first bookkeeping for Nigerian micro & small businesses.

---

## 1. What the app is

Credyt is a plain-language bookkeeping app built for Nigerian micro and small
businesses (MSMEs). It replaces the paper ledger, the head-counting, and the
"who hasn't paid me yet" guesswork.

- **Stack:** Next.js 16 + TypeScript + Tailwind CSS v4 + Supabase (Auth +
  Postgres + RLS) + Google Gemini (AI + OCR).
- **Two run modes:**
  - **Demo mode** — no keys required. Everything persists to `localStorage`
    and ships with Nigerian sample data ("Ada's Fashion Hub"). Used for
    quickstart testing.
  - **Live mode** — with Supabase keys, uses Supabase Auth + Postgres (RLS
    enforced), OCR uploads bucket, and server-side AI.
- **UX principle:** zero accounting jargon. No "debits", "ledger entries", or
  "receivables". Just *Money in*, *Money out*, *Profit*, and *Who owes you*.

## 2. Who it serves (ideal customer)

| Segment | Example | Why Credyt fits |
|---|---|---|
| Market traders & small shops | Balogun market trader, neighbourhood kiosk | Cash-heavy, sells on credit, currently uses a jotter |
| Fashion & tailoring | Ankara / aso-ebi designer (Ada's Fashion Hub) | Big-ticket custom orders, prepayment vs credit, fabric stock |
| Caterers & food businesses | Small catering, buka/restaurant | Event orders, deposits, ingredient costs |
| Transport operators | Okada/small shuttle owner | Fuel, maintenance, daily income per driver |
| Artisans & service pros | Electrician, barber, makeup artist | Job-based income, supplies, payment-tracking |

**Key behaviours of the target user:**
- **Sells on credit a lot** and struggles to collect. *(the #1 pain point)*
- Low-tech: prefers phones, big buttons, WhatsApp, voice, simple language.
- Record-keeping happens after the fact ("at the end of the day").
- Needs money: applying for loans / grants requires proof of income they
  don't have.
- English may be a second language (with pidgin mixed in); avoid jargon.
- Connectivity is patchy; the app must work offline-ish on cheap Android.

## 3. Current features

| Area | Route | What it does |
|---|---|---|
| Onboarding | `/` → welcome → `/signup` → `/onboarding` → `/first-transaction` | Creates account + business profile, then first transaction |
| Auth | Supabase Auth (+ demo mode) | Signup / login / forgot password / logout |
| Dashboard | `/dashboard` | Greeting header, Money In / Out / Profit cards, week-month-year chart, "money you're owed" banner, recent transactions, quick actions, daily trend |
| Records | `/transactions`, `/transactions/new`, `/transactions/[id]` | Full CRUD; income/expense, description, amount, category, date, payment status (paid/pending/credit), method, customer/vendor, notes |
| Scan / OCR | `/scan`, `/scan/history` | Snapshot a paper record, Gemini vision reads it into a draft the user confirms |
| Ask AI | `/ask` + `POST /api/ai/chat` | Natural-language questions; server computes verified figures so the model can't hallucinate numbers |
| Reports | `/reports` | Money in/out/profit for week/month/last-month/year, expense by category, income by category |
| Export | `/export` | CSV (Excel) and styled PDF of any period |
| Business profile | `/business` | Edit name, category, phone, location, description |
| More / Settings | `/more`, `/settings` | Hub links + account management |

**Data model (live mode):**
- `businesses` — one owner can have businesses; transactions attach to a business
- `transactions` — `numeric(14,2)` Naira amounts, type (`income`/`expense`),
  `payment_status` (`paid`/`pending`/`credit`)
- `categories` — system defaults + per-business custom
- `scanned_records` — OCR runs with status (`processing`/`completed`/`needs_review`/`failed`)
- RLS on every table, owner-scoped via `businesses.owner_id`.

## 4. Proposed killer features

Built to attack the target user's real pains — listed in build priority.

### 4.1 "Who Owes Me" debt hub + WhatsApp reminders — *the #1 killer feature*
- Dedicated tab listing every customer/vendor with an outstanding
  `pending`/`credit` balance, oldest-first.
- One-tap **WhatsApp follow-up** via `wa.me` deep link with an auto-generated
  polite reminder message: *"Hello {customer}, this is {business}. Your
  balance of ₦{amount} from {date} is due. Can you settle it today? Thank
  you!"*
- Tap "Mark paid" to settle without leaving the screen.
- Reason it kills: collecting debt is the #1 daily pain for credit-selling
  Nigerian SMEs; nobody else solves it in-app.

### 4.2 Voice recording
- Speak the transaction — *"Record ₦5,000 sale to Chidi and mark it pending"* —
  speech → parsed transaction draft → confirm → saved.
- Huge for low-literacy users and speed (hands-free, at the counter).

### 4.3 PWA / offline-first
- Installable to home screen, works on slow/patchy connections (syncs when
  back online). The app already persists to `localStorage`, so the wrapper is
  cheap and the payoff is huge for cheap-Android users.

### 4.4 Loan-ready statement + tax estimator
- Generate a bank-style **Statement of Account PDF** from their records —
  the document a loan officer / agent banking loan actually accepts.
- **Tax readiness estimate**: VAT (7.5%) + LED levies where applicable, so a
  business never walks into a tax check unprepared.
- Reason it kills: it converts boring records into *money* (loans) and
  *safety* (taxes).

### 4.5 Inventory / stock tracking
- Mark transactions as *stock-in* vs *stock-out*, auto-track remaining stock,
  low-stock alerts ("You're almost out of Ankara fabrics").
- Killer for fashion, retail, and food businesses.

### 4.6 AI daily briefing
- "Good morning" card on the dashboard: yesterday's profit, who owes you,
  unusual spending, what needs attention today.
- Turns the app from a recorder into a *daily adviser*.

## 5. Outcome

This set of features turns Credyt from "a notebook for your money" into a
**money-collector, an adviser, and a path to capital** — exactly the three
things a Nigerian micro-business owner wants but can't get from a paper ledger.