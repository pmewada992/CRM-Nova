import "server-only";
import { auth } from "@clerk/nextjs/server";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

/**
 * RLS-scoped client for the signed-in user. Forwards the Clerk session token
 * as the Supabase third-party auth token, so `auth.jwt() ->> 'sub'` in
 * policies resolves to the Clerk user id. Use this for every read/write that
 * should respect role/team visibility.
 */
export function createServerSupabaseClient(): SupabaseClient {
  return createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    async accessToken() {
      return (await auth()).getToken();
    },
  });
}

/**
 * Service-role client that bypasses RLS entirely. Server-only, and reserved
 * for the Clerk webhook (which runs before the calling user has a session)
 * — never use this to serve a request on behalf of a signed-in user.
 */
export function createAdminSupabaseClient(): SupabaseClient {
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  return createClient(SUPABASE_URL, serviceRoleKey, {
    auth: { persistSession: false },
  });
}
