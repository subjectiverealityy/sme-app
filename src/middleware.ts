import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Lightweight guard: app handles auth client-side + Supabase RLS enforces data isolation.
// Redirect logged-out deep links is handled in pages; keep middleware permissive for demo mode.
export function middleware(_req: NextRequest) {
  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard/:path*", "/transactions/:path*", "/reports/:path*", "/ask/:path*"],
};
