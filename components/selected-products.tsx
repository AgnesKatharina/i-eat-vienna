"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Trash2 } from "lucide-react"
import type { SelectedProduct } from "@/lib/types"

interface SelectedProductsProps {
  selectedProducts: Record<string, SelectedProduct>
  handleDeleteProduct: (product: string) => void
  onQuantityChange?: (product: string, quantity: number) => void
}

export function SelectedProducts({ selectedProducts, handleDeleteProduct, onQuantityChange }: SelectedProductsProps) {
  const handleQuantityChange = (product: string, value: string) => {
    const quantity = Number.parseInt(value) || 1
    if (onQuantityChange) {
      onQuantityChange(product, quantity)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Ausgewählte Produkte</CardTitle>
      </CardHeader>
      <CardContent>
        {Object.keys(selectedProducts).length === 0 ? (
          <p className="text-center text-gray-500">Keine Produkte ausgewählt</p>
        ) : (
          <div className="space-y-2">
            {Object.entries(selectedProducts).map(([product, details]) => (
              <div key={product} className="flex items-center space-x-2">
                <Input
                  type="number"
                  min="1"
                  className="w-16"
                  value={details.quantity}
                  onChange={(e) => handleQuantityChange(product, e.target.value)}
                />
                <div className="flex-1 truncate">{product}</div>
                <div className="text-sm text-gray-500 w-16 text-right">{details.unit}</div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-red-500 hover:text-red-700"
                  onClick={() => handleDeleteProduct(product)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
