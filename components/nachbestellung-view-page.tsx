"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ArrowLeft, Clock, User, Package, FileText } from "lucide-react"
import { useRouter } from "next/navigation"
import { getNachbestellungById } from "@/lib/nachbestellung-service"
import { getUserEmail } from "@/lib/user-utils"
import { getProductPackaging } from "@/lib/supabase-service"
import type { Nachbestellung, NachbestellungItem } from "@/lib/types"

interface EnrichedNachbestellungItem extends NachbestellungItem {
  correctPackagingUnit?: string
}

interface NachbestellungViewPageProps {
  nachbestellungId: string
}

export function NachbestellungViewPage({ nachbestellungId }: NachbestellungViewPageProps) {
  const router = useRouter()
  const [nachbestellung, setNachbestellung] = useState<Nachbestellung | null>(null)
  const [enrichedItems, setEnrichedItems] = useState<EnrichedNachbestellungItem[]>([])
  const [creatorEmail, setCreatorEmail] = useState<string>("")
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Enrich items with correct packaging units from database
  const enrichItemsWithPackaging = async (items: NachbestellungItem[]): Promise<EnrichedNachbestellungItem[]> => {
    const enrichedItems: EnrichedNachbestellungItem[] = []

    for (const item of items) {
      try {
        // Try to find the product in database by name to get correct packaging
        const packaging = await getProductPackaging(item.name)
        enrichedItems.push({
          ...item,
          correctPackagingUnit: packaging || item.packagingUnit,
        })
      } catch (error) {
        // Fallback to original packaging unit if lookup fails
        enrichedItems.push({
          ...item,
          correctPackagingUnit: item.packagingUnit,
        })
      }
    }

    return enrichedItems
  }

  useEffect(() => {
    const fetchNachbestellung = async () => {
      try {
        setLoading(true)
        const data = await getNachbestellungById(nachbestellungId)
        if (data) {
          setNachbestellung(data)

          // Enrich items with correct packaging units
          const enriched = await enrichItemsWithPackaging(data.items)
          setEnrichedItems(enriched)

          // Get creator email
          const email = await getUserEmail(data.createdBy)
          setCreatorEmail(email)
        } else {
          setError("Nachbestellung nicht gefunden")
        }
      } catch (err) {
        console.error("Error fetching nachbestellung:", err)
        setError("Fehler beim Laden der Nachbestellung")
      } finally {
        setLoading(false)
      }
    }

    if (nachbestellungId) {
      fetchNachbestellung()
    }
  }, [nachbestellungId])

  const getStatusColor = (status: string) => {
    switch (status) {
      case "offen":
        return "bg-blue-100 text-blue-800 border-blue-200"
      case "in_bearbeitung":
        return "bg-yellow-100 text-yellow-800 border-yellow-200"
      case "abgeschlossen":
        return "bg-green-100 text-green-800 border-green-200"
      default:
        return "bg-gray-100 text-gray-800 border-gray-200"
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
      default:
        return status
    }
  }

  if (loading) {
    return (
      <div className="container mx-auto p-4">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Lade Nachbestellung...</p>
          </div>
        </div>
      </div>
    )
  }

  if (error || !nachbestellung) {
    return (
      <div className="container mx-auto p-4">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <p className="text-red-600 mb-4">{error || "Nachbestellung nicht gefunden"}</p>
            <Button onClick={() => router.back()} variant="outline">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Zurück
            </Button>
          </div>
        </div>
      </div>
    )
  }

  const products = enrichedItems.filter((item) => item.type === "product")
  const ingredients = enrichedItems.filter((item) => item.type === "ingredient")

  return (
    <div className="container mx-auto p-4 max-w-6xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="icon" onClick={() => router.back()} className="shrink-0">
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{nachbestellung.eventName}</h1>
            <p className="text-gray-600">Nachbestellung #{nachbestellung.orderNumber}</p>
          </div>
        </div>
      </div>

      {/* Info Cards - 3 column grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        {/* Status */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Clock className="w-5 h-5 text-gray-500" />
              <div>
                <p className="text-sm text-gray-600 mb-1">Status</p>
                <Badge className={getStatusColor(nachbestellung.status)}>{getStatusText(nachbestellung.status)}</Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Erstellt am */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Clock className="w-5 h-5 text-gray-500" />
              <div>
                <p className="text-sm text-gray-600 mb-1">Erstellt am</p>
                <p className="font-medium">{new Date(nachbestellung.createdAt).toLocaleString("de-DE")}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Erstellt von */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <User className="w-5 h-5 text-gray-500" />
              <div>
                <p className="text-sm text-gray-600 mb-1">Erstellt von</p>
                <p className="font-medium">{creatorEmail}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Bestellte Artikel */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="w-5 h-5" />
            Bestellte Artikel
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="products" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="products" className="flex items-center gap-2">
                <Package className="w-4 h-4" />
                Produkte ({products.length})
              </TabsTrigger>
              <TabsTrigger value="ingredients" className="flex items-center gap-2">
                <FileText className="w-4 h-4" />
                Zutaten ({ingredients.length})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="products" className="mt-4">
              <div className="space-y-3">
                {products.length === 0 ? (
                  <p className="text-gray-500 text-center py-8">Keine Produkte bestellt</p>
                ) : (
                  products.map((item, index) => (
                    <div key={index} className="flex items-center justify-between p-4 border rounded-lg">
                      <div>
                        <h4 className="font-medium">{item.name}</h4>
                        <p className="text-sm text-gray-600">
                          {item.quantity} {item.unit} ({item.correctPackagingUnit || item.packagingUnit})
                        </p>
                      </div>
                      <Badge variant="outline" className="text-blue-600 border-blue-200">
                        {item.status === "offen"
                          ? "Offen"
                          : item.status === "bestellt"
                            ? "Bestellt"
                            : item.status === "erhalten"
                              ? "Erhalten"
                              : item.status}
                      </Badge>
                    </div>
                  ))
                )}
              </div>
            </TabsContent>

            <TabsContent value="ingredients" className="mt-4">
              <div className="space-y-3">
                {ingredients.length === 0 ? (
                  <p className="text-gray-500 text-center py-8">Keine Zutaten bestellt</p>
                ) : (
                  ingredients.map((item, index) => (
                    <div key={index} className="flex items-center justify-between p-4 border rounded-lg">
                      <div>
                        <h4 className="font-medium">{item.name}</h4>
                        <p className="text-sm text-gray-600">
                          {item.quantity} {item.unit} ({item.correctPackagingUnit || item.packagingUnit})
                        </p>
                      </div>
                      <Badge variant="outline" className="text-blue-600 border-blue-200">
                        {item.status === "offen"
                          ? "Offen"
                          : item.status === "bestellt"
                            ? "Bestellt"
                            : item.status === "erhalten"
                              ? "Erhalten"
                              : item.status}
                      </Badge>
                    </div>
                  ))
                )}
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Notizen */}
      {nachbestellung.notes && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5" />
              Notizen
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-700 whitespace-pre-wrap">{nachbestellung.notes}</p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
