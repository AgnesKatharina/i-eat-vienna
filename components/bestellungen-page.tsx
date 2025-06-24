"use client"

import { useState, useEffect, useMemo } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { useToast } from "@/components/ui/use-toast"
import { ArrowLeft, Save, Package, Calendar, CheckCircle2, History } from "lucide-react"
import {
  getAllProducts,
  getProductPackaging,
  saveUserPreferences,
  getUserPreferences,
  getProductRecipes,
  getEventsFromSupabase,
  getEventProductsFromSupabase,
  getEventIngredientsFromSupabase,
} from "@/lib/supabase-service"
import type { ProductWithCategory, Event, EventProduct, EventIngredient } from "@/lib/supabase-service"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

interface SavedOrder {
  id: string
  name: string
  date: string
  orderQuantities: Record<number, number>
  notes?: string
  favorite?: boolean
}

export function BestellungenPage() {
  const router = useRouter()
  const { toast } = useToast()

  const [products, setProducts] = useState<ProductWithCategory[]>([])
  const [packagingUnits, setPackagingUnits] = useState<
    Record<number, { amount_per_package: number; packaging_unit: string }>
  >({})
  const [productRecipes, setProductRecipes] = useState<Record<number, any[]>>({})
  const [loading, setLoading] = useState(true)

  const [searchTerm, setSearchTerm] = useState("")
  const [showFilters, setShowFilters] = useState(false)
  const [selectedCategories, setSelectedCategories] = useState<Record<string, boolean>>({})
  const [activeTab, setActiveTab] = useState<string>("products")
  const [sortBy, setSortBy] = useState<string>("name")

  const [orderQuantities, setOrderQuantities] = useState<Record<number, number>>({})
  const [orderNotes, setOrderNotes] = useState("")
  const [isSaving, setIsSaving] = useState(false)
  const [savedOrders, setSavedOrders] = useState<SavedOrder[]>([])

  const [events, setEvents] = useState<Event[]>([])
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null)
  const [eventProducts, setEventProducts] = useState<EventProduct[]>([])
  const [eventIngredients, setEventIngredients] = useState<EventIngredient[]>([])
  const [selectedProductsForReorder, setSelectedProductsForReorder] = useState<Record<string, boolean>>({})
  const [selectedIngredientsForReorder, setSelectedIngredientsForReorder] = useState<Record<string, boolean>>({})
  const [showIngredients, setShowIngredients] = useState(false)
  const [isReorderModalOpen, setIsReorderModalOpen] = useState(false)

  const [isSaveOrderModalOpen, setIsSaveOrderModalOpen] = useState(false)
  const [isLoadOrderModalOpen, setIsLoadOrderModalOpen] = useState(false)
  const [newOrderName, setNewOrderName] = useState("")
  const [selectedOrderToLoad, setSelectedOrderToLoad] = useState<SavedOrder | null>(null)

  // Step-based flow state
  const [currentStep, setCurrentStep] = useState<"event-selection" | "reorder">("event-selection")

  useEffect(() => {
    async function loadData() {
      setLoading(true)
      try {
        // Load basic data in parallel
        const [productsData, eventsData, savedPreferences] = await Promise.all([
          getAllProducts(),
          getEventsFromSupabase(),
          getUserPreferences("default_user", "bestellungen"),
        ])

        setProducts(productsData)

        // Set up categories
        const categories: Record<string, boolean> = {}
        productsData.forEach((product) => {
          if (product.category) {
            categories[product.category.name] = true
          }
        })
        setSelectedCategories(categories)

        // Load packaging and recipes in parallel (much faster!)
        const packagingPromises = productsData.map((product) => getProductPackaging(product.id).catch(() => null))
        const recipesPromises = productsData.map((product) => getProductRecipes(product.id).catch(() => []))

        const [packagingResults, recipesResults] = await Promise.all([
          Promise.all(packagingPromises),
          Promise.all(recipesPromises),
        ])

        // Process results
        const packagingData: Record<number, { amount_per_package: number; packaging_unit: string }> = {}
        const recipesData: Record<number, any[]> = {}

        productsData.forEach((product, index) => {
          const packaging = packagingResults[index]
          if (packaging) {
            packagingData[product.id] = {
              amount_per_package: packaging.amount_per_package,
              packaging_unit: packaging.packaging_unit,
            }
          }

          const recipes = recipesResults[index]
          if (recipes && recipes.length > 0) {
            recipesData[product.id] = recipes
          }
        })

        setPackagingUnits(packagingData)
        setProductRecipes(recipesData)

        // Handle saved preferences
        if (savedPreferences) {
          if (savedPreferences.orderQuantities) {
            setOrderQuantities(savedPreferences.orderQuantities)
          }
          if (savedPreferences.savedOrders) {
            setSavedOrders(savedPreferences.savedOrders)
          }
          if (savedPreferences.orderNotes) {
            setOrderNotes(savedPreferences.orderNotes)
          }
        }

        // Sort events by date
        setEvents(
          eventsData.sort((a, b) => {
            if (!a.date && !b.date) return 0
            if (!a.date) return 1
            if (!b.date) return -1
            return new Date(b.date).getTime() - new Date(a.date).getTime()
          }),
        )
      } catch (error) {
        console.error("Error loading data:", error)
        toast({
          title: "Fehler",
          description: "Daten konnten nicht geladen werden.",
          variant: "destructive",
        })
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [toast])

  const filteredProducts = useMemo(() => {
    const filtered = products.filter((product) => {
      const matchesSearch =
        searchTerm === "" ||
        product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (product.category?.name.toLowerCase() || "").includes(searchTerm.toLowerCase())

      const matchesCategory = product.category && selectedCategories[product.category.name]

      return matchesSearch && matchesCategory
    })

    filtered.sort((a, b) => {
      switch (sortBy) {
        case "name":
          return a.name.localeCompare(b.name)
        case "category":
          return (a.category?.name || "").localeCompare(b.category?.name || "")
        case "unit":
          return a.unit.localeCompare(b.unit)
        case "ordered":
          const aOrdered = orderQuantities[a.id] || 0
          const bOrdered = orderQuantities[b.id] || 0
          return bOrdered - aOrdered
        default:
          return 0
      }
    })

    return filtered
  }, [products, searchTerm, selectedCategories, sortBy, orderQuantities])

  const categories = useMemo(() => {
    const uniqueCategories = new Set<string>()
    products.forEach((product) => {
      if (product.category) {
        uniqueCategories.add(product.category.name)
      }
    })
    return Array.from(uniqueCategories).sort()
  }, [products])

  const orderSummary = useMemo(() => {
    const totalProducts = Object.values(orderQuantities).filter((q) => q > 0).length
    const totalQuantity = Object.values(orderQuantities).reduce((sum, qty) => sum + qty, 0)
    const totalPackages = Object.entries(orderQuantities).reduce((sum, [productId, qty]) => {
      if (qty > 0) {
        const packaging = packagingUnits[Number.parseInt(productId)]
        if (packaging) {
          return sum + Math.ceil(qty / packaging.amount_per_package)
        }
      }
      return sum
    }, 0)

    return { totalProducts, totalQuantity, totalPackages }
  }, [orderQuantities, packagingUnits])

  const handleEventSelect = async (event: Event) => {
    setSelectedEvent(event)

    console.log(`🎯 LOADING EVENT DATA: ${event.name} (ID: ${event.id})`)

    toast({
      title: "Event wird geladen...",
      description: `Lade Produkte und Zutaten für "${event.name}"`,
    })

    // Load both products and ingredients
    const [products, ingredients] = await Promise.all([
      getEventProductsFromSupabase(event.id),
      getEventIngredientsFromSupabase(event.id),
    ])

    console.log(`✅ LOADED: ${products.length} products and ${ingredients.length} ingredients for event ${event.name}`)

    setEventProducts(products)
    setEventIngredients(ingredients)

    // Initialize selection states
    const initialProductSelection: Record<string, boolean> = {}
    products.forEach((product) => {
      if (product.product) {
        initialProductSelection[product.product.name] = false
      }
    })
    setSelectedProductsForReorder(initialProductSelection)

    const initialIngredientSelection: Record<string, boolean> = {}
    ingredients.forEach((ingredient) => {
      initialIngredientSelection[ingredient.ingredient_name] = false
    })
    setSelectedIngredientsForReorder(initialIngredientSelection)

    setShowIngredients(false)
    setCurrentStep("reorder")
  }

  const handleBackToEventSelection = () => {
    setCurrentStep("event-selection")
    setSelectedEvent(null)
    setEventProducts([])
    setEventIngredients([])
    setSelectedProductsForReorder({})
    setSelectedIngredientsForReorder({})
  }

  const handleReorderConfirm = () => {
    const newOrderQuantities = { ...orderQuantities }

    if (showIngredients) {
      // Handle ingredients
      eventIngredients.forEach((eventIngredient) => {
        if (selectedIngredientsForReorder[eventIngredient.ingredient_name]) {
          const product = products.find((p) => p.name === eventIngredient.ingredient_name)
          if (product) {
            newOrderQuantities[product.id] =
              (newOrderQuantities[product.id] || 0) + Math.ceil(eventIngredient.quantity_needed)
          }
        }
      })
    } else {
      // Handle products
      eventProducts.forEach((eventProduct) => {
        if (eventProduct.product && selectedProductsForReorder[eventProduct.product.name]) {
          const product = products.find((p) => p.name === eventProduct.product.name)
          if (product) {
            newOrderQuantities[product.id] = (newOrderQuantities[product.id] || 0) + eventProduct.quantity
          }
        }
      })
    }

    setOrderQuantities(newOrderQuantities)

    const itemType = showIngredients ? "Zutaten" : "Produkte"
    const selectedCount = showIngredients
      ? Object.values(selectedIngredientsForReorder).filter(Boolean).length
      : Object.values(selectedProductsForReorder).filter(Boolean).length

    toast({
      title: "Erfolg",
      description: `${selectedCount} ${itemType} von Event "${selectedEvent?.name}" wurden zur Bestellung hinzugefügt.`,
    })

    // Reset selections for next time
    setSelectedProductsForReorder({})
    setSelectedIngredientsForReorder({})
  }

  const toggleIngredientForReorder = (ingredientName: string) => {
    setSelectedIngredientsForReorder((prev) => ({
      ...prev,
      [ingredientName]: !prev[ingredientName],
    }))
  }

  const selectAllIngredientsForReorder = (select: boolean) => {
    const newSelection: Record<string, boolean> = {}
    eventIngredients.forEach((ingredient) => {
      newSelection[ingredient.ingredient_name] = select
    })
    setSelectedIngredientsForReorder(newSelection)
  }

  const toggleProductForReorder = (productName: string) => {
    setSelectedProductsForReorder((prev) => ({
      ...prev,
      [productName]: !prev[productName],
    }))
  }

  const selectAllProductsForReorder = (select: boolean) => {
    const newSelection: Record<string, boolean> = {}
    eventProducts.forEach((product) => {
      if (product.product) {
        newSelection[product.product.name] = select
      }
    })
    setSelectedProductsForReorder(newSelection)
  }

  // Event Selection Step
  if (currentStep === "event-selection") {
    return (
      <div className="container mx-auto py-6 space-y-6">
        <div className="flex items-center justify-between">
          <Button variant="outline" onClick={() => router.push("/")} className="flex items-center gap-2">
            <ArrowLeft className="h-4 w-4" />
            Zurück zum Hauptmenü
          </Button>
          <h1 className="text-2xl font-bold">Event für Nachbestellung auswählen</h1>
          <div></div>
        </div>

        <div className="text-center mb-8">
          <p className="text-gray-600 text-lg">
            Wählen Sie ein Event aus, um dessen Produkte und Zutaten nachzubestellen.
          </p>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[...Array(6)].map((_, i) => (
              <Card key={i} className="animate-pulse">
                <CardContent className="p-6">
                  <div className="h-6 bg-gray-200 rounded w-3/4 mb-4"></div>
                  <div className="h-4 bg-gray-200 rounded w-1/2 mb-2"></div>
                  <div className="h-4 bg-gray-200 rounded w-2/3 mb-4"></div>
                  <div className="h-10 bg-gray-200 rounded"></div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : events.length === 0 ? (
          <div className="text-center py-12">
            <Calendar className="mx-auto h-16 w-16 text-gray-400 mb-4" />
            <h3 className="text-xl font-medium mb-2">Keine Events gefunden</h3>
            <p className="text-gray-500">Erstellen Sie zuerst ein Event in der Packliste.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {events.map((event) => (
              <Card
                key={event.id}
                className="cursor-pointer hover:shadow-lg transition-all duration-200 border-2 hover:border-blue-300"
                onClick={() => handleEventSelect(event)}
              >
                <CardContent className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <h3 className="font-bold text-xl mb-2">{event.name}</h3>
                      <div className="text-sm text-gray-600 mb-3">
                        📅 {event.type} • {event.date ? new Date(event.date).toLocaleDateString("de-DE") : "Kein Datum"}
                      </div>
                      {(event.ft || event.ka) && (
                        <div className="text-xs text-gray-500 flex gap-4 mb-4">
                          {event.ft && <span>🚚 FT: {event.ft}</span>}
                          {event.ka && <span>❄️ KA: {event.ka}</span>}
                        </div>
                      )}
                    </div>
                  </div>
                  <Button className="w-full bg-blue-600 hover:bg-blue-700" size="lg">
                    📦 Event auswählen
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    )
  }

  // Reorder Step
  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center justify-between">
        <Button variant="outline" onClick={handleBackToEventSelection} className="flex items-center gap-2">
          <ArrowLeft className="h-4 w-4" />
          Zurück zur Event-Auswahl
        </Button>
        <div className="text-center">
          <h1 className="text-2xl font-bold">Nachbestellung</h1>
          <p className="text-sm text-gray-600 mt-1">
            📅 Event: <span className="font-medium">{selectedEvent?.name}</span>
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setIsLoadOrderModalOpen(true)} className="flex items-center gap-2">
            <History className="h-4 w-4" />
            Bestellung laden
          </Button>
        </div>
      </div>

      {orderSummary.totalProducts > 0 && (
        <Card className="border-blue-200 bg-blue-50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-6">
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-600">{orderSummary.totalProducts}</div>
                  <div className="text-sm text-blue-600">Produkte</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-600">{orderSummary.totalQuantity}</div>
                  <div className="text-sm text-blue-600">Einheiten</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-600">{orderSummary.totalPackages}</div>
                  <div className="text-sm text-blue-600">Pakete</div>
                </div>
              </div>
              <div className="flex gap-2">
                <Button onClick={() => setIsSaveOrderModalOpen(true)} className="flex items-center gap-2">
                  <Save className="h-4 w-4" />
                  Bestellung speichern
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Enhanced toggle between products and ingredients */}
      <div className="flex gap-3 mb-6">
        <Button
          variant={!showIngredients ? "default" : "outline"}
          onClick={() => setShowIngredients(false)}
          className="flex-1 h-12 text-base"
          size="lg"
        >
          📦 Fertige Produkte ({eventProducts.length}){!showIngredients && <span className="ml-2">← Aktiv</span>}
        </Button>
        <Button
          variant={showIngredients ? "default" : "outline"}
          onClick={() => setShowIngredients(true)}
          className="flex-1 h-12 text-base"
          size="lg"
        >
          🥕 Rohe Zutaten ({eventIngredients.length}){showIngredients && <span className="ml-2">← Aktiv</span>}
        </Button>
      </div>

      {!showIngredients ? (
        // Products view
        eventProducts.length === 0 ? (
          <div className="text-center text-gray-500 py-12">
            <Package className="mx-auto h-16 w-16 text-gray-400 mb-4" />
            <h3 className="text-lg font-medium">Keine Produkte gefunden</h3>
            <p>Dieses Event hat keine zugewiesenen Produkte.</p>
          </div>
        ) : (
          <>
            <div className="flex justify-between items-center mb-4 p-3 bg-blue-50 rounded-lg">
              <span className="text-sm font-medium text-blue-800">
                ✅ {Object.values(selectedProductsForReorder).filter(Boolean).length} von {eventProducts.length}{" "}
                Produkten ausgewählt
              </span>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => selectAllProductsForReorder(true)}>
                  ✅ Alle auswählen
                </Button>
                <Button variant="outline" size="sm" onClick={() => selectAllProductsForReorder(false)}>
                  ❌ Keine auswählen
                </Button>
                <Button
                  onClick={handleReorderConfirm}
                  disabled={Object.values(selectedProductsForReorder).filter(Boolean).length === 0}
                  className="bg-green-600 hover:bg-green-700"
                >
                  ➕ Ausgewählte hinzufügen ({Object.values(selectedProductsForReorder).filter(Boolean).length})
                </Button>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {eventProducts.map((eventProduct) => {
                if (!eventProduct.product) return null
                const isSelected = selectedProductsForReorder[eventProduct.product.name]
                return (
                  <Card
                    key={eventProduct.id}
                    className={`cursor-pointer transition-all ${
                      isSelected ? "bg-blue-50 border-blue-300 shadow-md" : "hover:bg-gray-50 border-gray-200"
                    }`}
                    onClick={() => toggleProductForReorder(eventProduct.product!.name)}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-center space-x-4">
                        <Checkbox checked={isSelected} className="h-5 w-5" />
                        <div className="flex-1">
                          <h4 className="font-semibold text-lg">{eventProduct.product.name}</h4>
                          <p className="text-blue-600 font-medium">
                            📦 {eventProduct.quantity} {eventProduct.product.unit}
                          </p>
                          {eventProduct.product.category && (
                            <p className="text-xs text-gray-500">🏷️ {eventProduct.product.category.name}</p>
                          )}
                        </div>
                        {isSelected && <CheckCircle2 className="h-6 w-6 text-blue-600" />}
                      </div>
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          </>
        )
      ) : // Ingredients view
      eventIngredients.length === 0 ? (
        <div className="text-center text-gray-500 py-12">
          <Package className="mx-auto h-16 w-16 text-gray-400 mb-4" />
          <h3 className="text-lg font-medium">Keine Zutaten gefunden</h3>
          <p>Für dieses Event wurden keine Zutaten berechnet.</p>
        </div>
      ) : (
        <>
          <div className="flex justify-between items-center mb-4 p-3 bg-green-50 rounded-lg">
            <span className="text-sm font-medium text-green-800">
              ✅ {Object.values(selectedIngredientsForReorder).filter(Boolean).length} von {eventIngredients.length}{" "}
              Zutaten ausgewählt
            </span>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => selectAllIngredientsForReorder(true)}>
                ✅ Alle auswählen
              </Button>
              <Button variant="outline" size="sm" onClick={() => selectAllIngredientsForReorder(false)}>
                ❌ Keine auswählen
              </Button>
              <Button
                onClick={handleReorderConfirm}
                disabled={Object.values(selectedIngredientsForReorder).filter(Boolean).length === 0}
                className="bg-green-600 hover:bg-green-700"
              >
                ➕ Ausgewählte hinzufügen ({Object.values(selectedIngredientsForReorder).filter(Boolean).length})
              </Button>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {eventIngredients.map((eventIngredient, index) => {
              const isSelected = selectedIngredientsForReorder[eventIngredient.ingredient_name]
              return (
                <Card
                  key={`${eventIngredient.ingredient_id}-${index}`}
                  className={`cursor-pointer transition-all ${
                    isSelected ? "bg-green-50 border-green-300 shadow-md" : "hover:bg-gray-50 border-gray-200"
                  }`}
                  onClick={() => toggleIngredientForReorder(eventIngredient.ingredient_name)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-center space-x-4">
                      <Checkbox checked={isSelected} className="h-5 w-5" />
                      <div className="flex-1">
                        <h4 className="font-semibold text-lg">{eventIngredient.ingredient_name}</h4>
                        <p className="text-green-600 font-medium">
                          🥕 {Math.ceil(eventIngredient.quantity_needed)} {eventIngredient.ingredient_unit}
                        </p>
                        <div className="text-xs text-gray-500 mt-2">
                          📋 Verwendet in:{" "}
                          {eventIngredient.used_in_products.map((p) => `${p.product_name} (${p.quantity}x)`).join(", ")}
                        </div>
                      </div>
                      {isSelected && <CheckCircle2 className="h-6 w-6 text-green-600" />}
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        </>
      )}

      <Dialog open={isSaveOrderModalOpen} onOpenChange={setIsSaveOrderModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Bestellung speichern</DialogTitle>
            <DialogDescription>Geben Sie einen Namen für diese Bestellung ein.</DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Label htmlFor="order-name">Bestellungsname</Label>
            <Input
              id="order-name"
              value={newOrderName}
              onChange={(e) => setNewOrderName(e.target.value)}
              placeholder="z.B. Wochenbestellung KW 45"
              className="mt-2"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsSaveOrderModalOpen(false)}>
              Abbrechen
            </Button>
            <Button
              onClick={async () => {
                if (!newOrderName.trim()) {
                  toast({
                    title: "Fehler",
                    description: "Bitte geben Sie einen Namen für die Bestellung ein.",
                    variant: "destructive",
                  })
                  return
                }

                const newOrder: SavedOrder = {
                  id: Date.now().toString(),
                  name: newOrderName,
                  date: new Date().toISOString(),
                  orderQuantities: { ...orderQuantities },
                  notes: orderNotes,
                  favorite: false,
                }

                const updatedOrders = [...savedOrders, newOrder]
                setSavedOrders(updatedOrders)

                await saveUserPreferences("default_user", "bestellungen", {
                  orderQuantities,
                  savedOrders: updatedOrders,
                  orderNotes,
                })

                setIsSaveOrderModalOpen(false)
                setNewOrderName("")

                toast({
                  title: "Erfolg",
                  description: `Bestellung "${newOrderName}" wurde gespeichert.`,
                })
              }}
            >
              Speichern
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
