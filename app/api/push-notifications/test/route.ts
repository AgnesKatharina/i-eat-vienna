import { type NextRequest, NextResponse } from "next/server"
import { sendTestNotification } from "@/lib/push-notification-service"

export async function POST(request: NextRequest) {
  try {
    const { userEmail } = await request.json()

    if (!userEmail) {
      return NextResponse.json({ error: "Missing userEmail" }, { status: 400 })
    }

    // Check if user is admin
    if (userEmail !== "agnes@ieatvienna.at" && userEmail !== "office@ieatvienna.at") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 })
    }

    await sendTestNotification(userEmail)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error sending test notification:", error)
    return NextResponse.json({ error: "Failed to send test notification" }, { status: 500 })
  }
}
