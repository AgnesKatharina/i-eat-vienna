"use client"

import { useState, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ArrowLeft, Save, Edit, FileDown, Search, CheckCircle } from "lucide-react"
import { useToast } from "@/components/ui/use-toast"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { format } from "date-fns"
import { de } from "date-fns/locale"
import { unitPlurals } from "@/lib/data"
import { getEvent, saveEventProducts, getEventProducts, updateEvent, updatePrintReadyStatus } from "@/lib/event-service"
import { getAllProducts, getCategories, getProductRecipes, getProductPackaging } from "@/lib/supabase-service"
import { generatePdf } from "@/lib/pdf-generator"
import { PacklisteSkeleton } from "@/components/packliste-skeleton"
import type { SelectedProduct, EventDetails, CalculatedIngredient, Event } from "@/lib/types"
import type { ProductWithCategory } from "@/lib/supabase-service"
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs"

interface PacklisteDetailProps {
  eventId: string
}

export function PacklisteDetail({ eventId }: PacklisteDetailProps) {
  const router = useRouter()
  const { toast } = useToast()
  const supabase = createClientComponentClient()

  // State variables
  const [event, setEvent] = useState<Event | null>(null)
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
  const [isPrintReady, setIsPrintReady] = useState(false)
  const [isFinished, setIsFinished] = useState(false)
  const [isPrintPreviewOpen, setIsPrintPreviewOpen] = useState(false)
  const [printPreviewContent, setPrintPreviewContent] = useState<string>("")
  const [showSaveSuccess, setShowSaveSuccess] = useState(false)

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
          setIsFinished(eventData.finished || false)
          setEventDetails({
            type: eventData.type || "Catering",
            name: eventData.name || "",
            ft: eventData.ft || "",
            ka: eventData.ka || "",
            date: eventData.date ? new Date(eventData.date).toISOString().split("T")[0] : "",
            supplierName: "",
          })
          setEditDate(eventData.date ? new Date(eventData.date) : undefined)
          setEditEndDate(eventData.end_date ? new Date(eventData.end_date) : undefined)
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
          type: eventData?.type || "Catering",
          name: eventData?.name || "",
          ft: eventData?.ft || "",
          ka: eventData?.ka || "",
          date: eventData?.date ? new Date(eventData.date).toISOString().split("T")[0] : "",
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

  // Check for unsaved changes
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

  // Helper functions
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

  // Event handlers
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
    setSaving(true)
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
    setIsEditDialogOpen(true)
  }

  const handleUpdateEvent = async () => {
    if (!event) return

    try {
      const updated = await updateEvent(eventId, {
        name: event.name,
        type: event.type,
        date: editDate ? editDate.toISOString() : null,
        end_date: editEndDate ? editEndDate.toISOString() : null,
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

  const handleShowPrintPreview = async () => {
    if (!event) return

    try {
      // Create the print preview content
      const currentEventDetails: EventDetails = {
        type: event.type || "Catering",
        name: event.name || "",
        ft: event.ft || "",
        ka: event.ka || "",
        date: event.date ? format(new Date(event.date), "dd.MM.yyyy", { locale: de }) : "",
        supplierName: "",
      }

      // Generate HTML content for print preview
      const htmlContent = generatePrintPreviewHTML(
        selectedProducts,
        calculatedIngredients,
        currentEventDetails,
        formatWeight,
        getUnitPlural,
        productCategories,
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

  const generatePrintPreviewHTML = (
    selectedProducts: Record<string, SelectedProduct>,
    calculatedIngredients: Record<string, CalculatedIngredient>,
    eventDetails: EventDetails,
    formatWeight: (value: number, unit: string) => string,
    getUnitPlural: (quantity: number, unit: string) => string,
    productCategories: Record<string, string>,
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
          .checkbox {
            width: 12px;
            height: 12px;
            border: 1px solid #333;
            margin-right: 6px;
            flex-shrink: 0;
          }
          .ingredients-section {
            page-break-before: always;
            margin-top: 30px;
          }
          .ingredients-title {
            font-size: 16px;
            font-weight: bold;
            margin-bottom: 15px;
            border-bottom: 2px solid #333;
            padding-bottom: 5px;
          }
          .ingredients-table {
            width: 100%;
            border-collapse: collapse;
          }
          .ingredients-table th,
          .ingredients-table td {
            border: 1px solid #e5e5e5;
            padding: 6px;
            text-align: left;
          }
          .ingredients-table th {
            background-color: #f5f5f5;
            font-weight: bold;
          }
          .signature-box {
            margin-top: 30px;
            border: 1px solid #333;
            padding: 15px;
            height: 40px;
          }
          .signature-text {
            font-size: 11px;
          }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="title">Packliste: ${eventDetails.name}</div>
          <div class="event-info">
            ${eventDetails.type} | ${eventDetails.date || "Kein Datum"}
            ${eventDetails.ft ? ` | ${eventDetails.ft}` : ""}
            ${eventDetails.ka ? ` | ${eventDetails.ka}` : ""}
          </div>
        </div>

        <div class="products-section">
          <div class="category-grid">
    `

    // Add products by category
    sortedCategories.forEach((category) => {
      const products = productsByCategory[category].sort((a, b) => a.name.localeCompare(b.name))
      html += `
            <div class="category">
              <div class="category-title">${category}</div>
      `

      products.forEach((product) => {
        html += `
              <div class="product-item">
                <div class="checkbox"></div>
                <span>${product.quantity}x ${product.name}</span>
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
          <table class="ingredients-table">
            <thead>
              <tr>
                <th style="width: 20px;"></th>
                <th>Zutat</th>
                <th>Verpackung</th>
                <th>Gesamtmenge</th>
              </tr>
            </thead>
            <tbody>
      `

      Object.entries(calculatedIngredients)
        .sort(([a], [b]) => a.localeCompare(b))
        .forEach(([ingredient, details]) => {
          html += `
              <tr>
                <td><div class="checkbox"></div></td>
                <td>${ingredient}</td>
                <td>${details.packagingCount} ${getUnitPlural(details.packagingCount, details.packaging)} à ${formatWeight(details.amountPerPackage, details.unit)}</td>
                <td>${formatWeight(details.totalAmount, details.unit)}</td>
              </tr>
          `
        })

      html += `
            </tbody>
          </table>
        </div>
      `
    }

    // Add signature box
    html += `
        <div class="signature-box">
          <div class="signature-text">
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

      <div className="flex items-center justify-between mb-6">
        <Button variant="outline" onClick={handleBackClick} className="flex items-center gap-2 bg-transparent">
          <ArrowLeft className="h-4 w-4" />
          Zurück zur Event-Auswahl
        </Button>
        <h1 className="text-2xl font-bold">Packliste: {event.name}</h1>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleShowPrintPreview} className="flex items-center gap-2 bg-transparent">
            <FileDown className="h-4 w-4" />
            PDF Export
          </Button>
          <Button variant="outline" onClick={() => setIsEditDialogOpen(true)} className="flex items-center gap-2">
            <Edit className="h-4 w-4" />
            Bearbeiten
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
                Speichert...
              </>
            ) : (
              <>
                <Save className="h-4 w-4" />
                Speichern
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Event Information and Status Buttons - Expanded Horizontal Layout */}
      <div className="bg-white p-4 rounded-lg shadow-sm">
        <div className="flex items-center justify-between gap-8">
          {/* Event Information - Expanded with more space and light grey background */}
          <div className="flex items-center justify-between flex-1 min-w-0 pr-8 bg-gray-50 p-3 rounded-lg border border-gray-200">
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

          {/* Status Buttons - Slightly Bigger and Wider */}
          <div className="flex items-center gap-6 flex-shrink-0">
            {/* Print Ready Status - Bigger */}
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

            {/* Finished Status - Bigger */}
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
                className="h-8 w-8 bg-transparent"
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
                className="h-8 w-8 bg-transparent"
                onClick={() => handleProductSelect(product.id, product.name, activeCategory, 1, product.unit)}
              >
                <span className="text-lg">+</span>
              </Button>
            </div>
          </div>
        ))}
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
                          className="h-7 w-7 bg-transparent"
                          onClick={() => handleQuantityChange(product, details.quantity - 1)}
                        >
                          <span className="text-sm">-</span>
                        </Button>
                        <div className="w-8 text-center border rounded py-1 px-1 text-sm">{details.quantity}</div>
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-7 w-7 bg-transparent"
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
                        <th className="text-left p-2">Verpackung</th>
                        <th className="text-left p-2">Gesamtmenge</th>
                      </tr>
                    </thead>
                    <tbody>
                      {Object.entries(calculatedIngredients)
                        .sort(([a], [b]) => a.localeCompare(b))
                        .map(([ingredient, details]) => (
                          <tr key={ingredient} className="border-b">
                            <td className="p-2">{ingredient}</td>
                            <td className="p-2">
                              {details.packagingCount} {getUnitPlural(details.packagingCount, details.packaging)} à{" "}
                              {formatWeight(details.amountPerPackage, details.unit)}
                            </td>
                            <td className="p-2">{formatWeight(details.totalAmount, details.unit)}</td>
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

      {/* Print Preview Dialog */}
      <Dialog open={isPrintPreviewOpen} onOpenChange={setIsPrintPreviewOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden">
          <DialogHeader>
            <DialogTitle>Druckvorschau - Packliste: {event?.name}</DialogTitle>
            <DialogDescription>
              Vorschau der Packliste. Sie können das Dokument drucken oder als PDF exportieren.
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-auto border rounded-md bg-white">
            {printPreviewContent && (
              <iframe srcDoc={printPreviewContent} className="w-full h-96 border-0" title="Print Preview" />
            )}
          </div>

          <DialogFooter className="flex justify-between">
            <Button variant="outline" onClick={() => setIsPrintPreviewOpen(false)}>
              Schließen
            </Button>
            <div className="flex gap-2">
              <Button variant="outline" onClick={handleExportPdf}>
                Als PDF exportieren
              </Button>
              <Button onClick={handlePrint}>Drucken</Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
