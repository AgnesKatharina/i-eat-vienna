import webpush from "web-push"
import { createClient } from "@/lib/supabase-server"

// Configure web-push with VAPID keys
webpush.setVapidDetails(
  "mailto:office@ieatvienna.at",
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
  process.env.VAPID_PRIVATE_KEY!,
)

export interface PushSubscription {
  endpoint: string
  keys: {
    p256dh: string
    auth: string
  }
}

export interface NotificationPayload {
  title: string
  message: string
  url?: string
  icon?: string
}

export async function sendPushNotification(subscription: PushSubscription, payload: NotificationPayload) {
  try {
    const notificationPayload = JSON.stringify({
      title: payload.title,
      message: payload.message,
      url: payload.url || "/",
      icon: payload.icon || "/icon-192x192.png",
      timestamp: Date.now(),
    })

    await webpush.sendNotification(subscription, notificationPayload)
    return { success: true }
  } catch (error) {
    console.error("Error sending push notification:", error)
    return { success: false, error }
  }
}

export async function sendNotificationToAdmins(payload: NotificationPayload) {
  const supabase = createClient()

  try {
    // Get all admin subscriptions
    const { data: subscriptions, error } = await supabase
      .from("push_subscriptions")
      .select("*")
      .in("user_email", ["agnes@ieatvienna.at", "office@ieatvienna.at"])
      .eq("active", true)

    if (error) {
      console.error("Error fetching admin subscriptions:", error)
      return { success: false, error }
    }

    if (!subscriptions || subscriptions.length === 0) {
      console.log("No admin subscriptions found")
      return { success: true, message: "No admin subscriptions found" }
    }

    // Send notifications to all admin subscriptions
    const results = await Promise.allSettled(
      subscriptions.map((sub) =>
        sendPushNotification(
          {
            endpoint: sub.endpoint,
            keys: {
              p256dh: sub.p256dh_key,
              auth: sub.auth_key,
            },
          },
          payload,
        ),
      ),
    )

    const successful = results.filter((r) => r.status === "fulfilled").length
    const failed = results.filter((r) => r.status === "rejected").length

    console.log(`Push notifications sent: ${successful} successful, ${failed} failed`)

    return {
      success: true,
      results: { successful, failed, total: subscriptions.length },
    }
  } catch (error) {
    console.error("Error sending notifications to admins:", error)
    return { success: false, error }
  }
}
