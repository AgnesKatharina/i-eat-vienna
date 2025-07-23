"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Input } from "@/components/ui/input"
import { Search, ArrowLeft, Calendar } from "lucide-react"
import { getEvents } from "@/lib/event-service"
import type { Event } from "@/lib/types"
import { useRouter } from "next/navigation"

export default function BestellungenPage() {
  const [events, setEvents] = useState<Event[]>([])
  const [filteredEvents, setFilteredEvents] = useState<Event[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    loadEvents()
  }, [])

  const loadEvents = async () => {
    try {
      const eventsData = await getEvents()

      // Filter events from today and yesterday
      const today = new Date()
      const yesterday = new Date(today)
      yesterday.setDate(yesterday.getDate() - 1)

      // Set time to start of day for comparison
      today.setHours(0, 0, 0, 0)
      yesterday.setHours(0, 0, 0, 0)

      const recentEvents = eventsData.filter((event) => {
        if (!event.date) return false

        const eventDate = new Date(event.date)
        eventDate.setHours(0, 0, 0, 0)

        return eventDate.getTime() === today.getTime() || eventDate.getTime() === yesterday.getTime()
      })

      setEvents(recentEvents)
      setFilteredEvents(recentEvents)
    } catch (error) {
      console.error("Error loading events:", error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    const filtered = events.filter((event) => event.name.toLowerCase().includes(searchTerm.toLowerCase()))
    setFilteredEvents(filtered)
  }, [searchTerm, events])

  const formatDate = (dateString: string | null) => {
    if (!dateString) return ""
    const date = new Date(dateString)
    return date.toLocaleDateString("de-DE", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    })
  }

  const formatDateRange = (startDate: string | null, endDate: string | null) => {
    if (!startDate) return ""

    const start = formatDate(startDate)
    if (!endDate || startDate === endDate) {
      return start
    }

    const end = formatDate(endDate)
    return `${start} - ${end}`
  }

  const handleEventSelect = (event: Event) => {
    // Navigate to create reorder for this event
    router.push(`/app/nachbestellung/${event.id}`)
  }

  const handleBackToMain = () => {
    router.push("/app")
  }

  if (loading) {
    return (
      <div className="container mx-auto p-4">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Lade Events...</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-4 max-w-4xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold mb-2">Nachbestellung auswählen</h1>
        <p className="text-gray-600">Wählen Sie ein Event aus den letzten beiden Tagen für eine Nachbestellung</p>
      </div>

      <Tabs defaultValue="erstellen" className="w-full">
        <TabsList className="grid w-full grid-cols-2 mb-6">
          <TabsTrigger value="erstellen">Nachbestellung erstellen</TabsTrigger>
          <TabsTrigger value="offen">Offene Nachbestellungen</TabsTrigger>
        </TabsList>

        <TabsContent value="erstellen" className="space-y-4">
          <div className="relative mb-6">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input
              placeholder="Event suchen..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>

          {filteredEvents.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center">
                <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">Keine Events gefunden</h3>
                <p className="text-gray-600">
                  {searchTerm
                    ? "Keine Events entsprechen Ihrer Suche."
                    : "Keine Events von heute oder gestern verfügbar."}
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {filteredEvents.map((event) => (
                <Card
                  key={event.id}
                  className="cursor-pointer hover:shadow-md transition-shadow"
                  onClick={() => handleEventSelect(event)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <h3 className="font-semibold text-lg text-gray-900 mb-1">{event.name}</h3>
                        <p className="text-gray-600">
                          {event.type} • {formatDateRange(event.date, event.end_date)}
                        </p>
                      </div>
                      <div className="ml-4">
                        <Button variant="outline" size="sm">
                          Auswählen
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          <div className="pt-6">
            <Button
              variant="outline"
              onClick={handleBackToMain}
              className="text-red-600 border-red-200 hover:bg-red-50 bg-transparent"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Zurück zum Hauptmenü
            </Button>
          </div>
        </TabsContent>

        <TabsContent value="offen" className="space-y-4">
          <Card>
            <CardContent className="p-8 text-center">
              <div className="text-gray-400 mb-4">
                <svg className="h-12 w-12 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                  />
                </svg>
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">Keine offenen Nachbestellungen</h3>
              <p className="text-gray-600">Erstellen Sie eine neue Nachbestellung aus einem bestehenden Event.</p>
            </CardContent>
          </Card>

          <div className="pt-6">
            <Button
              variant="outline"
              onClick={handleBackToMain}
              className="text-red-600 border-red-200 hover:bg-red-50 bg-transparent"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Zurück zum Hauptmenü
            </Button>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
