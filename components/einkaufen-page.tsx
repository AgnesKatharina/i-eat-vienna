"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import { ArrowLeft, Search, Filter, X, Save, RotateCcw, EyeOff } from "lucide-react"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { getAllProducts, getCategories, saveUserPreferences, getUserPreferences } from "@/lib/supabase-service"
import type { Category } from "@/lib/database.types"
import type { ProductWithCategory } from "@/lib/supabase-service"

interface FilterState {
  searchTerm: string
  selectedCategories: string[]
  selectedProducts: string[]
  hiddenProducts: string[] // New: products to hide from view
}

export function EinkaufenPage() {
  const router = useRouter()
  const [products, setProducts] = useState<ProductWithCategory[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [showFilters, setShowFilters] = useState(false)
  const [saving, setSaving] = useState(false)

  // Generate a simple user ID (in a real app, this would come from authentication)
  const userId = "default_user" // You can replace this with actual user authentication later

  const [filters, setFilters] = useState<FilterState>({
    searchTerm: "",
    selectedCategories: [],
    selectedProducts: [],
    hiddenProducts: [], // New: track hidden products
  })

  // Load data and saved filters
  useEffect(() => {
    loadData()
    loadSavedFilters()
  }, [])

  const loadData = async () => {
    try {
      setLoading(true)
      const [productsData, categoriesData] = await Promise.all([getAllProducts(), getCategories()])
      setProducts(productsData)
      setCategories(categoriesData)
    } catch (error) {
      console.error("Error loading data:", error)
    } finally {
      setLoading(false)
    }
  }

  const loadSavedFilters = async () => {
    try {
      const savedFilters = await getUserPreferences(userId, "einkaufen_filters")
      if (savedFilters) {
        setFilters({
          ...savedFilters,
          hiddenProducts: savedFilters.hiddenProducts || [], // Ensure hiddenProducts exists
        })
      }
    } catch (error) {
      console.error("Error loading saved filters:", error)
    }
  }

  const saveFilters = async () => {
    try {
      setSaving(true)
      const success = await saveUserPreferences(userId, "einkaufen_filters", filters)

      if (success) {
        alert("Filter erfolgreich gespeichert!")
      } else {
        alert("Fehler beim Speichern der Filter. Bitte versuchen Sie es erneut.")
      }
    } catch (error) {
      console.error("Error saving filters:", error)
      alert("Fehler beim Speichern der Filter. Bitte versuchen Sie es erneut.")
    } finally {
      setSaving(false)
    }
  }

  const resetFilters = async () => {
    const resetState = {
      searchTerm: "",
      selectedCategories: [],
      selectedProducts: [],
      hiddenProducts: [],
    }
    setFilters(resetState)

    try {
      // Save the reset state to the database
      await saveUserPreferences(userId, "einkaufen_filters", resetState)
      alert("Filter zurückgesetzt!")
    } catch (error) {
      console.error("Error resetting filters:", error)
    }
  }

  // Filter products based on current filters
  const filteredProducts = products.filter((product) => {
    // First check if product is hidden
    if (filters.hiddenProducts.includes(product.name)) {
      return false
    }

    // Search term filter
    if (filters.searchTerm) {
      const searchLower = filters.searchTerm.toLowerCase()
      const matchesName = product.name.toLowerCase().includes(searchLower)
      const matchesCategory = categories
        .find((cat) => cat.id === product.category_id)
        ?.name.toLowerCase()
        .includes(searchLower)

      if (!matchesName && !matchesCategory) {
        return false
      }
    }

    // Category filter
    if (filters.selectedCategories.length > 0) {
      const categoryName = categories.find((cat) => cat.id === product.category_id)?.name
      if (!categoryName || !filters.selectedCategories.includes(categoryName)) {
        return false
      }
    }

    // Product filter
    if (filters.selectedProducts.length > 0) {
      if (!filters.selectedProducts.includes(product.name)) {
        return false
      }
    }

    return true
  })

  const handleCategoryToggle = (categoryName: string) => {
    setFilters((prev) => ({
      ...prev,
      selectedCategories: prev.selectedCategories.includes(categoryName)
        ? prev.selectedCategories.filter((c) => c !== categoryName)
        : [...prev.selectedCategories, categoryName],
    }))
  }

  const handleProductToggle = (productName: string) => {
    setFilters((prev) => ({
      ...prev,
      selectedProducts: prev.selectedProducts.includes(productName)
        ? prev.selectedProducts.filter((p) => p !== productName)
        : [...prev.selectedProducts, productName],
    }))
  }

  // New: Handle hiding/showing products
  const handleProductVisibilityToggle = (productName: string) => {
    setFilters((prev) => ({
      ...prev,
      hiddenProducts: prev.hiddenProducts.includes(productName)
        ? prev.hiddenProducts.filter((p) => p !== productName)
        : [...prev.hiddenProducts, productName],
    }))
  }

  const selectAllCategories = () => {
    setFilters((prev) => ({
      ...prev,
      selectedCategories: categories.map((cat) => cat.name),
    }))
  }

  const selectNoCategories = () => {
    setFilters((prev) => ({
      ...prev,
      selectedCategories: [],
    }))
  }

  const selectAllProducts = () => {
    setFilters((prev) => ({
      ...prev,
      selectedProducts: products.map((product) => product.name),
    }))
  }

  const selectNoProducts = () => {
    setFilters((prev) => ({
      ...prev,
      selectedProducts: [],
    }))
  }

  // New: Show/hide all products
  const showAllProducts = () => {
    setFilters((prev) => ({
      ...prev,
      hiddenProducts: [],
    }))
  }

  const hideAllProducts = () => {
    setFilters((prev) => ({
      ...prev,
      hiddenProducts: products.map((product) => product.name),
    }))
  }

  if (loading) {
    return (
      <div className="container mx-auto p-4">
        <div className="flex items-center justify-center h-64">
          <div className="text-lg">Lade Produkte...</div>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-4 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <Button variant="outline" onClick={() => router.push("/")} className="flex items-center gap-2">
          <ArrowLeft className="h-4 w-4" />
          Zurück zum Menü
        </Button>
        <h1 className="text-2xl font-bold">Einkaufen</h1>
      </div>

      {/* Search and Filter Controls */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Search className="h-5 w-5" />
              Produkte suchen und filtern
            </CardTitle>
            <div className="flex items-center gap-2">
              <Button onClick={saveFilters} size="sm" className="flex items-center gap-2" disabled={saving}>
                <Save className="h-4 w-4" />
                {saving ? "Speichere..." : "Speichern"}
              </Button>
              <Button onClick={resetFilters} variant="outline" size="sm" className="flex items-center gap-2">
                <RotateCcw className="h-4 w-4" />
                Zurücksetzen
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Search Input */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Nach Produkten oder Kategorien suchen..."
              value={filters.searchTerm}
              onChange={(e) => setFilters((prev) => ({ ...prev, searchTerm: e.target.value }))}
              className="pl-10"
            />
          </div>

          {/* Filter Summary */}
          <div className="flex items-center gap-2 flex-wrap">
            {filters.selectedCategories.length > 0 && (
              <Badge variant="secondary">{filters.selectedCategories.length} Kategorien</Badge>
            )}
            {filters.selectedProducts.length > 0 && (
              <Badge variant="secondary">{filters.selectedProducts.length} Produkte</Badge>
            )}
            {filters.hiddenProducts.length > 0 && (
              <Badge variant="destructive">{filters.hiddenProducts.length} versteckt</Badge>
            )}
            {filters.searchTerm && (
              <Badge variant="outline" className="flex items-center gap-1">
                Suche: {filters.searchTerm}
                <X
                  className="h-3 w-3 cursor-pointer"
                  onClick={() => setFilters((prev) => ({ ...prev, searchTerm: "" }))}
                />
              </Badge>
            )}
          </div>

          {/* Collapsible Detailed Filters */}
          <Collapsible open={showFilters} onOpenChange={setShowFilters}>
            <CollapsibleTrigger asChild>
              <Button variant="outline" className="flex items-center gap-2">
                <Filter className="h-4 w-4" />
                {showFilters ? "Filter ausblenden" : "Filter anzeigen"}
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="space-y-4 mt-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Category Filter */}
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-semibold">Kategorien</h3>
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline" onClick={selectAllCategories}>
                        Alle
                      </Button>
                      <Button size="sm" variant="outline" onClick={selectNoCategories}>
                        Keine
                      </Button>
                    </div>
                  </div>
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {categories.map((category) => (
                      <div key={category.id} className="flex items-center space-x-2">
                        <Checkbox
                          id={`category-${category.id}`}
                          checked={filters.selectedCategories.includes(category.name)}
                          onCheckedChange={() => handleCategoryToggle(category.name)}
                        />
                        <label
                          htmlFor={`category-${category.id}`}
                          className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                        >
                          {category.name}
                        </label>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Product Filter */}
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-semibold">Produkte</h3>
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline" onClick={selectAllProducts}>
                        Alle
                      </Button>
                      <Button size="sm" variant="outline" onClick={selectNoProducts}>
                        Keine
                      </Button>
                    </div>
                  </div>
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {products.map((product) => (
                      <div key={product.id} className="flex items-center space-x-2">
                        <Checkbox
                          id={`product-${product.id}`}
                          checked={filters.selectedProducts.includes(product.name)}
                          onCheckedChange={() => handleProductToggle(product.name)}
                        />
                        <label
                          htmlFor={`product-${product.id}`}
                          className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                        >
                          {product.name}
                        </label>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Product Visibility Filter */}
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-semibold">Sichtbarkeit</h3>
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline" onClick={showAllProducts}>
                        Alle zeigen
                      </Button>
                      <Button size="sm" variant="outline" onClick={hideAllProducts}>
                        Alle verstecken
                      </Button>
                    </div>
                  </div>
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {products.map((product) => (
                      <div key={product.id} className="flex items-center space-x-2">
                        <Checkbox
                          id={`visibility-${product.id}`}
                          checked={!filters.hiddenProducts.includes(product.name)}
                          onCheckedChange={() => handleProductVisibilityToggle(product.name)}
                        />
                        <label
                          htmlFor={`visibility-${product.id}`}
                          className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                        >
                          {product.name}
                        </label>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </CollapsibleContent>
          </Collapsible>
        </CardContent>
      </Card>

      {/* Results Summary */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-600">
          {filteredProducts.length} von {products.length} Produkten angezeigt
          {filters.hiddenProducts.length > 0 && (
            <span className="text-red-600 ml-2">({filters.hiddenProducts.length} versteckt)</span>
          )}
        </p>
      </div>

      {/* Products Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {filteredProducts.map((product) => {
          const category = categories.find((cat) => cat.id === product.category_id)
          return (
            <Card key={product.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold text-sm">{product.name}</h3>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleProductVisibilityToggle(product.name)}
                      className="h-6 w-6 p-0"
                      title="Produkt verstecken"
                    >
                      <EyeOff className="h-3 w-3" />
                    </Button>
                  </div>
                  {category && (
                    <Badge variant="outline" className="text-xs">
                      {category.name}
                    </Badge>
                  )}
                  {product.unit && <p className="text-xs text-gray-500">Einheit: {product.unit}</p>}
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {filteredProducts.length === 0 && (
        <Card>
          <CardContent className="p-8 text-center">
            <p className="text-gray-500">Keine Produkte gefunden.</p>
            <Button variant="outline" onClick={resetFilters} className="mt-4">
              Filter zurücksetzen
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
