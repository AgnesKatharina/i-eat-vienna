"use client"

import { useState, useEffect, useCallback, useMemo } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Save, ArrowLeft, Edit, FileDown, Search, CheckCircle, Trash2 } from "lucide-react"
import { format } from "date-fns"
import { de } from "date-fns/locale"
import { generatePdf } from "@/lib/pdf-generator"
import type { SelectedProduct, CalculatedIngredient, EventDetails } from "@/lib/types"
import { useToast } from "@/components/ui/use-toast"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { unitPlurals } from "@/lib/data"
import {
  getEvent,
  saveEventProducts,
  getEventProducts,
  updateEvent,
  updatePrintReadyStatus,
  updateEventNotes,
} from "@/lib/event-service"
import { getAllProducts, getCategories, getBatchRecipesAndPackaging } from "@/lib/supabase-service"
import { PacklisteSkeleton } from "@/components/packliste-skeleton"
import type { Event } from "@/lib/types"
import type { ProductWithCategory } from "@/lib/supabase-service"
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs"

interface Product {
  id: number
  name: string
  category: string
  unit: string
  price?: number
  supplier?: string
  notes?: string
  is_recipe?: boolean
  recipe_yield?: number
  ingredients?: Array<{
    product_id: number
    quantity: number
    unit: string
    product_name: string
  }>
}

interface EventProduct {
  product_id: number
  quantity: number
  is_packed: boolean
  notes?: string
}

interface EventData {
  id: string
  name: string
  type: string
  date?: string
  endDate?: string
  ft?: string
  ka?: string
  notes?: string
  selectedProducts?: Record<string, SelectedProduct>
  calculatedIngredients?: Record<string, CalculatedIngredient>
}

const EVENT_TYPES = [
  "Catering",
  "Event",
  "Hochzeit",
  "Geburtstag",
  "Firmenfeier",
  "Messe",
  "Workshop",
  "Seminar",
  "Konferenz",
  "Party",
  "Sonstige",
]

const FT_OPTIONS = [
  { value: "none", label: "Keine Auswahl" },
  { value: "FT1", label: "FT1" },
  { value: "FT2", label: "FT2" },
  { value: "FT3", label: "FT3" },
  { value: "FT4", label: "FT4" },
  { value: "FT5", label: "FT5" },
]

const KA_OPTIONS = [
  { value: "none", label: "Keine Auswahl" },
  { value: "KA1", label: "KA1" },
  { value: "KA2", label: "KA2" },
  { value: "KA3", label: "KA3" },
  { value: "KA4", label: "KA4" },
  { value: "KA5", label: "KA5" },
]

interface PacklisteDetailProps {
  eventId: string
}

