"use client"

import { useState } from "react"
import { Calendar } from "@/components/ui/calendar"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { CalendarIcon } from "lucide-react"
import { format } from "date-fns"
import { de } from "date-fns/locale"
import { cn } from "@/lib/utils"
import type { EventDetails } from "@/lib/types"

interface HeaderProps {
  eventDetails: EventDetails
  setEventDetails: (details: EventDetails) => void
  mode: string
}

export function Header({ eventDetails, setEventDetails, mode }: HeaderProps) {
  const [date, setDate] = useState<Date | undefined>(undefined)
  const [calendarOpen, setCalendarOpen] = useState(false)

  const handleDateSelect = (date: Date | undefined) => {
    setDate(date)
    if (date) {
      setEventDetails({
        ...eventDetails,
        date: format(date, "dd.MM.yyyy"),
      })
      // Automatically close the calendar after selecting a date
      setCalendarOpen(false)
    }
  }

  // Get dropdown options based on mode
  const getTypeOptions = () => {
    if (mode === "packliste") {
      return [
        { value: "Catering", label: "Catering" },
        { value: "Lieferung", label: "Lieferung" },
      ]
    } else if (mode === "einkaufen") {
      return [{ value: "Einkaufen", label: "Einkaufen" }]
    } else if (mode === "bestellung") {
      return [{ value: "Bestellung", label: "Bestellung" }]
    }

    return [
      { value: "Catering", label: "Catering" },
      { value: "Lieferung", label: "Lieferung" },
      { value: "Einkaufen", label: "Einkaufen" },
      { value: "Bestellung", label: "Bestellung" },
    ]
  }

  // Render date field
  const renderDateField = () => (
    <div className="space-y-2">
      <label htmlFor="date" className="text-sm font-medium">
        Datum
      </label>
      <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
        <PopoverTrigger asChild>
          <Button
            id="date"
            variant={"outline"}
            className={cn("w-full justify-start text-left font-normal", !date && "text-muted-foreground")}
          >
            <CalendarIcon className="mr-2 h-4 w-4" />
            {date ? format(date, "PPP", { locale: de }) : <span>Datum auswählen</span>}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar mode="single" selected={date} onSelect={handleDateSelect} initialFocus locale={de} />
        </PopoverContent>
      </Popover>
    </div>
  )

  // Render Foodtruck field
  const renderFoodtruckField = () => (
    <div className="space-y-2">
      <label htmlFor="ft" className="text-sm font-medium">
        Foodtruck
      </label>
      <Select value={eventDetails.ft} onValueChange={(value) => setEventDetails({ ...eventDetails, ft: value })}>
        <SelectTrigger id="ft">
          <SelectValue placeholder="FT auswählen" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="none">-</SelectItem>
          <SelectItem value="FT1">FT1</SelectItem>
          <SelectItem value="FT2">FT2</SelectItem>
          <SelectItem value="FT3">FT3</SelectItem>
          <SelectItem value="FT4">FT4</SelectItem>
          <SelectItem value="FT5">FT5</SelectItem>
          <SelectItem value="Indoor">Indoor</SelectItem>
        </SelectContent>
      </Select>
    </div>
  )

  // Render Name field (required for Bestellung mode)
  const renderSupplierNameField = () => (
    <div className="space-y-2">
      <label htmlFor="supplier-name" className="text-sm font-medium">
        Mitarbeiter Name
      </label>
      <Input
        id="supplier-name"
        value={eventDetails.supplierName || ""}
        onChange={(e) => setEventDetails({ ...eventDetails, supplierName: e.target.value })}
        placeholder="Mitarbeiter Name"
        required
      />
    </div>
  )

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            {/* Only show Type in Packliste mode */}
            {mode === "packliste" && (
              <div className="space-y-2">
                <label htmlFor="type" className="text-sm font-medium">
                  Typ
                </label>
                <Select
                  value={eventDetails.type}
                  onValueChange={(value) => setEventDetails({ ...eventDetails, type: value })}
                >
                  <SelectTrigger id="type">
                    <SelectValue placeholder="Typ auswählen" />
                  </SelectTrigger>
                  <SelectContent>
                    {getTypeOptions().map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Always show Event Name field */}
            <div className={`space-y-2 ${mode === "packliste" ? "" : "col-span-2"}`}>
              <label htmlFor="event-name" className="text-sm font-medium">
                Event Name
              </label>
              <Input
                id="event-name"
                value={eventDetails.name}
                onChange={(e) => setEventDetails({ ...eventDetails, name: e.target.value })}
                placeholder="Event Name"
              />
            </div>
          </div>

          {/* Add Supplier Name field for Bestellung mode */}
          {mode === "bestellung" && (
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">{renderSupplierNameField()}</div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            {/* In Bestellung mode, swap date and foodtruck positions */}
            {mode === "bestellung" ? (
              <>
                {renderDateField()}
                {renderFoodtruckField()}
              </>
            ) : (
              <>
                {renderFoodtruckField()}

                {/* Only show Kühlanhänger in Packliste mode */}
                {mode === "packliste" && (
                  <div className="space-y-2">
                    <label htmlFor="ka" className="text-sm font-medium">
                      Kühlanhänger
                    </label>
                    <Select
                      value={eventDetails.ka}
                      onValueChange={(value) => setEventDetails({ ...eventDetails, ka: value })}
                    >
                      <SelectTrigger id="ka">
                        <SelectValue placeholder="KA auswählen" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">-</SelectItem>
                        <SelectItem value="KA 1">KA 1</SelectItem>
                        <SelectItem value="KA 2">KA 2</SelectItem>
                        <SelectItem value="KA 3">KA 3</SelectItem>
                        <SelectItem value="KA 4">KA 4</SelectItem>
                        <SelectItem value="KA 5">KA 5</SelectItem>
                        <SelectItem value="K-FZ">K-FZ</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        <div className="flex flex-col items-center justify-center">
          {/* In Bestellung mode, date is already shown in the left column */}
          {mode !== "bestellung" && renderDateField()}
        </div>
      </div>
    </div>
  )
}
