import { DataMigrator } from "@/components/data-migrator"

export default function MigratePage() {
  return (
    <div className="container mx-auto p-8">
      <h1 className="text-2xl font-bold mb-6">Data Migration</h1>
      <p className="mb-6 text-gray-600">
        Use this tool to migrate your hardcoded data to your Supabase database. This will transfer all categories,
        products, recipes, and packaging units.
      </p>
      <DataMigrator />
    </div>
  )
}
