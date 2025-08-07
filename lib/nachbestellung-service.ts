import { createClient } from "@/lib/supabase-client"

export interface Nachbestellung {
  id: number
  event_id: number
  event_name: string
  status: "offen" | "in_bearbeitung" | "abgeschlossen" | "storniert"
  total_items: number
  total_products: number
  total_ingredients: number
  notes?: string
  created_at: string
  updated_at: string
  created_by?: string
  creator_email?: string
  completed_at?: string
  completed_by?: string
}

export interface NachbestellungItem {
  id: number
  nachbestellung_id: number
  item_type: "product" | "ingredient"
  item_id: number
  item_name: string
  quantity: number
  unit: string
  packaging_unit?: string
  category?: string
  notes?: string
  status: "offen" | "bestellt" | "erhalten" | "storniert" | "erledigt"
  is_packed: boolean
  created_at: string
  updated_at: string
}

export interface NachbestellungWithItems extends Nachbestellung {
  items: NachbestellungItem[]
}

interface CreateNachbestellungData {
  event_id: number
  event_name: string
  products: Array<{
    id: string
    name: string
    quantity: number
    unit: string
    packagingUnit: string
    category: string
  }>
  ingredients: Array<{
    id: string
    name: string
    quantity: number
    unit: string
    packagingUnit: string
    category: string
  }>
  notes?: string
}

export async function createNachbestellung(
  data: CreateNachbestellungData,
  userId?: string,
): Promise<Nachbestellung | null> {
  try {
    const supabase = createClient()

    const totalItems = data.products.length + data.ingredients.length

    // Create the main nachbestellung record
    const { data: nachbestellung, error: nachbestellungError } = await supabase
      .from("nachbestellungen")
      .insert({
        event_id: data.event_id,
        event_name: data.event_name,
        status: "offen",
        total_items: totalItems,
        total_products: data.products.length,
        total_ingredients: data.ingredients.length,
        notes: data.notes,
        created_by: userId,
      })
      .select()
      .single()

    if (nachbestellungError) {
      console.error("Error creating nachbestellung:", nachbestellungError)
      return null
    }

    // Create items for products
    const productItems = data.products.map((product) => ({
      nachbestellung_id: nachbestellung.id,
      item_type: "product" as const,
      item_id: Number.parseInt(product.id),
      item_name: product.name,
      quantity: product.quantity,
      unit: product.unit,
      packaging_unit: product.packagingUnit,
      category: product.category,
      status: "offen" as const,
      is_packed: false,
    }))

    // Create items for ingredients
    const ingredientItems = data.ingredients.map((ingredient) => ({
      nachbestellung_id: nachbestellung.id,
      item_type: "ingredient" as const,
      item_id: Number.parseInt(ingredient.id),
      item_name: ingredient.name,
      quantity: ingredient.quantity,
      unit: ingredient.unit,
      packaging_unit: ingredient.packagingUnit,
      category: ingredient.category,
      status: "offen" as const,
      is_packed: false,
    }))

    // Insert all items
    const allItems = [...productItems, ...ingredientItems]
    if (allItems.length > 0) {
      const { error: itemsError } = await supabase.from("nachbestellung_items").insert(allItems)

      if (itemsError) {
        console.error("Error creating nachbestellung items:", itemsError)
        // Clean up the nachbestellung if items creation failed
        await supabase.from("nachbestellungen").delete().eq("id", nachbestellung.id)
        return null
      }
    }

    return nachbestellung
  } catch (error) {
    console.error("Error in createNachbestellung:", error)
    return null
  }
}

export async function getNachbestellungen(userId?: string): Promise<Nachbestellung[]> {
  try {
    const supabase = createClient()

    console.log("Fetching nachbestellungen for user:", userId)

    // Fetch all nachbestellungen (not filtering by user for now, as they might be shared)
    const { data, error } = await supabase
      .from("nachbestellungen")
      .select("*")
      .order("created_at", { ascending: false })

    if (error) {
      console.error("Error fetching nachbestellungen:", error)
      return []
    }

    console.log("Fetched nachbestellungen:", data)
    return data || []
  } catch (error) {
    console.error("Error in getNachbestellungen:", error)
    return []
  }
}

