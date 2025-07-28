"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Bell, BellOff, TestTube } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { createClient } from "@/lib/supabase-client"
import {
  subscribeToPushNotifications,
  unsubscribeFromPushNotifications,
  getPushSubscription,
  savePushSubscription,
  removePushSubscription,
} from "@/lib/push-notification-service"

interface UserHeaderProps {
  user: {
    email?: string
    user_metadata?: {
      full_name?: string
      name?: string
    }
  }
}

export function UserHeader({ user }: UserHeaderProps) {
  const [isSubscribed, setIsSubscribed] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const { toast } = useToast()
  const supabase = createClient()

  const userEmail = user?.email || ""
  const userName = user?.user_metadata?.full_name || user?.user_metadata?.name || userEmail

  // Check if user is admin
  const isAdmin = userEmail === "agnes@ieatvienna.at" || userEmail === "office@ieatvienna.at"

  useEffect(() => {
    if (isAdmin) {
      checkSubscriptionStatus()
    }
  }, [isAdmin, userEmail])

  const checkSubscriptionStatus = async () => {
    try {
      const subscription = await getPushSubscription()
      setIsSubscribed(!!subscription)
    } catch (error) {
      console.error("Error checking subscription status:", error)
    }
  }

  const handleSubscribe = async () => {
    if (!isAdmin) return

    setIsLoading(true)
    try {
      const subscription = await subscribeToPushNotifications()
      if (subscription) {
        const success = await savePushSubscription(subscription, userEmail)
        if (success) {
          setIsSubscribed(true)
          toast({
            title: "Benachrichtigungen aktiviert",
            description: "Sie erhalten jetzt Push-Benachrichtigungen für neue Nachbestellungen.",
          })
        } else {
          throw new Error("Failed to save subscription")
        }
      } else {
        throw new Error("Failed to subscribe")
      }
    } catch (error) {
      console.error("Error subscribing to notifications:", error)
      toast({
        title: "Fehler",
        description: "Benachrichtigungen konnten nicht aktiviert werden.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleUnsubscribe = async () => {
    if (!isAdmin) return

    setIsLoading(true)
    try {
      const success = await unsubscribeFromPushNotifications()
      if (success) {
        await removePushSubscription(userEmail)
        setIsSubscribed(false)
        toast({
          title: "Benachrichtigungen deaktiviert",
          description: "Sie erhalten keine Push-Benachrichtigungen mehr.",
        })
      } else {
        throw new Error("Failed to unsubscribe")
      }
    } catch (error) {
      console.error("Error unsubscribing from notifications:", error)
      toast({
        title: "Fehler",
        description: "Benachrichtigungen konnten nicht deaktiviert werden.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleTestNotification = async () => {
    if (!isAdmin) return

    setIsLoading(true)
    try {
      const response = await fetch("/api/push-notifications/test", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ userEmail }),
      })

      if (response.ok) {
        toast({
          title: "Test-Benachrichtigung gesendet",
          description: "Überprüfen Sie Ihre Benachrichtigungen.",
        })
      } else {
        throw new Error("Failed to send test notification")
      }
    } catch (error) {
      console.error("Error sending test notification:", error)
      toast({
        title: "Fehler",
        description: "Test-Benachrichtigung konnte nicht gesendet werden.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleSignOut = async () => {
    try {
      await supabase.auth.signOut()
      window.location.href = "/"
    } catch (error) {
      console.error("Error signing out:", error)
      toast({
        title: "Fehler",
        description: "Abmeldung fehlgeschlagen.",
        variant: "destructive",
      })
    }
  }

  return (
    <div className="flex items-center justify-between p-4 bg-white border-b">
      <div className="flex items-center gap-4">
        <h1 className="text-xl font-semibold">I Eat Vienna</h1>
        <span className="text-sm text-gray-600">Willkommen, {userName}</span>
      </div>

      <div className="flex items-center gap-2">
        {isAdmin && (
          <>
            <Button
              variant="outline"
              size="sm"
              onClick={isSubscribed ? handleUnsubscribe : handleSubscribe}
              disabled={isLoading}
            >
              {isSubscribed ? <BellOff className="h-4 w-4" /> : <Bell className="h-4 w-4" />}
              {isSubscribed ? "Benachrichtigungen aus" : "Benachrichtigungen an"}
            </Button>

            {isSubscribed && (
              <Button variant="outline" size="sm" onClick={handleTestNotification} disabled={isLoading}>
                <TestTube className="h-4 w-4" />
                Test
              </Button>
            )}
          </>
        )}

        <Button variant="outline" size="sm" onClick={handleSignOut}>
          Abmelden
        </Button>
      </div>
    </div>
  )
}
