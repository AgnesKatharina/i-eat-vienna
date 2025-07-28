import { createClient } from "@/lib/supabase-server"
import { sendNotificationToAdmins } from "@/lib/push-notification-service"
import type { Database } from "./database.types"

type NachbestellungInsert = Database["public"]["Tables"]["nachbestellungen"]["Insert"]
type NachbestellungItemInsert = Database["public"]["Tables"]["nachbestellung_items"]["Insert"]

export interface CreateNachbestellungData {
  eventId: string
  eventName: string
  items: Array<{
    productId: string
    productName: string
    quantity: number
    unit: string
    category: string
  }>
  notes?: string
}

export async function createNachbestellung(data: CreateNachbestellungData) {
  const supabase = createClient()

  try {
    // Create the nachbestellung
    const nachbestellungData: NachbestellungInsert = {
      event_id: data.eventId,
      event_name: data.eventName,
      status: "pending",
      notes: data.notes || null,
      total_items: data.items.length,
      created_by: "system", // You might want to get this from auth context
    }

    const { data: nachbestellung, error: nachbestellungError } = await supabase
      .from("nachbestellungen")
      .insert(nachbestellungData)
      .select()
      .single()

    if (nachbestellungError) {
      throw nachbestellungError
    }

    // Create the nachbestellung items
    const itemsData: NachbestellungItemInsert[] = data.items.map((item) => ({
      nachbestellung_id: nachbestellung.id,
      product_id: item.productId,
      product_name: item.productName,
      quantity: item.quantity,
      unit: item.unit,
      category: item.category,
    }))

    const { error: itemsError } = await supabase.from("nachbestellung_items").insert(itemsData)

    if (itemsError) {
      throw itemsError
    }

    // Send push notification to admins
    try {
      await sendNotificationToAdmins({
        title: "Neue Nachbestellung",
        message: `Neue Nachbestellung für "${data.eventName}" mit ${data.items.length} Artikeln`,
        url: `/app/nachbestellungen/view/${nachbestellung.id}`,
        icon: "/icon-192x192.png",
      })
      console.log("Push notification sent to admins")
    } catch (notificationError) {
      console.error("Failed to send push notification:", notificationError)
      // Don't fail the entire operation if notification fails
    }

    return { success: true, data: nachbestellung }
  } catch (error) {
    console.error("Error creating nachbestellung:", error)
    return { success: false, error }
  }
}

export async function getNachbestellungen() {
  const supabase = createClient()

  const { data, error } = await supabase
    .from("nachbestellungen")
    .select(`
      *,
      nachbestellung_items (
        id,
        product_name,
        quantity,
        unit,
        category
      )
    `)
    .order("created_at", { ascending: false })

  if (error) {
    console.error("Error fetching nachbestellungen:", error)
    return { success: false, error }
  }

  return { success: true, data }
}

export async function getNachbestellungById(id: string) {
  const supabase = createClient()

  const { data, error } = await supabase
    .from("nachbestellungen")
    .select(`
      *,
      nachbestellung_items (
        id,
        product_id,
        product_name,
        quantity,
        unit,
        category
      )
    `)
    .eq("id", id)
    .single()

  if (error) {
    console.error("Error fetching nachbestellung:", error)
    return { success: false, error }
  }

  return { success: true, data }
}

export async function updateNachbestellungStatus(id: string, status: string) {
  const supabase = createClient()

  const { data, error } = await supabase
    .from("nachbestellungen")
    .update({ status, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select()
    .single()

  if (error) {
    console.error("Error updating nachbestellung status:", error)
    return { success: false, error }
  }

  return { success: true, data }
}
