import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase-server"

export async function POST(request: NextRequest) {
  try {
    const { endpoint } = await request.json()

    if (!endpoint) {
      return NextResponse.json({ error: "Missing endpoint" }, { status: 400 })
    }

    const supabase = createClient()

    const { error } = await supabase.from("push_subscriptions").update({ active: false }).eq("endpoint", endpoint)

    if (error) {
      console.error("Error unsubscribing:", error)
      return NextResponse.json({ error: "Failed to unsubscribe" }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error in unsubscribe route:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
