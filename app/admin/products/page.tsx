import { ProductManagement } from "@/components/product-management"

export default function ProductsPage() {
  return (
    <main className="container mx-auto py-8">
      <h1 className="text-2xl font-bold mb-6">Produkt-Verwaltung</h1>
      <ProductManagement />
    </main>
  )
}
