"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Image from "next/image"
import { ClipboardIcon, ShoppingCartIcon, ClipboardListIcon, DatabaseIcon } from "lucide-react"

export function LandingPage() {
  const router = useRouter()
  const [loading, setLoading] = useState<string | null>(null)

  const handleNavigate = (mode: string) => {
    setLoading(mode)
    router.push(`/app/${mode}`)
  }

  return (
    <div className="container mx-auto flex flex-col items-center justify-center min-h-screen py-12 px-4">
      {/* Logo */}
      <div className="w-32 h-32 mb-8">
        <Image src="/images/i-eat-vienna-logo.png" alt="I Eat Vienna Logo" width={128} height={128} priority />
      </div>

      {/* Headings */}
      <h1 className="text-5xl font-bold mb-2 text-slate-900">I Eat Vienna</h1>

      {/* Welcome message */}
      <h3 className="text-3xl font-medium text-slate-800 mb-2 mt-8">Willkommen bei I Eat Vienna</h3>
      <p className="text-lg text-slate-600 mb-12">Wählen Sie eine Option, um fortzufahren</p>

      {/* Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full max-w-6xl">
        {/* Packliste Card */}
        <div
          className="bg-red-100 rounded-xl p-8 flex flex-col items-center text-center cursor-pointer hover:shadow-lg transition-all hover:-translate-y-1"
          onClick={() => handleNavigate("packliste")}
        >
          <ClipboardIcon className="w-16 h-16 mb-6 text-slate-800" />
          <h3 className="text-2xl font-semibold mb-4 text-slate-800">Packliste</h3>
          <p className="text-slate-700">Packliste erstellen</p>
        </div>

        {/* Einkaufen Card */}
        <div
          className="bg-blue-100 rounded-xl p-8 flex flex-col items-center text-center cursor-pointer hover:shadow-lg transition-all hover:-translate-y-1"
          onClick={() => handleNavigate("einkaufen")}
        >
          <ShoppingCartIcon className="w-16 h-16 mb-6 text-slate-800" />
          <h3 className="text-2xl font-semibold mb-4 text-slate-800">Einkaufen</h3>
          <p className="text-slate-700">Einkaufen starten</p>
        </div>

        {/* Bestellung Card */}
        <div
          className="bg-green-100 rounded-xl p-8 flex flex-col items-center text-center cursor-pointer hover:shadow-lg transition-all hover:-translate-y-1"
          onClick={() => handleNavigate("bestellungen")}
        >
          <ClipboardListIcon className="w-16 h-16 mb-6 text-slate-800" />
          <h3 className="text-2xl font-semibold mb-4 text-slate-800">Bestellung</h3>
          <p className="text-slate-700">Nachbestellung erstellen</p>
        </div>
      </div>

      {/* Add the new Manage Products Card */}
      <div className="mt-8 w-full max-w-6xl">
        <div
          className="bg-purple-100 rounded-xl p-8 flex flex-col items-center text-center cursor-pointer hover:shadow-lg transition-all hover:-translate-y-1"
          onClick={() => handleNavigate("manage")}
        >
          <DatabaseIcon className="w-16 h-16 mb-6 text-slate-800" />
          <h3 className="text-2xl font-semibold mb-4 text-slate-800">Produkte Verwalten</h3>
          <p className="text-slate-700">Produkte, Rezepte und Verpackungen verwalten</p>
        </div>
      </div>

      {/* Footer */}
      <div className="mt-16 text-center text-slate-400">
        <p>© {new Date().getFullYear()} I Eat Vienna. Alle Rechte vorbehalten.</p>
      </div>
    </div>
  )
}
