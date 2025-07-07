import { supabase } from "./supabase-client"
import type { Database } from "./database.types"

type Category = Database["public"]["Tables"]["categories"]["Row"]
type Product = Database["public"]["Tables"]["products"]["Row"]
type Recipe = Database["public"]["Tables"]["recipes"]["Row"]
type PackagingUnit = Database["public"]["Tables"]["packaging_units"]["Row"]
type Event = Database["public"]["Tables"]["events"]["Row"]

export type ProductWithCategory = Product & { category: Category }
export type ProductWithRecipes = Product & { recipes: Recipe[] }
export type ProductWithPackaging = Product & { packaging: PackagingUnit | null }

// Cache for frequently accessed data
const cache = new Map<string, { data: any; timestamp: number; ttl: number }>()

function getCacheKey(key: string): string {
  return key
}

function setCache(key: string, data: any, ttlMinutes = 5): void {
  cache.set(getCacheKey(key), {
    data,
    timestamp: Date.now(),
    ttl: ttlMinutes * 60 * 1000,
  })
}

function getCache(key: string): any | null {
  const cached = cache.get(getCacheKey(key))
  if (!cached) return null

  if (Date.now() - cached.timestamp > cached.ttl) {
    cache.delete(getCacheKey(key))
    return null
  }

  return cached.data
}

export async function getCategories(): Promise<Category[]> {
  const cacheKey = "categories"
  const cached = getCache(cacheKey)
  if (cached) return cached

  const { data, error } = await supabase.from("categories").select("*").order("name")

  if (error) {
    console.error("Error fetching categories:", error)
    return []
  }

  const result = data || []
  setCache(cacheKey, result, 10) // Cache for 10 minutes
  return result
}

export async function getProductsByCategory(categoryId: number): Promise<Product[]> {
  const cacheKey = `products_category_${categoryId}`
  const cached = getCache(cacheKey)
  if (cached) return cached

  const { data, error } = await supabase.from("products").select("*").eq("category_id", categoryId).order("name")

  if (error) {
    console.error("Error fetching products by category:", error)
    return []
  }

  const result = data || []
  setCache(cacheKey, result, 5) // Cache for 5 minutes
  return result
}

export async function getAllProducts(): Promise<ProductWithCategory[]> {
  const cacheKey = "all_products_with_categories"
  const cached = getCache(cacheKey)
  if (cached) return cached

  const { data, error } = await supabase
    .from("products")
    .select(`
      *,
      category:categories(*)
    `)
    .order("name")

  if (error) {
    console.error("Error fetching all products:", error)
    return []
  }

  const result = data || []
  setCache(cacheKey, result, 5) // Cache for 5 minutes
  return result
}

export async function getProductRecipes(productId: number): Promise<Recipe[]> {
  const cacheKey = `product_recipes_${productId}`
  const cached = getCache(cacheKey)
  if (cached) return cached

  const { data, error } = await supabase
    .from("recipes")
    .select(`
      *,
      ingredient:products!recipes_ingredient_id_fkey(id, name, unit)
    `)
    .eq("product_id", productId)

  if (error) {
    console.error("Error fetching product recipes:", error)
    return []
  }

  const result = data || []
  setCache(cacheKey, result, 10) // Cache for 10 minutes
  console.log(`Fetched ${result.length} recipes for product ID ${productId}:`, result)
  return result
}

export async function getProductPackaging(productId: number): Promise<PackagingUnit | null> {
  const cacheKey = `product_packaging_${productId}`
  const cached = getCache(cacheKey)
  if (cached !== null) return cached

  const { data, error } = await supabase.from("packaging_units").select("*").eq("product_id", productId).single()

  if (error) {
    if (error.code === "PGRST116") {
      // No packaging found for this product
      setCache(cacheKey, null, 10)
      return null
    }
    console.error("Error fetching product packaging:", error)
    return null
  }

  setCache(cacheKey, data, 10) // Cache for 10 minutes
  return data
}

