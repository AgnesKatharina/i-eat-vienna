import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase-server"

export async function POST(request: NextRequest) {
  try {
    const { subscription, userEmail } = await request.json()

    if (!subscription || !userEmail) {
      return NextResponse.json({ error: "Missing subscription or userEmail" }, { status: 400 })
    }

    const supabase = createClient()

    const { error } = await supabase.from("push_subscriptions").upsert(
      {
        user_email: userEmail,
        endpoint: subscription.endpoint,
        p256dh: subscription.keys.p256dh,
        auth: subscription.keys.auth,
        active: true,
        updated_at: new Date().toISOString(),
      },
      {
        onConflict: "user_email",
      },
    )

    if (error) {
      console.error("Error saving push subscription:", error)
      return NextResponse.json({ error: "Failed to save subscription" }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error in subscribe route:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
