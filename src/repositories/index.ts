import { IRepository } from "./IRepository";
import { LocalRepository } from "./LocalRepository";
import { GoogleAppsScriptRepository } from "./GoogleAppsScriptRepository";
import { SupabaseRepository } from "./SupabaseRepository";
import { getSupabaseAdminClient } from "../lib/supabase";

export function getRepository(): IRepository {
  const dataSource = (process.env.DATA_SOURCE || "local").toLowerCase();

  if (dataSource === "supabase") {
    const client = getSupabaseAdminClient();
    if (!client) {
      console.warn('[Repository] DATA_SOURCE is set to "supabase" but Supabase client configuration is missing. Check SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.');
    }
    return SupabaseRepository.getInstance();
  }

  if (dataSource === "gas") {
    return GoogleAppsScriptRepository.getInstance();
  }

  return LocalRepository.getInstance();
}

export const repo = getRepository();

export * from "./IRepository";
export * from "./LocalRepository";
export * from "./GoogleAppsScriptRepository";
export * from "./SupabaseRepository";
