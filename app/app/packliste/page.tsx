"use client"

import { EventSelector } from "@/components/event-selector"
import { useRouter } from "next/navigation"

export default function PacklistePage() {
  const router = useRouter()

  const handleEventSelect = (eventId: string) => {
    router.push(`/app/packliste/${eventId}`)
  }

  return (
    <div className="container mx-auto py-8">
      <EventSelector mode="packliste" onEventSelect={handleEventSelect} />
    </div>
  )
}
