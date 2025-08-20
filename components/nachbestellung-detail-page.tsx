"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Textarea } from "@/components/ui/textarea"
import { ArrowLeft, Search, Package, ChefHat, ShoppingCart, Plus, Minus, FileText, Wrench, List } from "lucide-react"
import { createClient } from "@/lib/supabase-client"
import {
  getAllFoodtruckEquipment,
  getFoodtruckName,
  calculateIngredientsForEvent,
} from "@/lib/foodtruck-equipment-service"
import { createNachbestellung } from "@/lib/nachbestellung-service"
import { toast } from "@/hooks/use-toast"

interface Event {
  id: string
  name: string
  type: string
  date: string | null
  end_date: string | null
}

interface Product {
  id: string
  name: string
  category: string
  quantity: number
  unit: string
  packagingUnit: string
  reorderQuantity: number
}

interface Ingredient {
  id: string
  name: string
  quantity: number
  unit: string
  category: string
  packagingUnit: string
  used_in_products: string[]
  reorderQuantity: number
}

interface Equipment {
  id: string
  name: string
  foodtruck: string
  unit: string
  packagingUnit: string
  reorderQuantity: number
}

interface NachbestellungDetailPageProps {
  eventId: string
}

// Helper function to determine packaging unit based on ingredient/product name and unit
const getPackagingUnit = (name: string, unit: string): string => {
  const nameLower = name.toLowerCase()
  const unitLower = unit.toLowerCase()

  // Mapping based on common ingredient types
  if (nameLower.includes("öl") || nameLower.includes("essig") || nameLower.includes("sauce")) {
    return "Flasche"
  }
  if (nameLower.includes("mehl") || nameLower.includes("zucker") || nameLower.includes("salz")) {
    return "Sackerl"
  }
  if (nameLower.includes("marmelade") || nameLower.includes("honig") || nameLower.includes("mus")) {
    return "Glas"
  }
  if (nameLower.includes("milch") || nameLower.includes("sahne") || nameLower.includes("joghurt")) {
    return "Packung"
  }
  if (nameLower.includes("käse") || nameLower.includes("butter") || nameLower.includes("wurst")) {
    return "Packung"
  }
  if (nameLower.includes("brot") || nameLower.includes("brötchen")) {
    return "Stück"
  }
  if (nameLower.includes("ei")) {
    return "Stück"
  }
  if (nameLower.includes("dose") || nameLower.includes("konserve")) {
    return "Dose"
  }

  // Default based on unit type
  if (unitLower.includes("ml") || unitLower.includes("liter")) {
    return "Flasche"
  }
  if (unitLower.includes("g") || unitLower.includes("kg")) {
    return "Packung"
  }

  return "Stück"
}

