"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { ClipboardIcon, ShoppingCartIcon, ClipboardListIcon } from "lucide-react"
import { StylizedLogo } from "@/components/stylized-logo"

export function LandingPageAlt() {
  const router = useRouter()
  const [loading, setLoading] = useState<string | null>(null)

  const handleNavigate = (mode: string) => {
    setLoading(mode)
    router.push(`/app/${mode}`)
  }

  return (
    <div className="container mx-auto flex flex-col items-center justify-center min-h-screen py-12 px-4">
      {/* Logo */}
      <StylizedLogo size="lg" className="mb-8" />

      {/* Headings */}
      <h1 className="text-5xl font-bold mb-2 text-slate-900">I Eat Vienna</h1>
      <h2 className="text-xl text-slate-500 mb-12">Food Service Management</h2>

      {/* Welcome message */}
      <h3 className="text-3xl font-medium text-slate-800 mb-2">Willkommen bei I Eat Vienna</h3>
      <p className="text-lg text-slate-600 mb-12">Wählen Sie eine Option, um fortzufahren</p>

      {/* Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full max-w-6xl">
        {/* Packliste Card */}
        <div
          className="bg-red-50 rounded-xl p-8 flex flex-col items-center text-center cursor-pointer hover:shadow-lg transition-shadow"
          onClick={() => handleNavigate("packliste")}
        >
          <ClipboardIcon className="w-16 h-16 mb-6 text-slate-800" />
          <h3 className="text-2xl font-semibold mb-4 text-slate-800">Packliste</h3>
          <p className="text-slate-700">Erstellen und verwalten Sie Packlisten für Events</p>
        </div>

        {/* Einkaufen Card */}
        <div
          className="bg-blue-50 rounded-xl p-8 flex flex-col items-center text-center cursor-pointer hover:shadow-lg transition-shadow"
          onClick={() => handleNavigate("einkaufen")}
        >
          <ShoppingCartIcon className="w-16 h-16 mb-6 text-slate-800" />
          <h3 className="text-2xl font-semibold mb-4 text-slate-800">Einkaufen</h3>
          <p className="text-slate-700">Verwalten Sie Ihre Einkaufsliste</p>
        </div>

        {/* Bestellung Card (Added third card) */}
        <div
          className="bg-green-50 rounded-xl p-8 flex flex-col items-center text-center cursor-pointer hover:shadow-lg transition-shadow"
          onClick={() => handleNavigate("bestellung")}
        >
          <ClipboardListIcon className="w-16 h-16 mb-6 text-slate-800" />
          <h3 className="text-2xl font-semibold mb-4 text-slate-800">Bestellung</h3>
          <p className="text-slate-700">Erstellen und verwalten Sie Bestellungen</p>
        </div>
      </div>

      {/* Footer */}
      <div className="mt-16 text-center text-slate-400">
        <p>© {new Date().getFullYear()} I Eat Vienna. Alle Rechte vorbehalten.</p>
      </div>
    </div>
  )
}
