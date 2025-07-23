"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ArrowLeft, Search, Package, ChefHat, ShoppingCart, Plus, Minus } from "lucide-react"
import { createClient } from "@/lib/supabase-client"
import { getEventProductsFromSupabase, getEventIngredientsFromSupabase } from "@/lib/supabase-service"
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

  useEffect(() => {
    loadEventData()
  }, [eventId])

  const loadEventData = async () => {
    try {
      setLoading(true)
      const supabase = createClient()

      // Get event details
      const { data: eventData, error: eventError } = await supabase
        .from("events")
        .select("*")
        .eq("id", eventId)
        .single()

      if (eventError) {
        console.error("Error loading event:", eventError)
        toast({
          title: "Fehler",
          description: "Event konnte nicht geladen werden",
          variant: "destructive",
        })
        return
      }

      setEvent(eventData)

      // Load actual event products from database
      const eventProducts = await getEventProductsFromSupabase(Number.parseInt(eventId))
      console.log("Loaded event products:", eventProducts)

      // Transform event products to the expected format
      const transformedProducts: Product[] = eventProducts.map((eventProduct) => {
        const productName = eventProduct.product?.name || "Unknown Product"
        const unit = eventProduct.unit
        return {
          id: eventProduct.id.toString(),
          name: productName,
          category: eventProduct.product?.category?.name || "Uncategorized",
          quantity: eventProduct.quantity,
          unit: unit,
          packagingUnit: getPackagingUnit(productName, unit),
          reorderQuantity: 0,
        }
      })

      setProducts(transformedProducts)

      // Load actual event ingredients from database
      const eventIngredients = await getEventIngredientsFromSupabase(Number.parseInt(eventId))
      console.log("Loaded event ingredients:", eventIngredients)

      // Transform event ingredients to the expected format
      const transformedIngredients: Ingredient[] = eventIngredients.map((ingredient) => {
        const ingredientName = ingredient.ingredient_name
        const unit = ingredient.ingredient_unit
        return {
          id: ingredient.ingredient_id.toString(),
          name: ingredientName,
          quantity: Math.round(ingredient.quantity_needed * 100) / 100, // Round to 2 decimal places
          unit: unit,
          category: ingredient.category || "Zutat",
          packagingUnit: getPackagingUnit(ingredientName, unit),
          used_in_products: ingredient.used_in_products?.map((p: any) => p.product_name) || [],
          reorderQuantity: 0,
        }
      })

      setIngredients(transformedIngredients)
    } catch (error) {
      console.error("Error loading event data:", error)
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

  const handleCreateReorder = () => {
    const selectedProductsData = products.filter((p) => p.reorderQuantity > 0)
    const selectedIngredientsData = ingredients.filter((i) => i.reorderQuantity > 0)

    const totalSelected = selectedProductsData.length + selectedIngredientsData.length
    if (totalSelected === 0) {
      toast({
        title: "Keine Auswahl",
        description: "Bitte wählen Sie mindestens ein Produkt oder eine Zutat aus",
        variant: "destructive",
      })
      return
    }

    toast({
      title: "Nachbestellung erstellt",
      description: `${totalSelected} Artikel für Nachbestellung ausgewählt`,
    })

    console.log("Selected products:", selectedProductsData)
    console.log("Selected ingredients:", selectedIngredientsData)

    // Here you would save the reorder to the database
    // For now, we'll just navigate back
    router.push("/app/nachbestellungen")
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

  return (
    <div className="container mx-auto p-6 max-w-6xl">
      <div className="border border-gray-200 rounded-lg p-6">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Button
            variant="outline"
            size="icon"
            onClick={() => router.push("/app/nachbestellungen")}
            className="border-gray-300 hover:bg-gray-50"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex-1">
            <h1 className="text-2xl font-semibold text-gray-900 mb-2">Nachbestellung für: {event.name}</h1>
            <p className="text-gray-600">
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
          <TabsList className="grid w-full grid-cols-2 mb-6">
            <TabsTrigger value="products" className="flex items-center gap-2">
              <ChefHat className="h-4 w-4" />
              Produkte
              {products.filter((p) => p.reorderQuantity > 0).length > 0 && (
                <Badge variant="secondary" className="ml-1">
                  {products.filter((p) => p.reorderQuantity > 0).length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="ingredients" className="flex items-center gap-2">
              <ShoppingCart className="h-4 w-4" />
              Zutaten
              {ingredients.filter((i) => i.reorderQuantity > 0).length > 0 && (
                <Badge variant="secondary" className="ml-1">
                  {ingredients.filter((i) => i.reorderQuantity > 0).length}
                </Badge>
              )}
            </TabsTrigger>
          </TabsList>

          {/* Products Tab */}
          <TabsContent value="products" className="space-y-4">
            <div className="flex justify-between items-center">
              <p className="text-sm text-gray-600">{filteredProducts.length} Produkte gefunden</p>
            </div>

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
                    <CardContent className="p-4 flex justify-between items-center">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-semibold text-gray-900">{product.name}</h3>
                        </div>
                      </div>

                      {/* Quantity selector */}
                      <div className="flex items-center gap-2">
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
                          className="h-8 w-20 text-center [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
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
                        <span className="text-sm text-gray-600">{product.packagingUnit}</span>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          {/* Ingredients Tab */}
          <TabsContent value="ingredients" className="space-y-4">
            <div className="flex justify-between items-center">
              <p className="text-sm text-gray-600">{filteredIngredients.length} Zutaten gefunden</p>
            </div>

            {filteredIngredients.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <ShoppingCart className="h-12 w-12 text-gray-400 mb-4" />
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">Keine Zutaten gefunden</h3>
                  <p className="text-gray-600 text-center">
                    {searchTerm
                      ? "Keine Zutaten entsprechen Ihrer Suche."
                      : "Für dieses Event wurden keine Zutaten gefunden."}
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-3">
                {filteredIngredients.map((ingredient) => (
                  <Card key={ingredient.id} className="hover:shadow-sm transition-shadow">
                    <CardContent className="p-4 flex justify-between items-center">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-semibold text-gray-900">{ingredient.name}</h3>
                        </div>
                        <p className="text-xs text-gray-500 mb-2">
                          Verwendet in: {ingredient.used_in_products.join(", ")}
                        </p>
                      </div>

                      {/* Quantity selector */}
                      <div className="flex items-center gap-2">
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
                          className="h-8 w-20 text-center [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
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
                        <span className="text-sm text-gray-600">{ingredient.packagingUnit}</span>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>

        {/* Action Bar */}
        {(products.filter((p) => p.reorderQuantity > 0).length > 0 ||
          ingredients.filter((i) => i.reorderQuantity > 0).length > 0) && (
          <div className="mt-8 p-4 bg-gray-50 rounded-lg border">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-semibold text-gray-900">
                  {products.filter((p) => p.reorderQuantity > 0).length +
                    ingredients.filter((i) => i.reorderQuantity > 0).length}{" "}
                  Artikel ausgewählt
                </p>
                <p className="text-sm text-gray-600">
                  {products.filter((p) => p.reorderQuantity > 0).length} Produkte,{" "}
                  {ingredients.filter((i) => i.reorderQuantity > 0).length} Zutaten
                </p>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    setProducts(products.map((p) => ({ ...p, reorderQuantity: 0 })))
                    setIngredients(ingredients.map((i) => ({ ...i, reorderQuantity: 0 })))
                  }}
                >
                  Auswahl zurücksetzen
                </Button>
                <Button onClick={handleCreateReorder}>
                  <Package className="h-4 w-4 mr-2" />
                  Nachbestellung erstellen
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
