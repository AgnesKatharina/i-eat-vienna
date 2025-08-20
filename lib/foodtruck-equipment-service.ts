import { createClient } from "@/lib/supabase-client"

export interface FoodtruckEquipment {
  id: number
  name: string
  foodtruck: string
  unit: string
  created_at?: string
  updated_at?: string
}

export interface EventIngredient {
  ingredient_id: string
  ingredient_name: string
  total_amount: number
  unit: string
  used_in_products: string[]
}

export async function getAllFoodtruckEquipment(): Promise<FoodtruckEquipment[]> {
  try {
    const supabase = createClient()

    console.log("🔧 Fetching foodtruck equipment from database...")

    const { data, error } = await supabase.from("foodtruck_equipment").select("*").order("name")

    if (error) {
      console.error("❌ Error fetching foodtruck equipment:", error)
      return []
    }

    console.log("✅ Foodtruck equipment fetched successfully:", data?.length || 0, "items")
    return data || []
  } catch (error) {
    console.error("❌ Error in getAllFoodtruckEquipment:", error)
    return []
  }
}

export async function calculateIngredientsForEvent(eventId: string): Promise<EventIngredient[]> {
  console.log("🥘 === CALCULATING INGREDIENTS FOR EVENT ===")
  console.log("📅 Event ID:", eventId)

  try {
    const supabase = createClient()

    // Step 1: Get all products for this event
    console.log("📦 Step 1: Getting event products...")
    const { data: eventProducts, error: eventProductsError } = await supabase
      .from("event_products")
      .select("*")
      .eq("event_id", Number.parseInt(eventId))

    if (eventProductsError) {
      console.error("❌ Error fetching event products:", eventProductsError)
      throw eventProductsError
    }

    console.log("✅ Event products found:", eventProducts?.length || 0)
    console.log("📋 Event products:", eventProducts)

    if (!eventProducts || eventProducts.length === 0) {
      console.log("⚠️ No event products found for event:", eventId)
      return []
    }

    // Step 2: Get all products from database to match by name
    console.log("📦 Step 2: Getting all products for name matching...")
    const { data: allProducts, error: productsError } = await supabase.from("products").select("id, name, unit")

    if (productsError) {
      console.error("❌ Error fetching products:", productsError)
      throw productsError
    }

    console.log("✅ All products fetched:", allProducts?.length || 0)

    // Step 3: Create a map of product names to IDs (case-insensitive)
    const productNameToId = new Map<string, { id: string; name: string; unit: string }>()
    allProducts?.forEach((product) => {
      const normalizedName = product.name.toLowerCase().trim()
      productNameToId.set(normalizedName, {
        id: product.id.toString(),
        name: product.name,
        unit: product.unit,
      })
    })

    console.log("🗺️ Product name to ID map created with", productNameToId.size, "entries")

    // Step 4: Match event products to database products
    const matchedProducts: Array<{
      eventProduct: any
      dbProduct: { id: string; name: string; unit: string }
    }> = []

    eventProducts.forEach((eventProduct) => {
      const normalizedEventProductName = eventProduct.product_name.toLowerCase().trim()
      const dbProduct = productNameToId.get(normalizedEventProductName)

      if (dbProduct) {
        matchedProducts.push({ eventProduct, dbProduct })
        console.log("✅ Matched:", eventProduct.product_name, "→", dbProduct.name, "(ID:", dbProduct.id, ")")
      } else {
        console.log("⚠️ No match found for:", eventProduct.product_name)

        // Try partial matching for debugging
        const partialMatches = Array.from(productNameToId.entries()).filter(
          ([name]) =>
            name.includes(normalizedEventProductName.split(" ")[0]) ||
            normalizedEventProductName.includes(name.split(" ")[0]),
        )
        if (partialMatches.length > 0) {
          console.log(
            "🔍 Possible partial matches:",
            partialMatches.map(([name, product]) => product.name),
          )
        }
      }
    })

    if (matchedProducts.length === 0) {
      console.log("⚠️ No matching products found between event products and database products")
      return []
    }

    console.log("✅ Successfully matched", matchedProducts.length, "products")

    // Step 5: Get recipes for the matched products
    const productIds = matchedProducts.map((mp) => Number.parseInt(mp.dbProduct.id))
    console.log("🔍 Step 5: Getting recipes for product IDs:", productIds)

    const { data: recipes, error: recipesError } = await supabase
      .from("recipes")
      .select(`
        id,
        product_id,
        ingredient_id,
        amount
      `)
      .in("product_id", productIds)

    if (recipesError) {
      console.error("❌ Error fetching recipes:", recipesError)
      throw recipesError
    }

    console.log("✅ Recipes found:", recipes?.length || 0)
    console.log("📋 Recipes data:", recipes)

    if (!recipes || recipes.length === 0) {
      console.log("⚠️ No recipes found for the matched products")
      console.log("🔍 This could mean:")
      console.log("   - No recipes exist for these specific products")
      console.log("   - The recipes table is empty")
      console.log("   - Product IDs don't match between products and recipes tables")
      return []
    }

    // Step 6: Get ingredient details for all ingredients used in recipes
    const ingredientIds = [...new Set(recipes.map((r) => r.ingredient_id))]
    console.log("🥬 Step 6: Getting ingredient details for IDs:", ingredientIds)

    const { data: ingredients, error: ingredientsError } = await supabase
      .from("products")
      .select("id, name, unit")
      .in("id", ingredientIds)

    if (ingredientsError) {
      console.error("❌ Error fetching ingredients:", ingredientsError)
      throw ingredientsError
    }

    console.log("✅ Ingredients fetched:", ingredients?.length || 0)

    // Create ingredient lookup map
    const ingredientMap = new Map<string, { name: string; unit: string }>()
    ingredients?.forEach((ingredient) => {
      ingredientMap.set(ingredient.id.toString(), {
        name: ingredient.name,
        unit: ingredient.unit,
      })
    })

    // Step 7: Calculate total ingredients needed
    console.log("🧮 Step 7: Calculating ingredient totals...")
    const ingredientTotals = new Map<string, EventIngredient>()

    matchedProducts.forEach(({ eventProduct, dbProduct }) => {
      const productRecipes = recipes.filter((recipe) => recipe.product_id.toString() === dbProduct.id)

      console.log(
        `📝 Processing ${eventProduct.product_name} (qty: ${eventProduct.quantity}):`,
        productRecipes.length,
        "recipes",
      )

      productRecipes.forEach((recipe) => {
        const ingredient = ingredientMap.get(recipe.ingredient_id.toString())

        if (!ingredient) {
          console.log("⚠️ Ingredient not found for ID:", recipe.ingredient_id)
          return
        }

        const ingredientId = recipe.ingredient_id.toString()
        const amountPerProduct = recipe.amount || 0
        const totalAmount = amountPerProduct * eventProduct.quantity

        console.log(
          `  - ${ingredient.name}: ${amountPerProduct} × ${eventProduct.quantity} = ${totalAmount} ${ingredient.unit}`,
        )

        if (ingredientTotals.has(ingredientId)) {
          const existing = ingredientTotals.get(ingredientId)!
          existing.total_amount += totalAmount
          if (!existing.used_in_products.includes(eventProduct.product_name)) {
            existing.used_in_products.push(eventProduct.product_name)
          }
          console.log(`    Updated total for ${ingredient.name}: ${existing.total_amount} ${ingredient.unit}`)
        } else {
          ingredientTotals.set(ingredientId, {
            ingredient_id: ingredientId,
            ingredient_name: ingredient.name,
            total_amount: Math.round(totalAmount * 100) / 100,
            unit: ingredient.unit,
            used_in_products: [eventProduct.product_name],
          })
          console.log(`    New ingredient: ${ingredient.name} = ${totalAmount} ${ingredient.unit}`)
        }
      })
    })

    const result = Array.from(ingredientTotals.values())
    console.log("🎉 Final ingredient calculation complete:", result.length, "unique ingredients")
    console.log("📊 Final ingredients:", result)

    return result
  } catch (error) {
    console.error("💥 Fatal error calculating ingredients:", error)
    throw error
  }
}

export function getFoodtruckName(foodtruckCode: string): string {
  const foodtruckNames: Record<string, string> = {
    ft1: "Foodtruck 1",
    ft2: "Foodtruck 2",
    ft3: "Foodtruck 3",
    main: "Hauptküche",
    storage: "Lager",
    mobile: "Mobil",
  }

  return foodtruckNames[foodtruckCode] || foodtruckCode
}
