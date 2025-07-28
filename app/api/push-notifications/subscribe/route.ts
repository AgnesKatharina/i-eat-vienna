import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase-server"

export async function POST(request: NextRequest) {
  try {
    const { subscription, userEmail } = await request.json()

    if (!subscription || !userEmail) {
      return NextResponse.json({ error: "Missing subscription or userEmail" }, { status: 400 })
    }

    // Check if user is admin
    const adminEmails = ["agnes@ieatvienna.at", "office@ieatvienna.at"]
    if (!adminEmails.includes(userEmail)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 })
    }

    const supabase = createClient()

    // Check if subscription already exists
    const { data: existing } = await supabase
      .from("push_subscriptions")
      .select("id")
      .eq("user_email", userEmail)
      .eq("endpoint", subscription.endpoint)
      .single()

    if (existing) {
      // Update existing subscription
      const { error } = await supabase
        .from("push_subscriptions")
        .update({
          p256dh_key: subscription.keys.p256dh,
          auth_key: subscription.keys.auth,
          active: true,
          updated_at: new Date().toISOString(),
        })
        .eq("id", existing.id)

      if (error) {
        console.error("Error updating subscription:", error)
        return NextResponse.json({ error: "Failed to update subscription" }, { status: 500 })
      }
    } else {
      // Create new subscription
      const { error } = await supabase.from("push_subscriptions").insert({
        user_email: userEmail,
        endpoint: subscription.endpoint,
        p256dh_key: subscription.keys.p256dh,
        auth_key: subscription.keys.auth,
        active: true,
      })

      if (error) {
        console.error("Error creating subscription:", error)
        return NextResponse.json({ error: "Failed to create subscription" }, { status: 500 })
      }
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error in subscribe route:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
