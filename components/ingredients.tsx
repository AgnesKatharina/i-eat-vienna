"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import type { CalculatedIngredient } from "@/lib/types"

interface IngredientsProps {
  calculatedIngredients: Record<string, CalculatedIngredient>
  formatWeight: (value: number, unit: string) => string
  getUnitPlural: (quantity: number, unit: string) => string
}

export function Ingredients({ calculatedIngredients, formatWeight, getUnitPlural }: IngredientsProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Zutaten</CardTitle>
      </CardHeader>
      <CardContent>
        {Object.keys(calculatedIngredients).length === 0 ? (
          <p className="text-muted-foreground text-center py-4">Keine Zutaten berechnet</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Zutat</TableHead>
                <TableHead>Gesamtmenge</TableHead>
                <TableHead>Verpackung</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {Object.entries(calculatedIngredients)
                .sort(([a], [b]) => a.localeCompare(b))
                .map(([ingredient, details]) => (
                  <TableRow key={ingredient}>
                    <TableCell>{ingredient}</TableCell>
                    <TableCell>{formatWeight(details.totalAmount, details.unit)}</TableCell>
                    <TableCell>
                      {details.packagingCount} {getUnitPlural(details.packagingCount, details.packaging)} à{" "}
                      {formatWeight(details.amountPerPackage, details.unit)}
                    </TableCell>
                  </TableRow>
                ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  )
}
