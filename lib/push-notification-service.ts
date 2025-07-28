import webpush from "web-push"
import { createClient } from "@/lib/supabase-server"

// Configure web-push
if (process.env.VAPID_PRIVATE_KEY && process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY) {
  webpush.setVapidDetails(
    "mailto:office@ieatvienna.at",
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY,
    process.env.VAPID_PRIVATE_KEY,
  )
}

export interface NotificationPayload {
  title: string
  message: string
  url?: string
  icon?: string
}

export async function sendNotificationToAdmins(payload: NotificationPayload) {
  try {
    const supabase = createClient()

    // Get admin subscriptions
    const adminEmails = ["agnes@ieatvienna.at", "office@ieatvienna.at"]

    const { data: subscriptions, error } = await supabase
      .from("push_subscriptions")
      .select("*")
      .in("user_email", adminEmails)
      .eq("active", true)

    if (error) {
      console.error("Error fetching subscriptions:", error)
      return
    }

    if (!subscriptions || subscriptions.length === 0) {
      console.log("No active admin subscriptions found")
      return
    }

    // Send notifications to all admin subscriptions
    const notificationPromises = subscriptions.map(async (sub) => {
      try {
        const pushSubscription = {
          endpoint: sub.endpoint,
          keys: {
            p256dh: sub.p256dh_key,
            auth: sub.auth_key,
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
        if (error.statusCode === 410) {
          await supabase.from("push_subscriptions").update({ active: false }).eq("id", sub.id)
        }
      }
    })

    await Promise.allSettled(notificationPromises)
  } catch (error) {
    console.error("Error sending notifications to admins:", error)
  }
}

export async function sendTestNotification(userEmail: string) {
  try {
    const supabase = createClient()

    const { data: subscriptions, error } = await supabase
      .from("push_subscriptions")
      .select("*")
      .eq("user_email", userEmail)
      .eq("active", true)

    if (error) {
      console.error("Error fetching user subscription:", error)
      return false
    }

    if (!subscriptions || subscriptions.length === 0) {
      console.log("No active subscription found for user")
      return false
    }

    const subscription = subscriptions[0]
    const pushSubscription = {
      endpoint: subscription.endpoint,
      keys: {
        p256dh: subscription.p256dh_key,
        auth: subscription.auth_key,
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
    return true
  } catch (error) {
    console.error("Error sending test notification:", error)
    return false
  }
}
