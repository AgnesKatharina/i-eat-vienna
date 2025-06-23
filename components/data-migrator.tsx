"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { supabase } from "@/lib/supabase-client"
import { categories, categorySymbols, productsByCategory, productUnits, recipes, packagingUnits } from "@/lib/data"

export function DataMigrator() {
  const [loading, setLoading] = useState(false)
  const [logs, setLogs] = useState<string[]>([])
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [step, setStep] = useState<"idle" | "categories" | "products" | "recipes" | "packaging" | "complete">("idle")

  const addLog = (message: string) => {
    setLogs((prev) => [...prev, message])
    // Auto-scroll to bottom of logs
    const logsContainer = document.getElementById("logs-container")
    if (logsContainer) {
      logsContainer.scrollTop = logsContainer.scrollHeight
    }
  }

  const migrateData = async () => {
    setLoading(true)
    setLogs([])
    setError(null)
    setSuccess(false)
    setStep("categories")

    try {
      addLog("Starting migration...")

      // Map to store category IDs
      const categoryMap = new Map<string, number>()

      // Map to store product IDs
      const productMap = new Map<string, number>()

      // 1. Migrate categories
      addLog("Migrating categories...")
      for (const category of categories) {
        try {
          const { data, error } = await supabase
            .from("categories")
            .insert({
              name: category,
              symbol: categorySymbols[category] || "📦",
              created_at: new Date().toISOString(),
            })
            .select()
            .single()

          if (error) {
            addLog(`Error inserting category ${category}: ${error.message}`)
            continue
          }

          categoryMap.set(category, data.id)
          addLog(`✅ Migrated category: ${category} -> ID: ${data.id}`)
        } catch (err) {
          addLog(`❌ Error with category ${category}: ${err.message}`)
        }
      }

      // 2. Migrate products
      setStep("products")
      addLog("\nMigrating products...")
      for (const [category, products] of Object.entries(productsByCategory)) {
        const categoryId = categoryMap.get(category)
        if (!categoryId) {
          addLog(`❌ Category ID not found for ${category}`)
          continue
        }

        addLog(`Processing ${products.length} products in category: ${category}`)
        for (const product of products) {
          try {
            // Find the unit for this product
            let unit = "Stück" // Default
            const categoryProducts = productUnits[category] || []
            const productUnit = categoryProducts.find(([p]) => p === product)
            if (productUnit) {
              unit = productUnit[1]
            }

            const { data, error } = await supabase
              .from("products")
              .insert({
                name: product,
                category_id: categoryId,
                unit: unit,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(), // Add this line to set updated_at
              })
              .select()
              .single()

            if (error) {
              addLog(`❌ Error inserting product ${product}: ${error.message}`)
              continue
            }

            productMap.set(product, data.id)
            addLog(`✅ Migrated product: ${product} -> ID: ${data.id}`)
          } catch (err) {
            addLog(`❌ Error with product ${product}: ${err.message}`)
          }
        }
      }

      // 3. Migrate recipes
      setStep("recipes")
      addLog("\nMigrating recipes...")
      let recipeCount = 0
      for (const [productName, recipeIngredients] of Object.entries(recipes)) {
        const productId = productMap.get(productName)
        if (!productId) {
          addLog(`⚠️ Skipping recipe for ${productName} - product not found`)
          continue
        }

        if (Object.keys(recipeIngredients).length === 0) {
          addLog(`ℹ️ No ingredients for ${productName}, skipping`)
          continue
        }

        addLog(`Processing ${Object.keys(recipeIngredients).length} ingredients for product: ${productName}`)
        for (const [ingredientName, details] of Object.entries(recipeIngredients)) {
          try {
            const ingredientId = productMap.get(ingredientName)
            if (!ingredientId) {
              addLog(`⚠️ Skipping ingredient ${ingredientName} for ${productName} - ingredient not found`)
              continue
            }

            const { error } = await supabase.from("recipes").insert({
              product_id: productId,
              ingredient_id: ingredientId,
              amount: details.menge,
              unit: details.einheit,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(), // Add this line to set updated_at
            })

            if (error) {
              addLog(`❌ Error inserting recipe ${productName} -> ${ingredientName}: ${error.message}`)
              continue
            }

            recipeCount++
            addLog(`✅ Migrated recipe: ${productName} -> ${ingredientName} (${details.menge} ${details.einheit})`)
          } catch (err) {
            addLog(`❌ Error with recipe ${productName} -> ${ingredientName}: ${err.message}`)
          }
        }
      }
      addLog(`Total recipes migrated: ${recipeCount}`)

      // 4. Migrate packaging units
      setStep("packaging")
      addLog("\nMigrating packaging units...")
      let packagingCount = 0
      for (const [ingredientName, details] of Object.entries(packagingUnits)) {
        try {
          const productId = productMap.get(ingredientName)
          if (!productId) {
            addLog(`⚠️ Skipping packaging for ${ingredientName} - product not found`)
            continue
          }

          const { error } = await supabase.from("packaging_units").insert({
            product_id: productId,
            amount_per_package: details.pro_verpackung,
            packaging_unit: details.verpackungseinheit,
            created_at: new Date().toISOString(),
          })

          if (error) {
            addLog(`❌ Error inserting packaging for ${ingredientName}: ${error.message}`)
            continue
          }

          packagingCount++
          addLog(
            `✅ Migrated packaging: ${ingredientName} (${details.pro_verpackung} per ${details.verpackungseinheit})`,
          )
        } catch (err) {
          addLog(`❌ Error with packaging ${ingredientName}: ${err.message}`)
        }
      }
      addLog(`Total packaging units migrated: ${packagingCount}`)

      setStep("complete")
      addLog("\n✅ Migration completed successfully!")
      addLog(`Summary:`)
      addLog(`- Categories: ${categoryMap.size}`)
      addLog(`- Products: ${productMap.size}`)
      addLog(`- Recipes: ${recipeCount}`)
      addLog(`- Packaging Units: ${packagingCount}`)
      setSuccess(true)
    } catch (err) {
      setError(err.message)
      addLog(`❌ Migration failed: ${err.message}`)
    } finally {
      setLoading(false)
    }
  }

  const clearData = async () => {
    if (
      !confirm("Are you sure you want to clear all data from your Supabase database? This action cannot be undone.")
    ) {
      return
    }

    setLoading(true)
    setLogs([])
    setError(null)
    setSuccess(false)

    try {
      addLog("Starting data cleanup...")

      // Delete in reverse order of dependencies
      addLog("Deleting packaging units...")
      await supabase.from("packaging_units").delete().neq("id", 0)
      addLog("✅ Packaging units deleted")

      addLog("Deleting recipes...")
      await supabase.from("recipes").delete().neq("id", 0)
      addLog("✅ Recipes deleted")

      addLog("Deleting products...")
      await supabase.from("products").delete().neq("id", 0)
      addLog("✅ Products deleted")

      addLog("Deleting categories...")
      await supabase.from("categories").delete().neq("id", 0)
      addLog("✅ Categories deleted")

      addLog("✅ All data cleared successfully!")
    } catch (err) {
      setError(err.message)
      addLog(`❌ Data cleanup failed: ${err.message}`)
    } finally {
      setLoading(false)
    }
  }

  const getStepIcon = (currentStep: string) => {
    if (step === "idle") return "⏸️"
    if (step === currentStep) return loading ? "⏳" : "✅"
    if (
      (currentStep === "categories" && ["products", "recipes", "packaging", "complete"].includes(step)) ||
      (currentStep === "products" && ["recipes", "packaging", "complete"].includes(step)) ||
      (currentStep === "recipes" && ["packaging", "complete"].includes(step)) ||
      (currentStep === "packaging" && step === "complete")
    ) {
      return "✅"
    }
    return "⏸️"
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Data Migration Tool</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="mb-6">
          <p>This tool will migrate your data from the static files to your Supabase database.</p>
          <p className="text-yellow-500 mt-2">
            Warning: This will add data to your database. Running it multiple times may create duplicate entries.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <Button onClick={migrateData} disabled={loading} className="flex-1">
            {loading ? "Migrating..." : "Start Migration"}
          </Button>

          <Button onClick={clearData} disabled={loading} variant="destructive" className="flex-1">
            Clear All Data
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div
            className={`p-4 rounded-lg border ${step === "categories" && loading ? "bg-blue-50 border-blue-200" : step === "idle" ? "bg-gray-50 border-gray-200" : "bg-green-50 border-green-200"}`}
          >
            <div className="flex items-center gap-2">
              <span className="text-xl">{getStepIcon("categories")}</span>
              <h3 className="font-medium">1. Categories</h3>
            </div>
            <p className="text-sm mt-1 text-gray-600">Migrate category data</p>
          </div>

          <div
            className={`p-4 rounded-lg border ${step === "products" && loading ? "bg-blue-50 border-blue-200" : step === "idle" || step === "categories" ? "bg-gray-50 border-gray-200" : "bg-green-50 border-green-200"}`}
          >
            <div className="flex items-center gap-2">
              <span className="text-xl">{getStepIcon("products")}</span>
              <h3 className="font-medium">2. Products</h3>
            </div>
            <p className="text-sm mt-1 text-gray-600">Migrate product data</p>
          </div>

          <div
            className={`p-4 rounded-lg border ${step === "recipes" && loading ? "bg-blue-50 border-blue-200" : step === "idle" || step === "categories" || step === "products" ? "bg-gray-50 border-gray-200" : "bg-green-50 border-green-200"}`}
          >
            <div className="flex items-center gap-2">
              <span className="text-xl">{getStepIcon("recipes")}</span>
              <h3 className="font-medium">3. Recipes</h3>
            </div>
            <p className="text-sm mt-1 text-gray-600">Migrate recipe data</p>
          </div>

          <div
            className={`p-4 rounded-lg border ${step === "packaging" && loading ? "bg-blue-50 border-blue-200" : step === "idle" || step === "categories" || step === "products" || step === "recipes" ? "bg-gray-50 border-gray-200" : "bg-green-50 border-green-200"}`}
          >
            <div className="flex items-center gap-2">
              <span className="text-xl">{getStepIcon("packaging")}</span>
              <h3 className="font-medium">4. Packaging</h3>
            </div>
            <p className="text-sm mt-1 text-gray-600">Migrate packaging data</p>
          </div>
        </div>

        {success && (
          <Alert className="mb-6 bg-green-50 border-green-200">
            <AlertTitle>Success!</AlertTitle>
            <AlertDescription>
              Migration completed successfully. Your data has been transferred to Supabase.
            </AlertDescription>
          </Alert>
        )}

        {error && (
          <Alert className="mb-6 bg-red-50 border-red-200">
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {logs.length > 0 && (
          <div className="border rounded-lg p-4 bg-gray-50 max-h-96 overflow-y-auto" id="logs-container">
            <h3 className="font-bold mb-2">Migration Logs:</h3>
            <pre className="text-xs whitespace-pre-wrap">{logs.join("\n")}</pre>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
