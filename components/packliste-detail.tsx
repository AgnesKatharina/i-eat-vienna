"use client"

import { DialogFooter } from "@/components/ui/dialog"

import { useState, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ArrowLeft, Save, Edit, FileDown } from "lucide-react"
import { useToast } from "@/components/ui/use-toast"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Search } from "lucide-react"
import { format } from "date-fns"
import { de } from "date-fns/locale"
import { unitPlurals } from "@/lib/data"
import { getEvent, saveEventProducts, getEventProducts, updateEvent, updatePrintReadyStatus } from "@/lib/event-service"
import { getAllProducts, getCategories, getProductRecipes, getProductPackaging } from "@/lib/supabase-service"
import { generatePdf } from "@/lib/pdf-generator"
import { PacklisteSkeleton } from "@/components/packliste-skeleton"
import type { SelectedProduct, EventDetails, CalculatedIngredient, Event } from "@/lib/types"
import type { ProductWithCategory } from "@/lib/supabase-service"

interface PacklisteDetailProps {
  eventId: string
}

export function PacklisteDetail({ eventId }: PacklisteDetailProps) {
  const router = useRouter()
  const { toast } = useToast()
  const [event, setEvent] = useState<Event | null>(null)
  const [loading, setLoading] = useState(true)
  const [selectedProducts, setSelectedProducts] = useState<Record<string, SelectedProduct>>({})
  const [calculatedIngredients, setCalculatedIngredients] = useState<Record<string, CalculatedIngredient>>({})
  const [eventDetails, setEventDetails] = useState<EventDetails>({
    type: "Catering",
    name: "",
    ft: "",
    ka: "",
    date: "",
    supplierName: "",
  })

  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)
  const [isUnsavedChangesDialogOpen, setIsUnsavedChangesDialogOpen] = useState(false)
  const [initialSelectedProducts, setInitialSelectedProducts] = useState<Record<string, SelectedProduct>>({})
  const [initialEventDetails, setInitialEventDetails] = useState<EventDetails>({
    type: "Catering",
    name: "",
    ft: "",
    ka: "",
    date: "",
    supplierName: "",
  })

  const [isDeleteAllDialogOpen, setIsDeleteAllDialogOpen] = useState(false)
  const [categoryToDelete, setCategoryToDelete] = useState<string>("")
  const [productCategories, setProductCategories] = useState<Record<string, string>>({})
  const [isPrintReady, setIsPrintReady] = useState(false)
  const [isPrintPreviewOpen, setIsPrintPreviewOpen] = useState(false)

  // Define the correct order of categories for Packliste mode
  const packlisteCategories = ["Essen", "Getränke Pet", "Getränke Glas", "Getränke Spezial", "Equipment", "Kassa"]
  const [activeCategory, setActiveCategory] = useState(packlisteCategories[0])

  const [categories, setCategories] = useState<{ id: number; name: string }[]>([])
  const [products, setProducts] = useState<ProductWithCategory[]>([])
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [editDate, setEditDate] = useState<Date | undefined>(undefined)
  const [productQuantities, setProductQuantities] = useState<Record<string, number>>({})
  const [recipes, setRecipes] = useState<Record<string, Record<string, { menge: number; einheit: string }>>>({})
  const [packagingUnits, setPackagingUnits] = useState<
    Record<string, { pro_verpackung: number; verpackungseinheit: string }>
  >({})
  const [searchTerm, setSearchTerm] = useState("")

  // Load event data and categories/products from database
  useEffect(() => {
    async function loadData() {
      setLoading(true)
      try {
        // Load basic data in parallel first
        const [eventData, categoriesData, productsData] = await Promise.all([
          getEvent(eventId),
          getCategories(),
          getAllProducts(),
        ])

        if (eventData) {
          setEvent(eventData)
          setIsPrintReady(eventData.print || false)
          setEventDetails({
            type: eventData.type || "Catering",
            name: eventData.name || "",
            ft: eventData.ft || "",
            ka: eventData.ka || "",
            date: eventData.date ? new Date(eventData.date).toISOString().split("T")[0] : "",
            supplierName: "",
          })
          setEditDate(eventData.date ? new Date(eventData.date) : undefined)
        }

        setCategories(categoriesData)
        setProducts(productsData)

        // Create product categories mapping for PDF export
        const categoryMap: Record<string, string> = {}
        productsData.forEach((product) => {
          if (product.category) {
            categoryMap[product.name] = product.category.name
          }
        })
        setProductCategories(categoryMap)

        // Load event products in parallel with recipes/packaging
        const [eventProducts, recipesAndPackaging] = await Promise.all([
          getEventProducts(eventId),
          loadRecipesAndPackaging(productsData),
        ])

        // Process event products
        const productMap: Record<string, SelectedProduct> = {}
        const quantityMap: Record<string, number> = {}

        eventProducts.forEach((product) => {
          productMap[product.product_name] = {
            quantity: product.quantity,
            unit: product.unit,
          }
          quantityMap[product.product_name] = product.quantity
        })

        setSelectedProducts(productMap)
        setProductQuantities(quantityMap)
        setRecipes(recipesAndPackaging.recipes)
        setPackagingUnits(recipesAndPackaging.packaging)

        setInitialSelectedProducts(productMap)
        setInitialEventDetails({
          type: eventData.type || "Catering",
          name: eventData.name || "",
          ft: eventData.ft || "",
          ka: eventData.ka || "",
          date: eventData.date ? new Date(eventData.date).toISOString().split("T")[0] : "",
          supplierName: "",
        })
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
  }, [eventId, toast])

  useEffect(() => {
    // Check if selected products have changed
    const productsChanged = JSON.stringify(selectedProducts) !== JSON.stringify(initialSelectedProducts)

    // Check if event details have changed
    const currentEventDetails = {
      type: event?.type || "Catering",
      name: event?.name || "",
      ft: event?.ft || "",
      ka: event?.ka || "",
      date: event?.date ? new Date(event.date).toISOString().split("T")[0] : "",
      supplierName: eventDetails.supplierName,
    }
    const eventDetailsChanged = JSON.stringify(currentEventDetails) !== JSON.stringify(initialEventDetails)

    setHasUnsavedChanges(productsChanged || eventDetailsChanged)
  }, [selectedProducts, event, eventDetails, initialSelectedProducts, initialEventDetails])

  // Optimized function to load recipes and packaging in batches
  async function loadRecipesAndPackaging(productsData: ProductWithCategory[]) {
    const recipesMap: Record<string, Record<string, { menge: number; einheit: string }>> = {}
    const packagingMap: Record<string, { pro_verpackung: number; verpackungseinheit: string }> = {}

    // Process products in batches of 10 to avoid overwhelming the database
    const batchSize = 10
    for (let i = 0; i < productsData.length; i += batchSize) {
      const batch = productsData.slice(i, i + batchSize)

      // Load recipes and packaging for this batch in parallel
      const batchPromises = batch.map(async (product) => {
        const [productRecipes, productPackaging] = await Promise.all([
          getProductRecipes(product.id),
          getProductPackaging(product.id),
        ])

        return { product, productRecipes, productPackaging }
      })

      const batchResults = await Promise.all(batchPromises)

      // Process results
      batchResults.forEach(({ product, productRecipes, productPackaging }) => {
        if (productRecipes.length > 0) {
          recipesMap[product.name] = {}
          for (const recipe of productRecipes) {
            if (recipe.ingredient) {
              // @ts-ignore - ingredient is a joined field
              recipesMap[product.name][recipe.ingredient.name] = {
                menge: recipe.amount,
                einheit: recipe.ingredient.unit,
              }
            }
          }
        }

        if (productPackaging) {
          packagingMap[product.name] = {
            pro_verpackung: productPackaging.amount_per_package,
            verpackungseinheit: productPackaging.packaging_unit,
          }
        }
      })
    }

    return { recipes: recipesMap, packaging: packagingMap }
  }

  // Calculate ingredients whenever selected products change
  useEffect(() => {
    calculateIngredients()
  }, [selectedProducts, recipes, packagingUnits])

  // Memoize the calculateIngredients function to prevent unnecessary recalculations
  const calculateIngredients = useCallback(() => {
    const ingredients: Record<string, CalculatedIngredient> = {}

    // Calculate ingredients based on recipes and selected products
    Object.entries(selectedProducts).forEach(([productName, details]) => {
      if (productName in recipes && Object.keys(recipes[productName]).length > 0) {
        // Only process if the recipe has ingredients (not empty)
        const recipe = recipes[productName]
        Object.entries(recipe).forEach(([ingredientName, data]) => {
          const totalAmount = data.menge * details.quantity
          const unit = data.einheit

          if (!(ingredientName in ingredients)) {
            // Initialize ingredient if it doesn't exist yet
            ingredients[ingredientName] = {
              totalAmount,
              unit,
              packaging: "Unknown",
              amountPerPackage: 1,
              packagingCount: 1,
            }
          } else {
            // Add to existing ingredient
            ingredients[ingredientName].totalAmount += totalAmount
          }

          // Add packaging information if available
          if (ingredientName in packagingUnits) {
            const packInfo = packagingUnits[ingredientName]
            ingredients[ingredientName].packaging = packInfo.verpackungseinheit
            ingredients[ingredientName].amountPerPackage = packInfo.pro_verpackung
            ingredients[ingredientName].packagingCount = Math.ceil(
              ingredients[ingredientName].totalAmount / packInfo.pro_verpackung,
            )
          }
        })
      }
    })

    setCalculatedIngredients(ingredients)
  }, [selectedProducts, recipes, packagingUnits])

  const handleProductSelect = (
    productId: number,
    productName: string,
    category: string,
    quantity: number,
    unit: string,
    overwrite = false,
  ) => {
    setSelectedProducts((prev) => {
      const newProducts = { ...prev }

      if (overwrite) {
        if (quantity <= 0) {
          delete newProducts[productName]
        } else {
          newProducts[productName] = { quantity, unit }
        }
      } else if (productName in newProducts) {
        const newQuantity = newProducts[productName].quantity + quantity
        if (newQuantity <= 0) {
          delete newProducts[productName]
        } else {
          newProducts[productName].quantity = newQuantity
        }
      } else if (quantity > 0) {
        newProducts[productName] = { quantity, unit }
      }

      // Update the product quantities state as well
      setProductQuantities((prevQuantities) => {
        const newQuantities = { ...prevQuantities }
        if (productName in newProducts) {
          newQuantities[productName] = newProducts[productName].quantity
        } else {
          delete newQuantities[productName]
        }
        return newQuantities
      })

      return newProducts
    })
  }

  const handleDeleteProduct = (product: string) => {
    setSelectedProducts((prev) => {
      const newProducts = { ...prev }
      delete newProducts[product]

      // Update the product quantities state as well
      setProductQuantities((prevQuantities) => {
        const newQuantities = { ...prevQuantities }
        delete newQuantities[product]
        return newQuantities
      })

      return newProducts
    })
  }

  const handleQuantityChange = (product: string, quantity: number) => {
    // If quantity is 0 or less, remove the product entirely
    if (quantity <= 0) {
      handleDeleteProduct(product)
      return
    }

    // Update both states for positive quantities
    setSelectedProducts((prev) => {
      const newProducts = { ...prev }
      if (product in newProducts) {
        newProducts[product].quantity = quantity
      }
      return newProducts
    })

    setProductQuantities((prev) => ({
      ...prev,
      [product]: quantity,
    }))
  }

  const handleDeleteAllInCategory = (category: string) => {
    setCategoryToDelete(category)
    setIsDeleteAllDialogOpen(true)
  }

  const confirmDeleteAllInCategory = () => {
    // Get all products in the category that are currently selected
    const productsToDelete = Object.keys(selectedProducts).filter(
      (productName) => productCategories[productName] === categoryToDelete,
    )

    // Delete all products in this category
    setSelectedProducts((prev) => {
      const newProducts = { ...prev }
      productsToDelete.forEach((productName) => {
        delete newProducts[productName]
      })
      return newProducts
    })

    // Update product quantities as well
    setProductQuantities((prev) => {
      const newQuantities = { ...prev }
      productsToDelete.forEach((productName) => {
        delete newQuantities[productName]
      })
      return newQuantities
    })

    setIsDeleteAllDialogOpen(false)
    setCategoryToDelete("")

    toast({
      title: "Erfolg",
      description: `Alle Produkte aus der Kategorie "${categoryToDelete}" wurden gelöscht.`,
    })
  }

  const handleSave = async () => {
    try {
      await saveEventProducts(
        eventId,
        Object.entries(selectedProducts).map(([productName, details]) => ({
          product_name: productName,
          quantity: details.quantity,
          unit: details.unit,
        })),
      )

      // Reset the initial state after successful save
      setInitialSelectedProducts(selectedProducts)
      setInitialEventDetails({
        type: event?.type || "Catering",
        name: event?.name || "",
        ft: event?.ft || "",
        ka: event?.ka || "",
        date: event?.date ? new Date(event.date).toISOString().split("T")[0] : "",
        supplierName: eventDetails.supplierName,
      })
      setHasUnsavedChanges(false)

      toast({
        title: "Erfolg",
        description: "Packliste wurde gespeichert.",
      })
    } catch (error) {
      console.error("Error saving event products:", error)
      toast({
        title: "Fehler",
        description: "Packliste konnte nicht gespeichert werden.",
        variant: "destructive",
      })
    }
  }

  const handleEditEvent = () => {
    if (!event) return
    setIsEditDialogOpen(true)
  }

  const handleUpdateEvent = async () => {
    if (!event) return

    try {
      const updated = await updateEvent(eventId, {
        name: event.name,
        type: event.type,
        date: editDate ? editDate.toISOString() : null,
        ft: event.ft,
        ka: event.ka,
      })

      if (updated) {
        setEvent(updated)
        const newEventDetails = {
          type: updated.type || "Catering",
          name: updated.name || "",
          ft: updated.ft || "",
          ka: updated.ka || "",
          date: updated.date ? new Date(updated.date).toISOString().split("T")[0] : "",
          supplierName: eventDetails.supplierName,
        }
        setEventDetails(newEventDetails)
        setInitialEventDetails(newEventDetails)
        setIsEditDialogOpen(false)
        toast({
          title: "Erfolg",
          description: "Event wurde aktualisiert.",
        })
      }
    } catch (error) {
      console.error("Error updating event:", error)
      toast({
        title: "Fehler",
        description: "Event konnte nicht aktualisiert werden.",
        variant: "destructive",
      })
    }
  }

  const handleShowPrintPreview = () => {
    setIsPrintPreviewOpen(true)
  }

  const handleExportPdf = async () => {
    if (!event) return

    try {
      // Update eventDetails with current event data
      const currentEventDetails: EventDetails = {
        type: event.type || "Catering",
        name: event.name || "",
        ft: event.ft || "",
        ka: event.ka || "",
        date: event.date ? format(new Date(event.date), "dd.MM.yyyy", { locale: de }) : "",
        supplierName: "",
      }

      await generatePdf(
        selectedProducts,
        calculatedIngredients,
        currentEventDetails,
        formatWeight,
        getUnitPlural,
        "packliste",
        productCategories, // Pass the product categories mapping
      )

      setIsPrintPreviewOpen(false)
      toast({
        title: "Erfolg",
        description: "PDF wurde erstellt.",
      })
    } catch (error) {
      console.error("Error generating PDF:", error)
      toast({
        title: "Fehler",
        description: "PDF konnte nicht erstellt werden.",
        variant: "destructive",
      })
    }
  }

  const getUnitPlural = (quantity: number, unit: string): string => {
    if (quantity > 1) {
      return unitPlurals[unit] || unit
    }
    return unit
  }

  const formatWeight = (value: number, unit: string): string => {
    if (unit.toLowerCase() === "gramm" && value >= 1000) {
      return `${(value / 1000).toFixed(1)} Kg`
    } else if (unit.toLowerCase() === "milliliter" && value >= 1000) {
      return `${(value / 1000).toFixed(1)} L`
    } else {
      return `${value} ${unit}`
    }
  }

  // Get the category icon
  const getCategoryIcon = (categoryName: string) => {
    switch (categoryName) {
      case "Essen":
        return "🍔"
      case "Getränke Pet":
        return "💧"
      case "Getränke Glas":
        return "🥛"
      case "Getränke Spezial":
        return "⭐"
      case "Equipment":
        return "🍳"
      case "Kassa":
        return "💰"
      default:
        return "📦"
    }
  }

  // Get the category background color
  const getCategoryBackgroundColor = (categoryName: string) => {
    switch (categoryName) {
      case "Essen":
        return "bg-orange-50 border-orange-200 hover:bg-orange-100"
      case "Getränke Pet":
        return "bg-blue-50 border-blue-200 hover:bg-blue-100"
      case "Getränke Glas":
        return "bg-cyan-50 border-cyan-200 hover:bg-cyan-100"
      case "Getränke Spezial":
        return "bg-purple-50 border-purple-200 hover:bg-purple-100"
      case "Equipment":
        return "bg-green-50 border-green-200 hover:bg-green-100"
      case "Kassa":
        return "bg-yellow-50 border-yellow-200 hover:bg-yellow-100"
      default:
        return "bg-gray-50 border-gray-200 hover:bg-gray-100"
    }
  }

  // Filter products by active category and search term
  const filteredProducts = useCallback(() => {
    let filtered = products.filter((product) => product.category?.name === activeCategory)

    if (searchTerm) {
      const lowerSearchTerm = searchTerm.toLowerCase()
      filtered = filtered.filter((product) => product.name.toLowerCase().includes(lowerSearchTerm))
    }

    return filtered
  }, [products, activeCategory, searchTerm])

  const handleBackClick = () => {
    if (hasUnsavedChanges) {
      setIsUnsavedChangesDialogOpen(true)
    } else {
      router.push("/app/packliste")
    }
  }

  const handleSaveAndGoBack = async () => {
    await handleSave()
    router.push("/app/packliste")
  }

  const handleDiscardAndGoBack = () => {
    router.push("/app/packliste")
  }

  // Show skeleton while loading
  if (loading) {
    return <PacklisteSkeleton />
  }

  if (!event) {
    return (
      <div className="container mx-auto py-8">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-4">Event nicht gefunden</h2>
          <Button onClick={() => router.push("/app/packliste")}>Zurück zur Event-Auswahl</Button>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto space-y-6">
      <div className="flex items-center justify-between mb-6">
        <Button variant="outline" onClick={handleBackClick} className="flex items-center gap-2">
          <ArrowLeft className="h-4 w-4" />
          Zurück zur Event-Auswahl
        </Button>
        <h1 className="text-2xl font-bold">Packliste: {event.name}</h1>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleShowPrintPreview} className="flex items-center gap-2">
            <FileDown className="h-4 w-4" />
            PDF Export
          </Button>
          <Button variant="outline" onClick={handleEditEvent} className="flex items-center gap-2">
            <Edit className="h-4 w-4" />
            Bearbeiten
          </Button>
          <Button onClick={handleSave} className="flex items-center gap-2">
            <Save className="h-4 w-4" />
            Speichern
          </Button>
        </div>
      </div>

      {/* Event Information and Print Ready Status */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        {/* Event Information - takes 3 columns */}
        <div className="lg:col-span-3 bg-white p-4 rounded-lg shadow-sm">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <p className="text-sm text-gray-500">Typ</p>
              <p className="font-medium">{event.type}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Datum</p>
              <p className="font-medium">
                {event.date ? new Date(event.date).toLocaleDateString("de-DE") : "Kein Datum"}
              </p>
            </div>
            {event.ft && (
              <div>
                <p className="text-sm text-gray-500">Foodtruck</p>
                <p className="font-medium">{event.ft}</p>
              </div>
            )}
            {event.ka && (
              <div>
                <p className="text-sm text-gray-500">Kühlanhänger</p>
                <p className="font-medium">{event.ka}</p>
              </div>
            )}
          </div>
        </div>

        {/* Print Ready Status - takes 1 column */}
        <div className="lg:col-span-1 bg-gradient-to-br from-blue-50 to-indigo-50 p-4 rounded-lg shadow-sm border border-blue-100">
          <div className="flex flex-col items-center space-y-3">
            <div className="relative">
              <input
                type="checkbox"
                id="print-ready"
                checked={isPrintReady}
                onChange={async (e) => {
                  const newStatus = e.target.checked
                  setIsPrintReady(newStatus)

                  // Update database
                  const success = await updatePrintReadyStatus(eventId, newStatus)

                  if (success) {
                    // Update the event state as well
                    if (event) {
                      setEvent({ ...event, print: newStatus })
                    }
                    toast({
                      title: "Status aktualisiert",
                      description: newStatus
                        ? "Event ist bereit zum Drucken"
                        : "Event ist nicht mehr bereit zum Drucken",
                    })
                  } else {
                    // Revert the state if database update failed
                    setIsPrintReady(!newStatus)
                    toast({
                      title: "Fehler",
                      description: "Status konnte nicht aktualisiert werden",
                      variant: "destructive",
                    })
                  }
                }}
                className="sr-only"
              />
              <label
                htmlFor="print-ready"
                className={`relative inline-flex items-center justify-center w-12 h-6 rounded-full cursor-pointer transition-all duration-300 ease-in-out ${
                  isPrintReady
                    ? "bg-gradient-to-r from-green-400 to-green-500 shadow-md shadow-green-200"
                    : "bg-gray-300 hover:bg-gray-400"
                }`}
              >
                <span
                  className={`absolute w-4 h-4 bg-white rounded-full shadow-sm transform transition-all duration-300 ease-in-out ${
                    isPrintReady ? "translate-x-3" : "-translate-x-3"
                  }`}
                >
                  {isPrintReady && (
                    <svg
                      className="w-3 h-3 text-green-500 absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path
                        fillRule="evenodd"
                        d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                        clipRule="evenodd"
                      />
                    </svg>
                  )}
                </span>
              </label>
            </div>

            <div className="text-center">
              <label htmlFor="print-ready" className="text-sm font-semibold text-gray-800 cursor-pointer block">
                Bereit zum Drucken
              </label>
              <p className="text-xs text-gray-600 mt-1">Packliste fertig</p>
            </div>

            {isPrintReady && (
              <div className="flex items-center justify-center animate-fade-in">
                <div className="flex items-center justify-center w-8 h-8 bg-green-100 rounded-full">
                  <svg className="w-4 h-4 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                    <path
                      fillRule="evenodd"
                      d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                      clipRule="evenodd"
                    />
                  </svg>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <style jsx>{`
        @keyframes fade-in {
          from {
            opacity: 0;
            transform: translateX(10px);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }
        
        .animate-fade-in {
          animation: fade-in 0.3s ease-out;
        }
      `}</style>

      {/* Category Tabs */}
      <Tabs value={activeCategory} onValueChange={setActiveCategory} className="w-full">
        <TabsList className="flex flex-wrap h-auto">
          {packlisteCategories.map((category) => (
            <TabsTrigger key={category} value={category} className="flex-grow">
              <span className="mr-2">{getCategoryIcon(category)}</span>
              {category}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      {/* Search Bar */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />
        <Input
          placeholder="Produkt suchen..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Products Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {filteredProducts().map((product) => (
          <div
            key={product.id}
            className={`flex items-center justify-between p-3 border rounded-md h-[72px] ${getCategoryBackgroundColor(activeCategory)}`}
          >
            <div className="flex-1">
              <p className="font-medium">{product.name}</p>
              <p className="text-sm text-gray-500">{product.unit}</p>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8"
                onClick={() => handleProductSelect(product.id, product.name, activeCategory, -1, product.unit)}
                disabled={!productQuantities[product.name] || productQuantities[product.name] <= 0}
              >
                <span className="text-lg">-</span>
              </Button>
              <input
                type="number"
                min="0"
                value={productQuantities[product.name] || 0}
                onChange={(e) => {
                  const newQuantity = Number.parseInt(e.target.value) || 0
                  if (newQuantity <= 0) {
                    handleDeleteProduct(product.name)
                  } else {
                    handleProductSelect(product.id, product.name, activeCategory, newQuantity, product.unit, true)
                  }
                }}
                className="w-16 text-center border rounded py-1 px-2 h-8 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
              />
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8"
                onClick={() => handleProductSelect(product.id, product.name, activeCategory, 1, product.unit)}
              >
                <span className="text-lg">+</span>
              </Button>
            </div>
          </div>
        ))}
      </div>

      {/* Delete All Button for Current Category */}
      <div className="flex justify-end mt-4 mb-6">
        <Button
          variant="destructive"
          onClick={() => handleDeleteAllInCategory(activeCategory)}
          disabled={
            !Object.keys(selectedProducts).some((productName) => productCategories[productName] === activeCategory)
          }
          className="bg-red-600 hover:bg-red-700 text-white"
        >
          Alles Löschen ({activeCategory})
        </Button>
      </div>

      {/* Two-column layout for Selected Products and Ingredients */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-8">
        {/* Selected Products */}
        <div>
          <div className="bg-white rounded-lg shadow-sm overflow-hidden">
            <div className="p-4 border-b">
              <h2 className="text-xl font-semibold">Ausgewählte Produkte</h2>
            </div>
            <div className="p-4">
              {Object.keys(selectedProducts).length === 0 ? (
                <p className="text-center text-gray-500 py-4">Keine Produkte ausgewählt</p>
              ) : (
                <div className="space-y-3">
                  {Object.entries(selectedProducts).map(([product, details]) => (
                    <div key={product} className="flex items-center space-x-3 p-2 border rounded-md">
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-7 w-7"
                          onClick={() => handleQuantityChange(product, details.quantity - 1)}
                        >
                          <span className="text-sm">-</span>
                        </Button>
                        <div className="w-8 text-center border rounded py-1 px-1 text-sm">{details.quantity}</div>
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-7 w-7"
                          onClick={() => handleQuantityChange(product, details.quantity + 1)}
                        >
                          <span className="text-sm">+</span>
                        </Button>
                      </div>
                      <div className="flex-1 truncate">{product}</div>
                      <div className="text-sm text-gray-500 w-16 text-right">{details.unit}</div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-red-500 hover:text-red-700 h-7 w-7"
                        onClick={() => handleDeleteProduct(product)}
                      >
                        <span className="sr-only">Löschen</span>
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          className="h-4 w-4"
                        >
                          <path d="M3 6h18"></path>
                          <path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6"></path>
                          <path d="M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2"></path>
                          <line x1="10" y1="11" x2="10" y2="17"></line>
                          <line x1="14" y1="11" x2="14" y2="17"></line>
                        </svg>
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Ingredients */}
        <div>
          <div className="bg-white rounded-lg shadow-sm overflow-hidden">
            <div className="p-4 border-b">
              <h2 className="text-xl font-semibold">Zutaten</h2>
            </div>
            <div className="p-4">
              {Object.keys(calculatedIngredients).length === 0 ? (
                <p className="text-muted-foreground text-center py-4">Keine Zutaten berechnet</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left p-2">Zutat</th>
                        <th className="text-left p-2">Gesamtmenge</th>
                        <th className="text-left p-2">Verpackung</th>
                      </tr>
                    </thead>
                    <tbody>
                      {Object.entries(calculatedIngredients)
                        .sort(([a], [b]) => a.localeCompare(b))
                        .map(([ingredient, details]) => (
                          <tr key={ingredient} className="border-b">
                            <td className="p-2">{ingredient}</td>
                            <td className="p-2">{formatWeight(details.totalAmount, details.unit)}</td>
                            <td className="p-2">
                              {details.packagingCount} {getUnitPlural(details.packagingCount, details.packaging)} à{" "}
                              {formatWeight(details.amountPerPackage, details.unit)}
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Edit Event Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Event bearbeiten</DialogTitle>
            <DialogDescription>Ändern Sie die Details des Events und klicken Sie auf Speichern.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="edit-name">Event Name</Label>
              <Input id="edit-name" value={event.name} onChange={(e) => setEvent({ ...event, name: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-type">Typ</Label>
              <Select value={event.type} onValueChange={(value) => setEvent({ ...event, type: value })}>
                <SelectTrigger id="edit-type">
                  <SelectValue placeholder="Typ auswählen" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Catering">Catering</SelectItem>
                  <SelectItem value="Verkauf">Verkauf</SelectItem>
                  <SelectItem value="Lieferung">Lieferung</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-ft">Foodtruck</Label>
                <Select
                  value={event.ft || "none"}
                  onValueChange={(value) => setEvent({ ...event, ft: value === "none" ? null : value })}
                >
                  <SelectTrigger id="edit-ft">
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
              <div className="space-y-2">
                <Label htmlFor="edit-ka">Kühlanhänger</Label>
                <Select
                  value={event.ka || "none"}
                  onValueChange={(value) => setEvent({ ...event, ka: value === "none" ? null : value })}
                >
                  <SelectTrigger id="edit-ka">
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
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
              Abbrechen
            </Button>
            <Button onClick={handleUpdateEvent}>Speichern</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Unsaved Changes Dialog */}
      <Dialog open={isUnsavedChangesDialogOpen} onOpenChange={setIsUnsavedChangesDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Ungespeicherte Änderungen</DialogTitle>
            <DialogDescription>
              Sie haben ungespeicherte Änderungen. Möchten Sie diese speichern, bevor Sie zurückgehen?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex justify-between gap-1 flex-row p-6">
            <Button
              variant="outline"
              onClick={() => setIsUnsavedChangesDialogOpen(false)}
              className="flex-1 text-sm px-2"
            >
              Abbrechen
            </Button>
            <Button variant="destructive" onClick={handleDiscardAndGoBack} className="flex-1 text-sm px-2">
              Verwerfen
            </Button>
            <Button onClick={handleSaveAndGoBack} className="flex-1 text-sm px-2">
              Speichern & Zurück
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete All Confirmation Dialog */}
      <Dialog open={isDeleteAllDialogOpen} onOpenChange={setIsDeleteAllDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Alle Produkte löschen</DialogTitle>
            <DialogDescription>
              Sind Sie sicher, dass Sie alle ausgewählten Produkte aus der Kategorie "{categoryToDelete}" löschen
              möchten? Diese Aktion kann nicht rückgängig gemacht werden.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex justify-between gap-2 flex-row">
            <Button variant="outline" onClick={() => setIsDeleteAllDialogOpen(false)} className="flex-1">
              Abbrechen
            </Button>
            <Button
              variant="destructive"
              onClick={confirmDeleteAllInCategory}
              className="flex-1 bg-red-600 hover:bg-red-700"
            >
              Alle löschen
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Print Preview Dialog */}
      <Dialog open={isPrintPreviewOpen} onOpenChange={setIsPrintPreviewOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] p-0">
          <div className="flex flex-col h-full">
            {/* Header */}
            <div className="flex items-center justify-between p-4 pr-12 border-b bg-gray-50">
              <div>
                <DialogTitle className="text-lg font-semibold">Druckvorschau</DialogTitle>
                <DialogDescription className="text-sm text-gray-600">
                  Überprüfen Sie Ihre Packliste vor dem Drucken
                </DialogDescription>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setIsPrintPreviewOpen(false)}>
                  Zurück
                </Button>
                <Button onClick={handleExportPdf} className="bg-blue-600 hover:bg-blue-700">
                  <FileDown className="h-4 w-4 mr-2" />
                  PDF erstellen
                </Button>
              </div>
            </div>

            {/* Preview Content */}
            <div className="flex-1 overflow-auto p-6 bg-gray-100">
              <div className="max-w-3xl mx-auto bg-white shadow-lg" style={{ aspectRatio: "297/210" }}>
                {/* PDF Content Preview */}
                <div className="p-8 h-full flex flex-col">
                  {/* Header */}
                  <div className="border-b pb-2 mb-4">
                    <div className="text-xs text-gray-500 mb-1">
                      {event?.type} | {event?.name} |{" "}
                      {event?.date ? new Date(event.date).toLocaleDateString("de-DE") : "Kein Datum"}
                      {event?.ft && ` | ${event.ft}`}
                      {event?.ka && ` | ${event.ka}`}
                    </div>
                  </div>

                  {/* Title */}
                  <div className="mb-6">
                    <h1 className="text-lg font-bold">
                      Packliste: {event?.name} |{" "}
                      {event?.date ? new Date(event.date).toLocaleDateString("de-DE") : "Kein Datum"}
                      {event?.ft && ` | ${event.ft}`}
                      {event?.ka && ` | ${event.ka}`}
                    </h1>
                    <div className="border-b mt-2"></div>
                  </div>

                  {/* Products by Category */}
                  <div className="flex-1 grid grid-cols-6 gap-4 text-xs">
                    {packlisteCategories.map((category) => {
                      const categoryProducts = Object.entries(selectedProducts)
                        .filter(([productName]) => productCategories[productName] === category)
                        .sort(([a], [b]) => a.localeCompare(b))

                      return (
                        <div key={category} className="space-y-1">
                          <h3 className="font-bold text-sm border-b pb-1">{category}</h3>
                          {categoryProducts.map(([productName, details]) => (
                            <div key={productName} className="flex items-start gap-1">
                              <div className="w-2 h-2 border border-gray-400 mt-0.5 flex-shrink-0"></div>
                              <span className="text-xs leading-tight">
                                {details.quantity}x {productName}
                              </span>
                            </div>
                          ))}
                        </div>
                      )
                    })}
                  </div>

                  {/* Ingredients Section Preview */}
                  {Object.keys(calculatedIngredients).length > 0 && (
                    <div className="mt-6 pt-4 border-t">
                      <h2 className="text-sm font-bold mb-2">Zutaten (Seite 2)</h2>
                      <div className="text-xs text-gray-600">
                        {Object.keys(calculatedIngredients).length} Zutaten berechnet
                      </div>
                    </div>
                  )}

                  {/* Signature Box */}
                  <div className="mt-auto pt-4">
                    <div className="border border-gray-400 p-2 text-xs">
                      Erledigt von: ______________________ Datum & Uhrzeit: _____________________
                    </div>
                  </div>

                  {/* Footer */}
                  <div className="border-t pt-2 mt-2">
                    <div className="text-xs text-gray-500 flex justify-between">
                      <span>
                        {event?.type} | {event?.name} |{" "}
                        {event?.date ? new Date(event.date).toLocaleDateString("de-DE") : "Kein Datum"}
                      </span>
                      <span>Seite 1</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Page 2 Preview (Ingredients) */}
              {Object.keys(calculatedIngredients).length > 0 && (
                <div className="max-w-3xl mx-auto bg-white shadow-lg mt-4" style={{ aspectRatio: "297/210" }}>
                  <div className="p-8 h-full flex flex-col">
                    {/* Header */}
                    <div className="border-b pb-2 mb-4">
                      <div className="text-xs text-gray-500 mb-1">
                        {event?.type} | {event?.name} |{" "}
                        {event?.date ? new Date(event.date).toLocaleDateString("de-DE") : "Kein Datum"}
                        {event?.ft && ` | ${event.ft}`}
                        {event?.ka && ` | ${event.ka}`}
                      </div>
                    </div>

                    {/* Ingredients Title */}
                    <div className="mb-6">
                      <h1 className="text-lg font-bold">Zutaten</h1>
                      <div className="border-b mt-2"></div>
                    </div>

                    {/* Ingredients List */}
                    <div className="flex-1 space-y-2">
                      {Object.entries(calculatedIngredients)
                        .sort(([a], [b]) => a.localeCompare(b))
                        .map(([ingredient, details]) => (
                          <div key={ingredient} className="flex items-start gap-2 text-xs">
                            <div className="w-2 h-2 border border-gray-400 mt-0.5 flex-shrink-0"></div>
                            <div className="flex-1">{ingredient}</div>
                            <div className="w-20 text-right">
                              {details.packagingCount} {getUnitPlural(details.packagingCount, details.packaging)} à{" "}
                              {formatWeight(details.amountPerPackage, details.unit)}
                            </div>
                            <div className="w-16 text-right font-medium">
                              {formatWeight(details.totalAmount, details.unit)}
                            </div>
                          </div>
                        ))}
                    </div>

                    {/* Signature Box */}
                    <div className="mt-auto pt-4">
                      <div className="border border-gray-400 p-2 text-xs">
                        Erledigt von: ______________________ Datum & Uhrzeit: _____________________
                      </div>
                    </div>

                    {/* Footer */}
                    <div className="border-t pt-2 mt-2">
                      <div className="text-xs text-gray-500 flex justify-between">
                        <span>
                          {event?.type} | {event?.name} |{" "}
                          {event?.date ? new Date(event.date).toLocaleDateString("de-DE") : "Kein Datum"}
                        </span>
                        <span>Seite 2</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
