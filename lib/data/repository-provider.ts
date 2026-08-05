import type { BeautyProofRepository } from "./repository";
import { demoRepository } from "./demo-repository";
import { SupabaseBeautyProofRepository } from "./supabase-repository";

let supabaseRepository: SupabaseBeautyProofRepository | null = null;

export interface PersistenceConfiguration {
  mode: "memory" | "supabase" | "invalid";
  configured: boolean;
  message: string;
}

function environment() {
  const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  const secretKey = process.env.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
  return { url, secretKey };
}

export function persistenceConfiguration(): PersistenceConfiguration {
  const { url, secretKey } = environment();
  if (!url && !secretKey) return { mode: "memory", configured: false, message: "Supabase is not configured; using active-process memory persistence." };
  if (!url || !secretKey) return { mode: "invalid", configured: false, message: "Set both SUPABASE_URL and SUPABASE_SECRET_KEY (or legacy SUPABASE_SERVICE_ROLE_KEY)." };
  return { mode: "supabase", configured: true, message: "Supabase durable persistence is configured." };
}

export function getRepository(): BeautyProofRepository {
  const config = persistenceConfiguration();
  if (config.mode === "memory") return demoRepository;
  if (config.mode === "invalid") throw new Error(`INVALID_PERSISTENCE_CONFIGURATION: ${config.message}`);
  const { url, secretKey } = environment();
  if (!supabaseRepository) supabaseRepository = new SupabaseBeautyProofRepository(url, secretKey);
  return supabaseRepository;
}
