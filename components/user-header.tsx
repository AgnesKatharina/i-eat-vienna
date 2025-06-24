"use client"

import { User, LogOut } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useAuth } from "@/components/auth-provider"
import { createClient } from "@/lib/supabase-client"
import { useRouter } from "next/navigation"

export function UserHeader() {
  const { user } = useAuth()
  const router = useRouter()
  const supabase = createClient()

  if (!user) return null

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    router.push("/")
  }

  return (
    <div className="fixed top-4 right-4 z-50">
      <div className="bg-white/80 backdrop-blur-md rounded-lg shadow-lg border border-white/20 p-3 flex items-center gap-3">
        <div className="flex items-center gap-2 text-sm text-gray-700">
          <User className="h-4 w-4" />
          <span className="font-medium">{user.email}</span>
        </div>
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
