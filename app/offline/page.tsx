"use client"

import { Button } from "@/components/ui/button"
import { RefreshCw } from "lucide-react"
import Link from "next/link"

export default function OfflinePage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8 text-center">
        <h1 className="text-2xl font-bold mb-4">Sie sind offline</h1>
        <p className="mb-6 text-gray-600">
          Es scheint, dass Sie keine Internetverbindung haben. Einige Funktionen sind möglicherweise eingeschränkt.
        </p>

        <div className="space-y-4">
          <Button className="w-full" onClick={() => window.location.reload()}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Erneut versuchen
          </Button>

          <Link href="/" passHref>
            <Button variant="outline" className="w-full">
              Zurück zur Startseite
            </Button>
          </Link>
        </div>
      </div>
    </div>
  )
}