export function NachbestellungDetailPage({ eventId }: NachbestellungDetailPageProps) {
  const router = useRouter()
  const [event, setEvent] = useState<Event | null>(null)
  const [products, setProducts] = useState<Product[]>([])
  const [ingredients, setIngredients] = useState<Ingredient[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState("products")
  const [notes, setNotes] = useState("")
  const [isCreating, setIsCreating] = useState(false)
  const [allProducts, setAllProducts] = useState<Product[]>([])
  const [equipmentProducts, setEquipmentProducts] = useState<Equipment[]>([])

  useEffect(() => {
    loadEventData()
  }, [eventId])

  const loadEventData = async () => {
    try {
      setLoading(true)
      const supabase = createClient()

      console.log("🚀 === STARTING EVENT DATA LOAD ===")
      console.log("📅 Event ID:", eventId)

      // Get event details
      const { data: eventData, error: eventError } = await supabase
        .from("events")
        .select("*")
        .eq("id", eventId)
        .single()

      if (eventError) {
        console.error("❌ Error loading event:", eventError)
        toast({
          title: "Fehler",
          description: "Event konnte nicht geladen werden",
          variant: "destructive",
        })
        return
      }

      console.log("✅ Event data loaded:", eventData)
      setEvent(eventData)

      // Load event products - using the correct column names
      console.log("🍽️ === LOADING EVENT PRODUCTS ===")
      const { data: eventProductsData, error: eventProductsError } = await supabase
        .from("event_products")
        .select("*")
        .eq("event_id", Number.parseInt(eventId))

      console.log("📦 Raw event_products data:", eventProductsData)
      console.log("📦 Event products count:", eventProductsData?.length || 0)

      if (eventProductsError) {
        console.error("❌ Error loading event products:", eventProductsError)
      }

      // Transform event products to the expected format
      const transformedProducts: Product[] = []

      if (eventProductsData && eventProductsData.length > 0) {
        console.log("🔄 Processing event products...")
        eventProductsData.forEach((eventProduct, index) => {
          console.log(`🔍 Processing event product ${index + 1}:`, eventProduct)

          const productName = eventProduct.product_name || "Unknown Product"
          const unit = eventProduct.unit || "Stück"
          const category = "Event Product" // We don't have category info from event_products

          const transformedProduct = {
            id: eventProduct.id.toString(),
            name: productName,
            category: category,
            quantity: eventProduct.quantity || 0,
            unit: unit,
            packagingUnit: getPackagingUnit(productName, unit),
            reorderQuantity: 0,
          }

          transformedProducts.push(transformedProduct)
          console.log("✅ Added transformed product:", transformedProduct)
        })
      } else {
        console.log("⚠️ No event products found for event ID:", eventId)
      }

      console.log("📦 Final transformed products:", transformedProducts)
      setProducts(transformedProducts)

      // Load ingredients using the new service
      console.log("🥬 === LOADING INGREDIENTS ===")
      try {
        const calculatedIngredients = await calculateIngredientsForEvent(eventId)

        // Transform EventIngredient to Ingredient format
        const transformedIngredients: Ingredient[] = calculatedIngredients.map((eventIngredient) => ({
          id: eventIngredient.ingredient_id,
          name: eventIngredient.ingredient_name,
          quantity: eventIngredient.total_amount,
          unit: eventIngredient.unit,
          category: "Zutat",
          packagingUnit: getPackagingUnit(eventIngredient.ingredient_name, eventIngredient.unit),
          used_in_products: eventIngredient.used_in_products,
          reorderQuantity: 0,
        }))

        console.log("🎯 Final transformed ingredients:", transformedIngredients)
        setIngredients(transformedIngredients)
      } catch (ingredientError) {
        console.error("❌ Error loading ingredients:", ingredientError)
        setIngredients([])
      }

      // Load all products from database for "Alle Produkte" tab
      console.log("📚 Loading all products...")
      const { data: allProductsData, error: allProductsError } = await supabase
        .from("products")
        .select(`
          id,
          name,
          unit,
          categories(name)
        `)
        .order("name")

      if (!allProductsError && allProductsData) {
        const transformedAllProducts: Product[] = allProductsData.map((product) => ({
          id: product.id.toString(),
          name: product.name,
          category: product.categories?.name || "Uncategorized",
          quantity: 0,
          unit: product.unit,
          packagingUnit: getPackagingUnit(product.name, product.unit),
          reorderQuantity: 0,
        }))
        setAllProducts(transformedAllProducts)
        console.log("✅ All products loaded:", transformedAllProducts.length)
      }

      // Load foodtruck equipment from new table
      console.log("🚛 Loading foodtruck equipment...")
      try {
        const equipmentData = await getAllFoodtruckEquipment()
        console.log("✅ Loaded foodtruck equipment:", equipmentData)

        const transformedEquipment: Equipment[] = equipmentData.map((equipment) => ({
          id: equipment.id.toString(),
          name: equipment.name,
          foodtruck: getFoodtruckName(equipment.foodtruck),
          unit: equipment.unit,
          packagingUnit: equipment.unit,
          reorderQuantity: 0,
        }))
        setEquipmentProducts(transformedEquipment)
        console.log("✅ Equipment transformed:", transformedEquipment.length)
      } catch (equipmentError) {
        console.error("❌ Error loading equipment:", equipmentError)
        setEquipmentProducts([])
      }

      console.log("🎉 === EVENT DATA LOAD COMPLETE ===")
    } catch (error) {
      console.error("💥 Fatal error loading event data:", error)
      toast({
        title: "Fehler",
        description: "Daten konnten nicht geladen werden",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const filteredProducts = products.filter(
    (product) =>
      product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      product.category.toLowerCase().includes(searchTerm.toLowerCase()),
  )

  const filteredIngredients = ingredients.filter(
    (ingredient) =>
      ingredient.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      ingredient.category.toLowerCase().includes(searchTerm.toLowerCase()),
  )

  const filteredAllProducts = allProducts.filter(
    (product) =>
      product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      product.category.toLowerCase().includes(searchTerm.toLowerCase()),
  )

  const filteredEquipmentProducts = equipmentProducts.filter(
    (equipment) =>
      equipment.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      equipment.foodtruck.toLowerCase().includes(searchTerm.toLowerCase()),
  )

  const handleProductQuantityChange = (productId: string, value: number) => {
    setProducts(
      products.map((product) => (product.id === productId ? { ...product, reorderQuantity: value } : product)),
    )
  }

  const handleIngredientQuantityChange = (ingredientId: string, value: number) => {
    setIngredients(
      ingredients.map((ingredient) =>
        ingredient.id === ingredientId ? { ...ingredient, reorderQuantity: value } : ingredient,
      ),
    )
  }

  const handleAllProductQuantityChange = (productId: string, value: number) => {
    setAllProducts(
      allProducts.map((product) => (product.id === productId ? { ...product, reorderQuantity: value } : product)),
    )
  }

  const handleEquipmentQuantityChange = (equipmentId: string, value: number) => {
    setEquipmentProducts(
      equipmentProducts.map((equipment) =>
        equipment.id === equipmentId ? { ...equipment, reorderQuantity: value } : equipment,
      ),
    )
  }

  const handleCreateReorder = async () => {
    const selectedProductsData = products.filter((p) => p.reorderQuantity > 0)
    const selectedIngredientsData = ingredients.filter((i) => i.reorderQuantity > 0)
    const selectedAllProductsData = allProducts.filter((p) => p.reorderQuantity > 0)
    const selectedEquipmentData = equipmentProducts.filter((e) => e.reorderQuantity > 0)

    const totalSelected =
      selectedProductsData.length +
      selectedIngredientsData.length +
      selectedAllProductsData.length +
      selectedEquipmentData.length
    if (totalSelected === 0) {
      toast({
        title: "Keine Auswahl",
        description: "Bitte wählen Sie mindestens ein Produkt oder eine Zutat aus",
        variant: "destructive",
      })
      return
    }

    if (!event) {
      toast({
        title: "Fehler",
        description: "Event-Daten nicht verfügbar",
        variant: "destructive",
      })
      return
    }

    setIsCreating(true)

    try {
      const supabase = createClient()
      const {
        data: { user },
      } = await supabase.auth.getUser()

      const nachbestellungData = {
        event_id: Number.parseInt(eventId),
        event_name: event.name,
        products: selectedProductsData.map((p) => ({
          id: p.id,
          name: p.name,
          quantity: p.reorderQuantity,
          unit: p.unit,
          packagingUnit: p.packagingUnit,
          category: p.category,
        })),
        ingredients: selectedIngredientsData.map((i) => ({
          id: i.id,
          name: i.name,
          quantity: i.reorderQuantity,
          unit: i.unit,
          packagingUnit: i.packagingUnit,
          category: i.category,
        })),
        allProducts: selectedAllProductsData.map((p) => ({
          id: p.id,
          name: p.name,
          quantity: p.reorderQuantity,
          unit: p.unit,
          packagingUnit: p.packagingUnit,
          category: p.category,
        })),
        equipment: selectedEquipmentData.map((e) => ({
          id: e.id,
          name: e.name,
          quantity: e.reorderQuantity,
          unit: e.unit,
          packagingUnit: e.packagingUnit,
          category: e.foodtruck,
        })),
        notes: notes.trim() || undefined,
      }

      const result = await createNachbestellung(nachbestellungData, user?.id)

      if (result) {
        toast({
          title: "Nachbestellung erstellt",
          description: `${totalSelected} Artikel für Nachbestellung gespeichert`,
        })

        router.push("/app/nachbestellungen")
      } else {
        toast({
          title: "Fehler",
          description: "Nachbestellung konnte nicht erstellt werden",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("Error creating nachbestellung:", error)
      toast({
        title: "Fehler",
        description: "Ein unerwarteter Fehler ist aufgetreten",
        variant: "destructive",
      })
    } finally {
      setIsCreating(false)
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
            <p className="text-gray-600">Lade Event-Daten...</p>
          </div>
        </div>
      </div>
    )
  }

  if (!event) {
    return (
      <div className="container mx-auto p-6">
        <div className="text-center py-12">
          <h2 className="text-xl font-semibold mb-2">Event nicht gefunden</h2>
          <p className="text-gray-600 mb-4">Das angeforderte Event konnte nicht geladen werden.</p>
          <Button onClick={() => router.push("/app/nachbestellungen")}>Zurück zur Übersicht</Button>
        </div>
      </div>
    )
  }

  const selectedProductsCount = products.filter((p) => p.reorderQuantity > 0).length
  const selectedIngredientsCount = ingredients.filter((i) => i.reorderQuantity > 0).length
  const selectedAllProductsCount = allProducts.filter((p) => p.reorderQuantity > 0).length
  const selectedEquipmentCount = equipmentProducts.filter((e) => e.reorderQuantity > 0).length
  const totalSelectedCount =
    selectedProductsCount + selectedIngredientsCount + selectedAllProductsCount + selectedEquipmentCount

  return (
    <div className="container mx-auto p-4 sm:p-6 max-w-6xl">
      <div className="border border-gray-200 rounded-lg p-4 sm:p-6">
        {/* Header */}
        <div className="flex items-center gap-4 mb-6 sm:mb-8">
          <Button
            variant="outline"
            size="icon"
            onClick={() => router.push("/app/nachbestellungen")}
            className="border-gray-300 hover:bg-gray-50 flex-shrink-0"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex-1 min-w-0">
            <h1 className="text-xl sm:text-2xl font-semibold text-gray-900 mb-2 truncate">
              Nachbestellung für: {event.name}
            </h1>
            <p className="text-sm sm:text-base text-gray-600">
              {event.type} • {formatDateRange(event.date, event.end_date)}
            </p>
          </div>
        </div>

        {/* Search */}
        <div className="relative mb-6">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
          <Input
            placeholder="Produkte oder Zutaten suchen..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-4 mb-6">
            <TabsTrigger value="products" className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm">
              <ChefHat className="h-4 w-4" />
              <span className="hidden sm:inline">Produkte ({filteredProducts.length})</span>
              <span className="sm:hidden">Produkte ({filteredProducts.length})</span>
              {selectedProductsCount > 0 && (
                <Badge variant="secondary" className="ml-1 text-xs">
                  {selectedProductsCount}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="ingredients" className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm">
              <ShoppingCart className="h-4 w-4" />
              <span className="hidden sm:inline">Zutaten ({filteredIngredients.length})</span>
              <span className="sm:hidden">Zutaten ({filteredIngredients.length})</span>
              {selectedIngredientsCount > 0 && (
                <Badge variant="secondary" className="ml-1 text-xs">
                  {selectedIngredientsCount}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="equipment" className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm">
              <Wrench className="h-4 w-4" />
              <span className="hidden sm:inline">Equipment ({filteredEquipmentProducts.length})</span>
              <span className="sm:hidden">Equipment ({filteredEquipmentProducts.length})</span>
              {selectedEquipmentCount > 0 && (
                <Badge variant="secondary" className="ml-1 text-xs">
                  {selectedEquipmentCount}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="all-products" className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm">
              <List className="h-4 w-4" />
              <span className="hidden sm:inline">Alle Produkte ({filteredAllProducts.length})</span>
              <span className="sm:hidden">Alle ({filteredAllProducts.length})</span>
              {selectedAllProductsCount > 0 && (
                <Badge variant="secondary" className="ml-1 text-xs">
                  {selectedAllProductsCount}
                </Badge>
              )}
            </TabsTrigger>
          </TabsList>

          {/* Products Tab */}
          <TabsContent value="products" className="space-y-4">
            {filteredProducts.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <ChefHat className="h-12 w-12 text-gray-400 mb-4" />
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">Keine Produkte gefunden</h3>
                  <p className="text-gray-600 text-center">
                    {searchTerm
                      ? "Keine Produkte entsprechen Ihrer Suche."
                      : "Für dieses Event wurden keine Produkte gefunden."}
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-3">
                {filteredProducts.map((product) => (
                  <Card key={product.id} className="hover:shadow-sm transition-shadow">
                    <CardContent className="p-3 sm:p-4">
                      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold text-gray-900 truncate text-sm sm:text-base">{product.name}</h3>
                          <p className="text-xs text-gray-500">
                            {product.category} • {product.quantity} {product.unit} im Event
                          </p>
                        </div>

                        {/* Quantity selector */}
                        <div className="flex items-center justify-between sm:justify-end gap-2 flex-shrink-0">
                          <div className="flex items-center gap-1 sm:gap-2">
                            <Button
                              variant="outline"
                              size="icon"
                              className="h-8 w-8 rounded-md bg-transparent"
                              onClick={() => {
                                const newValue = Math.max(0, product.reorderQuantity - 1)
                                handleProductQuantityChange(product.id, newValue)
                              }}
                              disabled={product.reorderQuantity <= 0}
                            >
                              <Minus className="h-3 w-3" />
                            </Button>
                            <Input
                              type="number"
                              min="0"
                              value={product.reorderQuantity}
                              onChange={(e) => {
                                const value = Number.parseInt(e.target.value) || 0
                                handleProductQuantityChange(product.id, Math.max(0, value))
                              }}
                              className="h-8 w-14 sm:w-16 text-center text-xs sm:text-sm [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                            />
                            <Button
                              variant="outline"
                              size="icon"
                              className="h-8 w-8 rounded-md bg-transparent"
                              onClick={() => {
                                handleProductQuantityChange(product.id, product.reorderQuantity + 1)
                              }}
                            >
                              <Plus className="h-3 w-3" />
                            </Button>
                          </div>
                          <span className="text-xs sm:text-sm text-gray-600 min-w-0 truncate ml-1">
                            {product.packagingUnit}
                          </span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          {/* Ingredients Tab */}
          <TabsContent value="ingredients" className="space-y-4">
            {filteredIngredients.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <ShoppingCart className="h-12 w-12 text-gray-400 mb-4" />
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">Keine Zutaten gefunden</h3>
                  <p className="text-gray-600 text-center">
                    {searchTerm
                      ? "Keine Zutaten entsprechen Ihrer Suche."
                      : "Für dieses Event wurden keine Zutaten berechnet. Überprüfen Sie die Browser-Konsole für Details."}
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-3">
                {filteredIngredients.map((ingredient) => (
                  <Card key={ingredient.id} className="hover:shadow-sm transition-shadow">
                    <CardContent className="p-3 sm:p-4">
                      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold text-gray-900 truncate text-sm sm:text-base">
                            {ingredient.name}
                          </h3>
                          <p className="text-xs text-gray-500 truncate">
                            Benötigt: {ingredient.quantity} {ingredient.unit} • Verwendet in:{" "}
                            {ingredient.used_in_products.join(", ")}
                          </p>
                        </div>

                        {/* Quantity selector */}
                        <div className="flex items-center justify-between sm:justify-end gap-2 flex-shrink-0">
                          <div className="flex items-center gap-1 sm:gap-2">
                            <Button
                              variant="outline"
                              size="icon"
                              className="h-8 w-8 rounded-md bg-transparent"
                              onClick={() => {
                                const newValue = Math.max(0, ingredient.reorderQuantity - 1)
                                handleIngredientQuantityChange(ingredient.id, newValue)
                              }}
                              disabled={ingredient.reorderQuantity <= 0}
                            >
                              <Minus className="h-3 w-3" />
                            </Button>
                            <Input
                              type="number"
                              min="0"
                              value={ingredient.reorderQuantity}
                              onChange={(e) => {
                                const value = Number.parseInt(e.target.value) || 0
                                handleIngredientQuantityChange(ingredient.id, Math.max(0, value))
                              }}
                              className="h-8 w-14 sm:w-16 text-center text-xs sm:text-sm [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                            />
                            <Button
                              variant="outline"
                              size="icon"
                              className="h-8 w-8 rounded-md bg-transparent"
                              onClick={() => {
                                handleIngredientQuantityChange(ingredient.id, ingredient.reorderQuantity + 1)
                              }}
                            >
                              <Plus className="h-3 w-3" />
                            </Button>
                          </div>
                          <span className="text-xs sm:text-sm text-gray-600 min-w-0 truncate ml-1">
                            {ingredient.packagingUnit}
                          </span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          {/* Equipment Tab */}
          <TabsContent value="equipment" className="space-y-4">
            {filteredEquipmentProducts.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <Wrench className="h-12 w-12 text-gray-400 mb-4" />
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">Kein Equipment gefunden</h3>
                  <p className="text-gray-600 text-center">
                    {searchTerm ? "Kein Equipment entspricht Ihrer Suche." : "Kein Equipment verfügbar."}
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-3">
                {filteredEquipmentProducts.map((equipment) => (
                  <Card key={equipment.id} className="hover:shadow-sm transition-shadow">
                    <CardContent className="p-3 sm:p-4">
                      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold text-gray-900 truncate text-sm sm:text-base">
                            {equipment.name}
                          </h3>
                          <p className="text-xs text-gray-500">{equipment.foodtruck}</p>
                        </div>

                        {/* Quantity selector */}
                        <div className="flex items-center justify-between sm:justify-end gap-2 flex-shrink-0">
                          <div className="flex items-center gap-1 sm:gap-2">
                            <Button
                              variant="outline"
                              size="icon"
                              className="h-8 w-8 rounded-md bg-transparent"
                              onClick={() => {
                                const newValue = Math.max(0, equipment.reorderQuantity - 1)
                                handleEquipmentQuantityChange(equipment.id, newValue)
                              }}
                              disabled={equipment.reorderQuantity <= 0}
                            >
                              <Minus className="h-3 w-3" />
                            </Button>
                            <Input
                              type="number"
                              min="0"
                              value={equipment.reorderQuantity}
                              onChange={(e) => {
                                const value = Number.parseInt(e.target.value) || 0
                                handleEquipmentQuantityChange(equipment.id, Math.max(0, value))
                              }}
                              className="h-8 w-14 sm:w-16 text-center text-xs sm:text-sm [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                            />
                            <Button
                              variant="outline"
                              size="icon"
                              className="h-8 w-8 rounded-md bg-transparent"
                              onClick={() => {
                                handleEquipmentQuantityChange(equipment.id, equipment.reorderQuantity + 1)
                              }}
                            >
                              <Plus className="h-3 w-3" />
                            </Button>
                          </div>
                          <span className="text-xs sm:text-sm text-gray-600 min-w-0 truncate ml-1">
                            {equipment.packagingUnit}
                          </span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          {/* All Products Tab */}
          <TabsContent value="all-products" className="space-y-4">
            {filteredAllProducts.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <List className="h-12 w-12 text-gray-400 mb-4" />
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">Keine Produkte gefunden</h3>
                  <p className="text-gray-600 text-center">
                    {searchTerm ? "Keine Produkte entsprechen Ihrer Suche." : "Keine Produkte verfügbar."}
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-3">
                {filteredAllProducts.map((product) => (
                  <Card key={product.id} className="hover:shadow-sm transition-shadow">
                    <CardContent className="p-3 sm:p-4">
                      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold text-gray-900 truncate text-sm sm:text-base">{product.name}</h3>
                          <p className="text-xs text-gray-500">{product.category}</p>
                        </div>

                        {/* Quantity selector */}
                        <div className="flex items-center justify-between sm:justify-end gap-2 flex-shrink-0">
                          <div className="flex items-center gap-1 sm:gap-2">
                            <Button
                              variant="outline"
                              size="icon"
                              className="h-8 w-8 rounded-md bg-transparent"
                              onClick={() => {
                                const newValue = Math.max(0, product.reorderQuantity - 1)
                                handleAllProductQuantityChange(product.id, newValue)
                              }}
                              disabled={product.reorderQuantity <= 0}
                            >
                              <Minus className="h-3 w-3" />
                            </Button>
                            <Input
                              type="number"
                              min="0"
                              value={product.reorderQuantity}
                              onChange={(e) => {
                                const value = Number.parseInt(e.target.value) || 0
                                handleAllProductQuantityChange(product.id, Math.max(0, value))
                              }}
                              className="h-8 w-14 sm:w-16 text-center text-xs sm:text-sm [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                            />
                            <Button
                              variant="outline"
                              size="icon"
                              className="h-8 w-8 rounded-md bg-transparent"
                              onClick={() => {
                                handleAllProductQuantityChange(product.id, product.reorderQuantity + 1)
                              }}
                            >
                              <Plus className="h-3 w-3" />
                            </Button>
                          </div>
                          <span className="text-xs sm:text-sm text-gray-600 min-w-0 truncate ml-1">
                            {product.packagingUnit}
                          </span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>

        {/* Notes Section */}
        {totalSelectedCount > 0 && (
          <div className="mt-6">
            <div className="flex items-center gap-2 mb-3">
              <FileText className="h-4 w-4 text-gray-600" />
              <label htmlFor="notes" className="text-sm font-medium text-gray-700">
                Notizen (optional)
              </label>
            </div>
            <Textarea
              id="notes"
              placeholder="Zusätzliche Informationen zur Nachbestellung..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="min-h-[80px] resize-none"
              maxLength={500}
            />
            <p className="text-xs text-gray-500 mt-1">{notes.length}/500 Zeichen</p>
          </div>
        )}

        {/* Action Bar */}
        {totalSelectedCount > 0 && (
          <div className="mt-6 sm:mt-8 p-4 bg-gray-50 rounded-lg border">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <p className="font-semibold text-gray-900 text-sm sm:text-base">
                  {totalSelectedCount} Artikel ausgewählt
                </p>
                <p className="text-xs sm:text-sm text-gray-600">
                  {selectedProductsCount} Event-Produkte, {selectedIngredientsCount} Zutaten, {selectedEquipmentCount}{" "}
                  Equipment, {selectedAllProductsCount} Alle Produkte
                </p>
              </div>
              <div className="flex flex-col sm:flex-row gap-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    setProducts(products.map((p) => ({ ...p, reorderQuantity: 0 })))
                    setIngredients(ingredients.map((i) => ({ ...i, reorderQuantity: 0 })))
                    setAllProducts(allProducts.map((p) => ({ ...p, reorderQuantity: 0 })))
                    setEquipmentProducts(equipmentProducts.map((e) => ({ ...e, reorderQuantity: 0 })))
                    setNotes("")
                  }}
                  className="text-xs sm:text-sm"
                  disabled={isCreating}
                >
                  Auswahl zurücksetzen
                </Button>
                <Button onClick={handleCreateReorder} disabled={isCreating} className="text-xs sm:text-sm">
                  {isCreating ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Erstelle...
                    </>
                  ) : (
                    <>
                      <Package className="h-4 w-4 mr-2" />
                      Nachbestellung erstellen
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
