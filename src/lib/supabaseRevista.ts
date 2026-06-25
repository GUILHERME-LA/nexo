import { createClient } from "@supabase/supabase-js";

const url = import.meta.env.VITE_SUPABASE_URL as string;
const key = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

// Cliente fixado no schema customizado `revista_timeline`.
// SOMENTE LEITURA — nenhuma mutação parte do dashboard.
export const supabaseRevista = createClient(url, key, {
  db: { schema: "revista_timeline" },
  auth: { persistSession: false, autoRefreshToken: false },
});
