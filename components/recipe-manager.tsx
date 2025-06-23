"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent } from "@/components/ui/card"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useToast } from "@/components/ui/use-toast"
import { Plus, Edit, Trash2, Search, ChefHat } from "lucide-react"
import {
  getAllProducts,
  getProductRecipes,
  createRecipe,
  updateRecipe,
  deleteRecipe,
  getCategories,
  createProduct,
} from "@/lib/supabase-service"
import type { Database } from "@/lib/database.types"
import { supabase } from "@/lib/supabase-client"

type Product = Database["public"]["Tables"]["products"]["Row"]
type Category = Database["public"]["Tables"]["categories"]["Row"]
type Recipe = Database["public"]["Tables"]["recipes"]["Row"] & {
  ingredient: Product
}

export function RecipeManager() {
  const { toast } = useToast()
  const [products, setProducts] = useState<Product[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null)
  const [recipes, setRecipes] = useState<Recipe[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [currentRecipe, setCurrentRecipe] = useState<Recipe | null>(null)
  const [formData, setFormData] = useState({
    ingredient_id: "",
    amount: "",
    unit: "",
  })
  const [newIngredientData, setNewIngredientData] = useState({
    name: "",
    category_id: "",
    unit: "",
  })
  const [allRecipes, setAllRecipes] = useState<{ product_id: number }[]>([])
  const [recipeFilter, setRecipeFilter] = useState<"all" | "with" | "without">("all")

  useEffect(() => {
    loadInitialData()
  }, [])

  useEffect(() => {
    if (selectedProduct) {
      loadRecipes(selectedProduct.id)
    }
  }, [selectedProduct])

  async function loadInitialData() {
    setLoading(true)
    try {
      const [productsData, categoriesData] = await Promise.all([getAllProducts(), getCategories()])
      setProducts(productsData)
      setCategories(categoriesData)

      // Load all recipes to determine which products have recipes
      const { data: allRecipesData } = await supabase.from("recipes").select("product_id")
      setAllRecipes(allRecipesData || [])
    } catch (error) {
      console.error("Error loading initial data:", error)
      toast({
        title: "Fehler",
        description: "Daten konnten nicht geladen werden.",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  async function loadRecipes(productId: number) {
    try {
      const [productRecipes, allRecipesData] = await Promise.all([
        getProductRecipes(productId),
        supabase
          .from("recipes")
          .select("product_id")
          .then(({ data }) => data || []),
      ])
      setRecipes(productRecipes as Recipe[])
      setAllRecipes(allRecipesData)
    } catch (error) {
      console.error("Error loading recipes:", error)
      toast({
        title: "Fehler",
        description: "Rezepte konnten nicht geladen werden.",
        variant: "destructive",
      })
    }
  }

  const filteredProducts = products.filter((product) => {
    const matchesSearch = product.name.toLowerCase().includes(searchQuery.toLowerCase())

    if (!matchesSearch) return false

    if (recipeFilter === "all") return true

    const hasRecipes = allRecipes.some((recipe) => recipe.product_id === product.id)

    if (recipeFilter === "with") return hasRecipes
    if (recipeFilter === "without") return !hasRecipes

    return true
  })

  const handleAddRecipe = async () => {
    if (!selectedProduct || !formData.ingredient_id || !formData.amount || !formData.unit) {
      toast({
        title: "Fehler",
        description: "Bitte füllen Sie alle Felder aus.",
        variant: "destructive",
      })
      return
    }

    try {
      const result = await createRecipe({
        product_id: selectedProduct.id,
        ingredient_id: Number.parseInt(formData.ingredient_id),
        amount: Number.parseFloat(formData.amount),
        unit: formData.unit,
      })
      if (result) {
        toast({
          title: "Erfolg",
          description: "Zutat wurde erfolgreich zum Rezept hinzugefügt.",
        })
        setIsAddDialogOpen(false)
        setFormData({ ingredient_id: "", amount: "", unit: "" })
        loadRecipes(selectedProduct.id)
      }
    } catch (error) {
      console.error("Error creating recipe:", error)
      toast({
        title: "Fehler",
        description: "Zutat konnte nicht hinzugefügt werden.",
        variant: "destructive",
      })
    }
  }

  const handleCreateNewIngredient = async () => {
    if (!newIngredientData.name || !newIngredientData.category_id || !newIngredientData.unit) {
      toast({
        title: "Fehler",
        description: "Bitte füllen Sie alle Felder aus.",
        variant: "destructive",
      })
      return
    }

    try {
      const newProduct = await createProduct({
        name: newIngredientData.name,
        category_id: Number.parseInt(newIngredientData.category_id),
        unit: newIngredientData.unit,
      })

      if (newProduct) {
        toast({
          title: "Erfolg",
          description: `Neue Zutat "${newProduct.name}" wurde erstellt.`,
        })

        setProducts((prevProducts) => [...prevProducts, newProduct])

        setFormData({
          ...formData,
          ingredient_id: newProduct.id.toString(),
        })

        setIsAddDialogOpen(false)
        setNewIngredientData({
          name: "",
          category_id: "",
          unit: "",
        })
      }
    } catch (error) {
      console.error("Error creating new ingredient:", error)
      toast({
        title: "Fehler",
        description: "Neue Zutat konnte nicht erstellt werden.",
        variant: "destructive",
      })
    }
  }

  const handleEditRecipe = async () => {
    if (!currentRecipe || !formData.amount || !formData.unit) {
      toast({
        title: "Fehler",
        description: "Bitte füllen Sie alle Felder aus.",
        variant: "destructive",
      })
      return
    }

    try {
      const result = await updateRecipe(currentRecipe.id, {
        amount: Number.parseFloat(formData.amount),
        unit: formData.unit,
      })
      if (result) {
        toast({
          title: "Erfolg",
          description: "Zutat wurde erfolgreich aktualisiert.",
        })
        setIsEditDialogOpen(false)
        setCurrentRecipe(null)
        setFormData({ ingredient_id: "", amount: "", unit: "" })
        if (selectedProduct) {
          loadRecipes(selectedProduct.id)
        }
      }
    } catch (error) {
      console.error("Error updating recipe:", error)
      toast({
        title: "Fehler",
        description: "Zutat konnte nicht aktualisiert werden.",
        variant: "destructive",
      })
    }
  }

  const handleDeleteRecipe = async () => {
    if (!currentRecipe) return

    try {
      const result = await deleteRecipe(currentRecipe.id)
      if (result) {
        toast({
          title: "Erfolg",
          description: "Zutat wurde erfolgreich aus dem Rezept entfernt.",
        })
        setIsDeleteDialogOpen(false)
        setCurrentRecipe(null)
        if (selectedProduct) {
          loadRecipes(selectedProduct.id)
        }
      }
    } catch (error) {
      console.error("Error deleting recipe:", error)
      toast({
        title: "Fehler",
        description: "Zutat konnte nicht entfernt werden.",
        variant: "destructive",
      })
    }
  }

  const openEditDialog = (recipe: Recipe) => {
    setCurrentRecipe(recipe)
    setFormData({
      ingredient_id: recipe.ingredient_id.toString(),
      amount: recipe.amount.toString(),
      unit: recipe.unit,
    })
    setIsEditDialogOpen(true)
  }

  const openDeleteDialog = (recipe: Recipe) => {
    setCurrentRecipe(recipe)
    setIsDeleteDialogOpen(true)
  }

  const handleProductClick = (product: Product) => {
    setSelectedProduct(product)
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
      {/* Filter Controls */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />
          <Input
            placeholder="Produkte suchen..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={recipeFilter} onValueChange={(value: "all" | "with" | "without") => setRecipeFilter(value)}>
          <SelectTrigger className="w-full sm:w-64">
            <SelectValue placeholder="Rezept-Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Alle Produkte</SelectItem>
            <SelectItem value="with">Produkte mit Rezept</SelectItem>
            <SelectItem value="without">Produkte ohne Rezept</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Products List */}
        <Card>
          <CardContent className="p-6">
            <h3 className="text-xl font-semibold mb-4">Produkte ({filteredProducts.length})</h3>
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {filteredProducts.map((product) => {
                const hasRecipes = allRecipes.some((recipe) => recipe.product_id === product.id)
                const isSelected = selectedProduct?.id === product.id

                return (
                  <div
                    key={product.id}
                    onClick={() => handleProductClick(product)}
                    className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                      isSelected
                        ? "border-blue-500 bg-blue-50"
                        : "border-gray-200 hover:border-gray-300 hover:bg-gray-50"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-medium">{product.name}</span>
                      <div className="flex items-center gap-2">
                        {hasRecipes ? (
                          <div className="flex items-center gap-1 text-green-600">
                            <ChefHat className="h-4 w-4" />
                            <span className="text-xs">Rezept</span>
                          </div>
                        ) : (
                          <div className="text-xs text-gray-500">Kein Rezept</div>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}
              {filteredProducts.length === 0 && (
                <div className="text-center py-8 text-gray-500">Keine Produkte gefunden.</div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Recipe Details */}
        <Card>
          <CardContent className="p-6">
            {selectedProduct ? (
              <>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-xl font-semibold">Rezept für: {selectedProduct.name}</h3>
                  <Button onClick={() => setIsAddDialogOpen(true)} className="gap-2">
                    <Plus className="h-4 w-4" />
                    Zutat hinzufügen
                  </Button>
                </div>

                {recipes.length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Zutat</TableHead>
                        <TableHead>Menge</TableHead>
                        <TableHead>Einheit</TableHead>
                        <TableHead className="w-[100px]">Aktionen</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {recipes.map((recipe) => (
                        <TableRow key={recipe.id}>
                          <TableCell>
                            {recipe.ingredient ? recipe.ingredient.name : `Zutat ID: ${recipe.ingredient_id}`}
                          </TableCell>
                          <TableCell>{recipe.amount}</TableCell>
                          <TableCell>{recipe.unit}</TableCell>
                          <TableCell>
                            <div className="flex gap-2">
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => openEditDialog(recipe)}
                                className="h-8 w-8"
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => openDeleteDialog(recipe)}
                                className="h-8 w-8 text-red-500 hover:text-red-600"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <div className="text-center py-8 space-y-4">
                    <p className="text-gray-500">Keine Zutaten für dieses Produkt gefunden.</p>
                    <Button onClick={() => setIsAddDialogOpen(true)} variant="outline" className="gap-2">
                      <Plus className="h-4 w-4" />
                      Zutat hinzufügen
                    </Button>
                  </div>
                )}
              </>
            ) : (
              <div className="text-center py-12 text-gray-500">
                <ChefHat className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                <p>Wählen Sie ein Produkt aus der Liste aus, um dessen Rezept zu bearbeiten.</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Add Recipe Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Zutat hinzufügen</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <Tabs defaultValue="existing">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="existing">Vorhandene Zutat</TabsTrigger>
                <TabsTrigger value="new">Neue Zutat erstellen</TabsTrigger>
              </TabsList>
              <TabsContent value="existing" className="space-y-4 pt-4">
                <div className="space-y-2">
                  <label htmlFor="ingredient" className="text-sm font-medium">
                    Zutat
                  </label>
                  <Select
                    value={formData.ingredient_id}
                    onValueChange={(value) => setFormData({ ...formData, ingredient_id: value })}
                  >
                    <SelectTrigger id="ingredient">
                      <SelectValue placeholder="Zutat auswählen" />
                    </SelectTrigger>
                    <SelectContent>
                      {products
                        .filter((p) => p.id !== selectedProduct?.id)
                        .map((product) => (
                          <SelectItem key={product.id} value={product.id.toString()}>
                            {product.name}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <label htmlFor="amount" className="text-sm font-medium">
                    Menge
                  </label>
                  <Input
                    id="amount"
                    type="number"
                    step="0.01"
                    value={formData.amount}
                    onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                    placeholder="Menge"
                  />
                </div>
                <div className="space-y-2">
                  <label htmlFor="unit" className="text-sm font-medium">
                    Einheit
                  </label>
                  <Input
                    id="unit"
                    value={formData.unit}
                    onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                    placeholder="Stück, Gramm, etc."
                  />
                </div>
              </TabsContent>
              <TabsContent value="new" className="space-y-4 pt-4">
                <div className="space-y-2">
                  <label htmlFor="new-name" className="text-sm font-medium">
                    Name der neuen Zutat
                  </label>
                  <Input
                    id="new-name"
                    value={newIngredientData.name}
                    onChange={(e) => setNewIngredientData({ ...newIngredientData, name: e.target.value })}
                    placeholder="Name der Zutat"
                  />
                </div>
                <div className="space-y-2">
                  <label htmlFor="new-category" className="text-sm font-medium">
                    Kategorie
                  </label>
                  <Select
                    value={newIngredientData.category_id}
                    onValueChange={(value) => setNewIngredientData({ ...newIngredientData, category_id: value })}
                  >
                    <SelectTrigger id="new-category">
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
                  <label htmlFor="new-unit" className="text-sm font-medium">
                    Einheit
                  </label>
                  <Input
                    id="new-unit"
                    value={newIngredientData.unit}
                    onChange={(e) => setNewIngredientData({ ...newIngredientData, unit: e.target.value })}
                    placeholder="Stück, Kiste, etc."
                  />
                </div>
                <Button onClick={handleCreateNewIngredient} className="w-full mt-2">
                  Neue Zutat erstellen
                </Button>
              </TabsContent>
            </Tabs>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
              Abbrechen
            </Button>
            <Button onClick={handleAddRecipe}>Hinzufügen</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Recipe Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Zutat bearbeiten</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Zutat</label>
              <div className="p-2 border rounded-md bg-gray-50">{currentRecipe?.ingredient?.name}</div>
            </div>
            <div className="space-y-2">
              <label htmlFor="edit-amount" className="text-sm font-medium">
                Menge
              </label>
              <Input
                id="edit-amount"
                type="number"
                step="0.01"
                value={formData.amount}
                onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                placeholder="Menge"
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="edit-unit" className="text-sm font-medium">
                Einheit
              </label>
              <Input
                id="edit-unit"
                value={formData.unit}
                onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                placeholder="Stück, Gramm, etc."
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
              Abbrechen
            </Button>
            <Button onClick={handleEditRecipe}>Speichern</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Recipe Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Zutat entfernen</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p>
              Sind Sie sicher, dass Sie die Zutat <strong>{currentRecipe?.ingredient?.name}</strong> aus dem Rezept für{" "}
              <strong>{selectedProduct?.name}</strong> entfernen möchten?
            </p>
            <p className="text-red-500 mt-2">Diese Aktion kann nicht rückgängig gemacht werden.</p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)}>
              Abbrechen
            </Button>
            <Button variant="destructive" onClick={handleDeleteRecipe}>
              Entfernen
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
