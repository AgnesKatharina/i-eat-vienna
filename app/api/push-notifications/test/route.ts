import { type NextRequest, NextResponse } from "next/server"
import webpush from "web-push"
import { createClient } from "@/lib/supabase-client"
import { sendNotificationToAdmins } from "@/lib/push-notification-service"

// Configure web-push with VAPID keys
webpush.setVapidDetails(
  "mailto:office@ieatvienna.at",
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || "",
  process.env.VAPID_PRIVATE_KEY || "",
)

export async function POST(request: NextRequest) {
  try {
    const { userEmail } = await request.json()

    if (!userEmail) {
      return NextResponse.json({ error: "User email is required" }, { status: 400 })
    }

    const supabase = createClient()

    // Get push subscription for the user
    const { data: subscription, error } = await supabase
      .from("push_subscriptions")
      .select("*")
      .eq("user_email", userEmail)
      .single()

    if (error || !subscription) {
      return NextResponse.json({ error: "No subscription found for user" }, { status: 404 })
    }

    // Prepare test notification payload
    const payload = {
      title: "Test-Benachrichtigung",
      body: "Dies ist eine Test-Benachrichtigung von I Eat Vienna",
      icon: "/icons/icon-192x192.png",
      badge: "/icons/icon-72x72.png",
      data: {
        url: "/app",
        type: "test",
        timestamp: Date.now(),
      },
      actions: [
        {
          action: "view",
          title: "App öffnen",
        },
        {
          action: "close",
          title: "Schließen",
        },
      ],
      requireInteraction: false,
      vibrate: [100, 50, 100],
    }

    const pushSubscription = {
      endpoint: subscription.endpoint,
      keys: {
        p256dh: subscription.p256dh_key,
        auth: subscription.auth_key,
      },
    }

    await webpush.sendNotification(pushSubscription, JSON.stringify(payload))

    // Send test notification to admins
    const adminResult = await sendNotificationToAdmins({
      title: "Test Notification",
      message: "This is a test notification from I Eat Vienna",
      url: "/app/nachbestellungen",
      icon: "/icon-192x192.png",
    })

    return NextResponse.json({ message: "Test notification sent successfully", adminResult })
  } catch (error) {
    console.error("Error sending test notification:", error)
    return NextResponse.json({ error: "Failed to send test notification" }, { status: 500 })
  }
}
