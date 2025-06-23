import { supabase } from "@/lib/supabase-client"
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
  const { data, error } = await supabase.from("events").select("*").order("created_at", { ascending: false })

  if (error) {
    console.error("Error fetching events:", error)
    return []
  }

  return data || []
}

export async function getEvent(id: string): Promise<Event | null> {
  const { data, error } = await supabase.from("events").select("*").eq("id", id).single()

  if (error) {
    console.error("Error fetching event:", error)
    return null
  }

  return data
}

export async function createEvent(event: {
  name: string
  type: string
  date: string | null
  ft: string | null
  ka: string | null
}): Promise<Event | null> {
  const { data, error } = await supabase
    .from("events")
    .insert([
      {
        name: event.name,
        type: event.type,
        date: event.date,
        ft: event.ft,
        ka: event.ka,
        print: false,
      },
    ])
    .select()
    .single()

  if (error) {
    console.error("Error creating event:", error)
    return null
  }

  return data
}

export async function updateEvent(
  id: string,
  event: {
    name?: string
    type?: string
    date?: string | null
    ft?: string | null
    ka?: string | null
  },
): Promise<Event | null> {
  const { data, error } = await supabase.from("events").update(event).eq("id", id).select().single()

  if (error) {
    console.error("Error updating event:", error)
    return null
  }

  return data
}

export async function deleteEvent(id: string): Promise<boolean> {
  const { error } = await supabase.from("events").delete().eq("id", id)

  if (error) {
    console.error("Error deleting event:", error)
    return false
  }

  return true
}

export async function getEventProducts(eventId: string): Promise<EventProduct[]> {
  const { data, error } = await supabase.from("event_products").select("*").eq("event_id", eventId)

  if (error) {
    console.error("Error fetching event products:", error)
    return []
  }

  return data || []
}

export async function saveEventProducts(eventId: string, products: EventProduct[]): Promise<boolean> {
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
}

export async function updatePrintReadyStatus(id: string, isReady: boolean): Promise<boolean> {
  const { error } = await supabase.from("events").update({ print: isReady }).eq("id", id)

  if (error) {
    console.error("Error updating print ready status:", error)
    return false
  }

  return true
}
