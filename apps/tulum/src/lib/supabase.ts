import { createClient } from "@supabase/supabase-js";
// FlowBond-life canonical project — fgsrcxxccdjqyrpkitmk (never eoaj…)
export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
);
