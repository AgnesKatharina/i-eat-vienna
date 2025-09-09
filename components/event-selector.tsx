"use client"

import type React from "react"

import { useState, useEffect, useMemo } from "react"
import { useRouter } from "next/navigation"
import { format, isAfter, isBefore, isSameDay, startOfDay } from "date-fns"
import { de } from "date-fns/locale"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { useToast } from "@/components/ui/use-toast"

import { CalendarIcon, PlusCircle, Pencil, Trash2, Search, X, Copy } from "lucide-react"
import { cn } from "@/lib/utils"

import {
  getEvents,
  createEvent,
  updateEvent,
  deleteEvent,
  getEventProducts,
  saveEventProducts,
  type Event,
} from "@/lib/event-service"

const EVENT_TYPES = ["Catering", "Verkauf", "Lieferung"]

interface EventSelectorProps {
  onEventSelect: (eventId: string) => void
  mode: "packliste" | "nachbestellung"
}

export function EventSelector({ onEventSelect, mode }: EventSelectorProps) {
  const [events, setEvents] = useState<Event[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState("new")
  const [date, setDate] = useState<Date | undefined>(new Date())
  const [endDate, setEndDate] = useState<Date | undefined>(undefined)
  const [newEvent, setNewEvent] = useState({
    name: "",
    type: "Catering",
    ft: [] as string[],
    ka: [] as string[],
  })
  const [editingEvent, setEditingEvent] = useState<Event | null>(null)
  const [editDate, setEditDate] = useState<Date | undefined>(undefined)
  const [editEndDate, setEditEndDate] = useState<Date | undefined>(undefined)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [eventToDelete, setEventToDelete] = useState<Event | null>(null)
  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false)
  const [isEndDatePickerOpen, setIsEndDatePickerOpen] = useState(false)

  // Filtering states
  const [nameFilter, setNameFilter] = useState("")
  const [dateFilter, setDateFilter] = useState<Date | undefined>(undefined)

  const router = useRouter()
  const { toast } = useToast()

  useEffect(() => {
    loadEvents()
  }, [])

  async function loadEvents() {
    setLoading(true)
    const eventsData = await getEvents()
    setEvents(eventsData)
    setLoading(false)
  }

  // Filter and sort events
  const { upcomingEvents, pastEvents } = useMemo(() => {
    const now = startOfDay(new Date())

    // Filter events based on name and date filters
    const filteredEvents = events.filter((event) => {
      // Name filter
      const nameMatch =
        !nameFilter ||
        event.name.toLowerCase().includes(nameFilter.toLowerCase()) ||
        event.type.toLowerCase().includes(nameFilter.toLowerCase())

      // Date filter
      const dateMatch = !dateFilter || (event.date && isSameDay(new Date(event.date + "T00:00:00"), dateFilter))

      return nameMatch && dateMatch
    })

    // Split into upcoming and past events
    const upcoming = filteredEvents
      .filter((event) => {
        if (!event.date) return true // Events without dates go to upcoming
        const eventDate = new Date(event.date + "T00:00:00") // Parse as local date
        return isAfter(eventDate, now) || isSameDay(eventDate, now)
      })
      .sort((a, b) =>
        a.date && b.date ? new Date(a.date + "T00:00:00").getTime() - new Date(b.date + "T00:00:00").getTime() : 0,
      )

    const past = filteredEvents
      .filter((event) => {
        if (!event.date) return false
        const eventDate = new Date(event.date + "T00:00:00") // Parse as local date
        return isBefore(eventDate, now) && !isSameDay(eventDate, now)
      })
      .sort((a, b) =>
        a.date && b.date ? new Date(b.date + "T00:00:00").getTime() - new Date(a.date + "T00:00:00").getTime() : 0,
      )

    // Add events without dates to upcoming
    const withoutDate = filteredEvents.filter((event) => !event.date)

    return {
      upcomingEvents: [...upcoming, ...withoutDate],
      pastEvents: past,
    }
  }, [events, nameFilter, dateFilter])

  const handleSelectEvent = (eventId: number) => {
    router.push(`/app/packliste/${eventId}`)
  }

  const handleCreateEvent = async () => {
    if (!newEvent.name) {
      toast({
        title: "Fehler",
        description: "Bitte geben Sie einen Event-Namen ein",
        variant: "destructive",
      })
      return
    }

    try {
      const event = await createEvent({
        name: newEvent.name,
        type: newEvent.type,
        date: date ? format(date, "yyyy-MM-dd") : null,
        end_date: endDate ? format(endDate, "yyyy-MM-dd") : null,
        ft: newEvent.ft.length > 0 ? newEvent.ft.join(" & ") : null,
        ka: newEvent.ka.length > 0 ? newEvent.ka.join(" & ") : null,
      })

      if (event) {
        setEvents([event, ...events])
        setNewEvent({
          name: "",
          type: "Catering",
          ft: [],
          ka: [],
        })
        setDate(new Date())
        setEndDate(undefined)
        onEventSelect(event.id.toString())
      } else {
        throw new Error("Failed to create event")
      }
    } catch (error) {
      console.error("Error creating event:", error)
      toast({
        title: "Fehler beim Erstellen",
        description:
          error instanceof Error ? error.message : "Event konnte nicht erstellt werden. Bitte versuchen Sie es erneut.",
        variant: "destructive",
      })
    }
  }

  const handleEditClick = (e: React.MouseEvent, event: Event) => {
    e.stopPropagation()
    setEditingEvent(event)
    setEditDate(event.date ? new Date(event.date) : undefined)
    setEditEndDate(event.end_date ? new Date(event.end_date) : undefined)
    setIsEditDialogOpen(true)
  }

  const handleDeleteClick = (e: React.MouseEvent, event: Event) => {
    e.stopPropagation()
    setEventToDelete(event)
    setIsDeleteDialogOpen(true)
  }

  const handleUpdateEvent = async () => {
    if (!editingEvent) return

    const updated = await updateEvent(editingEvent.id.toString(), {
      name: editingEvent.name,
      type: editingEvent.type,
      date: editDate ? format(editDate, "yyyy-MM-dd") : null,
      end_date: editEndDate ? format(editEndDate, "yyyy-MM-dd") : null,
      ft: editingEvent.ft || null,
      ka: editingEvent.ka || null,
    })

    if (updated) {
      setEvents(events.map((e) => (e.id === updated.id ? updated : e)))
      setIsEditDialogOpen(false)
      setEditingEvent(null)
      toast({
        title: "Erfolg",
        description: "Event wurde aktualisiert",
      })
    } else {
      toast({
        title: "Fehler",
        description: "Event konnte nicht aktualisiert werden",
        variant: "destructive",
      })
    }
  }

  const handleDeleteEvent = async () => {
    if (!eventToDelete) return

    const success = await deleteEvent(eventToDelete.id.toString())
    if (success) {
      setEvents(events.filter((e) => e.id !== eventToDelete.id))
      setIsDeleteDialogOpen(false)
      setEventToDelete(null)
      toast({
        title: "Erfolg",
        description: "Event wurde gelöscht",
      })
    } else {
      toast({
        title: "Fehler",
        description: "Event konnte nicht gelöscht werden",
        variant: "destructive",
      })
    }
  }

  const handleCopyEvent = async (e: React.MouseEvent, originalEvent: Event) => {
    e.stopPropagation()

    try {
      // Get all products from the original event
      const originalProducts = await getEventProducts(originalEvent.id.toString())

      // Generate new name with "Kopie X"
      const baseName = originalEvent.name
      const existingCopies = events.filter((event) => event.name.startsWith(baseName + " Kopie"))
      const copyNumber = existingCopies.length + 1
      const newName = `${baseName} Kopie ${copyNumber}`

      // Create the new event with copied data
      const newEvent = await createEvent({
        name: newName,
        type: originalEvent.type,
        date: originalEvent.date,
        ft: originalEvent.ft,
        ka: originalEvent.ka,
      })

      if (newEvent && originalProducts.length > 0) {
        // Copy all products to the new event
        await saveEventProducts(newEvent.id.toString(), originalProducts)
      }

      if (newEvent) {
        setEvents([newEvent, ...events])
        toast({
          title: "Erfolg",
          description: `Event "${newName}" wurde erfolgreich kopiert`,
        })
      }
    } catch (error) {
      toast({
        title: "Fehler",
        description: "Event konnte nicht kopiert werden",
        variant: "destructive",
      })
    }
  }

  const clearFilters = () => {
    setNameFilter("")
    setDateFilter(undefined)
  }

  const renderEventList = (eventList: Event[]) => {
    if (loading) {
      return <div className="flex justify-center py-8">Lade Events...</div>
    }

    if (eventList.length === 0) {
      return (
        <div className="text-center py-8">
          <p className="mb-4">Keine Events gefunden</p>
          <Button onClick={() => setActiveTab("new")}>
            <PlusCircle className="mr-2 h-4 w-4" />
            Neues Event erstellen
          </Button>
        </div>
      )
    }

    return (
      <div className="space-y-4 mt-4">
        {eventList.map((event) => {
          const isPrintReady = event.print || false
          const isFinished = event.finished || false

          // Determine background color based on status
          let backgroundClass = "hover:bg-muted"
          if (isFinished) {
            backgroundClass = "bg-green-100 border-green-300 hover:bg-green-300"
          } else if (isPrintReady) {
            backgroundClass = "bg-yellow-100 border-yellow-300 hover:bg-yellow-200"
          }

          return (
            <div
              key={event.id}
              className={`flex items-center justify-between p-4 border rounded-lg cursor-pointer ${backgroundClass}`}
              onClick={() => handleSelectEvent(event.id)}
            >
              <div>
                <h3 className="font-medium">{event.name}</h3>
                <div className="text-sm text-muted-foreground">
                  {event.type} •{" "}
                  {event.date
                    ? event.end_date && event.date !== event.end_date
                      ? `${format(new Date(event.date), "dd.MM.yyyy", { locale: de })} - ${format(new Date(event.end_date), "dd.MM.yyyy", { locale: de })}`
                      : format(new Date(event.date), "dd.MM.yyyy", { locale: de })
                    : "Kein Datum"}
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <div className="text-sm">
                  {isFinished && (
                    <div className="flex items-center text-green-700 mb-1">
                      <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                        <path
                          fillRule="evenodd"
                          d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                          clipRule="evenodd"
                        />
                      </svg>
                      Fertig
                    </div>
                  )}
                  {isPrintReady && !isFinished && (
                    <div className="flex items-center text-yellow-700 mb-1">
                      <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                        <path
                          fillRule="evenodd"
                          d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                          clipRule="evenodd"
                        />
                      </svg>
                      Bereit zum Drucken
                    </div>
                  )}
                  {event.ft && <div>FT: {event.ft}</div>}
                  {event.ka && <div>KA: {event.ka}</div>}
                </div>
                <Button variant="ghost" size="icon" onClick={(e) => handleEditClick(e, event)}>
                  <Pencil className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon" onClick={(e) => handleCopyEvent(e, event)}>
                  <Copy className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon" onClick={(e) => handleDeleteClick(e, event)}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )
        })}
      </div>
    )
  }

  const renderFilterBar = () => (
    <div className="flex flex-col space-y-4 mb-4">
      <div className="flex items-center space-x-2">
        <div className="relative flex-grow">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Nach Name oder Typ suchen..."
            value={nameFilter}
            onChange={(e) => setNameFilter(e.target.value)}
            className="pl-8"
          />
          {nameFilter && (
            <Button
              variant="ghost"
              size="icon"
              className="absolute right-0 top-0 h-full"
              onClick={() => setNameFilter("")}
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>

        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" className={cn("w-[180px]", !dateFilter && "text-muted-foreground")}>
              <CalendarIcon className="mr-2 h-4 w-4" />
              {dateFilter ? format(dateFilter, "dd.MM.yyyy", { locale: de }) : "Datum Filter"}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="end">
            <Calendar mode="single" selected={dateFilter} onSelect={setDateFilter} initialFocus locale={de} />
          </PopoverContent>
        </Popover>

        {(nameFilter || dateFilter) && (
          <Button variant="ghost" size="sm" onClick={clearFilters}>
            Filter zurücksetzen
          </Button>
        )}
      </div>

      {(nameFilter || dateFilter) && (
        <div className="flex flex-wrap gap-2">
          {nameFilter && (
            <Badge variant="secondary" className="flex items-center gap-1">
              Name: {nameFilter}
              <X className="h-3 w-3 cursor-pointer" onClick={() => setNameFilter("")} />
            </Badge>
          )}
          {dateFilter && (
            <Badge variant="secondary" className="flex items-center gap-1">
              Datum: {format(dateFilter, "dd.MM.yyyy", { locale: de })}
              <X className="h-3 w-3 cursor-pointer" onClick={() => setDateFilter(undefined)} />
            </Badge>
          )}
        </div>
      )}
    </div>
  )

  return (
    <Card className="w-full max-w-3xl mx-auto">
      <CardHeader>
        <CardTitle>{mode === "packliste" ? "Packliste" : "Nachbestellung"} - Event auswählen</CardTitle>
        <CardDescription>Wählen Sie ein bestehendes Event oder erstellen Sie ein neues</CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="new">Neu</TabsTrigger>
            <TabsTrigger value="upcoming">
              Offen
              {upcomingEvents.length > 0 && (
                <Badge variant="secondary" className="ml-2">
                  {upcomingEvents.length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="past">
              Abgeschlossen
              {pastEvents.length > 0 && (
                <Badge variant="secondary" className="ml-2">
                  {pastEvents.length}
                </Badge>
              )}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="new">
            <div className="space-y-4 mt-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Event Name</Label>
                  <Input
                    id="name"
                    placeholder="Event Name eingeben"
                    value={newEvent.name}
                    onChange={(e) => setNewEvent({ ...newEvent, name: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="type">Typ</Label>
                  <Select value={newEvent.type} onValueChange={(value) => setNewEvent({ ...newEvent, type: value })}>
                    <SelectTrigger id="type">
                      <SelectValue placeholder="Typ auswählen" />
                    </SelectTrigger>
                    <SelectContent>
                      {EVENT_TYPES.map((type) => (
                        <SelectItem key={type} value={type}>
                          {type}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="ft">Foodtruck</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="w-full justify-start text-left font-normal bg-transparent">
                        {newEvent.ft.length > 0 ? newEvent.ft.join(" & ") : "FT auswählen"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-full p-0">
                      <div className="p-4 space-y-2">
                        {["FT1", "FT2", "FT3", "FT4", "FT5", "Indoor"].map((ft) => (
                          <div key={ft} className="flex items-center space-x-2">
                            <input
                              type="checkbox"
                              id={`ft-${ft}`}
                              checked={newEvent.ft.includes(ft)}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setNewEvent({ ...newEvent, ft: [...newEvent.ft, ft] })
                                } else {
                                  setNewEvent({ ...newEvent, ft: newEvent.ft.filter((f) => f !== ft) })
                                }
                              }}
                            />
                            <label htmlFor={`ft-${ft}`}>{ft}</label>
                          </div>
                        ))}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setNewEvent({ ...newEvent, ft: [] })}
                          className="w-full"
                        >
                          Alle abwählen
                        </Button>
                      </div>
                    </PopoverContent>
                  </Popover>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="ka">Kühlanhänger</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="w-full justify-start text-left font-normal bg-transparent">
                        {newEvent.ka.length > 0 ? newEvent.ka.join(" & ") : "KA auswählen"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-full p-0">
                      <div className="p-4 space-y-2">
                        {["KA 1", "KA 2", "KA 3", "KA 4", "KA 5", "K-FZ"].map((ka) => (
                          <div key={ka} className="flex items-center space-x-2">
                            <input
                              type="checkbox"
                              id={`ka-${ka}`}
                              checked={newEvent.ka.includes(ka)}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setNewEvent({ ...newEvent, ka: [...newEvent.ka, ka] })
                                } else {
                                  setNewEvent({ ...newEvent, ka: newEvent.ka.filter((k) => k !== ka) })
                                }
                              }}
                            />
                            <label htmlFor={`ka-${ka}`}>{ka}</label>
                          </div>
                        ))}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setNewEvent({ ...newEvent, ka: [] })}
                          className="w-full"
                        >
                          Alle abwählen
                        </Button>
                      </div>
                    </PopoverContent>
                  </Popover>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Datum</Label>
                <Popover open={isDatePickerOpen} onOpenChange={setIsDatePickerOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn("w-full justify-start text-left font-normal", !date && "text-muted-foreground")}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {date ? format(date, "PPP", { locale: de }) : <span>Datum auswählen</span>}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={date}
                      onSelect={(selectedDate) => {
                        setDate(selectedDate)
                        setIsDatePickerOpen(false) // Auto-close calendar
                      }}
                      initialFocus
                      locale={de}
                    />
                  </PopoverContent>
                </Popover>
              </div>
              <div className="space-y-2">
                <Label>Enddatum (optional)</Label>
                <Popover open={isEndDatePickerOpen} onOpenChange={setIsEndDatePickerOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn("w-full justify-start text-left font-normal", !endDate && "text-muted-foreground")}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {endDate ? format(endDate, "PPP", { locale: de }) : <span>Enddatum auswählen</span>}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={endDate}
                      onSelect={(selectedDate) => {
                        setEndDate(selectedDate)
                        setIsEndDatePickerOpen(false) // Auto-close calendar
                      }}
                      initialFocus
                      locale={de}
                      disabled={(date) => date && date < (date || new Date())}
                    />
                  </PopoverContent>
                </Popover>
                {endDate && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setEndDate(undefined)}
                    className="w-full"
                  >
                    Enddatum entfernen
                  </Button>
                )}
              </div>
            </div>
          </TabsContent>

          <TabsContent value="upcoming">
            {renderFilterBar()}
            {renderEventList(upcomingEvents)}
          </TabsContent>

          <TabsContent value="past">
            {renderFilterBar()}
            {renderEventList(pastEvents)}
          </TabsContent>
        </Tabs>
      </CardContent>
      <CardFooter className="flex justify-between">
        <Button
          variant="outline"
          onClick={() => router.push("/")}
          className="bg-red-50 border-red-200 text-red-700 hover:bg-red-100 hover:border-red-300 hover:text-red-800"
        >
          Zurück zum Hauptmenü
        </Button>
        {activeTab === "new" && <Button onClick={handleCreateEvent}>Event erstellen</Button>}
      </CardFooter>

      {/* Edit Event Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-[425px]" onOpenAutoFocus={(e) => e.preventDefault()}>
          <DialogHeader>
            <DialogTitle>Event bearbeiten</DialogTitle>
            <DialogDescription>Ändern Sie die Details des Events und klicken Sie auf Speichern.</DialogDescription>
          </DialogHeader>
          {editingEvent && (
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="edit-name">Event Name</Label>
                <Input
                  id="edit-name"
                  value={editingEvent.name}
                  onChange={(e) => setEditingEvent({ ...editingEvent, name: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-type">Typ</Label>
                <Select
                  value={editingEvent.type}
                  onValueChange={(value) => setEditingEvent({ ...editingEvent, type: value })}
                >
                  <SelectTrigger id="edit-type">
                    <SelectValue placeholder="Typ auswählen" />
                  </SelectTrigger>
                  <SelectContent>
                    {EVENT_TYPES.map((type) => (
                      <SelectItem key={type} value={type}>
                        {type}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Foodtruck and Kühlanhänger sections with proper checkbox layout */}
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Foodtruck</Label>
                  <div className="grid grid-cols-3 gap-2">
                    {["FT1", "FT2", "FT3", "FT4", "FT5", "Indoor"].map((ft) => {
                      const currentFTs = editingEvent?.ft ? editingEvent.ft.split(" & ") : []
                      return (
                        <div key={ft} className="flex items-center space-x-2">
                          <input
                            type="checkbox"
                            id={`edit-ft-${ft}`}
                            checked={currentFTs.includes(ft)}
                            onChange={(e) => {
                              if (!editingEvent) return
                              const currentFTs = editingEvent.ft ? editingEvent.ft.split(" & ") : []
                              let newFTs
                              if (e.target.checked) {
                                newFTs = [...currentFTs, ft]
                              } else {
                                newFTs = currentFTs.filter((f) => f !== ft)
                              }
                              setEditingEvent({
                                ...editingEvent,
                                ft: newFTs.length > 0 ? newFTs.join(" & ") : null,
                              })
                            }}
                          />
                          <label htmlFor={`edit-ft-${ft}`} className="text-sm">
                            {ft}
                          </label>
                        </div>
                      )
                    })}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Kühlanhänger</Label>
                  <div className="grid grid-cols-3 gap-2">
                    {["KA 1", "KA 2", "KA 3", "KA 4", "KA 5", "K-FZ"].map((ka) => {
                      const currentKAs = editingEvent?.ka
                        ? editingEvent.ka
                            .split(" & ")
                            .map((k) => k.trim())
                            .filter((k) => k.length > 0)
                        : []

                      const isSelected = currentKAs.some((storedKa) => {
                        const normalizedStored = storedKa.replace(/\s+/g, " ").trim()
                        const normalizedCurrent = ka.replace(/\s+/g, " ").trim()
                        return (
                          normalizedStored === normalizedCurrent ||
                          normalizedStored === ka.replace(" ", "") || // Check "KA1" format
                          normalizedStored.replace(" ", "") === ka.replace(" ", "")
                        ) // Check both without spaces
                      })

                      return (
                        <div key={ka} className="flex items-center space-x-2">
                          <input
                            type="checkbox"
                            id={`edit-ka-${ka}`}
                            checked={isSelected}
                            onChange={(e) => {
                              if (!editingEvent) return

                              const currentKAs = editingEvent.ka
                                ? editingEvent.ka
                                    .split(" & ")
                                    .map((k) => k.trim())
                                    .filter((k) => k.length > 0)
                                : []

                              const cleanedKAs = currentKAs.filter((storedKa) => {
                                const normalizedStored = storedKa.replace(/\s+/g, " ").trim()
                                const normalizedCurrent = ka.replace(/\s+/g, " ").trim()
                                return !(
                                  normalizedStored === normalizedCurrent ||
                                  normalizedStored === ka.replace(" ", "") ||
                                  normalizedStored.replace(" ", "") === ka.replace(" ", "")
                                )
                              })

                              let newKAs
                              if (e.target.checked) {
                                newKAs = [...cleanedKAs, ka]
                              } else {
                                newKAs = cleanedKAs
                              }

                              setEditingEvent({
                                ...editingEvent,
                                ka: newKAs.length > 0 ? newKAs.join(" & ") : null,
                              })
                            }}
                          />
                          <label htmlFor={`edit-ka-${ka}`} className="text-sm">
                            {ka.replace("KA ", "KA")}
                          </label>
                        </div>
                      )
                    })}
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Datum</Label>
                <div className="flex gap-2">
                  <Input
                    type="date"
                    value={editDate ? format(editDate, "yyyy-MM-dd") : ""}
                    onChange={(e) => {
                      if (e.target.value) {
                        setEditDate(new Date(e.target.value))
                      } else {
                        setEditDate(undefined)
                      }
                    }}
                    className="flex-1"
                  />
                  {editDate && (
                    <Button type="button" variant="outline" size="sm" onClick={() => setEditDate(undefined)}>
                      Entfernen
                    </Button>
                  )}
                </div>
              </div>
              <div className="space-y-2">
                <Label>Enddatum</Label>
                <div className="flex gap-2">
                  <Input
                    type="date"
                    value={editEndDate ? format(editEndDate, "yyyy-MM-dd") : ""}
                    onChange={(e) => {
                      if (e.target.value) {
                        setEditEndDate(new Date(e.target.value))
                      } else {
                        setEditEndDate(undefined)
                      }
                    }}
                    className="flex-1"
                  />
                  {editEndDate && (
                    <Button type="button" variant="outline" size="sm" onClick={() => setEditEndDate(undefined)}>
                      Entfernen
                    </Button>
                  )}
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
              Abbrechen
            </Button>
            <Button onClick={handleUpdateEvent}>Speichern</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Event löschen</DialogTitle>
            <DialogDescription>
              Sind Sie sicher, dass Sie dieses Event löschen möchten? Diese Aktion kann nicht rückgängig gemacht werden.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)}>
              Abbrechen
            </Button>
            <Button variant="destructive" onClick={handleDeleteEvent}>
              Löschen
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  )
}
