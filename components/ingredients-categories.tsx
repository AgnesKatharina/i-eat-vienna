"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import type { CalculatedIngredient } from "@/lib/types"
import { recipes } from "@/lib/data"

interface IngredientsCategoriesProps {
  calculatedIngredients: Record<string, CalculatedIngredient>
  handleProductSelect: (product: string, category: string, quantity: number, overwrite?: boolean) => void
}

export function IngredientsCategories({ calculatedIngredients, handleProductSelect }: IngredientsCategoriesProps) {
  const [quantities, setQuantities] = useState<Record<string, string>>({})
  const [recipeIngredients, setRecipeIngredients] = useState<string[]>([])

  // Extract unique ingredients from recipes
  useEffect(() => {
    const uniqueIngredients = new Set<string>()

    // Extract all ingredients from recipes
    Object.values(recipes).forEach((recipe) => {
      Object.keys(recipe).forEach((ingredient) => {
        uniqueIngredients.add(ingredient)
      })
    })

    // Convert to sorted array
    setRecipeIngredients(Array.from(uniqueIngredients).sort())
  }, [])

  const handleQuantityChange = (ingredient: string, value: string) => {
    setQuantities((prev) => ({
      ...prev,
      [ingredient]: value,
    }))
  }

  const handleIncreaseQuantity = (ingredient: string) => {
    const currentQuantity = quantities[ingredient] || ""
    const newQuantity = currentQuantity === "" ? 1 : Number.parseInt(currentQuantity) + 1

    setQuantities((prev) => ({
      ...prev,
      [ingredient]: newQuantity.toString(),
    }))

    handleProductSelect(ingredient, "Zutaten", 1)
  }

  const handleConfirmQuantity = (ingredient: string) => {
    const quantityStr = quantities[ingredient] || "0"
    const quantity = Number.parseInt(quantityStr) || 0

    if (quantity > 0) {
      handleProductSelect(ingredient, "Zutaten", quantity, true)
    }
  }

  return (
    <Card className="bg-yellow-50">
      <CardHeader>
        <CardTitle>Zutaten</CardTitle>
      </CardHeader>
      <CardContent>
        {recipeIngredients.length === 0 ? (
          <p className="text-center text-muted-foreground">
            Keine Zutaten gefunden. Bitte fügen Sie zuerst Rezepte hinzu.
          </p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {recipeIngredients.map((ingredient) => (
              <div key={ingredient} className="flex items-center gap-2">
                <Button
                  variant="outline"
                  className="flex-1 min-w-0 h-auto py-2 justify-start bg-white text-sm truncate"
                  onClick={() => handleIncreaseQuantity(ingredient)}
                >
                  <span className="truncate">{ingredient}</span>
                </Button>
                <Input
                  type="number"
                  min="0"
                  className="w-20 flex-shrink-0 text-center bg-white"
                  value={quantities[ingredient] || ""}
                  onChange={(e) => handleQuantityChange(ingredient, e.target.value)}
                  onBlur={() => handleConfirmQuantity(ingredient)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      handleConfirmQuantity(ingredient)
                    }
                  }}
                />
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
