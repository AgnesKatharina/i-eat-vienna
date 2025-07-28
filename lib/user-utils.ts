import { createClient } from "@/lib/supabase-client"

export async function getUserEmail(userId?: string): Promise<string> {
  if (!userId) {
    return "System"
  }

  try {
    const supabase = createClient()

    // Get current user to check if it's the same user
    const {
      data: { user: currentUser },
    } = await supabase.auth.getUser()

    if (currentUser && currentUser.id === userId) {
      // Return current user's email
      return currentUser.email || "Unbekannter Benutzer"
    }

    // For other users, we can't access their auth data from client
    // So we show a shortened UUID for privacy
    return `${userId.substring(0, 8)}...`
  } catch (error) {
    console.error("Error getting user email:", error)
    return "Unbekannter Benutzer"
  }
}

export function formatUserDisplay(userId?: string, email?: string): string {
  if (email) {
    return email
  }

  if (!userId) {
    return "System"
  }

  // Show shortened UUID for privacy
  return `${userId.substring(0, 8)}...`
}
