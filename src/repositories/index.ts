import { IRepository } from "./IRepository";
import { LocalRepository } from "./LocalRepository";
import { SupabaseRepository } from "./SupabaseRepository";
import { getSupabaseAdminClient } from "../lib/supabase";

export function getRepository(): IRepository {
  // Mac dinh la supabase: thieu cau hinh thi bao loi ro rang,
  // khong am tham roi ve du lieu mau cua LocalRepository.
  const dataSource = (process.env.DATA_SOURCE || "supabase").toLowerCase();

  if (dataSource === "supabase") {
    const client = getSupabaseAdminClient();
    if (!client) {
      console.warn('[Repository] DATA_SOURCE is set to "supabase" but Supabase client configuration is missing. Check SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.');
    }
    return SupabaseRepository.getInstance();
  }

  if (dataSource === "local") {
    console.warn('[Repository] DATA_SOURCE=local: dang dung du lieu mau trong bo nho. Chi nen dung khi phat trien hoac chay test.');
    return LocalRepository.getInstance();
  }

  throw new Error(`DATA_SOURCE khong hop le: "${dataSource}". Chi nhan "supabase" hoac "local".`);
}

export const repo = getRepository();

export * from "./IRepository";
export * from "./LocalRepository";
export * from "./SupabaseRepository";
