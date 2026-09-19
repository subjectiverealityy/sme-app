import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export async function getSupabaseServer() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anon) return null;
  const cookieStore = await cookies();
  return createServerClient(url, anon, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          );
        } catch {
          // ignore in read-only contexts
        }
      },
    },
  });
}

export async function getAuthBusinessId(): Promise<{
  userId: string | null;
  businessId: string | null;
}> {
  const supabase = await getSupabaseServer();
  if (!supabase) return { userId: null, businessId: null };
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { userId: null, businessId: null };
  const { data: biz } = await supabase
    .from("businesses")
    .select("id")
    .eq("owner_id", user.id)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();
  return { userId: user.id, businessId: biz?.id ?? null };
}
