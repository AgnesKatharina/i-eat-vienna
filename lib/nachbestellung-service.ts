import { createClient } from "@/lib/supabase-client"

import type { Database } from "./database.types"

type NachbestellungInsert = Database["public"]["Tables"]["nachbestellungen"]["Insert"]
type NachbestellungItemInsert = Database["public"]["Tables"]["nachbestellung_items"]["Insert"]

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
  status: "offen" | "bestellt" | "erhalten" | "storniert"
  created_at: string
  updated_at: string
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

    // Send push notification to admin users via API route
    try {
      await fetch("/api/push-notifications/send", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          title: "Neue Nachbestellung",
          message: `Neue Nachbestellung für "${data.event_name}" mit ${totalItems} Artikeln`,
          url: `/app/nachbestellungen/view/${nachbestellung.id}`,
        }),
      })
    } catch (error) {
      console.error("Error sending push notification:", error)
      // Don't fail the nachbestellung creation if notification fails
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

    const { data, error } = await supabase
      .from("nachbestellungen")
      .select("*")
      .order("created_at", { ascending: false })

    if (error) {
      console.error("Error fetching nachbestellungen:", error)
      return []
    }

    return data || []
  } catch (error) {
    console.error("Error in getNachbestellungen:", error)
    return []
  }
}

export async function getNachbestellungById(
  id: number,
): Promise<{ nachbestellung: Nachbestellung; items: NachbestellungItem[] } | null> {
  try {
    const supabase = createClient()

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

    return {
      nachbestellung,
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
