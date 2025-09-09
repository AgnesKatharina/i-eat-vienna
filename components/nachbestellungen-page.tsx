"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Calendar as CalendarComponent } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { cn } from "@/lib/utils"
import { format, isSameDay } from "date-fns"
import { de } from "date-fns/locale"
import {
  ArrowLeft,
  Search,
  Calendar,
  Package,
  ChevronRight,
  Clock,
  CheckCircle,
  XCircle,
  MoreVertical,
  Eye,
  Trash2,
  CalendarIcon,
  X,
} from "lucide-react"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { createClient } from "@/lib/supabase-client"
import {
  getNachbestellungen,
  updateNachbestellungStatus,
  deleteNachbestellung,
  type Nachbestellung,
} from "@/lib/nachbestellung-service"
import { toast } from "@/hooks/use-toast"

interface Event {
  id: string
  name: string
  type: string
  date: string | null
  end_date: string | null
}

const getStatusColor = (status: Nachbestellung["status"]) => {
  switch (status) {
    case "offen":
      return "bg-blue-100 text-blue-800 border-blue-200"
    case "in_bearbeitung":
      return "bg-yellow-100 text-yellow-800 border-yellow-200"
    case "abgeschlossen":
      return "bg-green-100 text-green-800 border-green-200"
    case "storniert":
      return "bg-red-100 text-red-800 border-red-200"
    default:
      return "bg-gray-100 text-gray-800 border-gray-200"
  }
}

const getStatusIcon = (status: Nachbestellung["status"]) => {
  switch (status) {
    case "offen":
      return <Clock className="h-3 w-3" />
    case "in_bearbeitung":
      return <Package className="h-3 w-3" />
    case "abgeschlossen":
      return <CheckCircle className="h-3 w-3" />
    case "storniert":
      return <XCircle className="h-3 w-3" />
    default:
      return <Clock className="h-3 w-3" />
  }
}

const getStatusText = (status: Nachbestellung["status"]) => {
  switch (status) {
    case "offen":
      return "Offen"
    case "in_bearbeitung":
      return "In Bearbeitung"
    case "abgeschlossen":
      return "Abgeschlossen"
    case "storniert":
      return "Storniert"
    default:
      return status
  }
}

