"use client"

import type React from "react"

import { useState, useMemo } from "react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Plus, Minus, Search } from "lucide-react"
import type { ProductWithCategory } from "@/lib/supabase-service"

interface ProductCategoriesProps {
  categories: { id: number; name: string; symbol?: string }[]
  products: ProductWithCategory[]
  handleProductSelect: (
    productId: number,
    productName: string,
    category: string,
    quantity: number,
    unit: string,
    overwrite?: boolean,
  ) => void
  mode?: string
  productQuantities?: Record<string, number>
  onQuantityChange?: (product: string, quantity: number) => void
}

export function ProductCategories({
  categories,
  products,
  handleProductSelect,
  mode = "packliste",
  productQuantities = {},
  onQuantityChange,
}: ProductCategoriesProps) {
  // Define the correct order of categories for Packliste mode
  const packlisteCategories = ["Essen", "Getränke Pet", "Getränke Glas", "Getränke Spezial", "Equipment", "Kassa"]

  // Filter and sort categories based on mode
  const sortedCategories = useMemo(() => {
    if (mode === "packliste") {
      return categories
        .filter((cat) => packlisteCategories.includes(cat.name))
        .sort((a, b) => packlisteCategories.indexOf(a.name) - packlisteCategories.indexOf(b.name))
    }
    return categories
  }, [categories, mode])

  const [activeCategory, setActiveCategory] = useState<string | null>(
    sortedCategories.length > 0 ? sortedCategories[0].name : null,
  )
  const [searchTerm, setSearchTerm] = useState("")

  // Group products by category
  const productsByCategory = categories.reduce<Record<string, ProductWithCategory[]>>((acc, category) => {
    acc[category.name] = products.filter((product) => product.category?.name === category.name)
    return acc
  }, {})

  const handleQuantityChange = (e: React.ChangeEvent<HTMLInputElement>, product: ProductWithCategory) => {
    const value = Number.parseInt(e.target.value)
    if (!isNaN(value) && value >= 0 && onQuantityChange) {
      onQuantityChange(product.name, value)
    }
  }

  const filteredProducts = (categoryName: string) => {
    const categoryProducts = productsByCategory[categoryName] || []
    if (!searchTerm) return categoryProducts

    const lowerSearchTerm = searchTerm.toLowerCase()
    return categoryProducts.filter((product) => product.name.toLowerCase().includes(lowerSearchTerm))
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />
          <Input
            placeholder="Produkt suchen..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        {searchTerm && (
          <Button variant="outline" onClick={() => setSearchTerm("")} className="w-full sm:w-auto">
            Suche zurücksetzen
          </Button>
        )}
      </div>

      <Tabs value={activeCategory || ""} onValueChange={setActiveCategory}>
        <TabsList className="flex flex-wrap h-auto">
          {sortedCategories.map((category) => (
            <TabsTrigger key={category.id} value={category.name} className="flex-grow">
              {category.symbol && <span className="mr-2">{category.symbol}</span>}
              {category.name}
            </TabsTrigger>
          ))}
        </TabsList>

        {sortedCategories.map((category) => (
          <TabsContent key={category.id} value={category.name} className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle>
                  {category.symbol && <span className="mr-2">{category.symbol}</span>}
                  {category.name}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  {filteredProducts(category.name).map((product) => (
                    <div key={product.id} className="flex items-center justify-between p-2 border rounded-md">
                      <div className="flex-1">
                        <p className="font-medium">{product.name}</p>
                        <p className="text-sm text-gray-500">{product.unit}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => handleProductSelect(product.id, product.name, category.name, -1, product.unit)}
                          disabled={!productQuantities[product.name] || productQuantities[product.name] <= 0}
                        >
                          <Minus className="h-4 w-4" />
                        </Button>
                        <div className="w-10 text-center border rounded py-1 px-2">
                          {productQuantities[product.name] || 0}
                        </div>
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => handleProductSelect(product.id, product.name, category.name, 1, product.unit)}
                        >
                          <Plus className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        ))}
      </Tabs>
    </div>
  )
}
