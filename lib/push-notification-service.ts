import { createClient } from "@/lib/supabase-client"

const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || ""

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

// Convert VAPID key from base64url to Uint8Array
const base64UrlToUint8Array = (base64UrlData: string): Uint8Array => {
  const padding = "=".repeat((4 - (base64UrlData.length % 4)) % 4)
  const base64 = (base64UrlData + padding).replace(/-/g, "+").replace(/_/g, "/")

  const rawData = atob(base64)
  const buffer = new Uint8Array(rawData.length)

  for (let i = 0; i < rawData.length; ++i) {
    buffer[i] = rawData.charCodeAt(i)
  }

  return buffer
}

// Client-side functions
export const subscribeToPushNotifications = async (): Promise<PushSubscription | null> => {
  try {
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
      console.warn("Push notifications are not supported")
      return null
    }

    const registration = await navigator.serviceWorker.getRegistration()
    if (!registration) {
      console.warn("Service worker not registered")
      return null
    }

    // Check if already subscribed
    const existingSubscription = await registration.pushManager.getSubscription()
    if (existingSubscription) {
      return existingSubscription.toJSON() as PushSubscription
    }

    // Subscribe to push notifications
    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: base64UrlToUint8Array(VAPID_PUBLIC_KEY),
    })

    return subscription.toJSON() as PushSubscription
  } catch (error) {
    console.error("Error subscribing to push notifications:", error)
    return null
  }
}

export const unsubscribeFromPushNotifications = async (): Promise<boolean> => {
  try {
    const registration = await navigator.serviceWorker.getRegistration()
    if (!registration) return false

    const subscription = await registration.pushManager.getSubscription()
    if (!subscription) return true

    return await subscription.unsubscribe()
  } catch (error) {
    console.error("Error unsubscribing from push notifications:", error)
    return false
  }
}

export const getPushSubscription = async (): Promise<PushSubscription | null> => {
  try {
    const registration = await navigator.serviceWorker.getRegistration()
    if (!registration) return null

    const subscription = await registration.pushManager.getSubscription()
    return subscription ? (subscription.toJSON() as PushSubscription) : null
  } catch (error) {
    console.error("Error getting push subscription:", error)
    return null
  }
}

// Save subscription to database
export const savePushSubscription = async (subscription: PushSubscription, userEmail: string): Promise<boolean> => {
  try {
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
      return false
    }

    return true
  } catch (error) {
    console.error("Error saving push subscription:", error)
    return false
  }
}

// Remove subscription from database
export const removePushSubscription = async (userEmail: string): Promise<boolean> => {
  try {
    const supabase = createClient()

    const { error } = await supabase.from("push_subscriptions").update({ active: false }).eq("user_email", userEmail)

    if (error) {
      console.error("Error removing push subscription:", error)
      return false
    }

    return true
  } catch (error) {
    console.error("Error removing push subscription:", error)
    return false
  }
}

// Send push notification to admin users (client-side function that calls API)
export const sendNachbestellungNotification = async (nachbestellungData: {
  eventName: string
  totalItems: number
  createdBy?: string
}): Promise<boolean> => {
  try {
    const response = await fetch("/api/push-notifications/send", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        type: "nachbestellung_created",
        data: nachbestellungData,
      }),
    })

    return response.ok
  } catch (error) {
    console.error("Error sending nachbestellung notification:", error)
    return false
  }
}
