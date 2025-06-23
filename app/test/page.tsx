import { SupabaseTest } from "@/components/supabase-test"

export default function TestPage() {
  return (
    <div className="container mx-auto p-8">
      <h1 className="text-2xl font-bold mb-6">Supabase Integration Test</h1>
      <p className="mb-6 text-gray-600">
        This page tests your Supabase connection and shows the data currently in your database.
      </p>
      <SupabaseTest />
    </div>
  )
}