// Batch function to load recipes and packaging efficiently
export async function getBatchRecipesAndPackaging(productIds: number[]): Promise<{
  recipes: Record<number, Recipe[]>
  packaging: Record<number, PackagingUnit | null>
}> {
  const cacheKey = `batch_recipes_packaging_${productIds.sort().join(",")}`
  const cached = getCache(cacheKey)
  if (cached) return cached

  // Load all recipes for all products in one query
  const { data: recipesData, error: recipesError } = await supabase
    .from("recipes")
    .select(`
      *,
      ingredient:products!recipes_ingredient_id_fkey(id, name, unit)
    `)
    .in("product_id", productIds)

  // Load all packaging for all products in one query
  const { data: packagingData, error: packagingError } = await supabase
    .from("packaging_units")
    .select("*")
    .in("product_id", productIds)

  if (recipesError) {
    console.error("Error fetching batch recipes:", recipesError)
  }

  if (packagingError) {
    console.error("Error fetching batch packaging:", packagingError)
  }

  // Group by product_id
  const recipes: Record<number, Recipe[]> = {}
  const packaging: Record<number, PackagingUnit | null> = {}

  // Initialize all products
  productIds.forEach((id) => {
    recipes[id] = []
    packaging[id] = null
  })

  // Group recipes by product_id
  if (recipesData) {
    recipesData.forEach((recipe) => {
      if (!recipes[recipe.product_id]) {
        recipes[recipe.product_id] = []
      }
      recipes[recipe.product_id].push(recipe)
    })
  }

  // Group packaging by product_id
  if (packagingData) {
    packagingData.forEach((pack) => {
      packaging[pack.product_id] = pack
    })
  }

  const result = { recipes, packaging }
  setCache(cacheKey, result, 5) // Cache for 5 minutes
  return result
}

