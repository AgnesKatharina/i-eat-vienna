"use client"

import { User, LogOut, Bell, BellOff } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { useAuth } from "@/components/auth-provider"
import { createClient } from "@/lib/supabase-client"
import { useRouter } from "next/navigation"
import { useState, useEffect } from "react"

export function UserHeader() {
  const { user } = useAuth()
  const router = useRouter()
  const supabase = createClient()
  const [notificationsEnabled, setNotificationsEnabled] = useState(false)
  const [isSubscribing, setIsSubscribing] = useState(false)

  // Check if user is admin
  const isAdmin = user?.email === "agnes@ieatvienna.at" || user?.email === "office@ieatvienna.at"

  useEffect(() => {
    if (isAdmin && "serviceWorker" in navigator && "PushManager" in window) {
      checkNotificationStatus()
    }
  }, [isAdmin])

  const checkNotificationStatus = async () => {
    try {
      const registration = await navigator.serviceWorker.getRegistration()
      if (registration) {
        const subscription = await registration.pushManager.getSubscription()
        setNotificationsEnabled(!!subscription)
      }
    } catch (error) {
      console.error("Error checking notification status:", error)
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

  const toggleNotifications = async () => {
    if (isSubscribing) return
    setIsSubscribing(true)

    try {
      if (notificationsEnabled) {
        // Unsubscribe
        const registration = await navigator.serviceWorker.getRegistration()
        if (registration) {
          const subscription = await registration.pushManager.getSubscription()
          if (subscription) {
            await subscription.unsubscribe()

            // Remove from database
            await fetch("/api/push-notifications/unsubscribe", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ endpoint: subscription.endpoint }),
            })

            setNotificationsEnabled(false)
          }
        }
      } else {
        // Subscribe
        const permission = await Notification.requestPermission()
        if (permission === "granted") {
          const registration = await navigator.serviceWorker.getRegistration()
          if (registration) {
            const subscription = await registration.pushManager.subscribe({
              userVisibleOnly: true,
              applicationServerKey: base64UrlToUint8Array(process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!),
            })

            // Save to database
            const response = await fetch("/api/push-notifications/subscribe", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                subscription: subscription.toJSON(),
                userEmail: user?.email,
              }),
            })

            if (response.ok) {
              setNotificationsEnabled(true)
            }
          }
        }
      }
    } catch (error) {
      console.error("Error toggling notifications:", error)
    } finally {
      setIsSubscribing(false)
    }
  }

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    router.push("/")
  }

  if (!user) return null

  return (
    <div className="fixed top-4 right-4 z-50">
      <div className="bg-white/80 backdrop-blur-md rounded-lg shadow-lg border border-white/20 p-3 flex items-center gap-3">
        <div className="flex items-center gap-2 text-sm text-gray-700">
          <User className="h-4 w-4" />
          <span className="font-medium">{user.email}</span>
        </div>

        {isAdmin && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0 hover:bg-blue-50 hover:text-blue-600">
                {notificationsEnabled ? <Bell className="h-4 w-4" /> : <BellOff className="h-4 w-4" />}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Push Notifications</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={toggleNotifications} disabled={isSubscribing}>
                {isSubscribing ? "Loading..." : notificationsEnabled ? "Disable Notifications" : "Enable Notifications"}
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={async () => {
                  await fetch("/api/push-notifications/test", { method: "POST" })
                }}
              >
                Test Notification
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}

        <Button
          onClick={handleSignOut}
          variant="ghost"
          size="sm"
          className="h-8 w-8 p-0 hover:bg-red-50 hover:text-red-600"
        >
          <LogOut className="h-4 w-4" />
        </Button>
      </div>
    </div>
  )
}
