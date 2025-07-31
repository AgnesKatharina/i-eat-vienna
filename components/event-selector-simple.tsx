"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { createEvent, getEvents, type Event } from "@/lib/event-service"
import { useRouter } from "next/navigation"
import { useToast } from "@/components/ui/use-toast"

export function EventSelectorSimple() {
  const [events, setEvents] = useState<Event[]>([])
  const [loading, setLoading] = useState(true)
  const [newEventName, setNewEventName] = useState("")
  const [creating, setCreating] = useState(false)

  const router = useRouter()
  const { toast } = useToast()

  useEffect(() => {
    loadEvents()
  }, [])

  async function loadEvents() {
    try {
      setLoading(true)
      const eventsData = await getEvents()
      setEvents(eventsData)
    } catch (error) {
      console.error("Error loading events:", error)
      toast({
        title: "Fehler",
        description: "Events konnten nicht geladen werden",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleCreateEvent = async () => {
    if (!newEventName.trim()) {
      toast({
        title: "Fehler",
        description: "Bitte geben Sie einen Event-Namen ein",
        variant: "destructive",
      })
      return
    }

    try {
      setCreating(true)
      const event = await createEvent({
        name: newEventName.trim(),
        type: "Catering",
        date: new Date().toISOString().split("T")[0],
        end_date: null,
        ft: null,
        ka: null,
      })

      if (event) {
        setEvents([event, ...events])
        setNewEventName("")
        toast({
          title: "Erfolg",
          description: "Event wurde erstellt",
        })
        router.push(`/app/packliste/${event.id}`)
      } else {
        throw new Error("Failed to create event")
      }
    } catch (error) {
      console.error("Error creating event:", error)
      toast({
        title: "Fehler beim Erstellen",
        description: error instanceof Error ? error.message : "Event konnte nicht erstellt werden",
        variant: "destructive",
      })
    } finally {
      setCreating(false)
    }
  }

  const handleSelectEvent = (eventId: number) => {
    router.push(`/app/packliste/${eventId}`)
  }

  if (loading) {
    return (
      <Card className="w-full max-w-2xl mx-auto">
        <CardContent className="p-6">
          <div className="flex justify-center">Lade Events...</div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle>Event auswählen</CardTitle>
        <CardDescription>Wählen Sie ein bestehendes Event oder erstellen Sie ein neues</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Create New Event */}
        <div className="space-y-4 p-4 border rounded-lg">
          <h3 className="font-medium">Neues Event erstellen</h3>
          <div className="space-y-2">
            <Label htmlFor="name">Event Name</Label>
            <Input
              id="name"
              placeholder="Event Name eingeben"
              value={newEventName}
              onChange={(e) => setNewEventName(e.target.value)}
              disabled={creating}
            />
          </div>
          <Button onClick={handleCreateEvent} disabled={creating || !newEventName.trim()}>
            {creating ? "Erstelle..." : "Event erstellen"}
          </Button>
        </div>

        {/* Existing Events */}
        <div className="space-y-4">
          <h3 className="font-medium">Bestehende Events</h3>
          {events.length === 0 ? (
            <p className="text-muted-foreground">Keine Events vorhanden</p>
          ) : (
            <div className="space-y-2">
              {events.slice(0, 10).map((event) => (
                <div
                  key={event.id}
                  className="flex items-center justify-between p-3 border rounded-lg cursor-pointer hover:bg-muted"
                  onClick={() => handleSelectEvent(event.id)}
                >
                  <div>
                    <h4 className="font-medium">{event.name}</h4>
                    <p className="text-sm text-muted-foreground">
                      {event.type} • {event.date || "Kein Datum"}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </CardContent>
      <CardFooter>
        <Button variant="outline" onClick={() => router.push("/")} className="w-full">
          Zurück zum Hauptmenü
        </Button>
      </CardFooter>
    </Card>
  )
}