export async function createCategory(
  category: Omit<Category, "id" | "created_at" | "updated_at">,
): Promise<Category | null> {
  const { data, error } = await supabase
    .from("categories")
    .insert([
      {
        ...category,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
    ])
    .select()
    .single()

  if (error) {
    console.error("Error creating category:", error)
    return null
  }

  // Invalidate cache
  cache.delete(getCacheKey("categories"))
  return data
}

export async function updateCategory(
  id: number,
  category: Partial<Omit<Category, "id" | "created_at" | "updated_at">>,
): Promise<Category | null> {
  const { data, error } = await supabase
    .from("categories")
    .update({
      ...category,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .select()
    .single()

  if (error) {
    console.error("Error updating category:", error)
    return null
  }

  // Invalidate cache
  cache.delete(getCacheKey("categories"))
  cache.delete(getCacheKey("all_products_with_categories"))
  return data
}

export async function deleteCategory(id: number): Promise<boolean> {
  const { error } = await supabase.from("categories").delete().eq("id", id)

  if (error) {
    console.error("Error deleting category:", error)
    return false
  }

  // Invalidate cache
  cache.delete(getCacheKey("categories"))
  cache.delete(getCacheKey("all_products_with_categories"))
  return true
}

export async function createProduct(
  product: Omit<Product, "id" | "created_at" | "updated_at">,
): Promise<Product | null> {
  const { data, error } = await supabase
    .from("products")
    .insert([
      {
        ...product,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
    ])
    .select()
    .single()

  if (error) {
    console.error("Error creating product:", error)
    return null
  }

  // Invalidate cache
  cache.delete(getCacheKey("all_products_with_categories"))
  if (product.category_id) {
    cache.delete(getCacheKey(`products_category_${product.category_id}`))
  }
  return data
}

export async function updateProduct(
  id: number,
  product: Partial<Omit<Product, "id" | "created_at" | "updated_at">>,
): Promise<Product | null> {
  const { data, error } = await supabase
    .from("products")
    .update({
      ...product,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .select()
    .single()

  if (error) {
    console.error("Error updating product:", error)
    return null
  }

  // Invalidate cache
  cache.delete(getCacheKey("all_products_with_categories"))
  if (product.category_id) {
    cache.delete(getCacheKey(`products_category_${product.category_id}`))
  }
  cache.delete(getCacheKey(`product_recipes_${id}`))
  cache.delete(getCacheKey(`product_packaging_${id}`))
  return data
}

export async function deleteProduct(id: number): Promise<boolean> {
  const { error } = await supabase.from("products").delete().eq("id", id)

  if (error) {
    console.error("Error deleting product:", error)
    return false
  }

  // Invalidate cache
  cache.delete(getCacheKey("all_products_with_categories"))
  cache.delete(getCacheKey(`product_recipes_${id}`))
  cache.delete(getCacheKey(`product_packaging_${id}`))
  return true
}

export async function createRecipe(recipe: Omit<Recipe, "id" | "created_at" | "updated_at">): Promise<Recipe | null> {
  const { data, error } = await supabase
    .from("recipes")
    .insert([
      {
        ...recipe,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
    ])
    .select()
    .single()

  if (error) {
    console.error("Error creating recipe:", error)
    return null
  }

  // Invalidate cache
  cache.delete(getCacheKey(`product_recipes_${recipe.product_id}`))
  return data
}

export async function updateRecipe(
  id: number,
  recipe: Partial<Omit<Recipe, "id" | "created_at" | "updated_at">>,
): Promise<Recipe | null> {
  const { data, error } = await supabase
    .from("recipes")
    .update({
      ...recipe,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .select()
    .single()

  if (error) {
    console.error("Error updating recipe:", error)
    return null
  }

  // Invalidate cache
  if (recipe.product_id) {
    cache.delete(getCacheKey(`product_recipes_${recipe.product_id}`))
  }
  return data
}

export async function deleteRecipe(id: number): Promise<boolean> {
  const { error } = await supabase.from("recipes").delete().eq("id", id)

  if (error) {
    console.error("Error deleting recipe:", error)
    return false
  }

  return true
}

export async function createPackagingUnit(
  packaging: Omit<PackagingUnit, "id" | "created_at" | "updated_at">,
): Promise<PackagingUnit | null> {
  const { data, error } = await supabase
    .from("packaging_units")
    .insert([
      {
        ...packaging,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
    ])
    .select()
    .single()

  if (error) {
    console.error("Error creating packaging unit:", error)
    return null
  }

  // Invalidate cache
  cache.delete(getCacheKey(`product_packaging_${packaging.product_id}`))
  return data
}

export async function updatePackagingUnit(
  id: number,
  packaging: Partial<Omit<PackagingUnit, "id" | "created_at" | "updated_at">>,
): Promise<PackagingUnit | null> {
  const { data, error } = await supabase
    .from("packaging_units")
    .update({
      ...packaging,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .select()
    .single()

  if (error) {
    console.error("Error updating packaging unit:", error)
    return null
  }

  // Invalidate cache
  if (packaging.product_id) {
    cache.delete(getCacheKey(`product_packaging_${packaging.product_id}`))
  }
  return data
}

export async function deletePackagingUnit(id: number): Promise<boolean> {
  const { error } = await supabase.from("packaging_units").delete().eq("id", id)

  if (error) {
    console.error("Error deleting packaging unit:", error)
    return false
  }

  return true
}

// Event Functions
export async function getEventsFromSupabase(): Promise<Event[]> {
  const cacheKey = "events"
  const cached = getCache(cacheKey)
  if (cached) return cached

  try {
    const { data, error } = await supabase
      .from("events")
      .select("*")
      .order("date", { ascending: false, nullsFirst: false })

    if (error) {
      console.error("Error fetching events from Supabase:", error)
      return []
    }

    const result = data || []
    setCache(cacheKey, result, 2) // Cache for 2 minutes
    return result
  } catch (error) {
    console.error("Error fetching events from Supabase:", error)
    return []
  }
}

// Update the getEventProductsFromSupabase function to properly fetch event products
export async function getEventProductsFromSupabase(eventId: number): Promise<any[]> {
  const cacheKey = `event_products_${eventId}`
  const cached = getCache(cacheKey)
  if (cached) return cached

  try {
    const { data, error } = await supabase.from("event_products").select("*").eq("event_id", eventId)

    if (error) {
      console.error("Error fetching event products from Supabase:", error)
      return []
    }

    // Transform the data to match the expected format
    const transformedData = (data || []).map((eventProduct) => ({
      id: eventProduct.id,
      event_id: eventProduct.event_id,
      quantity: eventProduct.quantity,
      unit: eventProduct.unit,
      product: {
        id: null, // We don't have product_id in event_products table
        name: eventProduct.product_name,
        unit: eventProduct.unit,
        category: null, // We'll need to find this by matching product name
      },
    }))

    // Try to match products by name to get additional details
    const allProducts = await getAllProducts()

    transformedData.forEach((eventProduct) => {
      const matchingProduct = allProducts.find((p) => p.name === eventProduct.product.name)
      if (matchingProduct) {
        eventProduct.product.id = matchingProduct.id
        eventProduct.product.category = matchingProduct.category
      }
    })

    console.log(`Fetched ${transformedData.length} event products for event ID ${eventId}:`, transformedData)
    setCache(cacheKey, transformedData, 2) // Cache for 2 minutes
    return transformedData
  } catch (error) {
    console.error("Error fetching event products from Supabase:", error)
    return []
  }
}

// Update the getEventIngredientsFromSupabase function to work with the correct data structure
export async function getEventIngredientsFromSupabase(eventId: number): Promise<any[]> {
  const cacheKey = `event_ingredients_${eventId}`
  const cached = getCache(cacheKey)
  if (cached) return cached

  try {
    // Get all event products for this event (using the corrected function above)
    const eventProducts = await getEventProductsFromSupabase(eventId)

    if (eventProducts.length === 0) {
      console.log(`No event products found for event ID ${eventId}`)
      return []
    }

    // Get all ingredients for these products
    const allIngredients: any[] = []

    for (const eventProduct of eventProducts) {
      if (eventProduct.product && eventProduct.product.id) {
        const recipes = await getProductRecipes(eventProduct.product.id)

        for (const recipe of recipes) {
          // Calculate ingredient quantity based on event product quantity
          const ingredientQuantity = (recipe.amount || 0) * eventProduct.quantity

          allIngredients.push({
            product_id: eventProduct.product.id,
            product_name: eventProduct.product.name,
            ingredient_id: recipe.ingredient_id,
            ingredient_name: recipe.ingredient?.name || "Unknown Ingredient",
            ingredient_unit: recipe.ingredient?.unit || "pcs",
            quantity_needed: ingredientQuantity,
            original_recipe_quantity: recipe.amount,
            event_product_quantity: eventProduct.quantity,
          })
        }
      }
    }

    // Group ingredients by ingredient_id and sum quantities
    const groupedIngredients = allIngredients.reduce(
      (acc, ingredient) => {
        const key = ingredient.ingredient_id
        if (acc[key]) {
          acc[key].quantity_needed += ingredient.quantity_needed
          acc[key].used_in_products.push({
            product_name: ingredient.product_name,
            quantity: ingredient.event_product_quantity,
          })
        } else {
          acc[key] = {
            ...ingredient,
            used_in_products: [
              {
                product_name: ingredient.product_name,
                quantity: ingredient.event_product_quantity,
              },
            ],
          }
        }
        return acc
      },
      {} as Record<number, any>,
    )

    const result = Object.values(groupedIngredients)
    console.log(`Calculated ${result.length} unique ingredients for event ID ${eventId}:`, result)
    setCache(cacheKey, result, 2) // Cache for 2 minutes
    return result
  } catch (error) {
    console.error("Error fetching event ingredients from Supabase:", error)
    return []
  }
}

// User Preferences Functions
export async function saveUserPreferences(userId: string, preferenceType: string, preferences: any): Promise<boolean> {
  try {
    // First, try to update existing record
    const { data: existingData, error: selectError } = await supabase
      .from("user_preferences")
      .select("id")
      .eq("user_id", userId)
      .eq("preference_type", preferenceType)
      .single()

    if (selectError && selectError.code !== "PGRST116") {
      console.error("Error checking existing preferences:", selectError)
      return false
    }

    if (existingData) {
      // Update existing record
      const { error: updateError } = await supabase
        .from("user_preferences")
        .update({
          preference_data: preferences,
          updated_at: new Date().toISOString(),
        })
        .eq("user_id", userId)
        .eq("preference_type", preferenceType)

      if (updateError) {
        console.error("Error updating user preferences:", updateError)
        return false
      }
    } else {
      // Insert new record
      const { error: insertError } = await supabase.from("user_preferences").insert({
        user_id: userId,
        preference_type: preferenceType,
        preference_data: preferences,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })

      if (insertError) {
        console.error("Error inserting user preferences:", insertError)
        return false
      }
    }

    return true
  } catch (error) {
    console.error("Error saving user preferences:", error)
    return false
  }
}

export async function getUserPreferences(userId: string, preferenceType: string): Promise<any | null> {
  try {
    const { data, error } = await supabase
      .from("user_preferences")
      .select("preference_data")
      .eq("user_id", userId)
      .eq("preference_type", preferenceType)
      .single()

    if (error) {
      if (error.code === "PGRST116") {
        // No preferences found for this user/type
        return null
      }
      console.error("Error fetching user preferences:", error)
      return null
    }

    return data?.preference_data || null
  } catch (error) {
    console.error("Error fetching user preferences:", error)
    return null
  }
}
