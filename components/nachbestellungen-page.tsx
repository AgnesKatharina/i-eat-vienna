"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ArrowLeft, Search, Calendar, Package } from "lucide-react"
import { createClient } from "@/lib/supabase-client"
import { toast } from "@/hooks/use-toast"

interface Event {
  id: string
  name: string
  type: string
  date: string | null
  end_date: string | null
}

interface Nachbestellung {
  id: string
  event_id: string
  event_name: string
  created_at: string
  status: string
  total_items: number
}

export function NachbestellungenPage() {
  const router = useRouter()
  const [events, setEvents] = useState<Event[]>([])
  const [nachbestellungen, setNachbestellungen] = useState<Nachbestellung[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState("erstellen")

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      setLoading(true)
      const supabase = createClient()

      // Get all events
      const { data: eventsData, error: eventsError } = await supabase
        .from("events")
        .select("*")
        .order("date", { ascending: false })

      if (eventsError) {
        console.error("Error loading events:", eventsError)
        toast({
          title: "Fehler",
          description: "Events konnten nicht geladen werden",
          variant: "destructive",
        })
      } else {
        setEvents(eventsData || [])
      }

      // Load existing nachbestellungen
      // For now, we'll keep this part simple
      setNachbestellungen([])
    } catch (error) {
      console.error("Error loading data:", error)
      toast({
        title: "Fehler",
        description: "Daten konnten nicht geladen werden",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const filteredEvents = events.filter((event) => event.name.toLowerCase().includes(searchTerm.toLowerCase()))

  const filteredNachbestellungen = nachbestellungen.filter((nachbestellung) =>
    nachbestellung.event_name.toLowerCase().includes(searchTerm.toLowerCase()),
  )

  const handleEventSelect = (event: Event) => {
    // Navigate to create nachbestellung for this event
    router.push(`/app/nachbestellungen/${event.id}`)
  }

  const handleNachbestellungOpen = (nachbestellung: Nachbestellung) => {
    // Navigate to open existing nachbestellung
    router.push(`/app/nachbestellungen/edit/${nachbestellung.id}`)
  }

  const formatDate = (dateString: string | null) => {
    if (!dateString) return "Kein Datum"
    const date = new Date(dateString)
    return date.toLocaleDateString("de-DE", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    })
  }

  const formatDateRange = (startDate: string | null, endDate: string | null) => {
    if (!startDate) return "Kein Datum"
    const start = formatDate(startDate)
    if (endDate && endDate !== startDate) {
      const end = formatDate(endDate)
      return `${start} - ${end}`
    }
    return start
  }

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Lade Daten...</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <div className="border border-gray-400 rounded-lg p-6">
        {/* Header with Back Button in one row with frames */}
        <div className="flex items-center gap-4 mb-8">
          <Button
            variant="outline"
            size="icon"
            onClick={() => router.push("/app")}
            className="border-gray-300 hover:bg-gray-50"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex-1">
            <h1 className="text-2xl font-semibold text-gray-900 mb-2">Nachbestellung auswählen</h1>
            <p className="text-gray-600">
              Wählen Sie ein Event für eine Nachbestellung oder verwalten Sie bestehende Nachbestellungen
            </p>
          </div>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-6">
            <TabsTrigger value="erstellen" className="flex items-center gap-2">
              <Package className="h-4 w-4" />
              Nachbestellung erstellen
            </TabsTrigger>
            <TabsTrigger value="offen" className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Offene Nachbestellungen
              {nachbestellungen.length > 0 && (
                <Badge variant="secondary" className="ml-1">
                  {nachbestellungen.length}
                </Badge>
              )}
            </TabsTrigger>
          </TabsList>

          {/* Search */}
          <div className="relative mb-6">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input
              placeholder="Event suchen..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Nachbestellung erstellen Tab */}
          <TabsContent value="erstellen" className="space-y-4">
            {filteredEvents.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <Calendar className="h-12 w-12 text-gray-400 mb-4" />
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">Keine Events gefunden</h3>
                  <p className="text-gray-600 text-center">
                    {searchTerm
                      ? "Keine Events entsprechen Ihrer Suche."
                      : "Es wurden keine Events gefunden. Erstellen Sie zuerst ein Event in der Packliste."}
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                {filteredEvents.map((event) => (
                  <Card
                    key={event.id}
                    className="hover:shadow-md transition-shadow cursor-pointer"
                    onClick={() => handleEventSelect(event)}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <h3 className="text-lg font-semibold text-gray-900 mb-1">{event.name}</h3>
                          <p className="text-sm text-gray-600">{formatDateRange(event.date, event.end_date)}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          {/* Offene Nachbestellungen Tab */}
          <TabsContent value="offen" className="space-y-4">
            {filteredNachbestellungen.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <Package className="h-12 w-12 text-gray-400 mb-4" />
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">Keine offenen Nachbestellungen</h3>
                  <p className="text-gray-600 text-center">Sie haben derzeit keine offenen Nachbestellungen.</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                {filteredNachbestellungen.map((nachbestellung) => (
                  <Card key={nachbestellung.id} className="hover:shadow-md transition-shadow cursor-pointer">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="text-lg font-semibold text-gray-900">{nachbestellung.event_name}</h3>
                            <Badge variant={nachbestellung.status === "offen" ? "default" : "secondary"}>
                              {nachbestellung.status}
                            </Badge>
                          </div>
                          <p className="text-sm text-gray-600">
                            Erstellt am {formatDate(nachbestellung.created_at)} • {nachbestellung.total_items} Artikel
                          </p>
                        </div>
                        <Button
                          onClick={() => handleNachbestellungOpen(nachbestellung)}
                          variant="outline"
                          className="ml-4"
                        >
                          Öffnen
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
