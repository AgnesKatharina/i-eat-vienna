import { type NextRequest, NextResponse } from "next/server"
import webpush from "web-push"
import { sendNotificationToAdmins } from "@/lib/push-notification-service"

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
    const { title, message, url } = await request.json()

    if (!title || !message) {
      return NextResponse.json({ error: "Missing title or message" }, { status: 400 })
    }

    await sendNotificationToAdmins({
      title,
      message,
      url: url || "/app/nachbestellungen",
      icon: "/icon-192x192.png",
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error sending notification:", error)
    return NextResponse.json({ error: "Failed to send notification" }, { status: 500 })
  }
}
