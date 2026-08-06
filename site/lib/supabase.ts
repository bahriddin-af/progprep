"use client";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

/**
 * Sozlamalar yo'q bo'lsa sayt ishlashda davom etadi — shunchaki kirish
 * tugmasi ko'rinmaydi va progress faqat brauzerda saqlanadi. Deploy
 * o'zgaruvchisiz ham buzilmasin.
 */
export const authEnabled = Boolean(url && anonKey);

let client: SupabaseClient | null = null;

export function supabase(): SupabaseClient | null {
  if (!authEnabled) return null;
  client ??= createClient(url!, anonKey!, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      // OAuth'dan qaytgan kod URL'da keladi — klient uni o'zi almashtiradi.
      detectSessionInUrl: true,
      flowType: "pkce",
    },
  });
  return client;
}
