import { IRepository } from "./IRepository";
import { LocalRepository } from "./LocalRepository";
import { GoogleAppsScriptRepository } from "./GoogleAppsScriptRepository";
import { SupabaseRepository } from "./SupabaseRepository";

export function getRepository(): IRepository {
  const dataSource = (process.env.DATA_SOURCE || "local").toLowerCase();

  if (dataSource === "supabase") {
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
