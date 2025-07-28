import { type NextRequest, NextResponse } from "next/server"
import webpush from "web-push"
import { createClient } from "@/lib/supabase-client"

// Configure web-push with VAPID keys
webpush.setVapidDetails(
  "mailto:office@ieatvienna.at",
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || "",
  process.env.VAPID_PRIVATE_KEY || "",
)

const ADMIN_EMAILS = ["agnes@ieatvienna.at", "office@ieatvienna.at"]

interface NotificationData {
  type: "nachbestellung_created"
  data: {
    eventName: string
    totalItems: number
    createdBy?: string
  }
}

export async function POST(request: NextRequest) {
  try {
    const body: NotificationData = await request.json()

    if (body.type !== "nachbestellung_created") {
      return NextResponse.json({ error: "Invalid notification type" }, { status: 400 })
    }

    const supabase = createClient()

    // Get push subscriptions for admin users
    const { data: subscriptions, error } = await supabase
      .from("push_subscriptions")
      .select("*")
      .in("user_email", ADMIN_EMAILS)

    if (error) {
      console.error("Error fetching push subscriptions:", error)
      return NextResponse.json({ error: "Failed to fetch subscriptions" }, { status: 500 })
    }

    if (!subscriptions || subscriptions.length === 0) {
      console.log("No admin subscriptions found")
      return NextResponse.json({ message: "No subscriptions to notify" })
    }

    // Prepare notification payload
    const payload = {
      title: "Neue Nachbestellung",
      body: `Neue Nachbestellung für "${body.data.eventName}" mit ${body.data.totalItems} Artikeln`,
      icon: "/icons/icon-192x192.png",
      badge: "/icons/icon-72x72.png",
      data: {
        url: "/app/nachbestellungen",
        type: "nachbestellung_created",
        eventName: body.data.eventName,
        totalItems: body.data.totalItems,
        timestamp: Date.now(),
      },
      actions: [
        {
          action: "view",
          title: "Anzeigen",
        },
        {
          action: "close",
          title: "Schließen",
        },
      ],
      requireInteraction: true,
      vibrate: [100, 50, 100],
    }

    // Send notifications to all admin subscriptions
    const notificationPromises = subscriptions.map(async (subscription) => {
      try {
        const pushSubscription = {
          endpoint: subscription.endpoint,
          keys: {
            p256dh: subscription.p256dh_key,
            auth: subscription.auth_key,
          },
        }

        await webpush.sendNotification(pushSubscription, JSON.stringify(payload))
        console.log(`Notification sent to ${subscription.user_email}`)
        return { success: true, email: subscription.user_email }
      } catch (error) {
        console.error(`Failed to send notification to ${subscription.user_email}:`, error)

        // If subscription is invalid, remove it from database
        if (error instanceof Error && (error.message.includes("410") || error.message.includes("invalid"))) {
          await supabase.from("push_subscriptions").delete().eq("user_email", subscription.user_email)
        }

        return {
          success: false,
          email: subscription.user_email,
          error: error instanceof Error ? error.message : "Unknown error",
        }
      }
    })

    const results = await Promise.all(notificationPromises)
    const successful = results.filter((r) => r.success).length
    const failed = results.filter((r) => !r.success).length

    return NextResponse.json({
      message: `Notifications sent: ${successful} successful, ${failed} failed`,
      results,
    })
  } catch (error) {
    console.error("Error in push notification API:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
