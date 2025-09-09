import { createClient } from "@/lib/supabase/client"
import type { CalculatedIngredient } from "@/lib/types"

export interface FoodtruckEquipment {
  id: number
  name: string
  unit: string
  foodtruck: string[] // Array of foodtruck names (matches database column name)
  notes?: string
  created_at: string
  updated_at: string
}

export interface CreateFoodtruckEquipmentData {
  name: string
  unit: string
  foodtruck: string[]
  notes?: string
}

export interface UpdateFoodtruckEquipmentData {
  name?: string
  unit?: string
  foodtruck?: string[]
  notes?: string
}

// Get all foodtruck equipment
export async function getFoodtruckEquipment(): Promise<FoodtruckEquipment[]> {
  try {
    const supabase = createClient()
    console.log("[v0] Fetching all foodtruck equipment from database")

    const { data, error } = await supabase.from("foodtruck_geschirr").select("*").order("name")

    if (error) {
      console.error("[v0] Error fetching foodtruck equipment:", error)
      throw error
    }

    console.log("[v0] Successfully fetched equipment:", data?.length || 0, "items")

    if (data && data.length > 0) {
      console.log("[v0] Sample equipment item:", JSON.stringify(data[0], null, 2))
      console.log("[v0] Foodtruck field type:", typeof data[0]?.foodtruck)
      console.log("[v0] Foodtruck field value:", data[0]?.foodtruck)
    }

    return data || []
  } catch (error) {
    console.error("[v0] Error in getFoodtruckEquipment:", error)
    throw error
  }
}

// Create new foodtruck equipment
export async function createFoodtruckEquipment(data: CreateFoodtruckEquipmentData): Promise<FoodtruckEquipment> {
  try {
    const supabase = createClient()
    const { data: result, error } = await supabase
      .from("foodtruck_geschirr")
      .insert({
        name: data.name,
        unit: data.unit,
        foodtruck: data.foodtruck,
        notes: data.notes,
      })
      .select()
      .single()

    if (error) {
      console.error("Error creating foodtruck equipment:", error)
      throw error
    }

    return result
  } catch (error) {
    console.error("Error in createFoodtruckEquipment:", error)
    throw error
  }
}

// Update foodtruck equipment
export async function updateFoodtruckEquipment(
  id: number,
  data: UpdateFoodtruckEquipmentData,
): Promise<FoodtruckEquipment> {
  try {
    const supabase = createClient()
    const { data: result, error } = await supabase
      .from("foodtruck_geschirr")
      .update({
        name: data.name,
        unit: data.unit,
        foodtruck: data.foodtruck,
        notes: data.notes,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .select()
      .single()

    if (error) {
      console.error("Error updating foodtruck equipment:", error)
      throw error
    }

    return result
  } catch (error) {
    console.error("Error in updateFoodtruckEquipment:", error)
    throw error
  }
}

// Delete foodtruck equipment
export async function deleteFoodtruckEquipment(id: number): Promise<boolean> {
  try {
    const supabase = createClient()
    const { error } = await supabase.from("foodtruck_geschirr").delete().eq("id", id)

    if (error) {
      console.error("Error deleting foodtruck equipment:", error)
      throw error
    }

    return true
  } catch (error) {
    console.error("Error in deleteFoodtruckEquipment:", error)
    return false
  }
}

// Get equipment filtered by foodtruck
export async function getEquipmentByFoodtruck(foodtruck: string): Promise<FoodtruckEquipment[]> {
  try {
    const supabase = createClient()
    const { data, error } = await supabase
      .from("foodtruck_geschirr")
      .select("*")
      .contains("foodtruck", [foodtruck])
      .order("name")

    if (error) {
      console.error("Error fetching equipment by foodtruck:", error)
      throw error
    }

    return data || []
  } catch (error) {
    console.error("Error in getEquipmentByFoodtruck:", error)
    throw error
  }
}

export async function getEquipmentByUnit(unit: string): Promise<FoodtruckEquipment[]> {
  try {
    const supabase = createClient()
    const { data, error } = await supabase.from("foodtruck_geschirr").select("*").eq("unit", unit).order("name")

    if (error) {
      console.error("Error fetching equipment by unit:", error)
      throw error
    }

    return data || []
  } catch (error) {
    console.error("Error in getEquipmentByUnit:", error)
    throw error
  }
}

// Calculate ingredients for an event
export async function calculateIngredientsForEvent(eventId: string): Promise<Record<string, CalculatedIngredient>> {
  try {
    console.log("[v0] Starting ingredient calculation for event:", eventId)
    const supabase = createClient()

    // Get event products for this event
    const { data: eventProducts, error: eventError } = await supabase
      .from("event_products")
      .select("*")
      .eq("event_id", eventId)

    if (eventError) {
      console.error("[v0] Error fetching event products:", eventError)
      return {}
    }

    if (!eventProducts || eventProducts.length === 0) {
      console.log("[v0] No products found for event:", eventId)
      return {}
    }

    console.log("[v0] Found", eventProducts.length, "products for event")

    // Get all products to match by name
    const { data: allProducts, error: productsError } = await supabase.from("products").select("id, name, unit")

    if (productsError) {
      console.error("[v0] Error fetching products:", productsError)
      return {}
    }

    const ingredients: Record<string, CalculatedIngredient> = {}

    // Process each event product
    for (const eventProduct of eventProducts) {
      // Find the product by name
      const product = allProducts?.find((p) => p.name === eventProduct.product_name)

      if (!product) {
        console.log("[v0] Product not found:", eventProduct.product_name)
        continue
      }

      // Get recipes for this product
      const { data: recipes, error: recipesError } = await supabase
        .from("recipes")
        .select(`
          *,
          ingredient:products!recipes_ingredient_id_fkey(id, name, unit)
        `)
        .eq("product_id", product.id)

      if (recipesError) {
        console.error("[v0] Error fetching recipes for product:", product.name, recipesError)
        continue
      }

      if (!recipes || recipes.length === 0) {
        console.log("[v0] No recipes found for product:", product.name)
        continue
      }

      console.log("[v0] Found", recipes.length, "recipe ingredients for", product.name)

      // Calculate ingredients for this product
      for (const recipe of recipes) {
        if (!recipe.ingredient) continue

        const ingredientName = recipe.ingredient.name
        const totalAmount = recipe.amount * eventProduct.quantity
        const unit = recipe.ingredient.unit

        if (!(ingredientName in ingredients)) {
          // Initialize ingredient if it doesn't exist yet
          ingredients[ingredientName] = {
            totalAmount,
            unit,
            packaging: "Unknown",
            amountPerPackage: 1,
            packagingCount: 1,
          }
        } else {
          // Add to existing ingredient
          ingredients[ingredientName].totalAmount += totalAmount
        }

        // Get packaging information if available
        const { data: packaging } = await supabase
          .from("packaging_units")
          .select("*")
          .eq("product_id", recipe.ingredient_id)
          .single()

        if (packaging) {
          ingredients[ingredientName].packaging = packaging.packaging_unit
          ingredients[ingredientName].amountPerPackage = packaging.amount_per_package
          ingredients[ingredientName].packagingCount = Math.ceil(
            ingredients[ingredientName].totalAmount / packaging.amount_per_package,
          )
        }
      }
    }

    console.log("[v0] Calculated ingredients:", Object.keys(ingredients).length, "unique ingredients")
    return ingredients
  } catch (error) {
    console.error("[v0] Error in calculateIngredientsForEvent:", error)
    return {}
  }
}
