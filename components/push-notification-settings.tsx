"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Bell, BellOff, AlertCircle } from "lucide-react"
import { toast } from "@/hooks/use-toast"
import {
  subscribeToPushNotifications,
  unsubscribeFromPushNotifications,
  getPushSubscription,
  savePushSubscription,
  removePushSubscription,
} from "@/lib/push-notification-service"
import { createClient } from "@/lib/supabase-client"

export function PushNotificationSettings() {
  const [isSubscribed, setIsSubscribed] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [isSupported, setIsSupported] = useState(false)
  const [userEmail, setUserEmail] = useState<string>("")

  useEffect(() => {
    checkNotificationSupport()
    loadUserAndSubscriptionStatus()
  }, [])

  const checkNotificationSupport = () => {
    const supported = "serviceWorker" in navigator && "PushManager" in window && "Notification" in window
    setIsSupported(supported)
  }

  const loadUserAndSubscriptionStatus = async () => {
    try {
      setIsLoading(true)

      // Get current user
      const supabase = createClient()
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user?.email) {
        setIsLoading(false)
        return
      }

      setUserEmail(user.email)

      // Check if user has push subscription
      const subscription = await getPushSubscription()
      setIsSubscribed(!!subscription)
    } catch (error) {
      console.error("Error loading subscription status:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleSubscriptionToggle = async (enabled: boolean) => {
    if (!userEmail) {
      toast({
        title: "Fehler",
        description: "Benutzer nicht gefunden",
        variant: "destructive",
      })
      return
    }

    try {
      setIsLoading(true)

      if (enabled) {
        // Request notification permission
        const permission = await Notification.requestPermission()

        if (permission !== "granted") {
          toast({
            title: "Berechtigung verweigert",
            description: "Benachrichtigungen wurden nicht erlaubt",
            variant: "destructive",
          })
          return
        }

        // Subscribe to push notifications
        const subscription = await subscribeToPushNotifications()

        if (!subscription) {
          toast({
            title: "Fehler",
            description: "Push-Benachrichtigungen konnten nicht aktiviert werden",
            variant: "destructive",
          })
          return
        }

        // Save subscription to database
        const saved = await savePushSubscription(subscription, userEmail)

        if (saved) {
          setIsSubscribed(true)
          toast({
            title: "Benachrichtigungen aktiviert",
            description: "Sie erhalten jetzt Push-Benachrichtigungen für neue Nachbestellungen",
          })
        } else {
          toast({
            title: "Fehler",
            description: "Benachrichtigungen konnten nicht gespeichert werden",
            variant: "destructive",
          })
        }
      } else {
        // Unsubscribe from push notifications
        const unsubscribed = await unsubscribeFromPushNotifications()

        if (unsubscribed) {
          // Remove from database
          await removePushSubscription(userEmail)
          setIsSubscribed(false)
          toast({
            title: "Benachrichtigungen deaktiviert",
            description: "Sie erhalten keine Push-Benachrichtigungen mehr",
          })
        } else {
          toast({
            title: "Fehler",
            description: "Benachrichtigungen konnten nicht deaktiviert werden",
            variant: "destructive",
          })
        }
      }
    } catch (error) {
      console.error("Error toggling subscription:", error)
      toast({
        title: "Fehler",
        description: "Ein unerwarteter Fehler ist aufgetreten",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const testNotification = async () => {
    if (!isSubscribed) {
      toast({
        title: "Nicht abonniert",
        description: "Aktivieren Sie zuerst die Benachrichtigungen",
        variant: "destructive",
      })
      return
    }

    try {
      const response = await fetch("/api/push-notifications/test", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          userEmail,
        }),
      })

      if (response.ok) {
        toast({
          title: "Test-Benachrichtigung gesendet",
          description: "Sie sollten in Kürze eine Test-Benachrichtigung erhalten",
        })
      } else {
        toast({
          title: "Fehler",
          description: "Test-Benachrichtigung konnte nicht gesendet werden",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("Error sending test notification:", error)
      toast({
        title: "Fehler",
        description: "Ein unerwarteter Fehler ist aufgetreten",
        variant: "destructive",
      })
    }
  }

  if (!isSupported) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BellOff className="h-5 w-5" />
            Push-Benachrichtigungen
          </CardTitle>
          <CardDescription>Push-Benachrichtigungen werden von Ihrem Browser nicht unterstützt</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2 text-amber-600">
            <AlertCircle className="h-4 w-4" />
            <span className="text-sm">Ihr Browser unterstützt keine Push-Benachrichtigungen</span>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bell className="h-5 w-5" />
          Push-Benachrichtigungen
        </CardTitle>
        <CardDescription>Erhalten Sie Benachrichtigungen für neue Nachbestellungen</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <Label htmlFor="push-notifications">Benachrichtigungen aktivieren</Label>
            <p className="text-sm text-gray-600">Erhalten Sie Push-Benachrichtigungen für neue Nachbestellungen</p>
          </div>
          <Switch
            id="push-notifications"
            checked={isSubscribed}
            onCheckedChange={handleSubscriptionToggle}
            disabled={isLoading}
          />
        </div>

        {isSubscribed && (
          <div className="pt-4 border-t">
            <Button variant="outline" onClick={testNotification} className="w-full bg-transparent">
              Test-Benachrichtigung senden
            </Button>
          </div>
        )}

        <div className="text-xs text-gray-500 space-y-1">
          <p>• Benachrichtigungen werden nur an Administratoren gesendet</p>
          <p>• Sie können Benachrichtigungen jederzeit deaktivieren</p>
          <p>• Benachrichtigungen funktionieren auch wenn die App geschlossen ist</p>
        </div>
      </CardContent>
    </Card>
  )
}
