"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent } from "@/components/ui/card"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { useToast } from "@/components/ui/use-toast"
import { Plus, Edit, Trash2, Search } from "lucide-react"
import { getCategories, createCategory, updateCategory, deleteCategory } from "@/lib/supabase-service"
import type { Database } from "@/lib/database.types"

type Category = Database["public"]["Tables"]["categories"]["Row"]

export function CategoryManager() {
  const { toast } = useToast()
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [currentCategory, setCurrentCategory] = useState<Category | null>(null)
  const [formData, setFormData] = useState({
    name: "",
    symbol: "",
  })

  useEffect(() => {
    loadCategories()
  }, [])

  async function loadCategories() {
    setLoading(true)
    try {
      const data = await getCategories()
      setCategories(data)
    } catch (error) {
      console.error("Error loading categories:", error)
      toast({
        title: "Fehler",
        description: "Kategorien konnten nicht geladen werden.",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const filteredCategories = categories.filter((category) =>
    category.name.toLowerCase().includes(searchQuery.toLowerCase()),
  )

  const handleAddCategory = async () => {
    if (!formData.name || !formData.symbol) {
      toast({
        title: "Fehler",
        description: "Bitte füllen Sie alle Felder aus.",
        variant: "destructive",
      })
      return
    }

    try {
      const result = await createCategory(formData)
      if (result) {
        toast({
          title: "Erfolg",
          description: `Kategorie "${result.name}" wurde erfolgreich erstellt.`,
        })
        setIsAddDialogOpen(false)
        setFormData({ name: "", symbol: "" })
        loadCategories()
      }
    } catch (error) {
      console.error("Error creating category:", error)
      toast({
        title: "Fehler",
        description: "Kategorie konnte nicht erstellt werden.",
        variant: "destructive",
      })
    }
  }

  const handleEditCategory = async () => {
    if (!currentCategory || !formData.name.trim() || !formData.symbol.trim()) {
      toast({
        title: "Fehler",
        description: "Bitte füllen Sie alle Felder aus.",
        variant: "destructive",
      })
      return
    }

    try {
      console.log("Updating category:", currentCategory.id, formData)
      const result = await updateCategory(currentCategory.id, {
        name: formData.name.trim(),
        symbol: formData.symbol.trim(),
      })

      if (result) {
        toast({
          title: "Erfolg",
          description: `Kategorie "${result.name}" wurde erfolgreich aktualisiert.`,
        })
        setIsEditDialogOpen(false)
        setCurrentCategory(null)
        setFormData({ name: "", symbol: "" })
        await loadCategories() // Make sure to await the reload
      } else {
        throw new Error("Update returned null")
      }
    } catch (error) {
      console.error("Error updating category:", error)
      toast({
        title: "Fehler",
        description: "Kategorie konnte nicht aktualisiert werden. Bitte versuchen Sie es erneut.",
        variant: "destructive",
      })
    }
  }

  const handleDeleteCategory = async () => {
    if (!currentCategory) return

    try {
      const result = await deleteCategory(currentCategory.id)
      if (result) {
        toast({
          title: "Erfolg",
          description: `Kategorie "${currentCategory.name}" wurde erfolgreich gelöscht.`,
        })
        setIsDeleteDialogOpen(false)
        setCurrentCategory(null)
        loadCategories()
      }
    } catch (error) {
      console.error("Error deleting category:", error)
      toast({
        title: "Fehler",
        description: "Kategorie konnte nicht gelöscht werden.",
        variant: "destructive",
      })
    }
  }

  const openEditDialog = (category: Category) => {
    console.log("Opening edit dialog for category:", category)
    setCurrentCategory(category)
    setFormData({
      name: category.name || "",
      symbol: category.symbol || "",
    })
    setIsEditDialogOpen(true)
  }

  const openDeleteDialog = (category: Category) => {
    setCurrentCategory(category)
    setIsDeleteDialogOpen(true)
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
        <div className="relative w-full sm:w-64">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />
          <Input
            placeholder="Kategorien suchen..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <Button onClick={() => setIsAddDialogOpen(true)} className="gap-2">
          <Plus className="h-4 w-4" />
          Neue Kategorie
        </Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {filteredCategories.map((category) => (
          <Card key={category.id} className="overflow-hidden">
            <CardContent className="p-0">
              <div className="p-6 flex flex-col items-center">
                <div className="text-4xl mb-2">{category.symbol}</div>
                <h3 className="text-lg font-semibold">{category.name}</h3>
              </div>
              <div className="flex border-t">
                <Button variant="ghost" className="flex-1 rounded-none h-12" onClick={() => openEditDialog(category)}>
                  <Edit className="h-4 w-4 mr-2" />
                  Bearbeiten
                </Button>
                <div className="w-px bg-border" />
                <Button
                  variant="ghost"
                  className="flex-1 rounded-none h-12 text-red-500 hover:text-red-600"
                  onClick={() => openDeleteDialog(category)}
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Löschen
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}

        {filteredCategories.length === 0 && (
          <div className="col-span-full text-center py-12 text-gray-500">
            {searchQuery
              ? "Keine Kategorien gefunden."
              : "Keine Kategorien vorhanden. Erstellen Sie eine neue Kategorie."}
          </div>
        )}
      </div>

      {/* Add Category Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Neue Kategorie erstellen</DialogTitle>
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
                placeholder="Kategoriename"
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="symbol" className="text-sm font-medium">
                Symbol
              </label>
              <Input
                id="symbol"
                value={formData.symbol}
                onChange={(e) => setFormData({ ...formData, symbol: e.target.value })}
                placeholder="Emoji Symbol (z.B. 🍔)"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
              Abbrechen
            </Button>
            <Button onClick={handleAddCategory}>Erstellen</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Category Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Kategorie bearbeiten</DialogTitle>
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
                placeholder="Kategoriename"
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="edit-symbol" className="text-sm font-medium">
                Symbol
              </label>
              <Input
                id="edit-symbol"
                value={formData.symbol}
                onChange={(e) => setFormData({ ...formData, symbol: e.target.value })}
                placeholder="Emoji Symbol (z.B. 🍔)"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsEditDialogOpen(false)
                setCurrentCategory(null)
                setFormData({ name: "", symbol: "" })
              }}
            >
              Abbrechen
            </Button>
            <Button onClick={handleEditCategory} disabled={!formData.name.trim() || !formData.symbol.trim()}>
              Speichern
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Category Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Kategorie löschen</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p>
              Sind Sie sicher, dass Sie die Kategorie <strong>{currentCategory?.name}</strong> löschen möchten?
            </p>
            <p className="text-red-500 mt-2">
              Diese Aktion kann nicht rückgängig gemacht werden. Alle Produkte in dieser Kategorie werden ebenfalls
              gelöscht.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)}>
              Abbrechen
            </Button>
            <Button variant="destructive" onClick={handleDeleteCategory}>
              Löschen
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
