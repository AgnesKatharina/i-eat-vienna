"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useToast } from "@/components/ui/use-toast"
import { Plus, Edit, Trash2, Save, X } from "lucide-react"
import {
  getCategories,
  getAllProducts,
  createCategory,
  updateCategory,
  deleteCategory,
  createProduct,
  updateProduct,
  deleteProduct,
} from "@/lib/supabase-service"
import type { Database } from "@/lib/database.types"

type Category = Database["public"]["Tables"]["categories"]["Row"]
type Product = Database["public"]["Tables"]["products"]["Row"]
type ProductWithCategory = Product & { category: Category }

export function ProductManagement() {
  const { toast } = useToast()
  const [categories, setCategories] = useState<Category[]>([])
  const [products, setProducts] = useState<ProductWithCategory[]>([])
  const [loading, setLoading] = useState(true)

  const [newCategory, setNewCategory] = useState({ name: "", symbol: "" })
  const [editingCategory, setEditingCategory] = useState<Category | null>(null)

  const [newProduct, setNewProduct] = useState({ name: "", category_id: 0, unit: "", food_type: "" })
  const [editingProduct, setEditingProduct] = useState<(Product & { food_type?: string | null }) | null>(null)

  useEffect(() => {
    loadData()
  }, [])

  async function loadData() {
    setLoading(true)
    const [categoriesData, productsData] = await Promise.all([getCategories(), getAllProducts()])

    setCategories(categoriesData)
    setProducts(productsData)
    setLoading(false)
  }

  async function handleCreateCategory() {
    if (!newCategory.name || !newCategory.symbol) {
      toast({
        title: "Fehler",
        description: "Bitte geben Sie einen Namen und ein Symbol ein.",
        variant: "destructive",
      })
      return
    }

    const result = await createCategory(newCategory)
    if (result) {
      toast({
        title: "Kategorie erstellt",
        description: `Die Kategorie "${result.name}" wurde erfolgreich erstellt.`,
      })
      setNewCategory({ name: "", symbol: "" })
      loadData()
    }
  }

  async function handleUpdateCategory() {
    if (!editingCategory || !editingCategory.name || !editingCategory.symbol) {
      toast({
        title: "Fehler",
        description: "Bitte geben Sie einen Namen und ein Symbol ein.",
        variant: "destructive",
      })
      return
    }

    const result = await updateCategory(editingCategory.id, {
      name: editingCategory.name,
      symbol: editingCategory.symbol,
    })

    if (result) {
      toast({
        title: "Kategorie aktualisiert",
        description: `Die Kategorie "${result.name}" wurde erfolgreich aktualisiert.`,
      })
      setEditingCategory(null)
      loadData()
    }
  }

  async function handleDeleteCategory(id: number, name: string) {
    if (confirm(`Sind Sie sicher, dass Sie die Kategorie "${name}" löschen möchten?`)) {
      const result = await deleteCategory(id)
      if (result) {
        toast({
          title: "Kategorie gelöscht",
          description: `Die Kategorie "${name}" wurde erfolgreich gelöscht.`,
        })
        loadData()
      }
    }
  }

  async function handleCreateProduct() {
    if (!newProduct.name || !newProduct.category_id || !newProduct.unit) {
      toast({
        title: "Fehler",
        description: "Bitte füllen Sie alle Felder aus.",
        variant: "destructive",
      })
      return
    }

    const productData = {
      name: newProduct.name,
      category_id: newProduct.category_id,
      unit: newProduct.unit,
      food_type: newProduct.food_type === "unclassified" ? null : newProduct.food_type || null,
    }

    const result = await createProduct(productData)
    if (result) {
      toast({
        title: "Produkt erstellt",
        description: `Das Produkt "${result.name}" wurde erfolgreich erstellt.`,
      })
      setNewProduct({ name: "", category_id: 0, unit: "", food_type: "" })
      loadData()
    }
  }

  async function handleUpdateProduct() {
    if (!editingProduct || !editingProduct.name || !editingProduct.category_id || !editingProduct.unit) {
      toast({
        title: "Fehler",
        description: "Bitte füllen Sie alle Felder aus.",
        variant: "destructive",
      })
      return
    }

    const result = await updateProduct(editingProduct.id, {
      name: editingProduct.name,
      category_id: editingProduct.category_id,
      unit: editingProduct.unit,
      food_type: editingProduct.food_type === "unclassified" ? null : editingProduct.food_type || null,
    })

    if (result) {
      toast({
        title: "Produkt aktualisiert",
        description: `Das Produkt "${result.name}" wurde erfolgreich aktualisiert.`,
      })
      setEditingProduct(null)
      loadData()
    }
  }

  async function handleDeleteProduct(id: number, name: string) {
    if (confirm(`Sind Sie sicher, dass Sie das Produkt "${name}" löschen möchten?`)) {
      const result = await deleteProduct(id)
      if (result) {
        toast({
          title: "Produkt gelöscht",
          description: `Das Produkt "${name}" wurde erfolgreich gelöscht.`,
        })
        loadData()
      }
    }
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
    return <div className="flex justify-center p-8">Laden...</div>
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Produkt-Verwaltung</CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="categories">
          <TabsList className="mb-4">
            <TabsTrigger value="categories">Kategorien</TabsTrigger>
            <TabsTrigger value="products">Produkte</TabsTrigger>
          </TabsList>

          <TabsContent value="categories">
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Name</label>
                  <Input
                    value={newCategory.name}
                    onChange={(e) => setNewCategory({ ...newCategory, name: e.target.value })}
                    placeholder="Kategoriename"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Symbol</label>
                  <Input
                    value={newCategory.symbol}
                    onChange={(e) => setNewCategory({ ...newCategory, symbol: e.target.value })}
                    placeholder="Emoji Symbol (z.B. 🍔)"
                  />
                </div>
                <div className="flex items-end">
                  <Button onClick={handleCreateCategory} className="gap-2">
                    <Plus className="h-4 w-4" />
                    Kategorie hinzufügen
                  </Button>
                </div>
              </div>

              <div className="border rounded-md">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 p-4 font-medium border-b">
                  <div>Name</div>
                  <div>Symbol</div>
                  <div>Produkte</div>
                  <div>Aktionen</div>
                </div>

                {categories.map((category) => (
                  <div key={category.id} className="grid grid-cols-1 md:grid-cols-4 gap-4 p-4 border-b last:border-0">
                    {editingCategory && editingCategory.id === category.id ? (
                      <>
                        <Input
                          value={editingCategory.name}
                          onChange={(e) => setEditingCategory({ ...editingCategory, name: e.target.value })}
                        />
                        <Input
                          value={editingCategory.symbol}
                          onChange={(e) => setEditingCategory({ ...editingCategory, symbol: e.target.value })}
                        />
                        <div className="flex items-center">
                          {products.filter((p) => p.category_id === category.id).length} Produkte
                        </div>
                        <div className="flex gap-2">
                          <Button size="sm" variant="outline" onClick={handleUpdateCategory}>
                            <Save className="h-4 w-4" />
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => setEditingCategory(null)}>
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="flex items-center">{category.name}</div>
                        <div className="flex items-center">{category.symbol}</div>
                        <div className="flex items-center">
                          {products.filter((p) => p.category_id === category.id).length} Produkte
                        </div>
                        <div className="flex gap-2">
                          <Button size="sm" variant="outline" onClick={() => setEditingCategory(category)}>
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleDeleteCategory(category.id, category.name)}
                            disabled={products.some((p) => p.category_id === category.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </>
                    )}
                  </div>
                ))}

                {categories.length === 0 && (
                  <div className="p-4 text-center text-muted-foreground">
                    Keine Kategorien gefunden. Fügen Sie eine neue Kategorie hinzu.
                  </div>
                )}
              </div>
            </div>
          </TabsContent>

          <TabsContent value="products">
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Name</label>
                  <Input
                    value={newProduct.name}
                    onChange={(e) => setNewProduct({ ...newProduct, name: e.target.value })}
                    placeholder="Produktname"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Kategorie</label>
                  <Select
                    value={newProduct.category_id.toString()}
                    onValueChange={(value) => setNewProduct({ ...newProduct, category_id: Number.parseInt(value) })}
                  >
                    <SelectTrigger>
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
                  <label className="text-sm font-medium">Einheit</label>
                  <Input
                    value={newProduct.unit}
                    onChange={(e) => setNewProduct({ ...newProduct, unit: e.target.value })}
                    placeholder="Stück, Kiste, etc."
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Food Type</label>
                  <Select
                    value={newProduct.food_type}
                    onValueChange={(value) => setNewProduct({ ...newProduct, food_type: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Typ auswählen" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="unclassified">❓ Unclassified</SelectItem>
                      <SelectItem value="food">🍔 Food</SelectItem>
                      <SelectItem value="non_food">🧽 Non-Food</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-end">
                  <Button onClick={handleCreateProduct} className="gap-2">
                    <Plus className="h-4 w-4" />
                    Produkt hinzufügen
                  </Button>
                </div>
              </div>

              <div className="border rounded-md">
                <div className="grid grid-cols-1 md:grid-cols-5 gap-4 p-4 font-medium border-b">
                  <div>Name</div>
                  <div>Kategorie</div>
                  <div>Einheit</div>
                  <div>Food Type</div>
                  <div>Aktionen</div>
                </div>

                {products.map((product) => (
                  <div key={product.id} className="grid grid-cols-1 md:grid-cols-5 gap-4 p-4 border-b last:border-0">
                    {editingProduct && editingProduct.id === product.id ? (
                      <>
                        <Input
                          value={editingProduct.name}
                          onChange={(e) => setEditingProduct({ ...editingProduct, name: e.target.value })}
                        />
                        <Select
                          value={editingProduct.category_id.toString()}
                          onValueChange={(value) =>
                            setEditingProduct({ ...editingProduct, category_id: Number.parseInt(value) })
                          }
                        >
                          <SelectTrigger>
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
                        <Input
                          value={editingProduct.unit}
                          onChange={(e) => setEditingProduct({ ...editingProduct, unit: e.target.value })}
                        />
                        <Select
                          value={editingProduct.food_type || "unclassified"}
                          onValueChange={(value) =>
                            setEditingProduct({
                              ...editingProduct,
                              food_type: value === "unclassified" ? null : value,
                            })
                          }
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Typ auswählen" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="unclassified">❓ Unclassified</SelectItem>
                            <SelectItem value="food">🍔 Food</SelectItem>
                            <SelectItem value="non_food">🧽 Non-Food</SelectItem>
                          </SelectContent>
                        </Select>
                        <div className="flex gap-2">
                          <Button size="sm" variant="outline" onClick={handleUpdateProduct}>
                            <Save className="h-4 w-4" />
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => setEditingProduct(null)}>
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="flex items-center">{product.name}</div>
                        <div className="flex items-center">
                          {product.category?.symbol} {product.category?.name}
                        </div>
                        <div className="flex items-center">{product.unit}</div>
                        <div className={`flex items-center ${getFoodTypeColor(product.food_type)}`}>
                          {getFoodTypeDisplay(product.food_type)}
                        </div>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() =>
                              setEditingProduct({
                                ...product,
                                food_type: product.food_type,
                              })
                            }
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleDeleteProduct(product.id, product.name)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </>
                    )}
                  </div>
                ))}

                {products.length === 0 && (
                  <div className="p-4 text-center text-muted-foreground">
                    Keine Produkte gefunden. Fügen Sie ein neues Produkt hinzu.
                  </div>
                )}
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  )
}
