import { createBrowserClient } from "@supabase/ssr"
import type { Database } from "./database.types"

export function createClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseAnonKey) {
    console.error("Missing Supabase environment variables")
    throw new Error("Missing Supabase environment variables")
  }

  return createBrowserClient<Database>(supabaseUrl, supabaseAnonKey)
}

// Keep the old export for backward compatibility
export const supabase = createClient()
