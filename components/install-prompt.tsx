"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Download, X } from "lucide-react"

export function InstallPrompt() {
  const [showPrompt, setShowPrompt] = useState(false)
  const [installEvent, setInstallEvent] = useState<any>(null)
  const [isIOS, setIsIOS] = useState(false)
  const [isStandalone, setIsStandalone] = useState(false)
  const [dismissed, setDismissed] = useState(false)

  useEffect(() => {
    // Check if already installed
    setIsStandalone(window.matchMedia("(display-mode: standalone)").matches)

    // Check if iOS
    setIsIOS(/iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream)

    // Listen for beforeinstallprompt event
    const handleBeforeInstallPrompt = (e: Event) => {
      // Prevent Chrome 67 and earlier from automatically showing the prompt
      e.preventDefault()
      // Stash the event so it can be triggered later
      setInstallEvent(e)
      // Show the prompt if not already installed and not dismissed
      if (!isStandalone && !dismissed) {
        setShowPrompt(true)
      }
    }

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt)

    // Check if already dismissed
    const hasBeenDismissed = localStorage.getItem("installPromptDismissed")
    if (hasBeenDismissed) {
      setDismissed(true)
    }

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt)
    }
  }, [dismissed, isStandalone])

  const handleInstall = () => {
    if (!installEvent) return

    // Show the install prompt
    installEvent.prompt()

    // Wait for the user to respond to the prompt
    installEvent.userChoice.then((choiceResult: { outcome: string }) => {
      if (choiceResult.outcome === "accepted") {
        console.log("User accepted the install prompt")
      } else {
        console.log("User dismissed the install prompt")
      }
      setShowPrompt(false)
      setInstallEvent(null)
    })
  }

  const handleDismiss = () => {
    setShowPrompt(false)
    setDismissed(true)
    localStorage.setItem("installPromptDismissed", "true")
  }

  if (!showPrompt || isStandalone || dismissed) return null

  return (
    <div className="fixed bottom-4 left-4 right-4 bg-white dark:bg-gray-800 p-4 rounded-lg shadow-lg z-50 border border-gray-200 dark:border-gray-700">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <h3 className="font-bold text-lg mb-1">I Eat Vienna App installieren</h3>
          {isIOS ? (
            <p className="text-sm text-gray-600 dark:text-gray-300">
              Tippen Sie auf{" "}
              <span className="inline-block">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"></path>
                  <polyline points="16 6 12 2 8 6"></polyline>
                  <line x1="12" y1="2" x2="12" y2="15"></line>
                </svg>
              </span>{" "}
              und dann auf "Zum Home-Bildschirm"
            </p>
          ) : (
            <p className="text-sm text-gray-600 dark:text-gray-300">
              Installieren Sie diese App auf Ihrem Gerät für schnelleren Zugriff
            </p>
          )}
        </div>

        <div className="flex items-center gap-2">
          {!isIOS && (
            <Button onClick={handleInstall} className="flex items-center gap-2">
              <Download className="h-4 w-4" />
              Installieren
            </Button>
          )}
          <Button variant="ghost" size="icon" onClick={handleDismiss}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  )
}
