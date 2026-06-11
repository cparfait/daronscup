import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

/**
 * Client Supabase navigateur — utilisé pour le Realtime (tchat, scores live).
 * La donnée applicative passe par Prisma ; Supabase sert surtout au WebSocket.
 */
export const supabase = createClient(url, anonKey, {
  auth: { persistSession: false },
  realtime: { params: { eventsPerSecond: 5 } },
});

/**
 * Client serveur avec la service role key — bypass RLS pour les opérations
 * d'administration (cron scores, seed). NE JAMAIS exposer côté client.
 */
export function createServiceClient() {
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
  return createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
