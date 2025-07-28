import { type NextRequest, NextResponse } from "next/server"
import { sendNotificationToAdmins } from "@/lib/push-notification-server"

export async function POST(request: NextRequest) {
  try {
    const { type, data } = await request.json()

    if (type === "nachbestellung_created") {
      await sendNotificationToAdmins({
        title: "Neue Nachbestellung",
        message: `Neue Nachbestellung für ${data.eventName} mit ${data.totalItems} Artikeln`,
        url: "/app/nachbestellungen",
        icon: "/icon-192x192.png",
      })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error sending notification:", error)
    return NextResponse.json({ error: "Failed to send notification" }, { status: 500 })
  }
}
