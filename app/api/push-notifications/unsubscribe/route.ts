import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase-server"

export async function POST(request: NextRequest) {
  try {
    const { userEmail } = await request.json()

    if (!userEmail) {
      return NextResponse.json({ error: "Missing userEmail" }, { status: 400 })
    }

    const supabase = createClient()

    // Mark all subscriptions for this user as inactive
    const { error } = await supabase
      .from("push_subscriptions")
      .update({
        active: false,
        updated_at: new Date().toISOString(),
      })
      .eq("user_email", userEmail)

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
