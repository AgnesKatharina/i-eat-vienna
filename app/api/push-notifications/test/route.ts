import { type NextRequest, NextResponse } from "next/server"
import { sendTestNotification } from "@/lib/push-notification-service"

export async function POST(request: NextRequest) {
  try {
    const { userEmail } = await request.json()

    if (!userEmail) {
      return NextResponse.json({ error: "Missing userEmail" }, { status: 400 })
    }

    // Check if user is admin
    const adminEmails = ["agnes@ieatvienna.at", "office@ieatvienna.at"]
    if (!adminEmails.includes(userEmail)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 })
    }

    const success = await sendTestNotification(userEmail)

    if (success) {
      return NextResponse.json({ success: true })
    } else {
      return NextResponse.json({ error: "Failed to send test notification" }, { status: 500 })
    }
  } catch (error) {
    console.error("Error in test notification route:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
