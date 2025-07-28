import { createClient } from "@/lib/supabase-client"
import { sendNachbestellungNotification } from "@/lib/push-notification-service"

export interface NachbestellungItem {
  id?: string
  nachbestellung_id: string
  product_id: string
  quantity: number
  unit: string
  notes?: string
  product?: {
    name: string
    category: string
    unit: string
  }
}

export interface Nachbestellung {
  id?: string
  event_id: string
  created_by: string
  status: "draft" | "submitted" | "approved" | "ordered" | "delivered"
  notes?: string
  created_at?: string
  updated_at?: string
  event?: {
    name: string
    date: string
  }
  items?: NachbestellungItem[]
  total_items?: number
}

export async function createNachbestellung(
  eventId: string,
  items: Omit<NachbestellungItem, "nachbestellung_id">[],
  notes?: string,
): Promise<{ success: boolean; data?: Nachbestellung; error?: string }> {
  try {
    const supabase = createClient()

    // Get current user
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()

    if (userError || !user) {
      return { success: false, error: "User not authenticated" }
    }

    // Create nachbestellung
    const { data: nachbestellung, error: nachbestellungError } = await supabase
      .from("nachbestellungen")
      .insert({
        event_id: eventId,
        created_by: user.id,
        status: "submitted",
        notes,
      })
      .select("*, event:events(*)")
      .single()

    if (nachbestellungError) {
      console.error("Error creating nachbestellung:", nachbestellungError)
      return { success: false, error: "Failed to create nachbestellung" }
    }

    // Create nachbestellung items
    const itemsWithNachbestellungId = items.map((item) => ({
      ...item,
      nachbestellung_id: nachbestellung.id,
    }))

    const { error: itemsError } = await supabase.from("nachbestellung_items").insert(itemsWithNachbestellungId)

    if (itemsError) {
      console.error("Error creating nachbestellung items:", itemsError)
      // Try to clean up the nachbestellung
      await supabase.from("nachbestellungen").delete().eq("id", nachbestellung.id)
      return { success: false, error: "Failed to create nachbestellung items" }
    }

    // Send push notification to admins
    try {
      await sendNachbestellungNotification({
        eventName: nachbestellung.event?.name || "Unbekanntes Event",
        totalItems: items.length,
        createdBy: user.email || "Unbekannter Benutzer",
      })
    } catch (notificationError) {
      console.error("Error sending push notification:", notificationError)
      // Don't fail the entire operation if notification fails
    }

    return {
      success: true,
      data: {
        ...nachbestellung,
        items: itemsWithNachbestellungId,
        total_items: items.length,
      },
    }
  } catch (error) {
    console.error("Error in createNachbestellung:", error)
    return { success: false, error: "Internal server error" }
  }
}

export async function getNachbestellungen(eventId?: string): Promise<Nachbestellung[]> {
  try {
    const supabase = createClient()

    let query = supabase
      .from("nachbestellungen")
      .select(
        `
        *,
        event:events(*),
        items:nachbestellung_items(
          *,
          product:products(*)
        )
      `,
      )
      .order("created_at", { ascending: false })

    if (eventId) {
      query = query.eq("event_id", eventId)
    }

    const { data, error } = await query

    if (error) {
      console.error("Error fetching nachbestellungen:", error)
      return []
    }

    return (
      data?.map((nachbestellung) => ({
        ...nachbestellung,
        total_items: nachbestellung.items?.length || 0,
      })) || []
    )
  } catch (error) {
    console.error("Error in getNachbestellungen:", error)
    return []
  }
}

export async function getNachbestellungById(id: string): Promise<Nachbestellung | null> {
  try {
    const supabase = createClient()

    const { data, error } = await supabase
      .from("nachbestellungen")
      .select(
        `
        *,
        event:events(*),
        items:nachbestellung_items(
          *,
          product:products(*)
        )
      `,
      )
      .eq("id", id)
      .single()

    if (error) {
      console.error("Error fetching nachbestellung:", error)
      return null
    }

    return {
      ...data,
      total_items: data.items?.length || 0,
    }
  } catch (error) {
    console.error("Error in getNachbestellungById:", error)
    return null
  }
}

export async function updateNachbestellungStatus(
  id: string,
  status: Nachbestellung["status"],
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = createClient()

    const { error } = await supabase
      .from("nachbestellungen")
      .update({ status, updated_at: new Date().toISOString() })
      .eq("id", id)

    if (error) {
      console.error("Error updating nachbestellung status:", error)
      return { success: false, error: "Failed to update status" }
    }

    return { success: true }
  } catch (error) {
    console.error("Error in updateNachbestellungStatus:", error)
    return { success: false, error: "Internal server error" }
  }
}

export async function deleteNachbestellung(id: string): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = createClient()

    // Delete items first (due to foreign key constraint)
    const { error: itemsError } = await supabase.from("nachbestellung_items").delete().eq("nachbestellung_id", id)

    if (itemsError) {
      console.error("Error deleting nachbestellung items:", itemsError)
      return { success: false, error: "Failed to delete nachbestellung items" }
    }

    // Delete nachbestellung
    const { error: nachbestellungError } = await supabase.from("nachbestellungen").delete().eq("id", id)

    if (nachbestellungError) {
      console.error("Error deleting nachbestellung:", nachbestellungError)
      return { success: false, error: "Failed to delete nachbestellung" }
    }

    return { success: true }
  } catch (error) {
    console.error("Error in deleteNachbestellung:", error)
    return { success: false, error: "Internal server error" }
  }
}
