"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Bell, BellOff, TestTube } from "lucide-react"
import { createClient } from "@/lib/supabase-client"
import type { User } from "@supabase/supabase-js"

interface UserHeaderProps {
  user: User | null
}

export function UserHeader({ user }: UserHeaderProps) {
  const [isSubscribed, setIsSubscribed] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [isAdmin, setIsAdmin] = useState(false)

  // Check if user is admin
  useEffect(() => {
    if (user?.email) {
      const adminEmails = ["agnes@ieatvienna.at", "office@ieatvienna.at"]
      setIsAdmin(adminEmails.includes(user.email))
    }
  }, [user])

  // Check subscription status
  useEffect(() => {
    if (isAdmin && "serviceWorker" in navigator && "PushManager" in window) {
      checkSubscriptionStatus()
    }
  }, [isAdmin])

  const checkSubscriptionStatus = async () => {
    try {
      const registration = await navigator.serviceWorker.getRegistration()
      if (registration) {
        const subscription = await registration.pushManager.getSubscription()
        setIsSubscribed(!!subscription)
      }
    } catch (error) {
      console.error("Error checking subscription status:", error)
    }
  }

  const base64UrlToUint8Array = (base64UrlData: string) => {
    const padding = "=".repeat((4 - (base64UrlData.length % 4)) % 4)
    const base64 = (base64UrlData + padding).replace(/-/g, "+").replace(/_/g, "/")
    const rawData = atob(base64)
    const buffer = new Uint8Array(rawData.length)
    for (let i = 0; i < rawData.length; ++i) {
      buffer[i] = rawData.charCodeAt(i)
    }
    return buffer
  }

  const subscribeToNotifications = async () => {
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
      alert("Push notifications are not supported in this browser")
      return
    }

    setIsLoading(true)
    try {
      const registration = await navigator.serviceWorker.getRegistration()
      if (!registration) {
        throw new Error("Service worker not registered")
      }

      const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
      if (!publicKey) {
        throw new Error("VAPID public key not configured")
      }

      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: base64UrlToUint8Array(publicKey),
      })

      // Save subscription to database
      const response = await fetch("/api/push-notifications/subscribe", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          subscription,
          userEmail: user?.email,
        }),
      })

      if (!response.ok) {
        throw new Error("Failed to save subscription")
      }

      setIsSubscribed(true)
      alert("Successfully subscribed to notifications!")
    } catch (error) {
      console.error("Error subscribing to notifications:", error)
      alert("Failed to subscribe to notifications")
    } finally {
      setIsLoading(false)
    }
  }

  const unsubscribeFromNotifications = async () => {
    setIsLoading(true)
    try {
      const registration = await navigator.serviceWorker.getRegistration()
      if (registration) {
        const subscription = await registration.pushManager.getSubscription()
        if (subscription) {
          await subscription.unsubscribe()

          // Remove subscription from database
          await fetch("/api/push-notifications/unsubscribe", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              userEmail: user?.email,
            }),
          })
        }
      }

      setIsSubscribed(false)
      alert("Successfully unsubscribed from notifications!")
    } catch (error) {
      console.error("Error unsubscribing from notifications:", error)
      alert("Failed to unsubscribe from notifications")
    } finally {
      setIsLoading(false)
    }
  }

  const testNotification = async () => {
    try {
      const response = await fetch("/api/push-notifications/test", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          userEmail: user?.email,
        }),
      })

      if (!response.ok) {
        throw new Error("Failed to send test notification")
      }

      alert("Test notification sent!")
    } catch (error) {
      console.error("Error sending test notification:", error)
      alert("Failed to send test notification")
    }
  }

  const handleSignOut = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
  }

  if (!user) return null

  return (
    <div className="flex items-center justify-between p-4 bg-white border-b">
      <div className="flex items-center gap-4">
        <div>
          <h2 className="text-lg font-semibold">Willkommen, {user.email}</h2>
          {isAdmin && <Badge variant="secondary">Admin</Badge>}
        </div>
      </div>

      <div className="flex items-center gap-2">
        {isAdmin && (
          <>
            <Button
              variant="outline"
              size="sm"
              onClick={isSubscribed ? unsubscribeFromNotifications : subscribeToNotifications}
              disabled={isLoading}
            >
              {isSubscribed ? <BellOff className="w-4 h-4 mr-2" /> : <Bell className="w-4 h-4 mr-2" />}
              {isSubscribed ? "Benachrichtigungen aus" : "Benachrichtigungen an"}
            </Button>

            {isSubscribed && (
              <Button variant="outline" size="sm" onClick={testNotification}>
                <TestTube className="w-4 h-4 mr-2" />
                Test
              </Button>
            )}
          </>
        )}

        <Button variant="outline" onClick={handleSignOut}>
          Abmelden
        </Button>
      </div>
    </div>
  )
}