export async function getNachbestellungById(id: number): Promise<NachbestellungWithItems | null> {
  try {
    const supabase = createClient()

    console.log("Fetching nachbestellung with ID:", id)

    // Get the nachbestellung
    const { data: nachbestellung, error: nachbestellungError } = await supabase
      .from("nachbestellungen")
      .select("*")
      .eq("id", id)
      .single()

    if (nachbestellungError) {
      console.error("Error fetching nachbestellung:", nachbestellungError)
      return null
    }

    console.log("Nachbestellung data:", nachbestellung)

    // Get creator email if created_by exists
    let creator_email = "Unbekannt"
    if (nachbestellung.created_by) {
      try {
        // Try to get the current user first
        const {
          data: { user: currentUser },
        } = await supabase.auth.getUser()

        if (currentUser && currentUser.id === nachbestellung.created_by) {
          creator_email = currentUser.email || "Unbekannt"
        } else {
          // For other users, we can't access their auth data directly from client
          // We'll show a shortened UUID for privacy
          creator_email = `${nachbestellung.created_by.substring(0, 8)}...`
        }
      } catch (emailError) {
        console.error("Error fetching creator email:", emailError)
        creator_email = `${nachbestellung.created_by.substring(0, 8)}...`
      }
    }

    // Get the items
    const { data: items, error: itemsError } = await supabase
      .from("nachbestellung_items")
      .select("*")
      .eq("nachbestellung_id", id)
      .order("item_type", { ascending: true })
      .order("item_name", { ascending: true })

    if (itemsError) {
      console.error("Error fetching nachbestellung items:", itemsError)
      return null
    }

    console.log("Nachbestellung items:", items)

    return {
      ...nachbestellung,
      creator_email,
      items: items || [],
    }
  } catch (error) {
    console.error("Error in getNachbestellungById:", error)
    return null
  }
}

export async function updateNachbestellungStatus(
  id: number,
  status: Nachbestellung["status"],
  userId?: string,
): Promise<boolean> {
  try {
    const supabase = createClient()

    const updateData: any = {
      status,
      updated_at: new Date().toISOString(),
    }

    if (status === "abgeschlossen") {
      updateData.completed_at = new Date().toISOString()
      updateData.completed_by = userId
    }

    const { error } = await supabase.from("nachbestellungen").update(updateData).eq("id", id)

    if (error) {
      console.error("Error updating nachbestellung status:", error)
      return false
    }

    return true
  } catch (error) {
    console.error("Error in updateNachbestellungStatus:", error)
    return false
  }
}

export async function updateItemPackedStatus(itemId: number, isPacked: boolean): Promise<boolean> {
  try {
    const supabase = createClient()

    const { error } = await supabase
      .from("nachbestellung_items")
      .update({
        is_packed: isPacked,
        updated_at: new Date().toISOString(),
      })
      .eq("id", itemId)

    if (error) {
      console.error("Error updating item packed status:", error)
      return false
    }

    return true
  } catch (error) {
    console.error("Error in updateItemPackedStatus:", error)
    return false
  }
}

export async function updateItemStatus(itemId: number, status: NachbestellungItem["status"]): Promise<boolean> {
  try {
    const supabase = createClient()

    const { error } = await supabase
      .from("nachbestellung_items")
      .update({
        status,
        updated_at: new Date().toISOString(),
      })
      .eq("id", itemId)

    if (error) {
      console.error("Error updating item status:", error)
      return false
    }

    return true
  } catch (error) {
    console.error("Error in updateItemStatus:", error)
    return false
  }
}

export async function deleteNachbestellung(id: number): Promise<boolean> {
  try {
    const supabase = createClient()

    // Delete items first (due to foreign key constraint)
    const { error: itemsError } = await supabase.from("nachbestellung_items").delete().eq("nachbestellung_id", id)

    if (itemsError) {
      console.error("Error deleting nachbestellung items:", itemsError)
      return false
    }

    // Delete the nachbestellung
    const { error: nachbestellungError } = await supabase.from("nachbestellungen").delete().eq("id", id)

    if (nachbestellungError) {
      console.error("Error deleting nachbestellung:", nachbestellungError)
      return false
    }

    return true
  } catch (error) {
    console.error("Error in deleteNachbestellung:", error)
    return false
  }
}
