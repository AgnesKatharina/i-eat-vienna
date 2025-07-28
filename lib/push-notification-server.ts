import webpush from "web-push"
import { createClient } from "@/lib/supabase-server"

// Configure web-push
webpush.setVapidDetails(
  "mailto:office@ieatvienna.at",
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
  process.env.VAPID_PRIVATE_KEY!,
)

export interface NotificationPayload {
  title: string
  message: string
  url?: string
  icon?: string
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
      console.error("Error fetching subscriptions:", error)
      return
    }

    if (!subscriptions || subscriptions.length === 0) {
      console.log("No admin subscriptions found")
      return
    }

    // Send notification to each subscription
    const promises = subscriptions.map(async (sub) => {
      try {
        const pushSubscription = {
          endpoint: sub.endpoint,
          keys: {
            p256dh: sub.p256dh,
            auth: sub.auth,
          },
        }

        const notificationPayload = JSON.stringify({
          title: payload.title,
          message: payload.message,
          url: payload.url || "/app/nachbestellungen",
          icon: payload.icon || "/icon-192x192.png",
          badge: "/icon-192x192.png",
          timestamp: Date.now(),
        })

        await webpush.sendNotification(pushSubscription, notificationPayload)
        console.log(`Notification sent to ${sub.user_email}`)
      } catch (error) {
        console.error(`Failed to send notification to ${sub.user_email}:`, error)

        // If subscription is invalid, mark it as inactive
        if (error.statusCode === 410 || error.statusCode === 404) {
          await supabase.from("push_subscriptions").update({ active: false }).eq("id", sub.id)
        }
      }
    })

    await Promise.allSettled(promises)
  } catch (error) {
    console.error("Error sending notifications to admins:", error)
  }
}

export async function sendTestNotification(userEmail: string) {
  const supabase = createClient()

  try {
    const { data: subscriptions, error } = await supabase
      .from("push_subscriptions")
      .select("*")
      .eq("user_email", userEmail)
      .eq("active", true)

    if (error || !subscriptions || subscriptions.length === 0) {
      throw new Error("No active subscription found")
    }

    const subscription = subscriptions[0]
    const pushSubscription = {
      endpoint: subscription.endpoint,
      keys: {
        p256dh: subscription.p256dh,
        auth: subscription.auth,
      },
    }

    const notificationPayload = JSON.stringify({
      title: "Test Benachrichtigung",
      message: "Dies ist eine Test-Benachrichtigung von I Eat Vienna",
      url: "/app",
      icon: "/icon-192x192.png",
      badge: "/icon-192x192.png",
      timestamp: Date.now(),
    })

    await webpush.sendNotification(pushSubscription, notificationPayload)
  } catch (error) {
    console.error("Error sending test notification:", error)
    throw error
  }
}
