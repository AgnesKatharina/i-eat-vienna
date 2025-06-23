"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Plus } from "lucide-react"

interface ProductCategoriesProps {
  categories: string[]
  categorySymbols: Record<string, string>
  productsByCategory: Record<string, string[]>
  handleProductSelect: (product: string, category: string, quantity: number, overwrite?: boolean) => void
  getCategoryForProduct: (product: string) => string
  mode?: string
  productQuantities?: Record<string, number>
  onQuantityChange?: (product: string, quantity: number) => void
}

export function ProductCategories({
  categories,
  categorySymbols,
  productsByCategory,
  handleProductSelect,
  getCategoryForProduct,
  mode = "packliste",
  productQuantities = {},
  onQuantityChange,
}: ProductCategoriesProps) {
  const [activeCategory, setActiveCategory] = useState(categories[0] || "")
  const [quantities, setQuantities] = useState<Record<string, number>>({})

  const handleQuantityChange = (product: string, value: string) => {
    const quantity = Number.parseInt(value) || 0

    // Update local state
    setQuantities((prev) => ({
      ...prev,
      [product]: quantity,
    }))

    // Notify parent component if callback exists
    if (onQuantityChange) {
      onQuantityChange(product, quantity)
    }
  }

  const handleAddProduct = (product: string, category: string) => {
    const quantity = quantities[product] || productQuantities[product] || 1
    handleProductSelect(product, category, quantity)

    // Reset quantity after adding
    setQuantities((prev) => {
      const newQuantities = { ...prev }
      delete newQuantities[product]
      return newQuantities
    })
  }

  // Get the display value for the input field
  const getDisplayQuantity = (product: string) => {
    // If the product is in productQuantities (already selected), show that value
    if (product in productQuantities) {
      return productQuantities[product]
    }

    // Otherwise, show the local quantity or empty string
    return quantities[product] || ""
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Produkte</CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs value={activeCategory} onValueChange={setActiveCategory}>
          <TabsList className="grid grid-cols-3 md:grid-cols-6 mb-4">
            {categories.map((category) => (
              <TabsTrigger key={category} value={category} className="text-xs md:text-sm">
                {categorySymbols[category]} {category}
              </TabsTrigger>
            ))}
          </TabsList>

          {categories.map((category) => (
            <TabsContent key={category} value={category}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {productsByCategory[category]?.map((product) => (
                  <div key={product} className="flex items-center space-x-2">
                    <Input
                      type="number"
                      min="1"
                      className="w-16"
                      value={getDisplayQuantity(product)}
                      onChange={(e) => handleQuantityChange(product, e.target.value)}
                    />
                    <Button
                      variant="outline"
                      className="flex-1 justify-start overflow-hidden"
                      onClick={() => handleAddProduct(product, category)}
                    >
                      <Plus className="h-4 w-4 mr-2 flex-shrink-0" />
                      <span className="truncate">{product}</span>
                    </Button>
                  </div>
                ))}
              </div>
            </TabsContent>
          ))}
        </Tabs>
      </CardContent>
    </Card>
  )
}
