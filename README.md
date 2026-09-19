# Ledgerly — Simple records. Smarter business.

Mobile-first bookkeeping for Nigerian micro & small businesses. Next.js + TypeScript + Tailwind + Supabase + Gemini.

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

Bottom nav (mobile): Home, Records, Scan, Ask AI, More. Desktop: sidebar.

## Key routes

- `/dashboard`, `/transactions`, `/transactions/new`, `/transactions/[id]`
- `/scan`, `/scan/history`, `/ask`, `/reports`, `/export`, `/business`, `/settings`

## AI & OCR

- `POST /api/ai/chat` — authenticates, aggregates Supabase data server-side, then calls Gemini. Falls back to local calculations when no key.
- `POST /api/ocr/process` — Gemini vision extracts structured JSON, user confirms before saving.

## Money

Amounts stored as `numeric(14,2)`, displayed as ₦. Profit = paid income − expenses. Owed = pending/credit income.


## Video Demo
https://drive.google.com/file/d/1S2mor93730zNmFUVs9irT6sphgEGQ0HP/view?usp=sharing