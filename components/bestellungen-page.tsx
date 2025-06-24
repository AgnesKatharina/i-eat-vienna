"use client"

import { useState, useEffect, useMemo } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { useToast } from "@/components/ui/use-toast"
import {
  ArrowLeft,
  Search,
  Filter,
  Save,
  RefreshCw,
  Package,
  ShoppingCart,
  Calendar,
  CheckCircle2,
  Plus,
  Minus,
  Download,
  Upload,
  History,
  Star,
  X,
  Trash2,
} from "lucide-react"
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"

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
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid")

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
  const [isEventModalOpen, setIsEventModalOpen] = useState(false)
  const [isReorderModalOpen, setIsReorderModalOpen] = useState(false)

  const [isSaveOrderModalOpen, setIsSaveOrderModalOpen] = useState(false)
  const [isLoadOrderModalOpen, setIsLoadOrderModalOpen] = useState(false)
  const [newOrderName, setNewOrderName] = useState("")
  const [selectedOrderToLoad, setSelectedOrderToLoad] = useState<SavedOrder | null>(null)

  useEffect(() => {
    async function loadData() {
      setLoading(true)
      try {
        const productsData = await getAllProducts()
        setProducts(productsData)

        const categories: Record<string, boolean> = {}
        productsData.forEach((product) => {
          if (product.category) {
            categories[product.category.name] = true
          }
        })
        setSelectedCategories(categories)

        const packagingData: Record<number, { amount_per_package: number; packaging_unit: string }> = {}
        const recipesData: Record<number, any[]> = {}

        for (const product of productsData) {
          const packaging = await getProductPackaging(product.id)
          if (packaging) {
            packagingData[product.id] = {
              amount_per_package: packaging.amount_per_package,
              packaging_unit: packaging.packaging_unit,
            }
          }

          const recipes = await getProductRecipes(product.id)
          if (recipes.length > 0) {
            recipesData[product.id] = recipes
          }
        }

        setPackagingUnits(packagingData)
        setProductRecipes(recipesData)

        const savedPreferences = await getUserPreferences("default_user", "bestellungen")
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

        const eventsData = await getEventsFromSupabase()
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

  const handleCategoryChange = (category: string, checked: boolean) => {
    setSelectedCategories((prev) => ({ ...prev, [category]: checked }))
  }

  const handleSelectAllCategories = (select: boolean) => {
    const newCategories: Record<string, boolean> = {}
    categories.forEach((category) => {
      newCategories[category] = select
    })
    setSelectedCategories(newCategories)
  }

  const handleQuantityChange = (productId: number, quantity: number) => {
    setOrderQuantities((prev) => ({
      ...prev,
      [productId]: Math.max(0, quantity),
    }))
  }

  const handleQuickAdd = (productId: number, amount = 1) => {
    setOrderQuantities((prev) => ({
      ...prev,
      [productId]: (prev[productId] || 0) + amount,
    }))
  }

  const handleClearProduct = (productId: number) => {
    setOrderQuantities((prev) => {
      const newQuantities = { ...prev }
      delete newQuantities[productId]
      return newQuantities
    })
  }

  const handleSaveOrder = async () => {
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
  }

  const handleLoadOrder = (order: SavedOrder) => {
    setOrderQuantities(order.orderQuantities)
    setOrderNotes(order.notes || "")
    setIsLoadOrderModalOpen(false)

    toast({
      title: "Erfolg",
      description: `Bestellung "${order.name}" wurde geladen.`,
    })
  }

  const handleDeleteSavedOrder = async (orderId: string) => {
    const updatedOrders = savedOrders.filter((order) => order.id !== orderId)
    setSavedOrders(updatedOrders)

    await saveUserPreferences("default_user", "bestellungen", {
      orderQuantities,
      savedOrders: updatedOrders,
      orderNotes,
    })

    toast({
      title: "Erfolg",
      description: "Bestellung wurde gelöscht.",
    })
  }

  const handleToggleFavorite = async (orderId: string) => {
    const updatedOrders = savedOrders.map((order) =>
      order.id === orderId ? { ...order, favorite: !order.favorite } : order,
    )
    setSavedOrders(updatedOrders)

    await saveUserPreferences("default_user", "bestellungen", {
      orderQuantities,
      savedOrders: updatedOrders,
      orderNotes,
    })
  }

  const handleResetOrder = () => {
    setOrderQuantities({})
    setOrderNotes("")
    toast({
      title: "Zurückgesetzt",
      description: "Alle Bestellmengen wurden zurückgesetzt.",
    })
  }

  const handleSaveCurrentOrder = async () => {
    setIsSaving(true)
    try {
      await saveUserPreferences("default_user", "bestellungen", {
        orderQuantities,
        savedOrders,
        orderNotes,
      })

      toast({
        title: "Erfolg",
        description: "Aktuelle Bestellung wurde gespeichert.",
      })
    } catch (error) {
      toast({
        title: "Fehler",
        description: "Bestellung konnte nicht gespeichert werden.",
        variant: "destructive",
      })
    } finally {
      setIsSaving(false)
    }
  }

  const handleEventSelect = async (event: Event) => {
    setSelectedEvent(event)
    setIsEventModalOpen(false)

    console.log(`Loading data for event: ${event.name} (ID: ${event.id})`)

    // Load both products and ingredients
    const [products, ingredients] = await Promise.all([
      getEventProductsFromSupabase(event.id),
      getEventIngredientsFromSupabase(event.id),
    ])

    console.log(`Loaded ${products.length} products and ${ingredients.length} ingredients for event ${event.name}`)

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
    setIsReorderModalOpen(true)
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
    setIsReorderModalOpen(false)
    setSelectedEvent(null)
    setEventProducts([])
    setEventIngredients([])

    const itemType = showIngredients ? "Zutaten" : "Produkte"
    toast({
      title: "Erfolg",
      description: `${itemType} von Event "${selectedEvent?.name}" wurden zur Bestellung hinzugefügt.`,
    })
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

  const formatPackagingInfo = (product: ProductWithCategory) => {
    const packaging = packagingUnits[product.id]
    if (!packaging) return "Keine Verpackungsinfo"
    return `${packaging.amount_per_package} ${product.unit} pro ${packaging.packaging_unit}`
  }

  const renderProductCard = (product: ProductWithCategory) => {
    const currentQuantity = orderQuantities[product.id] || 0
    const packaging = packagingUnits[product.id]
    const recipes = productRecipes[product.id] || []

    return (
      <Card
        key={product.id}
        className={`overflow-hidden transition-all ${currentQuantity > 0 ? "ring-2 ring-blue-200 bg-blue-50" : ""}`}
      >
        <CardContent className="p-4">
          <div className="flex flex-col h-full">
            <div className="mb-4">
              <div className="flex justify-between items-start mb-2">
                <div className="flex-1">
                  <h3 className="font-medium text-lg">{product.name}</h3>
                  <p className="text-sm text-gray-500">{product.category?.name}</p>
                </div>
                <Badge variant={packaging ? "outline" : "secondary"}>{product.unit}</Badge>
              </div>

              {packaging && (
                <p className="text-sm text-gray-600 flex items-center gap-1 mb-2">
                  <Package className="h-4 w-4" />
                  {formatPackagingInfo(product)}
                </p>
              )}

              {recipes.length > 0 && (
                <p className="text-xs text-blue-600 mb-2">
                  {recipes.length} Rezept{recipes.length !== 1 ? "e" : ""} verfügbar
                </p>
              )}
            </div>

            <div className="mt-auto space-y-3">
              <div className="flex gap-1">
                <Button variant="outline" size="sm" onClick={() => handleQuickAdd(product.id, 1)} className="flex-1">
                  +1
                </Button>
                <Button variant="outline" size="sm" onClick={() => handleQuickAdd(product.id, 5)} className="flex-1">
                  +5
                </Button>
                {packaging && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleQuickAdd(product.id, packaging.amount_per_package)}
                    className="flex-1 text-xs"
                  >
                    +1 {packaging.packaging_unit}
                  </Button>
                )}
              </div>

              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => handleQuantityChange(product.id, currentQuantity - 1)}
                  disabled={currentQuantity === 0}
                >
                  <Minus className="h-4 w-4" />
                </Button>

                <Input
                  type="number"
                  min="0"
                  value={currentQuantity}
                  onChange={(e) => handleQuantityChange(product.id, Number.parseInt(e.target.value) || 0)}
                  className="h-8 text-center flex-1"
                />

                <Button
                  variant="outline"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => handleQuantityChange(product.id, currentQuantity + 1)}
                >
                  <Plus className="h-4 w-4" />
                </Button>

                {currentQuantity > 0 && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-red-500 hover:text-red-700"
                    onClick={() => handleClearProduct(product.id)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>

              {currentQuantity > 0 && packaging && (
                <div className="text-sm text-gray-600 bg-gray-50 p-2 rounded">
                  <div className="flex items-center justify-between">
                    <span>
                      {currentQuantity} × {product.unit}
                    </span>
                    <span className="font-medium">
                      = {Math.ceil(currentQuantity / packaging.amount_per_package)} {packaging.packaging_unit}
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center justify-between">
        <Button variant="outline" onClick={() => router.push("/app")} className="flex items-center gap-2">
          <ArrowLeft className="h-4 w-4" />
          Zurück zum Menü
        </Button>
        <h1 className="text-2xl font-bold">Bestellungen</h1>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setIsEventModalOpen(true)} className="flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            Event nachbestellen
          </Button>
          <Button variant="outline" onClick={() => setIsLoadOrderModalOpen(true)} className="flex items-center gap-2">
            <History className="h-4 w-4" />
            Bestellung laden
          </Button>
          <Button variant="outline" onClick={handleResetOrder} className="flex items-center gap-2">
            <RefreshCw className="h-4 w-4" />
            Zurücksetzen
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
                <Button
                  onClick={handleSaveCurrentOrder}
                  disabled={isSaving}
                  variant="outline"
                  className="flex items-center gap-2"
                >
                  <Download className="h-4 w-4" />
                  {isSaving ? "Speichere..." : "Aktuell speichern"}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="products">
            Produkte
            <Badge variant="secondary" className="ml-2">
              {filteredProducts.length}
            </Badge>
          </TabsTrigger>
          <TabsTrigger value="order">
            Aktuelle Bestellung
            <Badge variant="secondary" className="ml-2">
              {orderSummary.totalProducts}
            </Badge>
          </TabsTrigger>
          <TabsTrigger value="saved">
            Gespeicherte Bestellungen
            <Badge variant="secondary" className="ml-2">
              {savedOrders.length}
            </Badge>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="products" className="space-y-4">
          <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
            <div className="flex w-full md:w-auto gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />
                <Input
                  placeholder="Produkt suchen..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Sortieren nach" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="name">Name</SelectItem>
                  <SelectItem value="category">Kategorie</SelectItem>
                  <SelectItem value="unit">Einheit</SelectItem>
                  <SelectItem value="ordered">Bestellt</SelectItem>
                </SelectContent>
              </Select>
              <Button
                variant={showFilters ? "default" : "outline"}
                onClick={() => setShowFilters(!showFilters)}
                className="flex items-center gap-2"
              >
                <Filter className="h-4 w-4" />
                Filter
              </Button>
            </div>
          </div>

          {showFilters && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex justify-between items-center">
                  <span>Kategorien filtern</span>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => handleSelectAllCategories(true)}>
                      Alle auswählen
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => handleSelectAllCategories(false)}>
                      Keine auswählen
                    </Button>
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {categories.map((category) => (
                    <div key={category} className="flex items-center space-x-2">
                      <Checkbox
                        id={`category-${category}`}
                        checked={selectedCategories[category] || false}
                        onCheckedChange={(checked) => handleCategoryChange(category, checked === true)}
                      />
                      <Label htmlFor={`category-${category}`}>{category}</Label>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

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
          ) : filteredProducts.length === 0 ? (
            <div className="text-center py-12">
              <Package className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-4 text-lg font-medium">Keine Produkte gefunden</h3>
              <p className="mt-2 text-gray-500">Versuchen Sie, Ihre Suchkriterien zu ändern oder Filter anzupassen.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredProducts.map(renderProductCard)}
            </div>
          )}
        </TabsContent>

        <TabsContent value="order" className="space-y-4">
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-medium">Aktuelle Bestellung</h3>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setIsSaveOrderModalOpen(true)}>
                  <Save className="h-4 w-4 mr-2" />
                  Speichern
                </Button>
                <Button variant="outline" onClick={handleResetOrder}>
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Zurücksetzen
                </Button>
              </div>
            </div>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Notizen zur Bestellung</CardTitle>
              </CardHeader>
              <CardContent>
                <Textarea
                  placeholder="Zusätzliche Notizen oder Anweisungen..."
                  value={orderNotes}
                  onChange={(e) => setOrderNotes(e.target.value)}
                  rows={3}
                />
              </CardContent>
            </Card>

            {Object.entries(orderQuantities).filter(([_, qty]) => qty > 0).length === 0 ? (
              <div className="text-center py-12">
                <ShoppingCart className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-4 text-lg font-medium">Keine Produkte bestellt</h3>
                <p className="mt-2 text-gray-500">Gehen Sie zum Produkte-Tab, um Artikel hinzuzufügen.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {Object.entries(orderQuantities)
                  .filter(([_, qty]) => qty > 0)
                  .map(([productId, quantity]) => {
                    const product = products.find((p) => p.id === Number.parseInt(productId))
                    if (!product) return null

                    const packaging = packagingUnits[product.id]

                    return (
                      <Card key={productId}>
                        <CardContent className="p-4">
                          <div className="flex items-center justify-between">
                            <div className="flex-1">
                              <h4 className="font-medium">{product.name}</h4>
                              <p className="text-sm text-gray-500">{product.category?.name}</p>
                              {packaging && (
                                <p className="text-sm text-gray-600">
                                  {Math.ceil(quantity / packaging.amount_per_package)} {packaging.packaging_unit}(
                                  {quantity} {product.unit})
                                </p>
                              )}
                            </div>
                            <div className="flex items-center gap-2">
                              <Button
                                variant="outline"
                                size="icon"
                                className="h-8 w-8"
                                onClick={() => handleQuantityChange(product.id, quantity - 1)}
                              >
                                <Minus className="h-4 w-4" />
                              </Button>
                              <span className="w-12 text-center font-medium">{quantity}</span>
                              <Button
                                variant="outline"
                                size="icon"
                                className="h-8 w-8"
                                onClick={() => handleQuantityChange(product.id, quantity + 1)}
                              >
                                <Plus className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-red-500 hover:text-red-700"
                                onClick={() => handleClearProduct(product.id)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    )
                  })}
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="saved" className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-medium">Gespeicherte Bestellungen</h3>
            <Button onClick={() => setIsSaveOrderModalOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Neue Bestellung speichern
            </Button>
          </div>

          {savedOrders.length === 0 ? (
            <div className="text-center py-12">
              <History className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-4 text-lg font-medium">Keine gespeicherten Bestellungen</h3>
              <p className="mt-2 text-gray-500">
                Speichern Sie Ihre erste Bestellung, um sie später wiederzuverwenden.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {savedOrders
                .sort((a, b) => (b.favorite ? 1 : 0) - (a.favorite ? 1 : 0))
                .map((order) => {
                  const orderTotal = Object.values(order.orderQuantities).reduce((sum, qty) => sum + qty, 0)
                  const productCount = Object.values(order.orderQuantities).filter((qty) => qty > 0).length

                  return (
                    <Card key={order.id} className={order.favorite ? "border-yellow-200 bg-yellow-50" : ""}>
                      <CardContent className="p-4">
                        <div className="space-y-3">
                          <div className="flex items-start justify-between">
                            <div>
                              <h4 className="font-medium flex items-center gap-2">
                                {order.name}
                                {order.favorite && <Star className="h-4 w-4 text-yellow-500 fill-current" />}
                              </h4>
                              <p className="text-sm text-gray-500">
                                {new Date(order.date).toLocaleDateString("de-DE")}
                              </p>
                            </div>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleToggleFavorite(order.id)}
                              className="h-8 w-8"
                            >
                              <Star
                                className={`h-4 w-4 ${order.favorite ? "text-yellow-500 fill-current" : "text-gray-400"}`}
                              />
                            </Button>
                          </div>

                          <div className="flex justify-between text-sm">
                            <span>{productCount} Produkte</span>
                            <span>{orderTotal} Einheiten</span>
                          </div>

                          {order.notes && <p className="text-sm text-gray-600 bg-gray-50 p-2 rounded">{order.notes}</p>}

                          <div className="flex gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleLoadOrder(order)}
                              className="flex-1"
                            >
                              <Upload className="h-4 w-4 mr-1" />
                              Laden
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDeleteSavedOrder(order.id)}
                              className="text-red-500 hover:text-red-700"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  )
                })}
            </div>
          )}
        </TabsContent>
      </Tabs>

      <Dialog open={isEventModalOpen} onOpenChange={setIsEventModalOpen}>
        <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Event für Nachbestellung auswählen</DialogTitle>
            <DialogDescription>Wählen Sie ein Event aus, um dessen Produkte nachzubestellen.</DialogDescription>
          </DialogHeader>
          <div className="space-y-2 py-4">
            {events.length === 0 ? (
              <p className="text-center text-gray-500 py-8">Keine Events gefunden</p>
            ) : (
              events.map((event) => (
                <div
                  key={event.id}
                  className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50 cursor-pointer"
                  onClick={() => handleEventSelect(event)}
                >
                  <div>
                    <h3 className="font-medium">{event.name}</h3>
                    <div className="text-sm text-gray-500">
                      {event.type} • {event.date ? new Date(event.date).toLocaleDateString("de-DE") : "Kein Datum"}
                    </div>
                    {(event.ft || event.ka) && (
                      <div className="text-xs text-gray-400 mt-1">
                        {event.ft && `FT: ${event.ft}`} {event.ft && event.ka && " • "} {event.ka && `KA: ${event.ka}`}
                      </div>
                    )}
                  </div>
                  <Button variant="outline" size="sm">
                    Auswählen
                  </Button>
                </div>
              ))
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEventModalOpen(false)}>
              Abbrechen
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isReorderModalOpen} onOpenChange={setIsReorderModalOpen}>
        <DialogContent className="sm:max-w-[800px] max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Produkte/Zutaten nachbestellen</DialogTitle>
            <DialogDescription>
              Wählen Sie die Produkte oder Zutaten aus Event "{selectedEvent?.name}" aus, die Sie nachbestellen möchten.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            {/* Toggle between products and ingredients */}
            <div className="flex gap-2 mb-4">
              <Button
                variant={!showIngredients ? "default" : "outline"}
                onClick={() => setShowIngredients(false)}
                className="flex-1"
              >
                Produkte ({eventProducts.length})
              </Button>
              <Button
                variant={showIngredients ? "default" : "outline"}
                onClick={() => setShowIngredients(true)}
                className="flex-1"
              >
                Zutaten ({eventIngredients.length})
              </Button>
            </div>

            {!showIngredients ? (
              // Products view
              eventProducts.length === 0 ? (
                <p className="text-center text-gray-500 py-8">Keine Produkte in diesem Event gefunden</p>
              ) : (
                <>
                  <div className="flex justify-between items-center mb-4">
                    <span className="text-sm text-gray-600">
                      {Object.values(selectedProductsForReorder).filter(Boolean).length} von {eventProducts.length}{" "}
                      Produkten ausgewählt
                    </span>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" onClick={() => selectAllProductsForReorder(true)}>
                        Alle auswählen
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => selectAllProductsForReorder(false)}>
                        Keine auswählen
                      </Button>
                    </div>
                  </div>
                  <div className="space-y-2 max-h-[400px] overflow-y-auto">
                    {eventProducts.map((eventProduct) => {
                      if (!eventProduct.product) return null
                      const isSelected = selectedProductsForReorder[eventProduct.product.name]
                      return (
                        <div
                          key={eventProduct.id}
                          className={`flex items-center justify-between p-3 border rounded-lg cursor-pointer transition-colors ${
                            isSelected ? "bg-blue-50 border-blue-200" : "hover:bg-gray-50"
                          }`}
                          onClick={() => toggleProductForReorder(eventProduct.product!.name)}
                        >
                          <div className="flex items-center space-x-3">
                            <Checkbox
                              checked={isSelected}
                              onChange={() => toggleProductForReorder(eventProduct.product!.name)}
                            />
                            <div>
                              <h4 className="font-medium">{eventProduct.product.name}</h4>
                              <p className="text-sm text-gray-500">
                                {eventProduct.quantity} {eventProduct.product.unit}
                              </p>
                              {eventProduct.product.category && (
                                <p className="text-xs text-gray-400">{eventProduct.product.category.name}</p>
                              )}
                            </div>
                          </div>
                          {isSelected && <CheckCircle2 className="h-5 w-5 text-blue-600" />}
                        </div>
                      )
                    })}
                  </div>
                </>
              )
            ) : // Ingredients view
            eventIngredients.length === 0 ? (
              <p className="text-center text-gray-500 py-8">Keine Zutaten für dieses Event gefunden</p>
            ) : (
              <>
                <div className="flex justify-between items-center mb-4">
                  <span className="text-sm text-gray-600">
                    {Object.values(selectedIngredientsForReorder).filter(Boolean).length} von {eventIngredients.length}{" "}
                    Zutaten ausgewählt
                  </span>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => selectAllIngredientsForReorder(true)}>
                      Alle auswählen
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => selectAllIngredientsForReorder(false)}>
                      Keine auswählen
                    </Button>
                  </div>
                </div>
                <div className="space-y-2 max-h-[400px] overflow-y-auto">
                  {eventIngredients.map((eventIngredient, index) => {
                    const isSelected = selectedIngredientsForReorder[eventIngredient.ingredient_name]
                    return (
                      <div
                        key={`${eventIngredient.ingredient_id}-${index}`}
                        className={`flex items-center justify-between p-3 border rounded-lg cursor-pointer transition-colors ${
                          isSelected ? "bg-green-50 border-green-200" : "hover:bg-gray-50"
                        }`}
                        onClick={() => toggleIngredientForReorder(eventIngredient.ingredient_name)}
                      >
                        <div className="flex items-center space-x-3">
                          <Checkbox
                            checked={isSelected}
                            onChange={() => toggleIngredientForReorder(eventIngredient.ingredient_name)}
                          />
                          <div className="flex-1">
                            <h4 className="font-medium">{eventIngredient.ingredient_name}</h4>
                            <p className="text-sm text-gray-500">
                              {Math.ceil(eventIngredient.quantity_needed)} {eventIngredient.ingredient_unit}
                            </p>
                            <div className="text-xs text-gray-400 mt-1">
                              Verwendet in:{" "}
                              {eventIngredient.used_in_products
                                .map((p) => `${p.product_name} (${p.quantity}x)`)
                                .join(", ")}
                            </div>
                          </div>
                        </div>
                        {isSelected && <CheckCircle2 className="h-5 w-5 text-green-600" />}
                      </div>
                    )
                  })}
                </div>
              </>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsReorderModalOpen(false)}>
              Abbrechen
            </Button>
            <Button
              onClick={handleReorderConfirm}
              disabled={
                showIngredients
                  ? Object.values(selectedIngredientsForReorder).filter(Boolean).length === 0
                  : Object.values(selectedProductsForReorder).filter(Boolean).length === 0
              }
            >
              {showIngredients ? "Ausgewählte Zutaten" : "Ausgewählte Produkte"} hinzufügen (
              {showIngredients
                ? Object.values(selectedIngredientsForReorder).filter(Boolean).length
                : Object.values(selectedProductsForReorder).filter(Boolean).length}
              )
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
            <Button onClick={handleSaveOrder}>Speichern</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
