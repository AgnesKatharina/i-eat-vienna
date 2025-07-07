"use client"

import { useState, useEffect, useMemo } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent } from "@/components/ui/card"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useToast } from "@/components/ui/use-toast"
import { Plus, Edit, Trash2, Search, Tag, Package } from "lucide-react"
import { getCategories, getAllProducts, createProduct, updateProduct, deleteProduct } from "@/lib/supabase-service"
import type { Database } from "@/lib/database.types"

type Category = Database["public"]["Tables"]["categories"]["Row"]
type Product = Database["public"]["Tables"]["products"]["Row"]
type ProductWithCategory = Product & { category: Category }

export function ProductManager() {
  const { toast } = useToast()
  const [products, setProducts] = useState<ProductWithCategory[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [categoryFilter, setCategoryFilter] = useState<string>("all")
  const [foodTypeFilter, setFoodTypeFilter] = useState<string>("all")
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [currentProduct, setCurrentProduct] = useState<ProductWithCategory | null>(null)
  const [formData, setFormData] = useState({
    name: "",
    category_id: "",
    unit: "",
    food_type: "",
  })

  useEffect(() => {
    loadData()
  }, [])

  async function loadData() {
    setLoading(true)
    try {
      const [categoriesData, productsData] = await Promise.all([getCategories(), getAllProducts()])
      setCategories(categoriesData)
      setProducts(productsData)
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

  const filteredProducts = useMemo(() => {
    return products.filter((product) => {
      const matchesSearch = product.name.toLowerCase().includes(searchQuery.toLowerCase())
      const matchesCategory = categoryFilter === "all" || product.category_id.toString() === categoryFilter
      const matchesFoodType =
        foodTypeFilter === "all" ||
        (foodTypeFilter === "unclassified" && !product.food_type) ||
        product.food_type === foodTypeFilter
      return matchesSearch && matchesCategory && matchesFoodType
    })
  }, [products, searchQuery, categoryFilter, foodTypeFilter])

  const handleAddProduct = async () => {
    if (!formData.name || !formData.category_id || !formData.unit) {
      toast({
        title: "Fehler",
        description: "Bitte füllen Sie alle Felder aus.",
        variant: "destructive",
      })
      return
    }

    try {
      const result = await createProduct({
        name: formData.name,
        category_id: Number.parseInt(formData.category_id),
        unit: formData.unit,
        food_type: formData.food_type === "unclassified" ? null : formData.food_type || null,
      })
      if (result) {
        toast({
          title: "Erfolg",
          description: `Produkt "${result.name}" wurde erfolgreich erstellt.`,
        })
        setIsAddDialogOpen(false)
        setFormData({ name: "", category_id: "", unit: "", food_type: "" })
        loadData()
      }
    } catch (error) {
      console.error("Error creating product:", error)
      toast({
        title: "Fehler",
        description: "Produkt konnte nicht erstellt werden.",
        variant: "destructive",
      })
    }
  }

  const handleEditProduct = async () => {
    if (!currentProduct || !formData.name || !formData.category_id || !formData.unit) {
      toast({
        title: "Fehler",
        description: "Bitte füllen Sie alle Felder aus.",
        variant: "destructive",
      })
      return
    }

    try {
      const result = await updateProduct(currentProduct.id, {
        name: formData.name,
        category_id: Number.parseInt(formData.category_id),
        unit: formData.unit,
        food_type: formData.food_type === "unclassified" ? null : formData.food_type || null,
      })
      if (result) {
        toast({
          title: "Erfolg",
          description: `Produkt "${result.name}" wurde erfolgreich aktualisiert.`,
        })
        setIsEditDialogOpen(false)
        setCurrentProduct(null)
        setFormData({ name: "", category_id: "", unit: "", food_type: "" })
        loadData()
      }
    } catch (error) {
      console.error("Error updating product:", error)
      toast({
        title: "Fehler",
        description: "Produkt konnte nicht aktualisiert werden.",
        variant: "destructive",
      })
    }
  }

  const handleDeleteProduct = async () => {
    if (!currentProduct) return

    try {
      const result = await deleteProduct(currentProduct.id)
      if (result) {
        toast({
          title: "Erfolg",
          description: `Produkt "${currentProduct.name}" wurde erfolgreich gelöscht.`,
        })
        setIsDeleteDialogOpen(false)
        setCurrentProduct(null)
        loadData()
      }
    } catch (error) {
      console.error("Error deleting product:", error)
      toast({
        title: "Fehler",
        description: "Produkt konnte nicht gelöscht werden.",
        variant: "destructive",
      })
    }
  }

  const openEditDialog = (product: ProductWithCategory) => {
    setCurrentProduct(product)
    setFormData({
      name: product.name,
      category_id: product.category_id.toString(),
      unit: product.unit,
      food_type: product.food_type || "unclassified",
    })
    setIsEditDialogOpen(true)
  }

  const openDeleteDialog = (product: ProductWithCategory) => {
    setCurrentProduct(product)
    setIsDeleteDialogOpen(true)
  }

  const getFoodTypeDisplay = (foodType: string | null) => {
    switch (foodType) {
      case "food":
        return "🍔 Food"
      case "non_food":
        return "🧽 Non-Food"
      default:
        return "❓ Unclassified"
    }
  }

  const getFoodTypeColor = (foodType: string | null) => {
    switch (foodType) {
      case "food":
        return "text-green-600"
      case "non_food":
        return "text-blue-600"
      default:
        return "text-gray-500"
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row gap-4 justify-between">
        <div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto">
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />
            <Input
              placeholder="Produkte suchen..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="w-full sm:w-48">
              <SelectValue placeholder="Kategorie" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Alle Kategorien</SelectItem>
              {categories.map((category) => (
                <SelectItem key={category.id} value={category.id.toString()}>
                  {category.symbol} {category.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={foodTypeFilter} onValueChange={setFoodTypeFilter}>
            <SelectTrigger className="w-full sm:w-48">
              <SelectValue placeholder="Food Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Alle Typen</SelectItem>
              <SelectItem value="food">🍔 Food</SelectItem>
              <SelectItem value="non_food">🧽 Non-Food</SelectItem>
              <SelectItem value="unclassified">❓ Unclassified</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Button onClick={() => setIsAddDialogOpen(true)} className="gap-2">
          <Plus className="h-4 w-4" />
          Neues Produkt
        </Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {filteredProducts.map((product) => (
          <Card key={product.id} className="overflow-hidden">
            <CardContent className="p-0">
              <div className="p-6 flex flex-col items-center">
                <h3 className="text-lg font-semibold text-center mb-2">{product.name}</h3>
                <div className="flex items-center gap-2 text-sm text-gray-500 mb-2">
                  <Tag className="h-4 w-4" />
                  <span>
                    {product.category?.symbol} {product.category?.name}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-500 mb-2">
                  <Package className="h-4 w-4" />
                  <span>{product.unit}</span>
                </div>
                <div className={`text-sm font-medium ${getFoodTypeColor(product.food_type)}`}>
                  {getFoodTypeDisplay(product.food_type)}
                </div>
              </div>
              <div className="flex border-t">
                <Button variant="ghost" className="flex-1 rounded-none h-12" onClick={() => openEditDialog(product)}>
                  <Edit className="h-4 w-4 mr-2" />
                  Bearbeiten
                </Button>
                <div className="w-px bg-border" />
                <Button
                  variant="ghost"
                  className="flex-1 rounded-none h-12 text-red-500 hover:text-red-600"
                  onClick={() => openDeleteDialog(product)}
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Löschen
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}

        {filteredProducts.length === 0 && (
          <div className="col-span-full text-center py-12 text-gray-500">
            {searchQuery || categoryFilter !== "all" || foodTypeFilter !== "all"
              ? "Keine Produkte gefunden."
              : "Keine Produkte vorhanden. Erstellen Sie ein neues Produkt."}
          </div>
        )}
      </div>

      {/* Add Product Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Neues Produkt erstellen</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label htmlFor="name" className="text-sm font-medium">
                Name
              </label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Produktname"
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="category" className="text-sm font-medium">
                Kategorie
              </label>
              <Select
                value={formData.category_id}
                onValueChange={(value) => setFormData({ ...formData, category_id: value })}
              >
                <SelectTrigger id="category">
                  <SelectValue placeholder="Kategorie auswählen" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((category) => (
                    <SelectItem key={category.id} value={category.id.toString()}>
                      {category.symbol} {category.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label htmlFor="unit" className="text-sm font-medium">
                Einheit
              </label>
              <Input
                id="unit"
                value={formData.unit}
                onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                placeholder="Stück, Kiste, etc."
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="food_type" className="text-sm font-medium">
                Food Type
              </label>
              <Select
                value={formData.food_type}
                onValueChange={(value) => setFormData({ ...formData, food_type: value })}
              >
                <SelectTrigger id="food_type">
                  <SelectValue placeholder="Typ auswählen" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="unclassified">❓ Unclassified</SelectItem>
                  <SelectItem value="food">🍔 Food</SelectItem>
                  <SelectItem value="non_food">🧽 Non-Food</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
              Abbrechen
            </Button>
            <Button onClick={handleAddProduct}>Erstellen</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Product Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Produkt bearbeiten</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label htmlFor="edit-name" className="text-sm font-medium">
                Name
              </label>
              <Input
                id="edit-name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Produktname"
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="edit-category" className="text-sm font-medium">
                Kategorie
              </label>
              <Select
                value={formData.category_id}
                onValueChange={(value) => setFormData({ ...formData, category_id: value })}
              >
                <SelectTrigger id="edit-category">
                  <SelectValue placeholder="Kategorie auswählen" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((category) => (
                    <SelectItem key={category.id} value={category.id.toString()}>
                      {category.symbol} {category.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label htmlFor="edit-unit" className="text-sm font-medium">
                Einheit
              </label>
              <Input
                id="edit-unit"
                value={formData.unit}
                onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                placeholder="Stück, Kiste, etc."
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="edit-food_type" className="text-sm font-medium">
                Food Type
              </label>
              <Select
                value={formData.food_type}
                onValueChange={(value) => setFormData({ ...formData, food_type: value })}
              >
                <SelectTrigger id="edit-food_type">
                  <SelectValue placeholder="Typ auswählen" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="unclassified">❓ Unclassified</SelectItem>
                  <SelectItem value="food">🍔 Food</SelectItem>
                  <SelectItem value="non_food">🧽 Non-Food</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
              Abbrechen
            </Button>
            <Button onClick={handleEditProduct}>Speichern</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Product Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Produkt löschen</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p>
              Sind Sie sicher, dass Sie das Produkt <strong>"{currentProduct?.name}"</strong> löschen möchten? Diese
              Aktion kann nicht rückgängig gemacht werden.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)}>
              Abbrechen
            </Button>
            <Button variant="destructive" onClick={handleDeleteProduct}>
              Löschen
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