export function PacklisteDetail({ eventId }: PacklisteDetailProps) {
  const router = useRouter()
  const { toast } = useToast()
  const supabase = createClientComponentClient()

  // State variables
  const [event, setEvent] = useState<Event | null>(null)
  const [eventData, setEventData] = useState<EventData | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
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
  const [ingredientFoodTypes, setIngredientFoodTypes] = useState<Record<string, string>>({})
  const [isPrintReady, setIsPrintReady] = useState(false)
  const [isFinished, setIsFinished] = useState(false)
  const [isPrintPreviewOpen, setIsPrintPreviewOpen] = useState(false)
  const [printPreviewContent, setPrintPreviewContent] = useState<string>("")
  const [showSaveSuccess, setShowSaveSuccess] = useState(false)
  const [notes, setNotes] = useState("")
  const [startDate, setStartDate] = useState<Date>()
  const [endDate, setEndDate] = useState<Date>()

  // Add this state after the other state declarations (around line 60)
  const [tempInputValues, setTempInputValues] = useState<Record<string, string>>({})
  // Add this state after the tempInputValues state declaration (around line 61)
  const [originalInputValues, setOriginalInputValues] = useState<Record<string, number>>({})

  // Add state for shared notes functionality
  const [initialNotes, setInitialNotes] = useState<string>("")

  // Define the correct order of categories for Packliste mode
  const packlisteCategories = ["Essen", "Getränke Pet", "Getränke Glas", "Getränke Spezial", "Equipment", "Kassa"]
  const [activeCategory, setActiveCategory] = useState(packlisteCategories[0])

  const [categories, setCategories] = useState<{ id: number; name: string }[]>([])
  const [products, setProducts] = useState<ProductWithCategory[]>([])
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [editDate, setEditDate] = useState<Date | undefined>(undefined)
  const [editEndDate, setEditEndDate] = useState<Date | undefined>(undefined)
  const [productQuantities, setProductQuantities] = useState<Record<string, number>>({})
  const [recipes, setRecipes] = useState<Record<string, Record<string, { menge: number; einheit: string }>>>({})
  const [packagingUnits, setPackagingUnits] = useState<
    Record<string, { pro_verpackung: number; verpackungseinheit: string }>
  >({})
  const [searchTerm, setSearchTerm] = useState("")

  // Edit form state - Updated with arrays for FT and KA
  const [editForm, setEditForm] = useState({
    name: "",
    type: "",
    date: "",
    endDate: "",
    ft: [] as string[],
    ka: [] as string[],
  })

  // Memoized filtered products for better performance
  const filteredProducts = useMemo(() => {
    let filtered = products.filter((product) => product.category?.name === activeCategory)

    if (searchTerm) {
      const lowerSearchTerm = searchTerm.toLowerCase()
      filtered = filtered.filter((product) => product.name.toLowerCase().includes(lowerSearchTerm))
    }

    return filtered
  }, [products, activeCategory, searchTerm])

  // Separate ingredients by food classification
  const separatedIngredients = useMemo(() => {
    const foodIngredients: Record<string, CalculatedIngredient> = {}
    const nonFoodIngredients: Record<string, CalculatedIngredient> = {}

    Object.entries(calculatedIngredients).forEach(([ingredientName, details]) => {
      const foodType = ingredientFoodTypes[ingredientName] || "unclassified"

      if (foodType === "food") {
        foodIngredients[ingredientName] = details
      } else {
        // Treat both 'non-food' and unclassified as Non Food
        nonFoodIngredients[ingredientName] = details
      }
    })

    return { foodIngredients, nonFoodIngredients }
  }, [calculatedIngredients, ingredientFoodTypes])

  // Update finished status function
  const updateFinishedStatus = async (isFinished: boolean): Promise<boolean> => {
    try {
      const { error } = await supabase.from("events").update({ finished: isFinished }).eq("id", eventId)

      if (error) {
        console.error("Error updating finished status:", error)
        return false
      }

      return true
    } catch (error) {
      console.error("Error updating finished status:", error)
      return false
    }
  }

  // Optimized function to load recipes and packaging in batches using the new batch function
  const loadRecipesAndPackaging = useCallback(async (productsData: ProductWithCategory[]) => {
    const productIds = productsData.map((p) => p.id)
    const { recipes: batchRecipes, packaging: batchPackaging } = await getBatchRecipesAndPackaging(productIds)

    const recipesMap: Record<string, Record<string, { menge: number; einheit: string }>> = {}
    const packagingMap: Record<string, { pro_verpackung: number; verpackungseinheit: string }> = {}

    // Process recipes
    Object.entries(batchRecipes).forEach(([productId, productRecipes]) => {
      const product = productsData.find((p) => p.id === Number.parseInt(productId))
      if (product && productRecipes.length > 0) {
        recipesMap[product.name] = {}
        productRecipes.forEach((recipe) => {
          if (recipe.ingredient) {
            // @ts-ignore - ingredient is a joined field
            recipesMap[product.name][recipe.ingredient.name] = {
              menge: recipe.amount,
              einheit: recipe.ingredient.unit,
            }
          }
        })
      }
    })

    // Process packaging
    Object.entries(batchPackaging).forEach(([productId, productPackaging]) => {
      const product = productsData.find((p) => p.id === Number.parseInt(productId))
      if (product && productPackaging) {
        packagingMap[product.name] = {
          pro_verpackung: productPackaging.amount_per_package,
          verpackungseinheit: productPackaging.packaging_unit,
        }
      }
    })

    return { recipes: recipesMap, packaging: packagingMap }
  }, [])

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

        const eventNotes = eventData?.notes || ""

        if (eventData) {
          setEvent(eventData)
          setIsPrintReady(eventData.print || false)
          setIsFinished(eventData.finished || false)

          // Load notes from database
          setNotes(eventNotes)
          setInitialNotes(eventNotes)

          setEventDetails({
            type: eventData.type || "Catering",
            name: eventData.name || "",
            ft: eventData.ft || "",
            ka: eventData.ka || "",
            date: eventData.date ? new Date(eventData.date).toISOString().split("T")[0] : "",
            supplierName: "",
            notes: eventNotes, // Add notes to eventDetails
          })
          setEditDate(eventData.date ? new Date(eventData.date) : undefined)
          setEditEndDate(eventData.end_date ? new Date(eventData.end_date) : undefined)

          // Set edit form initial values with arrays for FT and KA
          setEditForm({
            name: eventData.name || "",
            type: eventData.type || "Catering",
            date: eventData.date ? new Date(eventData.date).toISOString().split("T")[0] : "",
            endDate: eventData.end_date ? new Date(eventData.end_date).toISOString().split("T")[0] : "",
            ft: eventData.ft ? eventData.ft.split(" & ") : [],
            ka: eventData.ka ? eventData.ka.split(" & ") : [],
          })
        }

        setCategories(categoriesData)
        setProducts(productsData)

        // Create product categories mapping for PDF export
        const categoryMap: Record<string, string> = {}
        const foodTypeMap: Record<string, string> = {}
        productsData.forEach((product) => {
          if (product.category) {
            categoryMap[product.name] = product.category.name
          }
          // Store food classification for ingredients
          if (product.food_type) {
            foodTypeMap[product.name] = product.food_type
          }
        })
        setProductCategories(categoryMap)
        setIngredientFoodTypes(foodTypeMap)

        // Load event products and recipes/packaging in parallel
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
          type: eventData?.type || "Catering",
          name: eventData?.name || "",
          ft: eventData?.ft || "",
          ka: eventData?.ka || "",
          date: eventData?.date ? new Date(eventData.date).toISOString().split("T")[0] : "",
          supplierName: "",
          notes: eventNotes, // Now eventNotes is properly scoped
        })

        // Also store initial status values for comparison
        const initialPrintReady = eventData?.print || false
        const initialFinished = eventData?.finished || false
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
  }, [eventId, toast, loadRecipesAndPackaging])

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

  // Check for unsaved changes
  useEffect(() => {
    // Check if selected products have changed
    const productsChanged = JSON.stringify(selectedProducts) !== JSON.stringify(initialSelectedProducts)

    // Check if event details have changed (including all fields)
    const currentEventDetails = {
      type: event?.type || "Catering",
      name: event?.name || "",
      ft: event?.ft || "",
      ka: event?.ka || "",
      date: event?.date ? new Date(event.date).toISOString().split("T")[0] : "",
      endDate: event?.end_date ? new Date(event.end_date).toISOString().split("T")[0] : "",
      supplierName: eventDetails.supplierName,
    }

    const initialEventDetailsWithEndDate = {
      ...initialEventDetails,
      endDate: event?.end_date ? new Date(event.end_date).toISOString().split("T")[0] : "",
    }

    const eventDetailsChanged = JSON.stringify(currentEventDetails) !== JSON.stringify(initialEventDetailsWithEndDate)

    // Check if status flags have changed
    const statusChanged = (event?.print || false) !== isPrintReady || (event?.finished || false) !== isFinished

    // Check if notes have changed
    const notesChanged = notes !== initialNotes

    setHasUnsavedChanges(productsChanged || eventDetailsChanged || statusChanged || notesChanged)
  }, [
    selectedProducts,
    event,
    eventDetails,
    initialSelectedProducts,
    initialEventDetails,
    isPrintReady,
    isFinished,
    notes,
    initialNotes,
  ])

  // Helper functions
  const getUnitPlural = useCallback((quantity: number, unit: string): string => {
    if (quantity > 1) {
      return unitPlurals[unit] || unit
    }
    return unit
  }, [])

  const formatWeight = useCallback((value: number, unit: string): string => {
    if (unit.toLowerCase() === "gramm" && value >= 1000) {
      return `${(value / 1000).toFixed(1)} Kg`
    } else if (unit.toLowerCase() === "milliliter" && value >= 1000) {
      return `${(value / 1000).toFixed(1)} L`
    } else {
      return `${value} ${unit}`
    }
  }, [])

  // Get the category icon
  const getCategoryIcon = useCallback((categoryName: string) => {
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
  }, [])

  // Get the category background color (light version for unselected products)
  const getCategoryBackgroundColor = useCallback((categoryName: string) => {
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
  }, [])

  // Get the stronger category background color for selected products
  const getSelectedCategoryBackgroundColor = useCallback((categoryName: string) => {
    switch (categoryName) {
      case "Essen":
        return "bg-orange-200 border-orange-400 hover:bg-orange-300 shadow-sm"
      case "Getränke Pet":
        return "bg-blue-200 border-blue-400 hover:bg-blue-300 shadow-sm"
      case "Getränke Glas":
        return "bg-cyan-200 border-cyan-400 hover:bg-cyan-300 shadow-sm"
      case "Getränke Spezial":
        return "bg-purple-200 border-purple-400 hover:bg-purple-300 shadow-sm"
      case "Equipment":
        return "bg-green-200 border-green-400 hover:bg-green-300 shadow-sm"
      case "Kassa":
        return "bg-yellow-200 border-yellow-400 hover:bg-yellow-300 shadow-sm"
      default:
        return "bg-gray-200 border-gray-400 hover:bg-gray-300 shadow-sm"
    }
  }, [])

  // Event handlers
  const handleProductSelect = useCallback(
    (productId: number, productName: string, category: string, quantity: number, unit: string, overwrite = false) => {
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
    },
    [],
  )

  const handleDeleteProduct = useCallback((product: string) => {
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
  }, [])

  const handleQuantityChange = useCallback(
    (product: string, quantity: number) => {
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
    },
    [handleDeleteProduct],
  )

  const handleClearCategory = useCallback(
    (categoryName: string) => {
      // Get all products from this category that are currently selected
      const productsToDelete = Object.keys(selectedProducts).filter(
        (productName) => productCategories[productName] === categoryName,
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

      toast({
        title: "Erfolg",
        description: `Alle Produkte aus der Kategorie "${categoryName}" wurden gelöscht.`,
      })
    },
    [selectedProducts, productCategories, toast],
  )

  const handleDeleteAllInCategory = useCallback((category: string) => {
    setCategoryToDelete(category)
    setIsDeleteAllDialogOpen(true)
  }, [])

  const confirmDeleteAllInCategory = useCallback(() => {
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
  }, [selectedProducts, productCategories, categoryToDelete, toast])

  const handleSave = async () => {
    setSaving(true)
    try {
      // Save event products
      await saveEventProducts(
        eventId,
        Object.entries(selectedProducts).map(([productName, details]) => ({
          product_name: productName,
          quantity: details.quantity,
          unit: details.unit,
        })),
      )

      // Save notes if they have changed
      if (notes !== initialNotes) {
        const notesSuccess = await updateEventNotes(eventId, notes)
        if (!notesSuccess) {
          throw new Error("Failed to save notes")
        }
      }

      // Reset the initial state after successful save
      setInitialSelectedProducts(selectedProducts)
      setInitialEventDetails({
        type: event?.type || "Catering",
        name: event?.name || "",
        ft: event?.ft || "",
        ka: event?.ka || "",
        date: event?.date ? new Date(event.date).toISOString().split("T")[0] : "",
        endDate: event?.end_date ? new Date(event.end_date).toISOString().split("T")[0] : "",
        supplierName: eventDetails.supplierName,
        notes: notes, // Update initial notes
      })

      // Reset notes initial state
      setInitialNotes(notes)

      // Update the event state to reflect current status values and notes
      if (event) {
        setEvent({ ...event, print: isPrintReady, finished: isFinished, notes })
      }
      setHasUnsavedChanges(false)

      // Show success animation
      setShowSaveSuccess(true)
      setTimeout(() => setShowSaveSuccess(false), 3000)

      // Show toast notification
      toast({
        title: "✅ Erfolgreich gespeichert!",
        description: "Alle Änderungen wurden erfolgreich in der Packliste gespeichert.",
        duration: 5000,
        className: "bg-green-50 border-green-200 text-green-800 shadow-lg",
      })
    } catch (error) {
      console.error("Error saving event products:", error)
      toast({
        title: "❌ Fehler beim Speichern",
        description: "Packliste konnte nicht gespeichert werden. Bitte versuchen Sie es erneut.",
        variant: "destructive",
        duration: 5000,
      })
    } finally {
      setSaving(false)
    }
  }

  const handleEditEvent = () => {
    if (!event) return

    // Reset form with current event data
    setEditForm({
      name: event.name || "",
      type: event.type || "Catering",
      date: event.date ? new Date(event.date).toISOString().split("T")[0] : "",
      endDate: event.end_date ? new Date(event.end_date).toISOString().split("T")[0] : "",
      ft: event.ft ? event.ft.split(" & ") : [],
      ka: event.ka ? event.ka.split(" & ") : [],
    })

    setIsEditDialogOpen(true)
  }

  const handleUpdateEvent = async () => {
    if (!event) return

    try {
      const updated = await updateEvent(eventId, {
        name: editForm.name,
        type: editForm.type,
        date: editForm.date ? new Date(editForm.date).toISOString() : null,
        end_date: editForm.endDate ? new Date(editForm.endDate).toISOString() : null,
        ft: editForm.ft.length > 0 ? editForm.ft.join(" & ") : null,
        ka: editForm.ka.length > 0 ? editForm.ka.join(" & ") : null,
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
          notes: notes, // Keep current notes
        }
        setEventDetails(newEventDetails)
        setInitialEventDetails(newEventDetails)
        setIsEditDialogOpen(false)
        toast({
          title: "✅ Erfolg",
          description: "Event wurde erfolgreich aktualisiert.",
        })
      }
    } catch (error) {
      console.error("Error updating event:", error)
      toast({
        title: "❌ Fehler",
        description: "Event konnte nicht aktualisiert werden.",
        variant: "destructive",
      })
    }
  }

  const handleShowPrintPreview = async () => {
    if (!event) return

    try {
      // Create the print preview content including end date and notes
      const currentEventDetails: EventDetails = {
        type: event.type || "Catering",
        name: event.name || "",
        ft: event.ft || "",
        ka: event.ka || "",
        date: event.date ? format(new Date(event.date), "dd.MM.yyyy", { locale: de }) : "",
        endDate: event.end_date ? format(new Date(event.end_date), "dd.MM.yyyy", { locale: de }) : "",
        supplierName: "",
        notes: notes, // Include current notes
      }

      // Generate HTML content for print preview
      const htmlContent = generatePrintPreviewHTML(
        selectedProducts,
        calculatedIngredients,
        currentEventDetails,
        formatWeight,
        getUnitPlural,
        productCategories,
        ingredientFoodTypes,
      )

      setPrintPreviewContent(htmlContent)
      setIsPrintPreviewOpen(true)
    } catch (error) {
      console.error("Error generating print preview:", error)
      toast({
        title: "Fehler",
        description: "Druckvorschau konnte nicht erstellt werden.",
        variant: "destructive",
      })
    }
  }

  const handleExportPdf = async () => {
    if (!event) return

    try {
      // Update eventDetails with current event data including end date and notes
      const currentEventDetails: EventDetails = {
        type: event.type || "Catering",
        name: event.name || "",
        ft: event.ft || "",
        ka: event.ka || "",
        date: event.date ? format(new Date(event.date), "dd.MM.yyyy", { locale: de }) : "",
        endDate: event.end_date ? format(new Date(event.end_date), "dd.MM.yyyy", { locale: de }) : "",
        supplierName: "",
        notes: notes, // Include current notes for PDF
      }

      await generatePdf(
        selectedProducts,
        calculatedIngredients,
        currentEventDetails,
        formatWeight,
        getUnitPlural,
        "packliste",
        productCategories, // Pass the product categories mapping
        ingredientFoodTypes, // Pass the ingredient food types mapping
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

  const generatePrintPreviewHTML = (
    selectedProducts: Record<string, SelectedProduct>,
    calculatedIngredients: Record<string, CalculatedIngredient>,
    eventDetails: EventDetails,
    formatWeight: (value: number, unit: string) => string,
    getUnitPlural: (quantity: number, unit: string) => string,
    productCategories: Record<string, string>,
    ingredientFoodTypes: Record<string, string>,
  ): string => {
    // Group products by their actual categories
    const productsByCategory: Record<string, { name: string; quantity: number; unit: string }[]> = {}

    Object.entries(selectedProducts).forEach(([productName, details]) => {
      const category = productCategories[productName] || "Sonstige"
      if (!productsByCategory[category]) {
        productsByCategory[category] = []
      }
      productsByCategory[category].push({
        name: productName,
        quantity: details.quantity,
        unit: details.unit,
      })
    })

    const sortedCategories = Object.keys(productsByCategory).sort()

    // Separate ingredients by food classification
    const foodIngredients: Record<string, CalculatedIngredient> = {}
    const nonFoodIngredients: Record<string, CalculatedIngredient> = {}

    Object.entries(calculatedIngredients).forEach(([ingredientName, details]) => {
      const foodType = ingredientFoodTypes[ingredientName] || "unclassified"

      if (foodType === "food") {
        foodIngredients[ingredientName] = details
      } else {
        // Treat both 'non-food' and unclassified as Non Food
        nonFoodIngredients[ingredientName] = details
      }
    })

    // Build header info with proper formatting
    let headerInfo = `${eventDetails.name} | ${eventDetails.type}`

    // Add date information
    if (eventDetails.date) {
      if (eventDetails.endDate && eventDetails.endDate !== eventDetails.date) {
        headerInfo += ` | ${eventDetails.date} - ${eventDetails.endDate}`
      } else {
        headerInfo += ` | ${eventDetails.date}`
      }
    }

    // Add FT if exists
    if (eventDetails.ft && eventDetails.ft !== "none") {
      headerInfo += ` | ${eventDetails.ft}`
    }

    // Add KA if exists
    if (eventDetails.ka && eventDetails.ka !== "none") {
      headerInfo += ` | ${eventDetails.ka}`
    }

    // Generate HTML
    let html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <title>Packliste: ${eventDetails.name}</title>
      <style>
        @media print {
          @page { margin: 1cm; }
          body { margin: 0; }
        }
        body {
          font-family: Arial, sans-serif;
          font-size: 12px;
          line-height: 1.4;
          margin: 20px;
        }
        .header {
          border-bottom: 2px solid #333;
          padding-bottom: 10px;
          margin-bottom: 20px;
        }
        .title {
          font-size: 18px;
          font-weight: bold;
          margin-bottom: 5px;
        }
        .event-info {
          font-size: 14px;
          color: #666;
        }
        .products-section {
          margin-bottom: 30px;
        }
        .category-grid {
          display: grid;
          grid-template-columns: repeat(6, 1fr);
          gap: 20px;
          margin-bottom: 20px;
        }
        .category {
          break-inside: avoid;
        }
        .category-title {
          font-weight: bold;
          font-size: 14px;
          margin-bottom: 8px;
          padding-bottom: 3px;
          border-bottom: 1px solid #ccc;
        }
        .product-item {
          display: flex;
          align-items: center;
          margin-bottom: 4px;
          font-size: 11px;
        }
        .product-item span.bold-product {
          font-weight: bold;
        }
        .checkbox {
          width: 12px;
          height: 12px;
          border: 1px solid #333;
          margin-right: 6px;
          flex-shrink: 0;
        }
        .ingredients-section {
          margin-top: 30px;
        }
        .ingredients-title {
          font-size: 16px;
          font-weight: bold;
          margin-bottom: 15px;
          border-bottom: 2px solid #333;
          padding-bottom: 5px;
        }
        .ingredients-subsection {
          margin-bottom: 25px;
        }
        .ingredients-subtitle {
          font-size: 14px;
          font-weight: bold;
          margin-bottom: 10px;
          padding-bottom: 3px;
          border-bottom: 1px solid #666;
        }
        .ingredients-table {
          width: 100%;
          border-collapse: collapse;
          margin-bottom: 15px;
        }
        .ingredients-table th,
        .ingredients-table td {
          border: 1px solid #e5e5e5;
          padding: 6px;
          text-align: left;
          vertical-align: middle;
          height: 25px;
        }
        .ingredients-table th {
          background-color: #f5f5f5;
          font-weight: bold;
          font-size: 14px;
        }
        .ingredients-table .ingredient-name {
          font-size: 14px;
          font-weight: bold;
        }
        .ingredients-table .total-amount {
          font-size: 14px;
          font-weight: bold;
        }
        .ingredients-table .required-amount {
          font-size: 14px;
          font-weight: normal;
          color: #666;
        }
        .special-infos-section {
          margin-top: 30px;
          margin-bottom: 30px;
        }
        .special-infos-title {
          font-size: 16px;
          font-weight: bold;
          margin-bottom: 10px;
          text-decoration: underline;
        }
        .special-infos-box {
          border: 2px solid #333;
          padding: 15px;
          min-height: 80px;
          background-color: #f9f9f9;
        }
        .special-infos-content {
          font-size: 12px;
          line-height: 1.5;
          white-space: pre-wrap;
        }
        .signature-box {
          margin-top: 30px;
          border: 1px solid #333;
          padding: 20px;
          min-height: 60px;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
        }
        .signature-text {
          font-size: 11px;
          line-height: 1.6;
        }
        .signature-line {
          margin-top: 10px;
          padding-top: 5px;
        }
      </style>
    </head>
    <body>
      <div class="header">
        <div class="title">Packliste</div>
        <div class="event-info">${headerInfo}</div>
      </div>

      <div class="products-section">
        <div class="category-grid">
  `

    // Add products by category
    sortedCategories.forEach((category) => {
      const products = productsByCategory[category].sort((a, b) => a.name.localeCompare(b.name))
      const isBoldColumn = category === "Equipment" || category === "Getränke Glas" || category === "Getränke Pet"

      html += `
          <div class="category">
            <div class="category-title">${category}</div>
    `

      products.forEach((product) => {
        html += `
            <div class="product-item">
              <div class="checkbox"></div>
              <span class="${isBoldColumn ? "bold-product" : ""}">${product.quantity}x ${product.name}</span>
            </div>
      `
      })

      html += `
          </div>
    `
    })

    html += `
        </div>
      </div>
  `

    // Add ingredients section if there are any
    if (Object.keys(calculatedIngredients).length > 0) {
      html += `
      <div class="ingredients-section">
        <div class="ingredients-title">Zutaten</div>
    `

      // Non Food section first
      if (Object.keys(nonFoodIngredients).length > 0) {
        html += `
        <div class="ingredients-subsection">
          <div class="ingredients-subtitle">Non Food</div>
          <table class="ingredients-table">
            <thead>
              <tr>
                <th class="checkbox-cell"></th>
                <th>Zutat</th>
                <th>Gesamtmenge</th>
                <th>Benötigte Menge</th>
              </tr>
            </thead>
            <tbody>
      `

        Object.entries(nonFoodIngredients)
          .sort(([a], [b]) => a.localeCompare(b))
          .forEach(([ingredient, details]) => {
            html += `
              <tr>
                <td class="checkbox-cell"><div class="checkbox"></div></td>
                <td class="ingredient-name">${ingredient}</td>
                <td class="total-amount">${details.packagingCount} ${getUnitPlural(details.packagingCount, details.packaging)} à ${formatWeight(details.amountPerPackage, details.unit)}</td>
                <td class="required-amount">${formatWeight(details.totalAmount, details.unit)}</td>
              </tr>
          `
          })

        html += `
            </tbody>
          </table>
        </div>
      `
      }

      // Food section second
      if (Object.keys(foodIngredients).length > 0) {
        html += `
        <div class="ingredients-subsection">
          <div class="ingredients-subtitle">Food</div>
          <table class="ingredients-table">
            <thead>
              <tr>
                <th class="checkbox-cell"></th>
                <th>Zutat</th>
                <th>Gesamtmenge</th>
                <th>Benötigte Menge</th>
              </tr>
            </thead>
            <tbody>
      `

        Object.entries(foodIngredients)
          .sort(([a], [b]) => a.localeCompare(b))
          .forEach(([ingredient, details]) => {
            html += `
              <tr>
                <td class="checkbox-cell"><div class="checkbox"></div></td>
                <td class="ingredient-name">${ingredient}</td>
                <td class="total-amount">${details.packagingCount} ${getUnitPlural(details.packagingCount, details.packaging)} à ${formatWeight(details.amountPerPackage, details.unit)}</td>
                <td class="required-amount">${formatWeight(details.totalAmount, details.unit)}</td>
              </tr>
          `
          })

        html += `
            </tbody>
          </table>
        </div>
      `
      }

      html += `
      </div>
    `
    }

    // Add Special Infos section if notes exist
    if (eventDetails.notes && eventDetails.notes.trim() !== "") {
      html += `
        <div class="special-infos-section">
          <div class="special-infos-title">Special Infos</div>
          <div class="special-infos-box">
            <div class="special-infos-content">${eventDetails.notes.replace(/\n/g, "<br>")}</div>
          </div>
        </div>
      `
    }

    // Add signature box with updated footer format
    html += `
      <div class="signature-box">
        <div class="signature-text">
          ${headerInfo}
        </div>
        <div class="signature-text signature-line">
          Erledigt von: ______________________&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;Datum & Uhrzeit: _____________________
        </div>
      </div>
    </body>
    </html>
  `

    return html
  }

  const handlePrint = () => {
    if (!printPreviewContent) return

    // Create a new window for printing
    const printWindow = window.open("", "_blank")
    if (!printWindow) {
      toast({
        title: "Fehler",
        description: "Popup-Blocker verhindert das Öffnen des Druckfensters.",
        variant: "destructive",
      })
      return
    }

    printWindow.document.write(printPreviewContent)
    printWindow.document.close()

    // Wait for content to load, then print
    printWindow.onload = () => {
      printWindow.focus()
      printWindow.print()
      printWindow.close()
    }

    setIsPrintPreviewOpen(false)
    toast({
      title: "Erfolg",
      description: "Druckdialog wurde geöffnet.",
    })
  }

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

  // Render ingredients table component
  const renderIngredientsTable = (ingredients: Record<string, CalculatedIngredient>, title: string) => {
    if (Object.keys(ingredients).length === 0) return null

    return (
      <div className="mb-6">
        <h3 className="text-lg font-semibold mb-3 pb-2 border-b border-gray-300">{title}</h3>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b">
                <th className="text-left p-2 w-8"></th>
                <th className="text-left p-2">Zutat</th>
                <th className="text-left p-2">Gesamtmenge</th>
                <th className="text-left p-2">Benötigte Menge</th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(ingredients)
                .sort(([a], [b]) => a.localeCompare(b))
                .map(([ingredient, details]) => (
                  <tr key={ingredient} className="border-b">
                    <td className="p-2 text-center">
                      <div className="w-4 h-4 border border-gray-400 rounded-sm mx-auto"></div>
                    </td>
                    <td className="p-2 text-base font-medium">{ingredient}</td>
                    <td className="p-2 text-base font-medium">
                      {details.packagingCount} {getUnitPlural(details.packagingCount, details.packaging)} à{" "}
                      {formatWeight(details.amountPerPackage, details.unit)}
                    </td>
                    <td className="p-2 text-base">{formatWeight(details.totalAmount, details.unit)}</td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </div>
    )
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
    <div className="max-w-[1600px] mx-auto space-y-6 px-4 sm:px-6 lg:px-8">
      {/* Success Banner */}
      {showSaveSuccess && (
        <div className="fixed top-4 left-1/2 transform -translate-x-1/2 z-50 animate-in slide-in-from-top-2 duration-300">
          <div className="bg-green-500 text-white px-6 py-3 rounded-lg shadow-lg flex items-center gap-3 min-w-[300px]">
            <CheckCircle className="h-6 w-6 animate-pulse" />
            <div>
              <div className="font-semibold">Erfolgreich gespeichert!</div>
              <div className="text-sm opacity-90">Alle Änderungen wurden gespeichert</div>
            </div>
          </div>
        </div>
      )}

      {/* Header Section - Two Row Layout */}
      <div className="space-y-4 mb-6">
        {/* Top Row: Back Button Only */}
        <div className="flex items-center">
          <Button
            variant="outline"
            onClick={handleBackClick}
            className="flex items-center gap-2 bg-transparent flex-shrink-0"
          >
            <ArrowLeft className="h-4 w-4" />
            <span className="hidden sm:inline">Zurück zur Event-Auswahl</span>
            <span className="sm:hidden">Zurück</span>
          </Button>
        </div>

        {/* Bottom Row: Event Title and Action Buttons */}
        <div className="flex items-center justify-between gap-4">
          {/* Left: Empty space for balance */}
          <div className="flex-shrink-0 w-0 sm:w-32"></div>

          {/* Center: Event Title */}
          <div className="flex-1 text-center">
            <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold">Packliste: {event.name}</h1>
          </div>

          {/* Right: Action Buttons */}
          <div className="flex gap-2 flex-shrink-0">
            <Button
              variant="outline"
              onClick={handleShowPrintPreview}
              className="flex items-center gap-2 bg-transparent"
            >
              <FileDown className="h-4 w-4" />
              <span className="hidden sm:inline">PDF Export</span>
            </Button>
            <Button variant="outline" onClick={handleEditEvent} className="flex items-center gap-2 bg-transparent">
              <Edit className="h-4 w-4" />
              <span className="hidden sm:inline">Bearbeiten</span>
            </Button>
            <Button
              onClick={handleSave}
              disabled={saving}
              className={`flex items-center gap-2 transition-all duration-200 bg-black hover:bg-gray-800 text-white ${
                saving ? "cursor-not-allowed opacity-75" : ""
              }`}
            >
              {saving ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                  <span className="hidden sm:inline">Speichert...</span>
                </>
              ) : (
                <>
                  <Save className="h-4 w-4" />
                  <span className="hidden sm:inline">Speichern</span>
                </>
              )}
            </Button>
          </div>
        </div>
      </div>

      {/* Event Information and Status Section - Mobile Optimized */}
      <div className="bg-white p-4 rounded-lg shadow-sm">
        {/* Event Information - Mobile Stacked */}
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 lg:gap-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between flex-1 gap-4 sm:gap-2 bg-gray-50 p-3 rounded-lg border border-gray-200">
            <div className="text-center">
              <p className="text-xs text-gray-500">Typ</p>
              <p className="font-medium text-sm">{event.type}</p>
            </div>
            <div className="text-center">
              <p className="text-xs text-gray-500">Datum</p>
              <p className="font-medium text-sm">
                {event.date
                  ? event.end_date && event.date !== event.end_date
                    ? `${new Date(event.date).toLocaleDateString("de-DE")} - ${new Date(
                        event.end_date,
                      ).toLocaleDateString("de-DE")}`
                    : new Date(event.date).toLocaleDateString("de-DE")
                  : "Kein Datum"}
              </p>
            </div>
            {event.ft && (
              <div className="text-center">
                <p className="text-xs text-gray-500">Foodtruck</p>
                <p className="font-medium text-sm">{event.ft}</p>
              </div>
            )}
            {event.ka && (
              <div className="text-center">
                <p className="text-xs text-gray-500">Kühlanhänger</p>
                <p className="font-medium text-sm">{event.ka}</p>
              </div>
            )}
          </div>

          {/* Status Buttons - Mobile Stacked */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 sm:gap-6 flex-shrink-0">
            {/* Print Ready Status */}
            <div className="flex items-center gap-3 bg-gradient-to-br from-blue-50 to-indigo-50 px-4 py-3 rounded-lg border border-blue-100">
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
                  className={`relative inline-flex items-center justify-center w-10 h-5 rounded-full cursor-pointer transition-all duration-300 ease-in-out ${
                    isPrintReady
                      ? "bg-gradient-to-r from-yellow-400 to-yellow-500 shadow-sm shadow-yellow-200"
                      : "bg-gray-300 hover:bg-gray-400"
                  }`}
                >
                  <span
                    className={`absolute w-3 h-3 bg-white rounded-full shadow-sm transform transition-all duration-300 ease-in-out ${
                      isPrintReady ? "translate-x-2.5" : "-translate-x-2.5"
                    }`}
                  >
                    {isPrintReady && (
                      <svg
                        className="w-2 h-2 text-yellow-600 absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2"
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
              <label
                htmlFor="print-ready"
                className="text-sm font-medium text-gray-800 cursor-pointer whitespace-nowrap"
              >
                Bereit zum Drucken
              </label>
            </div>

            {/* Finished Status */}
            <div className="flex items-center gap-3 bg-gradient-to-br from-green-50 to-emerald-50 px-4 py-3 rounded-lg border border-green-100">
              <div className="relative">
                <input
                  type="checkbox"
                  id="finished"
                  checked={isFinished}
                  onChange={async (e) => {
                    const newStatus = e.target.checked
                    setIsFinished(newStatus)

                    // Update database
                    const success = await updateFinishedStatus(newStatus)

                    if (success) {
                      // Update the event state as well
                      if (event) {
                        setEvent({ ...event, finished: newStatus })
                      }
                      toast({
                        title: "Status aktualisiert",
                        description: newStatus
                          ? "Event ist als fertig markiert"
                          : "Event ist nicht mehr als fertig markiert",
                      })
                    } else {
                      // Revert the state if database update failed
                      setIsFinished(!newStatus)
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
                  htmlFor="finished"
                  className={`relative inline-flex items-center justify-center w-10 h-5 rounded-full cursor-pointer transition-all duration-300 ease-in-out ${
                    isFinished
                      ? "bg-gradient-to-r from-green-400 to-green-500 shadow-sm shadow-green-200"
                      : "bg-gray-300 hover:bg-gray-400"
                  }`}
                >
                  <span
                    className={`absolute w-3 h-3 bg-white rounded-full shadow-sm transform transition-all duration-300 ease-in-out ${
                      isFinished ? "translate-x-2.5" : "-translate-x-2.5"
                    }`}
                  >
                    {isFinished && (
                      <svg
                        className="w-2 h-2 text-green-600 absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2"
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
              <label htmlFor="finished" className="text-sm font-medium text-gray-800 cursor-pointer whitespace-nowrap">
                Fertig
              </label>
            </div>
          </div>
        </div>
      </div>

      {/* Category Tabs and Clear Button Section */}
      <div className="space-y-4">
        <Tabs value={activeCategory} onValueChange={setActiveCategory} className="w-full">
          <TabsList className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 h-auto gap-1 p-1">
            {packlisteCategories.map((category) => (
              <TabsTrigger key={category} value={category} className="flex-col sm:flex-row text-xs sm:text-sm p-2">
                <span className="text-base sm:mr-2">{getCategoryIcon(category)}</span>
                <span className="hidden sm:inline">{category}</span>
                <span className="sm:hidden text-xs">{category.split(" ")[0]}</span>
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>

        {/* Shared Notes Section - Always Visible */}
        <div className="bg-white p-4 rounded-lg shadow-sm border">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                />
              </svg>
              <span className="text-sm font-medium text-gray-700">Notizen (optional)</span>
            </div>
            <span className="text-xs text-gray-500">{notes.length}/1000 Zeichen</span>
          </div>

          <div className="space-y-2">
            <Textarea
              value={notes}
              onChange={(e) => {
                if (e.target.value.length <= 1000) {
                  setNotes(e.target.value)
                }
              }}
              placeholder="Zusätzliche Informationen zur Packliste..."
              className="w-full p-3 border border-gray-300 rounded-md resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              rows={6}
            />
          </div>
        </div>

        {/* Clear Category Button for Active Category */}
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2">
          <h3 className="text-lg font-semibold flex items-center">
            <span className="mr-2">{getCategoryIcon(activeCategory)}</span>
            {activeCategory}
          </h3>
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleClearCategory(activeCategory)}
            className="text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200 w-fit"
            disabled={
              !Object.keys(selectedProducts).some((productName) => productCategories[productName] === activeCategory)
            }
          >
            Alles löschen
          </Button>
        </div>
      </div>

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

      {/* Products Grid - Improved for better name visibility */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-4 2xl:grid-cols-5 gap-3">
        {filteredProducts.map((product) => {
          const isSelected = productQuantities[product.name] && productQuantities[product.name] > 0
          const backgroundColorClass = isSelected
            ? getSelectedCategoryBackgroundColor(activeCategory)
            : getCategoryBackgroundColor(activeCategory)

          return (
            <div
              key={product.id}
              className={`flex items-center justify-between p-3 border rounded-md min-h-[80px] transition-all duration-200 ${backgroundColorClass}`}
            >
              <div className="flex-1 min-w-0 mr-3">
                <p
                  className={`font-semibold text-base leading-tight break-words ${isSelected ? "font-bold" : ""}`}
                  title={product.name}
                  style={{
                    wordBreak: "break-word",
                    hyphens: "auto",
                    overflowWrap: "break-word",
                  }}
                >
                  {product.name}
                </p>
                <p className="text-xs text-gray-500 mt-1">{product.unit}</p>
              </div>
              <div className="flex items-center gap-1.5 flex-shrink-0">
                <Button
                  variant="outline"
                  size="icon"
                  className="h-7 w-7 bg-transparent"
                  onClick={() => handleProductSelect(product.id, product.name, activeCategory, -1, product.unit)}
                  disabled={!productQuantities[product.name] || productQuantities[product.name] <= 0}
                >
                  <span className="text-sm">-</span>
                </Button>
                <input
                  type="text"
                  value={
                    tempInputValues[product.name] !== undefined
                      ? tempInputValues[product.name]
                      : productQuantities[product.name]?.toString() || "0"
                  }
                  onFocus={(e) => {
                    const currentValue = productQuantities[product.name] || 0
                    // Store the original value
                    setOriginalInputValues((prev) => ({ ...prev, [product.name]: currentValue }))
                    // Set the temporary value and select all text - if value is 0, show empty string
                    setTempInputValues((prev) => ({
                      ...prev,
                      [product.name]: currentValue === 0 ? "" : currentValue.toString(),
                    }))
                    e.target.select()
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      const value = e.currentTarget.value.trim()
                      const originalValue = originalInputValues[product.name] || 0

                      // Clear the temporary values
                      setTempInputValues((prev) => {
                        const newTemp = { ...prev }
                        delete newTemp[product.name]
                        return newTemp
                      })
                      setOriginalInputValues((prev) => {
                        const newOriginal = { ...prev }
                        delete newOriginal[product.name]
                        return newOriginal
                      })

                      // Handle the validation logic
                      if (value === "") {
                        // If empty, restore to original value
                        if (originalValue === 0) {
                          // Keep it at 0 if it was originally 0
                          handleQuantityChange(product.name, 0)
                        } else {
                          // Set to 1 if it was originally positive
                          handleQuantityChange(product.name, 1)
                        }
                      } else if (isNaN(Number(value)) || Number(value) < 0) {
                        // If invalid input, restore to original value or 1
                        if (originalValue === 0) {
                          handleQuantityChange(product.name, 0)
                        } else {
                          handleQuantityChange(product.name, Math.max(1, originalValue))
                        }
                      } else {
                        // Valid input - allow 0 for deselecting
                        const quantity = Number.parseInt(value)
                        if (quantity === 0) {
                          handleQuantityChange(product.name, 0) // This will remove the product
                        } else {
                          handleProductSelect(product.id, product.name, activeCategory, quantity, product.unit, true)
                        }
                      }
                      e.currentTarget.blur()
                    }
                  }}
                  onChange={(e) => {
                    const value = e.target.value
                    // Allow any input including empty string during editing
                    setTempInputValues((prev) => ({ ...prev, [product.name]: value }))
                  }}
                  onBlur={(e) => {
                    const value = e.target.value.trim()
                    const originalValue = originalInputValues[product.name] || 0

                    // Clear the temporary values
                    setTempInputValues((prev) => {
                      const newTemp = { ...prev }
                      delete newTemp[product.name]
                      return newTemp
                    })
                    setOriginalInputValues((prev) => {
                      const newOriginal = { ...prev }
                      delete newOriginal[product.name]
                      return newOriginal
                    })

                    // Handle the validation logic
                    if (value === "") {
                      // If empty, restore to original value
                      if (originalValue === 0) {
                        // Keep it at 0 if it was originally 0
                        handleQuantityChange(product.name, 0)
                      } else {
                        // Set to 1 if it was originally positive
                        handleQuantityChange(product.name, 1)
                      }
                    } else if (isNaN(Number(value)) || Number(value) < 0) {
                      // If invalid input, restore to original value or 1
                      if (originalValue === 0) {
                        handleQuantityChange(product.name, 0)
                      } else {
                        handleQuantityChange(product.name, Math.max(1, originalValue))
                      }
                    } else {
                      // Valid input - allow 0 for deselecting
                      const quantity = Number.parseInt(value)
                      if (quantity === 0) {
                        handleQuantityChange(product.name, 0) // This will remove the product
                      } else {
                        handleProductSelect(product.id, product.name, activeCategory, quantity, product.unit, true)
                      }
                    }
                  }}
                  className="w-12 h-7 text-center text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                  style={{ MozAppearance: "textfield" }}
                />
                <Button
                  variant="outline"
                  size="icon"
                  className="h-7 w-7 bg-transparent"
                  onClick={() => handleProductSelect(product.id, product.name, activeCategory, 1, product.unit)}
                >
                  <span className="text-sm">+</span>
                </Button>
              </div>
            </div>
          )
        })}
      </div>

      {/* Selected Products and Ingredients Section - Two Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Column - Selected Products */}
        <div className="bg-white p-6 rounded-lg shadow-sm">
          <h2 className="text-xl font-bold mb-4">Ausgewählte Produkte</h2>
          {Object.keys(selectedProducts).length === 0 ? (
            <p className="text-gray-500 text-center py-8">Keine Produkte ausgewählt</p>
          ) : (
            <div className="space-y-2">
              {Object.entries(selectedProducts)
                .sort(([a], [b]) => a.localeCompare(b))
                .map(([productName, details]) => (
                  <div
                    key={productName}
                    className="flex items-center justify-between p-3 border border-gray-200 rounded-md hover:bg-gray-50"
                  >
                    <div className="flex-1 min-w-0 mr-3">
                      <p className="font-medium text-base leading-tight break-words" title={productName}>
                        {productName}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {/* Quantity Controls */}
                      <div className="flex items-center gap-1.5">
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-7 w-7 bg-transparent"
                          onClick={() => handleQuantityChange(productName, details.quantity - 1)}
                          disabled={details.quantity <= 1}
                        >
                          <span className="text-sm">-</span>
                        </Button>
                        <input
                          type="text"
                          value={
                            tempInputValues[productName] !== undefined
                              ? tempInputValues[productName]
                              : details.quantity.toString()
                          }
                          onFocus={(e) => {
                            const currentValue = details.quantity
                            // Store the original value
                            setOriginalInputValues((prev) => ({ ...prev, [productName]: currentValue }))
                            // Set the temporary value and select all text
                            setTempInputValues((prev) => ({
                              ...prev,
                              [productName]: currentValue.toString(),
                            }))
                            e.target.select()
                          }}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              const value = e.currentTarget.value.trim()
                              const originalValue = originalInputValues[productName] || details.quantity

                              // Clear the temporary values
                              setTempInputValues((prev) => {
                                const newTemp = { ...prev }
                                delete newTemp[productName]
                                return newTemp
                              })
                              setOriginalInputValues((prev) => {
                                const newOriginal = { ...prev }
                                delete newOriginal[productName]
                                return newOriginal
                              })

                              // Handle the validation logic
                              if (value === "" || isNaN(Number(value)) || Number(value) <= 0) {
                                // If invalid input, restore to original value (minimum 1 for selected products)
                                handleQuantityChange(productName, Math.max(1, originalValue))
                              } else {
                                // Valid input
                                const quantity = Number.parseInt(value)
                                handleQuantityChange(productName, Math.max(1, quantity))
                              }
                              e.currentTarget.blur()
                            }
                          }}
                          onChange={(e) => {
                            const value = e.target.value
                            // Allow any input including empty string during editing
                            setTempInputValues((prev) => ({ ...prev, [productName]: value }))
                          }}
                          onBlur={(e) => {
                            const value = e.target.value.trim()
                            const originalValue = originalInputValues[productName] || details.quantity

                            // Clear the temporary values
                            setTempInputValues((prev) => {
                              const newTemp = { ...prev }
                              delete newTemp[productName]
                              return newTemp
                            })
                            setOriginalInputValues((prev) => {
                              const newOriginal = { ...prev }
                              delete newOriginal[productName]
                              return newOriginal
                            })

                            // Handle the validation logic
                            if (value === "" || isNaN(Number(value)) || Number(value) <= 0) {
                              // If invalid input, restore to original value (minimum 1 for selected products)
                              handleQuantityChange(productName, Math.max(1, originalValue))
                            } else {
                              // Valid input
                              const quantity = Number.parseInt(value)
                              handleQuantityChange(productName, Math.max(1, quantity))
                            }
                          }}
                          className="w-12 h-7 text-center text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                          style={{ MozAppearance: "textfield" }}
                        />
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-7 w-7 bg-transparent"
                          onClick={() => handleQuantityChange(productName, details.quantity + 1)}
                        >
                          <span className="text-sm">+</span>
                        </Button>
                      </div>
                      {/* Delete Button */}
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-red-500 hover:text-red-700 hover:bg-red-50 flex-shrink-0"
                        onClick={() => handleDeleteProduct(productName)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
            </div>
          )}
        </div>

        {/* Right Column - Ingredients */}
        <div className="bg-white p-6 rounded-lg shadow-sm">
          <h2 className="text-xl font-bold mb-6">Zutaten</h2>
          {Object.keys(calculatedIngredients).length === 0 ? (
            <p className="text-gray-500 text-center py-8">Keine Zutaten berechnet</p>
          ) : (
            <>
              {/* Non Food Ingredients */}
              {Object.keys(separatedIngredients.nonFoodIngredients).length > 0 && (
                <div className="mb-8">
                  <h3 className="text-lg font-semibold mb-4 pb-2 border-b border-gray-300 text-gray-700">Non Food</h3>
                  <div className="overflow-x-auto">
                    <table className="w-full border-collapse">
                      <thead>
                        <tr className="border-b-2 border-gray-300">
                          <th className="text-left p-3 font-semibold text-gray-700">Zutat</th>
                          <th className="text-left p-3 font-semibold text-gray-700">Gesamtmenge</th>
                          <th className="text-left p-3 font-semibold text-gray-700">Verpackung</th>
                        </tr>
                      </thead>
                      <tbody>
                        {Object.entries(separatedIngredients.nonFoodIngredients)
                          .sort(([a], [b]) => a.localeCompare(b))
                          .map(([ingredient, details]) => (
                            <tr key={ingredient} className="border-b border-gray-200 hover:bg-gray-50">
                              <td className="p-3 font-medium text-gray-900">{ingredient}</td>
                              <td className="p-3 text-gray-700">{formatWeight(details.totalAmount, details.unit)}</td>
                              <td className="p-3 text-gray-700">
                                {details.packagingCount} {getUnitPlural(details.packagingCount, details.packaging)} à{" "}
                                {formatWeight(details.amountPerPackage, details.unit)}
                              </td>
                            </tr>
                          ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Food Ingredients */}
              {Object.keys(separatedIngredients.foodIngredients).length > 0 && (
                <div>
                  <h3 className="text-lg font-semibold mb-4 pb-2 border-b border-gray-300 text-gray-700">Food</h3>
                  <div className="overflow-x-auto">
                    <table className="w-full border-collapse">
                      <thead>
                        <tr className="border-b-2 border-gray-300">
                          <th className="text-left p-3 font-semibold text-gray-700">Zutat</th>
                          <th className="text-left p-3 font-semibold text-gray-700">Gesamtmenge</th>
                          <th className="text-left p-3 font-semibold text-gray-700">Verpackung</th>
                        </tr>
                      </thead>
                      <tbody>
                        {Object.entries(separatedIngredients.foodIngredients)
                          .sort(([a], [b]) => a.localeCompare(b))
                          .map(([ingredient, details]) => (
                            <tr key={ingredient} className="border-b border-gray-200 hover:bg-gray-50">
                              <td className="p-3 font-medium text-gray-900">{ingredient}</td>
                              <td className="p-3 text-gray-700">{formatWeight(details.totalAmount, details.unit)}</td>
                              <td className="p-3 text-gray-700">
                                {details.packagingCount} {getUnitPlural(details.packagingCount, details.packaging)} à{" "}
                                {formatWeight(details.amountPerPackage, details.unit)}
                              </td>
                            </tr>
                          ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Dialogs */}
      <Dialog open={isUnsavedChangesDialogOpen} onOpenChange={setIsUnsavedChangesDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Ungespeicherte Änderungen</DialogTitle>
            <DialogDescription>
              Sie haben ungespeicherte Änderungen. Möchten Sie diese speichern, bevor Sie fortfahren?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={handleDiscardAndGoBack}>
              Verwerfen
            </Button>
            <Button onClick={handleSaveAndGoBack}>Speichern und fortfahren</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isDeleteAllDialogOpen} onOpenChange={setIsDeleteAllDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Alle Produkte löschen</DialogTitle>
            <DialogDescription>
              Sind Sie sicher, dass Sie alle Produkte aus der Kategorie "{categoryToDelete}" löschen möchten?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeleteAllDialogOpen(false)}>
              Abbrechen
            </Button>
            <Button variant="destructive" onClick={confirmDeleteAllInCategory}>
              Löschen
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-md" onOpenAutoFocus={(e) => e.preventDefault()}>
          <DialogHeader>
            <DialogTitle>Event bearbeiten</DialogTitle>
            <DialogDescription>Bearbeiten Sie die Event-Details</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="edit-name">Name</Label>
              <Input
                id="edit-name"
                value={editForm.name}
                onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="edit-type">Typ</Label>
              <Select value={editForm.type} onValueChange={(value) => setEditForm({ ...editForm, type: value })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Catering">Catering</SelectItem>
                  <SelectItem value="Verkauf">Verkauf</SelectItem>
                  <SelectItem value="Lieferung">Lieferung</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="edit-date">Datum</Label>
              <Input
                id="edit-date"
                type="date"
                value={editForm.date}
                onChange={(e) => setEditForm({ ...editForm, date: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="edit-end-date">Enddatum (optional)</Label>
              <Input
                id="edit-end-date"
                type="date"
                value={editForm.endDate}
                onChange={(e) => setEditForm({ ...editForm, endDate: e.target.value })}
              />
            </div>
            <div>
              <Label>Foodtruck</Label>
              <div className="grid grid-cols-3 gap-2 mt-2">
                {["FT1", "FT2", "FT3", "FT4", "FT5", "Indoor"].map((ft) => (
                  <label key={ft} className="flex items-center space-x-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={editForm.ft.includes(ft)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setEditForm({ ...editForm, ft: [...editForm.ft, ft] })
                        } else {
                          setEditForm({ ...editForm, ft: editForm.ft.filter((f) => f !== ft) })
                        }
                      }}
                      className="rounded"
                    />
                    <span className="text-sm">{ft}</span>
                  </label>
                ))}
              </div>
            </div>
            <div>
              <Label>Kühlanhänger</Label>
              <div className="grid grid-cols-3 gap-2 mt-2">
                {["KA 1", "KA 2", "KA 3", "KA 4", "KA 5"].map((ka) => (
                  <label key={ka} className="flex items-center space-x-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={editForm.ka.includes(ka)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setEditForm({ ...editForm, ka: [...editForm.ka, ka] })
                        } else {
                          setEditForm({ ...editForm, ka: editForm.ka.filter((k) => k !== ka) })
                        }
                      }}
                      className="rounded"
                    />
                    <span className="text-sm">{ka}</span>
                  </label>
                ))}
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

      <Dialog open={isPrintPreviewOpen} onOpenChange={setIsPrintPreviewOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Druckvorschau</DialogTitle>
            <DialogDescription>Vorschau der Packliste vor dem PDF-Export</DialogDescription>
          </DialogHeader>
          <div className="border rounded-lg p-4 bg-white">
            <div dangerouslySetInnerHTML={{ __html: printPreviewContent }} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsPrintPreviewOpen(false)}>
              Schließen
            </Button>
            <Button onClick={handleExportPdf}>PDF exportieren</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
