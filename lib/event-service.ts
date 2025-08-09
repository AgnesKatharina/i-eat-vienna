import { createClient } from "@/lib/supabase-client"
import type { Event } from "@/lib/types"

function parseEventDate(dateString: string | null): Date | null {
  if (!dateString) return null
  // Parse as local date to avoid timezone issues
  const [year, month, day] = dateString.split("-").map(Number)
  return new Date(year, month - 1, day)
}

export type { Event }

export interface EventProduct {
  product_name: string
  quantity: number
  unit: string
}

export async function getEvents(): Promise<Event[]> {
  try {
    const supabase = createClient()
    const { data, error } = await supabase.from("events").select("*").order("created_at", { ascending: false })

    if (error) {
      console.error("Error fetching events:", error)
      return []
    }

    return data || []
  } catch (error) {
    console.error("Error in getEvents:", error)
    return []
  }
}

export async function getEvent(id: string): Promise<Event | null> {
  try {
    const supabase = createClient()
    const { data, error } = await supabase.from("events").select("*").eq("id", id).single()

    if (error) {
      console.error("Error fetching event:", error)
      return null
    }

    return data
  } catch (error) {
    console.error("Error in getEvent:", error)
    return null
  }
}

export async function createEvent(event: {
  name: string
  type: string
  date: string | null
  end_date: string | null
  ft: string | null
  ka: string | null
  notes?: string
}): Promise<Event | null> {
  try {
    const supabase = createClient()
    const { data, error } = await supabase
      .from("events")
      .insert([
        {
          name: event.name,
          type: event.type,
          date: event.date,
          end_date: event.end_date,
          ft: event.ft,
          ka: event.ka,
          notes: event.notes || '',
          print: false,
          finished: false,
        },
      ])
      .select()
      .single()

    if (error) {
      console.error("Error creating event:", error)
      throw error
    }

    return data
  } catch (error) {
    console.error("Error in createEvent:", error)
    throw error
  }
}

export async function updateEvent(
  id: string,
  event: {
    name?: string
    type?: string
    date?: string | null
    end_date?: string | null
    ft?: string | null
    ka?: string | null
    notes?: string
  },
): Promise<Event | null> {
  try {
    const supabase = createClient()
    const { data, error } = await supabase.from("events").update(event).eq("id", id).select().single()

    if (error) {
      console.error("Error updating event:", error)
      return null
    }

    return data
  } catch (error) {
    console.error("Error in updateEvent:", error)
    return null
  }
}

export async function deleteEvent(id: string): Promise<boolean> {
  try {
    const supabase = createClient()
    const { error } = await supabase.from("events").delete().eq("id", id)

    if (error) {
      console.error("Error deleting event:", error)
      return false
    }

    return true
  } catch (error) {
    console.error("Error in deleteEvent:", error)
    return false
  }
}

export async function getEventProducts(eventId: string): Promise<EventProduct[]> {
  try {
    const supabase = createClient()
    const { data, error } = await supabase.from("event_products").select("*").eq("event_id", eventId)

    if (error) {
      console.error("Error fetching event products:", error)
      return []
    }

    return data || []
  } catch (error) {
    console.error("Error in getEventProducts:", error)
    return []
  }
}

export async function saveEventProducts(eventId: string, products: EventProduct[]): Promise<boolean> {
  try {
    const supabase = createClient()

    // First delete all existing products for this event
    const { error: deleteError } = await supabase.from("event_products").delete().eq("event_id", eventId)

    if (deleteError) {
      console.error("Error deleting existing event products:", deleteError)
      return false
    }

    // Then insert the new products
    if (products.length === 0) {
      return true // No products to insert
    }

    const { error: insertError } = await supabase.from("event_products").insert(
      products.map((product) => ({
        event_id: eventId,
        product_name: product.product_name,
        quantity: product.quantity,
        unit: product.unit,
      })),
    )

    if (insertError) {
      console.error("Error inserting event products:", insertError)
      return false
    }

    return true
  } catch (error) {
    console.error("Error in saveEventProducts:", error)
    return false
  }
}

export async function updatePrintReadyStatus(id: string, isReady: boolean): Promise<boolean> {
  try {
    const supabase = createClient()
    const { error } = await supabase.from("events").update({ print: isReady }).eq("id", id)

    if (error) {
      console.error("Error updating print ready status:", error)
      return false
    }

    return true
  } catch (error) {
    console.error("Error in updatePrintReadyStatus:", error)
    return false
  }
}

export async function updateFinishedStatus(id: string, isFinished: boolean): Promise<boolean> {
  try {
    const supabase = createClient()
    const { error } = await supabase.from("events").update({ finished: isFinished }).eq("id", id)

    if (error) {
      console.error("Error updating finished status:", error)
      return false
    }

    return true
  } catch (error) {
    console.error("Error in updateFinishedStatus:", error)
    return false
  }
}

export async function updateEventNotes(id: string, notes: string): Promise<boolean> {
  try {
    const supabase = createClient()
    const { error } = await supabase.from("events").update({ notes }).eq("id", id)

    if (error) {
      console.error("Error updating event notes:", error)
      return false
    }

    return true
  } catch (error) {
    console.error("Error in updateEventNotes:", error)
    return false
  }
}
