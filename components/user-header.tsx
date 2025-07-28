"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Bell, BellOff, LogOut } from "lucide-react"
import { createClient } from "@/lib/supabase-client"
import { useRouter } from "next/navigation"
import type { User as SupabaseUser } from "@supabase/supabase-js"

interface PushNotificationSettingsProps {
  user: SupabaseUser
}

function PushNotificationSettings({ user }: PushNotificationSettingsProps) {
  const [isSubscribed, setIsSubscribed] = useState(false)
  const [isSupported, setIsSupported] = useState(false)
  const [loading, setLoading] = useState(false)

  // Check if user is admin
  const isAdmin = user.email === "agnes@ieatvienna.at" || user.email === "office@ieatvienna.at"

  useEffect(() => {
    if ("serviceWorker" in navigator && "PushManager" in window) {
      setIsSupported(true)
      checkSubscriptionStatus()
    }
  }, [])

  const checkSubscriptionStatus = async () => {
    try {
      const registration = await navigator.serviceWorker.ready
      const subscription = await registration.pushManager.getSubscription()
      setIsSubscribed(!!subscription)
    } catch (error) {
      console.error("Error checking subscription status:", error)
    }
  }

  const urlBase64ToUint8Array = (base64String: string) => {
    const padding = "=".repeat((4 - (base64String.length % 4)) % 4)
    const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/")
    const rawData = window.atob(base64)
    const outputArray = new Uint8Array(rawData.length)
    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i)
    }
    return outputArray
  }

  const subscribeToPush = async () => {
    if (!isSupported) return

    setLoading(true)
    try {
      const registration = await navigator.serviceWorker.ready
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!),
      })

      const response = await fetch("/api/push-notifications/subscribe", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          subscription: subscription.toJSON(),
          userEmail: user.email,
        }),
      })

      if (response.ok) {
        setIsSubscribed(true)
      } else {
        throw new Error("Failed to subscribe")
      }
    } catch (error) {
      console.error("Error subscribing to push notifications:", error)
      alert("Fehler beim Aktivieren der Push-Benachrichtigungen")
    } finally {
      setLoading(false)
    }
  }

  const unsubscribeFromPush = async () => {
    if (!isSupported) return

    setLoading(true)
    try {
      const registration = await navigator.serviceWorker.ready
      const subscription = await registration.pushManager.getSubscription()

      if (subscription) {
        await subscription.unsubscribe()
      }

      const response = await fetch("/api/push-notifications/unsubscribe", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          userEmail: user.email,
        }),
      })

      if (response.ok) {
        setIsSubscribed(false)
      } else {
        throw new Error("Failed to unsubscribe")
      }
    } catch (error) {
      console.error("Error unsubscribing from push notifications:", error)
      alert("Fehler beim Deaktivieren der Push-Benachrichtigungen")
    } finally {
      setLoading(false)
    }
  }

  const sendTestNotification = async () => {
    try {
      const response = await fetch("/api/push-notifications/test", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          userEmail: user.email,
        }),
      })

      if (response.ok) {
        alert("Test-Benachrichtigung gesendet!")
      } else {
        throw new Error("Failed to send test notification")
      }
    } catch (error) {
      console.error("Error sending test notification:", error)
      alert("Fehler beim Senden der Test-Benachrichtigung")
    }
  }

  if (!isAdmin || !isSupported) {
    return null
  }

  return (
    <div className="flex items-center gap-2">
      <Button
        variant="outline"
        size="sm"
        onClick={isSubscribed ? unsubscribeFromPush : subscribeToPush}
        disabled={loading}
        className="flex items-center gap-2 bg-transparent"
      >
        {isSubscribed ? <BellOff className="w-4 h-4" /> : <Bell className="w-4 h-4" />}
        {loading ? "Laden..." : isSubscribed ? "Push aus" : "Push an"}
      </Button>
      {isSubscribed && (
        <Button variant="ghost" size="sm" onClick={sendTestNotification} className="text-xs">
          Test
        </Button>
      )}
    </div>
  )
}

export function UserHeader() {
  const [user, setUser] = useState<SupabaseUser | null>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    const getUser = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      setUser(user)
      setLoading(false)
    }

    getUser()

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user ?? null)
    })

    return () => subscription.unsubscribe()
  }, [supabase.auth])

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    router.push("/")
  }

  if (loading) {
    return (
      <div className="flex items-center justify-between p-4 bg-white border-b">
        <div className="animate-pulse h-6 bg-gray-200 rounded w-32"></div>
      </div>
    )
  }

  if (!user) {
    return null
  }

  const isAdmin = user.email === "agnes@ieatvienna.at" || user.email === "office@ieatvienna.at"

  return (
    <div className="flex items-center justify-between p-4 bg-white border-b">
      <div className="flex items-center gap-3">
        <Bell className="w-5 h-5 text-gray-600" />
        <div>
          <p className="font-medium text-gray-900">{user.email}</p>
          {isAdmin && (
            <Badge variant="secondary" className="text-xs">
              Admin
            </Badge>
          )}
        </div>
      </div>

      <div className="flex items-center gap-3">
        <PushNotificationSettings user={user} />
        <Button variant="outline" size="sm" onClick={handleSignOut} className="flex items-center gap-2 bg-transparent">
          <LogOut className="w-4 h-4" />
          Abmelden
        </Button>
      </div>
    </div>
  )
}
