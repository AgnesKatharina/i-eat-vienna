"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import { ArrowLeft, Calendar, User, Clock, Package, CheckCircle, XCircle, Edit3, Save, X } from "lucide-react"
import {
  getNachbestellungById,
  updateNachbestellungStatus,
  updateItemPackedStatus,
  type NachbestellungWithItems,
  type NachbestellungItem,
} from "@/lib/nachbestellung-service"
import { createClient } from "@/lib/supabase-client"
import { toast } from "@/hooks/use-toast"

interface NachbestellungViewPageProps {
  nachbestellungId: number
}

const getStatusColor = (status: string) => {
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

const getStatusIcon = (status: string) => {
  switch (status) {
    case "offen":
      return <Clock className="h-4 w-4" />
    case "in_bearbeitung":
      return <Package className="h-4 w-4" />
    case "abgeschlossen":
      return <CheckCircle className="h-4 w-4" />
    case "storniert":
      return <XCircle className="h-4 w-4" />
    default:
      return <Clock className="h-4 w-4" />
  }
}

const getStatusText = (status: string) => {
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

export function NachbestellungViewPage({ nachbestellungId }: NachbestellungViewPageProps) {
  const router = useRouter()
  const [nachbestellung, setNachbestellung] = useState<NachbestellungWithItems | null>(null)
  const [loading, setLoading] = useState(true)
  const [editingNotes, setEditingNotes] = useState(false)
  const [notesValue, setNotesValue] = useState("")

  useEffect(() => {
    loadNachbestellung()
  }, [nachbestellungId])

  const loadNachbestellung = async () => {
    try {
      setLoading(true)
      const data = await getNachbestellungById(nachbestellungId)

      if (data) {
        setNachbestellung(data)
        setNotesValue(data.notes || "")
      } else {
        toast({
          title: "Fehler",
          description: "Nachbestellung konnte nicht geladen werden",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("Error loading nachbestellung:", error)
      toast({
        title: "Fehler",
        description: "Ein unerwarteter Fehler ist aufgetreten",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleItemClick = async (item: NachbestellungItem) => {
    if (!nachbestellung) return

    // Toggle the is_packed status
    const newPackedStatus = !item.is_packed

    try {
      const success = await updateItemPackedStatus(item.id, newPackedStatus)

      if (success) {
        // Update the item in the local state
        const updatedItems = nachbestellung.items.map((i) =>
          i.id === item.id ? { ...i, is_packed: newPackedStatus } : i,
        )

        const updatedNachbestellung = {
          ...nachbestellung,
          items: updatedItems,
        }

        setNachbestellung(updatedNachbestellung)

        // Check if we need to update the nachbestellung status
        const hasPackedItems = updatedItems.some((i) => i.is_packed)

        // If there are packed items and the status is still "offen", change to "in_bearbeitung"
        if (hasPackedItems && nachbestellung.status === "offen") {
          await handleStatusChange("in_bearbeitung")
        }

        toast({
          title: "Status aktualisiert",
          description: `${item.item_name} wurde als ${newPackedStatus ? "gepackt" : "nicht gepackt"} markiert`,
        })
      } else {
        toast({
          title: "Fehler",
          description: "Status konnte nicht aktualisiert werden",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("Error updating item packed status:", error)
      toast({
        title: "Fehler",
        description: "Ein unerwarteter Fehler ist aufgetreten",
        variant: "destructive",
      })
    }
  }

  const handleStatusChange = async (newStatus: "offen" | "in_bearbeitung" | "abgeschlossen" | "storniert") => {
    if (!nachbestellung) return

    try {
      const supabase = createClient()
      const {
        data: { user },
      } = await supabase.auth.getUser()

      const success = await updateNachbestellungStatus(nachbestellung.id, newStatus, user?.id)

      if (success) {
        setNachbestellung((prev) => (prev ? { ...prev, status: newStatus } : null))
        toast({
          title: "Status aktualisiert",
          description: `Status wurde auf "${getStatusText(newStatus)}" geändert`,
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

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString("de-DE", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Lade Nachbestellung...</p>
          </div>
        </div>
      </div>
    )
  }

  if (!nachbestellung) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <XCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Nachbestellung nicht gefunden</h3>
            <p className="text-gray-600 mb-4">Die angeforderte Nachbestellung konnte nicht geladen werden.</p>
            <Button onClick={() => router.push("/app/nachbestellungen")} variant="outline">
              Zurück zur Übersicht
            </Button>
          </div>
        </div>
      </div>
    )
  }

  const products = nachbestellung.items.filter((item) => item.item_type === "product" && item.category !== "Equipment")
  const ingredients = nachbestellung.items.filter((item) => item.item_type === "ingredient")
  const equipment = nachbestellung.items.filter((item) => item.item_type === "product" && item.category === "Equipment")

  return (
    <div className="container mx-auto p-4 sm:p-6 max-w-6xl">
      <div className="border border-gray-400 rounded-lg p-4 sm:p-6">
        {/* Header - Event name big, Nachbestellung # small */}
        <div className="flex items-center gap-4 mb-6">
          <Button
            variant="outline"
            size="icon"
            onClick={() => router.push("/app/nachbestellungen")}
            className="border-gray-300 hover:bg-gray-50 flex-shrink-0"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex-1 min-w-0">
            <h1 className="text-xl sm:text-2xl font-semibold text-gray-900 mb-1">{nachbestellung.event_name}</h1>
            <p className="text-sm sm:text-base text-gray-600">Nachbestellung #{nachbestellung.id}</p>
          </div>
          <Badge variant="outline" className={`flex items-center gap-2 ${getStatusColor(nachbestellung.status)}`}>
            {getStatusIcon(nachbestellung.status)}
            {getStatusText(nachbestellung.status)}
          </Badge>
        </div>

        {/* Status Actions */}
        {nachbestellung.status !== "abgeschlossen" && (
          <div className="flex flex-wrap gap-2 mb-6">
            {nachbestellung.status === "offen" && (
              <Button onClick={() => handleStatusChange("in_bearbeitung")} variant="outline" size="sm">
                In Bearbeitung
              </Button>
            )}
            {(nachbestellung.status === "offen" || nachbestellung.status === "in_bearbeitung") && (
              <Button onClick={() => handleStatusChange("abgeschlossen")} variant="outline" size="sm">
                Abschließen
              </Button>
            )}
            {nachbestellung.status !== "storniert" && (
              <Button
                onClick={() => handleStatusChange("storniert")}
                variant="outline"
                size="sm"
                className="text-red-600 border-red-200 hover:bg-red-50"
              >
                Stornieren
              </Button>
            )}
          </div>
        )}

        {/* Info Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 text-sm text-gray-600 mb-1">
                <User className="h-4 w-4" />
                Erstellt von
              </div>
              <p className="font-semibold">{nachbestellung.creator_email || "Unbekannt"}</p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 text-sm text-gray-600 mb-1">
                <Calendar className="h-4 w-4" />
                Erstellt am
              </div>
              <p className="font-semibold">{formatDate(nachbestellung.created_at)}</p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 text-sm text-gray-600 mb-1">
                <Package className="h-4 w-4" />
                Artikel gesamt
              </div>
              <p className="font-semibold">{nachbestellung.total_items}</p>
            </CardContent>
          </Card>
        </div>

        {/* Notes Section */}
        {(nachbestellung.notes || editingNotes) && (
          <Card className="mb-6">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">Notizen</CardTitle>
                {!editingNotes ? (
                  <Button variant="ghost" size="sm" onClick={() => setEditingNotes(true)}>
                    <Edit3 className="h-4 w-4" />
                  </Button>
                ) : (
                  <div className="flex gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setEditingNotes(false)
                        setNotesValue(nachbestellung.notes || "")
                      }}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        // Here you would save the notes
                        setEditingNotes(false)
                        toast({
                          title: "Notizen gespeichert",
                          description: "Die Notizen wurden erfolgreich aktualisiert",
                        })
                      }}
                    >
                      <Save className="h-4 w-4" />
                    </Button>
                  </div>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {editingNotes ? (
                <Textarea
                  value={notesValue}
                  onChange={(e) => setNotesValue(e.target.value)}
                  placeholder="Notizen hinzufügen..."
                  className="min-h-[100px]"
                />
              ) : (
                <p className="text-gray-700 whitespace-pre-wrap">{nachbestellung.notes || "Keine Notizen vorhanden"}</p>
              )}
            </CardContent>
          </Card>
        )}

        <div className="space-y-6">
          {/* Products Section */}
          {products.length > 0 && (
            <div>
              <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <Package className="h-5 w-5" />
                Produkte ({products.length})
              </h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
                {products.map((product) => (
                  <Button
                    key={product.id}
                    variant={product.is_packed ? "default" : "outline"}
                    className={`h-auto p-3 text-left justify-start ${
                      product.is_packed
                        ? "bg-green-500 hover:bg-green-600 text-white border-green-500"
                        : "bg-white hover:bg-gray-50 text-gray-700 border-gray-300"
                    }`}
                    onClick={() => handleItemClick(product)}
                  >
                    <div className="w-full text-left">
                      <h4 className="font-medium text-sm mb-1 truncate">{product.item_name}</h4>
                      <p className="text-xs opacity-80">
                        {product.quantity} {product.unit}
                      </p>
                      {product.category && <p className="text-xs opacity-70 truncate">{product.category}</p>}
                    </div>
                  </Button>
                ))}
              </div>
            </div>
          )}

          {/* Ingredients Section */}
          {ingredients.length > 0 && (
            <div>
              <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <Package className="h-5 w-5" />
                Zutaten ({ingredients.length})
              </h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
                {ingredients.map((ingredient) => (
                  <Button
                    key={ingredient.id}
                    variant={ingredient.is_packed ? "default" : "outline"}
                    className={`h-auto p-3 text-left justify-start ${
                      ingredient.is_packed
                        ? "bg-green-500 hover:bg-green-600 text-white border-green-500"
                        : "bg-white hover:bg-gray-50 text-gray-700 border-gray-300"
                    }`}
                    onClick={() => handleItemClick(ingredient)}
                  >
                    <div className="w-full text-left">
                      <h4 className="font-medium text-sm mb-1 truncate">{ingredient.item_name}</h4>
                      <p className="text-xs opacity-80">
                        {ingredient.quantity} {ingredient.unit}
                      </p>
                      {ingredient.category && <p className="text-xs opacity-70 truncate">{ingredient.category}</p>}
                    </div>
                  </Button>
                ))}
              </div>
            </div>
          )}

          {/* Foodtruck Geschirr Section */}
          {equipment.length > 0 && (
            <div>
              <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <Package className="h-5 w-5" />
                Foodtruck Geschirr ({equipment.length})
              </h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
                {equipment.map((equipmentItem) => (
                  <Button
                    key={equipmentItem.id}
                    variant={equipmentItem.is_packed ? "default" : "outline"}
                    className={`h-auto p-3 text-left justify-start ${
                      equipmentItem.is_packed
                        ? "bg-green-500 hover:bg-green-600 text-white border-green-500"
                        : "bg-white hover:bg-gray-50 text-gray-700 border-gray-300"
                    }`}
                    onClick={() => handleItemClick(equipmentItem)}
                  >
                    <div className="w-full text-left">
                      <h4 className="font-medium text-sm mb-1 truncate">{equipmentItem.item_name}</h4>
                      <p className="text-xs opacity-80">
                        {equipmentItem.quantity} {equipmentItem.unit}
                      </p>
                      {equipmentItem.category && (
                        <p className="text-xs opacity-70 truncate">{equipmentItem.category}</p>
                      )}
                    </div>
                  </Button>
                ))}
              </div>
            </div>
          )}

          {/* Empty State */}
          {nachbestellung.items.length === 0 && (
            <div className="flex flex-col items-center justify-center py-12">
              <Package className="h-12 w-12 text-gray-400 mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Keine Artikel</h3>
              <p className="text-gray-600 text-center">Diese Nachbestellung enthält keine Artikel.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
