import { categories, categorySymbols, productsByCategory, productUnits, recipes, packagingUnits } from "../lib/data"
import { createClient } from "@supabase/supabase-js"

// This script is meant to be run locally to migrate your data to Supabase
// You'll need to set these environment variables or replace with your values
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ""
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "" // Use service role key for migrations

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function migrateData() {
  console.log("Starting migration...")

  // Map to store the mapping between old category names and new category IDs
  const categoryMap = new Map<string, number>()

  // Map to store the mapping between old product names and new product IDs
  const productMap = new Map<string, number>()

  // 1. Migrate categories
  console.log("Migrating categories...")
  for (const category of categories) {
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
      console.error(`Error inserting category ${category}:`, error)
      continue
    }

    categoryMap.set(category, data.id)
    console.log(`Migrated category: ${category} -> ID: ${data.id}`)
  }

  // 2. Migrate products
  console.log("\nMigrating products...")
  for (const [category, products] of Object.entries(productsByCategory)) {
    const categoryId = categoryMap.get(category)
    if (!categoryId) {
      console.error(`Category ID not found for ${category}`)
      continue
    }

    for (const product of products) {
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
        console.error(`Error inserting product ${product}:`, error)
        continue
      }

      productMap.set(product, data.id)
      console.log(`Migrated product: ${product} -> ID: ${data.id}`)
    }
  }

  // 3. Migrate recipes
  console.log("\nMigrating recipes...")
  for (const [productName, recipeIngredients] of Object.entries(recipes)) {
    const productId = productMap.get(productName)
    if (!productId) {
      console.log(`Skipping recipe for ${productName} - product not found`)
      continue
    }

    for (const [ingredientName, details] of Object.entries(recipeIngredients)) {
      const ingredientId = productMap.get(ingredientName)
      if (!ingredientId) {
        console.log(`Skipping ingredient ${ingredientName} for ${productName} - ingredient not found`)
        continue
      }

      const { data, error } = await supabase
        .from("recipes")
        .insert({
          product_id: productId,
          ingredient_id: ingredientId,
          amount: details.menge,
          unit: details.einheit,
          created_at: new Date().toISOString(),
        })
        .select()
        .single()

      if (error) {
        console.error(`Error inserting recipe ${productName} -> ${ingredientName}:`, error)
        continue
      }

      console.log(`Migrated recipe: ${productName} -> ${ingredientName}`)
    }
  }

  // 4. Migrate packaging units
  console.log("\nMigrating packaging units...")
  for (const [ingredientName, details] of Object.entries(packagingUnits)) {
    const productId = productMap.get(ingredientName)
    if (!productId) {
      console.log(`Skipping packaging for ${ingredientName} - product not found`)
      continue
    }

    const { data, error } = await supabase
      .from("packaging_units")
      .insert({
        product_id: productId,
        amount_per_package: details.pro_verpackung,
        packaging_unit: details.verpackungseinheit,
        created_at: new Date().toISOString(),
      })
      .select()
      .single()

    if (error) {
      console.error(`Error inserting packaging for ${ingredientName}:`, error)
      continue
    }

    console.log(`Migrated packaging: ${ingredientName}`)
  }

  console.log("\nMigration completed!")
}

migrateData().catch(console.error)