export function NachbestellungenPage() {
  const router = useRouter()
  const [events, setEvents] = useState<Event[]>([])
  const [nachbestellungen, setNachbestellungen] = useState<Nachbestellung[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date())
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState("erstellen")
  const [calendarOpen, setCalendarOpen] = useState(false)

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      setLoading(true)
      const supabase = createClient()

      // Get current user
      const {
        data: { user },
      } = await supabase.auth.getUser()

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

      // Load nachbestellungen
      const nachbestellungenData = await getNachbestellungen(user?.id)
      setNachbestellungen(nachbestellungenData)
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

  const filteredEvents = events.filter((event) => {
    // Name filter
    const nameMatch = event.name.toLowerCase().includes(searchTerm.toLowerCase())

    // Date filter - if no date selected, show all events
    if (!selectedDate) return nameMatch

    // If event has no date, don't show it when date filter is active
    if (!event.date) return false

    const eventStartDate = new Date(event.date + "T00:00:00")
    const eventEndDate = event.end_date ? new Date(event.end_date + "T00:00:00") : eventStartDate

    // Check if selected date falls within the event's date range (inclusive)
    const selectedDateOnly = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), selectedDate.getDate())
    const startDateOnly = new Date(eventStartDate.getFullYear(), eventStartDate.getMonth(), eventStartDate.getDate())
    const endDateOnly = new Date(eventEndDate.getFullYear(), eventEndDate.getMonth(), eventEndDate.getDate())

    const dateMatch = selectedDateOnly >= startDateOnly && selectedDateOnly <= endDateOnly

    return nameMatch && dateMatch
  })

  const filteredNachbestellungen = nachbestellungen.filter((nachbestellung) =>
    nachbestellung.event_name.toLowerCase().includes(searchTerm.toLowerCase()),
  )

  const openNachbestellungen = filteredNachbestellungen.filter((n) => n.status !== "abgeschlossen")
  const completedNachbestellungen = filteredNachbestellungen.filter((n) => n.status === "abgeschlossen")

  const handleEventSelect = (event: Event) => {
    router.push(`/app/nachbestellungen/${event.id}`)
  }

  const handleNachbestellungView = (nachbestellung: Nachbestellung) => {
    router.push(`/app/nachbestellungen/view/${nachbestellung.id}`)
  }

  const handleStatusChange = async (nachbestellungId: number, newStatus: Nachbestellung["status"]) => {
    try {
      const supabase = createClient()
      const {
        data: { user },
      } = await supabase.auth.getUser()

      const success = await updateNachbestellungStatus(nachbestellungId, newStatus, user?.id)

      if (success) {
        // Update local state
        setNachbestellungen((prev) =>
          prev.map((n) =>
            n.id === nachbestellungId ? { ...n, status: newStatus, updated_at: new Date().toISOString() } : n,
          ),
        )

        toast({
          title: "Status aktualisiert",
          description: `Nachbestellung wurde als "${getStatusText(newStatus)}" markiert`,
        })
      } else {
        toast({
          title: "Fehler",
          description: "Status konnte nicht aktualisiert werden",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("Error updating status:", error)
      toast({
        title: "Fehler",
        description: "Ein unerwarteter Fehler ist aufgetreten",
        variant: "destructive",
      })
    }
  }

  const handleDelete = async (nachbestellungId: number) => {
    if (!confirm("Sind Sie sicher, dass Sie diese Nachbestellung löschen möchten?")) {
      return
    }

    try {
      const success = await deleteNachbestellung(nachbestellungId)

      if (success) {
        setNachbestellungen((prev) => prev.filter((n) => n.id !== nachbestellungId))
        toast({
          title: "Nachbestellung gelöscht",
          description: "Die Nachbestellung wurde erfolgreich gelöscht",
        })
      } else {
        toast({
          title: "Fehler",
          description: "Nachbestellung konnte nicht gelöscht werden",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("Error deleting nachbestellung:", error)
      toast({
        title: "Fehler",
        description: "Ein unerwarteter Fehler ist aufgetreten",
        variant: "destructive",
      })
    }
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

  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString("de-DE", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
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

  const setToday = () => setSelectedDate(new Date())
  const setYesterday = () => {
    const yesterday = new Date()
    yesterday.setDate(yesterday.getDate() - 1)
    setSelectedDate(yesterday)
  }
  const clearDateFilter = () => setSelectedDate(undefined)

  const handleDateSelect = (date: Date | undefined) => {
    setSelectedDate(date)
    setCalendarOpen(false) // Auto-close calendar after selection
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
    <div className="container mx-auto p-4 sm:p-6 max-w-4xl">
      <div className="border border-gray-400 rounded-lg p-4 sm:p-6">
        {/* Header */}
        <div className="flex items-center gap-4 mb-6 sm:mb-8">
          <Button
            variant="outline"
            size="icon"
            onClick={() => router.push("/app")}
            className="border-gray-300 hover:bg-gray-50 flex-shrink-0"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex-1 min-w-0">
            <h1 className="text-xl sm:text-2xl font-semibold text-gray-900 mb-2">Nachbestellung auswählen</h1>
            <p className="text-sm sm:text-base text-gray-600">
              Wählen Sie ein Event für eine Nachbestellung oder verwalten Sie bestehende Nachbestellungen
            </p>
          </div>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-3 mb-6">
            <TabsTrigger value="erstellen" className="flex items-center gap-1 text-xs sm:text-sm">
              <Package className="h-4 w-4" />
              <span className="hidden sm:inline">Nachbestellung erstellen</span>
              <span className="sm:hidden">Erstellen</span>
            </TabsTrigger>
            <TabsTrigger value="offen" className="flex items-center gap-1 text-xs sm:text-sm">
              <Calendar className="h-4 w-4" />
              <span className="hidden sm:inline">Offene Nachbestellungen</span>
              <span className="sm:hidden">Offen</span>
              {openNachbestellungen.length > 0 && (
                <Badge variant="secondary" className="ml-1 text-xs">
                  {openNachbestellungen.length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="abgeschlossen" className="flex items-center gap-1 text-xs sm:text-sm">
              <CheckCircle className="h-4 w-4" />
              <span className="hidden sm:inline">Abgeschlossene Nachbestellungen</span>
              <span className="sm:hidden">Abgeschlossen</span>
              {completedNachbestellungen.length > 0 && (
                <Badge variant="secondary" className="ml-1 text-xs">
                  {completedNachbestellungen.length}
                </Badge>
              )}
            </TabsTrigger>
          </TabsList>

          <div className="space-y-4 mb-6">
            {/* Search Bar */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                placeholder="Event suchen..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>

            {/* Date Filter Section - only show in "erstellen" tab */}
            {activeTab === "erstellen" && (
              <div className="space-y-3">
                {/* Quick Filter Buttons */}
                <div className="flex flex-wrap gap-2">
                  <Button
                    variant={selectedDate && isSameDay(selectedDate, new Date()) ? "default" : "outline"}
                    size="sm"
                    onClick={setToday}
                    className="flex items-center gap-1"
                  >
                    <Calendar className="h-4 w-4" />
                    Heute
                  </Button>
                  <Button
                    variant={
                      selectedDate && isSameDay(selectedDate, new Date(Date.now() - 24 * 60 * 60 * 1000))
                        ? "default"
                        : "outline"
                    }
                    size="sm"
                    onClick={setYesterday}
                    className="flex items-center gap-1"
                  >
                    <Calendar className="h-4 w-4" />
                    Gestern
                  </Button>
                  <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        size="sm"
                        className={cn("flex items-center gap-1", selectedDate && "border-blue-500")}
                      >
                        <CalendarIcon className="h-4 w-4" />
                        {selectedDate ? format(selectedDate, "dd.MM.yyyy", { locale: de }) : "Datum wählen"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <CalendarComponent
                        mode="single"
                        selected={selectedDate}
                        onSelect={handleDateSelect}
                        initialFocus
                        locale={de}
                      />
                    </PopoverContent>
                  </Popover>
                  {selectedDate && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={clearDateFilter}
                      className="flex items-center gap-1 text-gray-500 hover:text-gray-700"
                    >
                      <X className="h-4 w-4" />
                      Filter zurücksetzen
                    </Button>
                  )}
                </div>

                {/* Active Filter Display */}
                {selectedDate && (
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary" className="flex items-center gap-1">
                      <CalendarIcon className="h-3 w-3" />
                      Events am {format(selectedDate, "dd.MM.yyyy", { locale: de })}
                      <X className="h-3 w-3 cursor-pointer hover:text-red-500" onClick={clearDateFilter} />
                    </Badge>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Nachbestellung erstellen Tab */}
          <TabsContent value="erstellen" className="space-y-4">
            {filteredEvents.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <Calendar className="h-12 w-12 text-gray-400 mb-4" />
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">
                    {selectedDate ? "Keine Events an diesem Tag" : "Keine Events gefunden"}
                  </h3>
                  <p className="text-gray-600 text-center">
                    {selectedDate
                      ? `Am ${format(selectedDate, "dd.MM.yyyy", { locale: de })} finden keine Events statt.`
                      : searchTerm
                        ? "Keine Events entsprechen Ihrer Suche."
                        : "Es wurden keine Events gefunden. Erstellen Sie zuerst ein Event in der Packliste."}
                  </p>
                  {selectedDate && (
                    <Button variant="outline" onClick={clearDateFilter} className="mt-4 bg-transparent">
                      Alle Events anzeigen
                    </Button>
                  )}
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                {filteredEvents.map((event) => (
                  <Card
                    key={event.id}
                    className="hover:bg-gray-100 transition-colors duration-200 cursor-pointer"
                    onClick={() => handleEventSelect(event)}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex-1 min-w-0">
                          <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-1 truncate group-hover:text-blue-700 transition-colors">
                            {event.name}
                          </h3>
                          <p className="text-sm text-gray-600">{formatDateRange(event.date, event.end_date)}</p>
                        </div>
                        <ChevronRight className="h-5 w-5 text-gray-400 flex-shrink-0 ml-2 transition-all duration-200 group-hover:text-blue-500 group-hover:translate-x-1" />
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          {/* Offene Nachbestellungen Tab */}
          <TabsContent value="offen" className="space-y-4">
            {openNachbestellungen.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <Package className="h-12 w-12 text-gray-400 mb-4" />
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">Keine offenen Nachbestellungen</h3>
                  <p className="text-gray-600 text-center">
                    {searchTerm
                      ? "Keine offenen Nachbestellungen entsprechen Ihrer Suche."
                      : "Sie haben derzeit keine offenen Nachbestellungen."}
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                {openNachbestellungen.map((nachbestellung) => (
                  <Card key={nachbestellung.id} className="hover:bg-gray-100 transition-colors duration-200">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-2">
                            <h3 className="text-base sm:text-lg font-semibold text-gray-900 truncate">
                              {nachbestellung.event_name}
                            </h3>
                            <Badge
                              variant="outline"
                              className={`text-xs flex items-center gap-1 ${getStatusColor(nachbestellung.status)}`}
                            >
                              {getStatusIcon(nachbestellung.status)}
                              {getStatusText(nachbestellung.status)}
                            </Badge>
                          </div>

                          <div className="space-y-1 text-sm text-gray-600">
                            <p>Erstellt am {formatDateTime(nachbestellung.created_at)}</p>
                            <p>
                              {nachbestellung.total_items} Artikel ({nachbestellung.total_products} Produkte,{" "}
                              {nachbestellung.total_ingredients} Zutaten)
                            </p>
                            {nachbestellung.notes && (
                              <p className="text-xs text-gray-500 truncate">Notiz: {nachbestellung.notes}</p>
                            )}
                          </div>
                        </div>

                        {/* Actions */}
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 flex-shrink-0 hover:bg-yellow-100 hover:text-yellow-700 transition-colors"
                            >
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-48">
                            <DropdownMenuItem onClick={() => handleNachbestellungView(nachbestellung)}>
                              <Eye className="h-4 w-4 mr-2" />
                              Bearbeiten
                            </DropdownMenuItem>

                            {nachbestellung.status === "offen" && (
                              <DropdownMenuItem onClick={() => handleStatusChange(nachbestellung.id, "in_bearbeitung")}>
                                <Package className="h-4 w-4 mr-2" />
                                In Bearbeitung
                              </DropdownMenuItem>
                            )}

                            {(nachbestellung.status === "offen" || nachbestellung.status === "in_bearbeitung") && (
                              <DropdownMenuItem onClick={() => handleStatusChange(nachbestellung.id, "abgeschlossen")}>
                                <CheckCircle className="h-4 w-4 mr-2" />
                                Abschließen
                              </DropdownMenuItem>
                            )}

                            {nachbestellung.status !== "abgeschlossen" && (
                              <DropdownMenuItem
                                onClick={() => handleDelete(nachbestellung.id)}
                                className="text-red-600 focus:text-red-600"
                              >
                                <Trash2 className="h-4 w-4 mr-2" />
                                Löschen
                              </DropdownMenuItem>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          {/* Abgeschlossene Nachbestellungen Tab */}
          <TabsContent value="abgeschlossen" className="space-y-4">
            {completedNachbestellungen.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <CheckCircle className="h-12 w-12 text-gray-400 mb-4" />
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">Keine abgeschlossenen Nachbestellungen</h3>
                  <p className="text-gray-600 text-center">
                    {searchTerm
                      ? "Keine abgeschlossenen Nachbestellungen entsprechen Ihrer Suche."
                      : "Sie haben derzeit keine abgeschlossenen Nachbestellungen."}
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                {completedNachbestellungen.map((nachbestellung) => (
                  <Card key={nachbestellung.id} className="hover:bg-gray-100 transition-colors duration-200">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-2">
                            <h3 className="text-base sm:text-lg font-semibold text-gray-900 truncate">
                              {nachbestellung.event_name}
                            </h3>
                            <Badge
                              variant="outline"
                              className={`text-xs flex items-center gap-1 ${getStatusColor(nachbestellung.status)}`}
                            >
                              {getStatusIcon(nachbestellung.status)}
                              {getStatusText(nachbestellung.status)}
                            </Badge>
                          </div>

                          <div className="space-y-1 text-sm text-gray-600">
                            <p>Erstellt am {formatDateTime(nachbestellung.created_at)}</p>
                            {nachbestellung.completed_at && (
                              <p>Abgeschlossen am {formatDateTime(nachbestellung.completed_at)}</p>
                            )}
                            <p>
                              {nachbestellung.total_items} Artikel ({nachbestellung.total_products} Produkte,{" "}
                              {nachbestellung.total_ingredients} Zutaten)
                            </p>
                            {nachbestellung.notes && (
                              <p className="text-xs text-gray-500 truncate">Notiz: {nachbestellung.notes}</p>
                            )}
                          </div>
                        </div>

                        {/* Actions for completed orders */}
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 flex-shrink-0 hover:bg-green-100 hover:text-green-700 transition-colors"
                            >
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-48">
                            <DropdownMenuItem onClick={() => handleNachbestellungView(nachbestellung)}>
                              <Eye className="h-4 w-4 mr-2" />
                              Bearbeiten
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => handleDelete(nachbestellung.id)}
                              className="text-red-600 focus:text-red-600"
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Löschen
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
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
