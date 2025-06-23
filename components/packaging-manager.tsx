"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent } from "@/components/ui/card"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { useToast } from "@/components/ui/use-toast"
import { Plus, Edit, Trash2, Search } from "lucide-react"
import {
  getAllProducts,
  getProductPackaging,
  createPackagingUnit,
  updatePackagingUnit,
  deletePackagingUnit,
} from "@/lib/supabase-service"
import type { Database } from "@/lib/database.types"

type Product = Database["public"]["Tables"]["products"]["Row"]
type PackagingUnit = Database["public"]["Tables"]["packaging_units"]["Row"]

export function PackagingManager() {
  const { toast } = useToast()
  const [products, setProducts] = useState<Product[]>([])
  const [packagingUnits, setPackagingUnits] = useState<Record<number, PackagingUnit | null>>({})
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [currentProduct, setCurrentProduct] = useState<Product | null>(null)
  const [formData, setFormData] = useState({
    product_id: "",
    amount_per_package: "",
    packaging_unit: "",
  })

  useEffect(() => {
    loadProducts()
  }, [])

  async function loadProducts() {
    setLoading(true)
    try {
      const data = await getAllProducts()
      setProducts(data)

      // Load packaging info for each product
      const packagingData: Record<number, PackagingUnit | null> = {}
      for (const product of data) {
        const packaging = await getProductPackaging(product.id)
        packagingData[product.id] = packaging
      }
      setPackagingUnits(packagingData)
    } catch (error) {
      console.error("Error loading products:", error)
      toast({
        title: "Fehler",
        description: "Produkte konnten nicht geladen werden.",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const filteredProducts = products.filter((product) => product.name.toLowerCase().includes(searchQuery.toLowerCase()))

  const handleAddPackaging = async () => {
    if (!formData.product_id || !formData.amount_per_package || !formData.packaging_unit) {
      toast({
        title: "Fehler",
        description: "Bitte füllen Sie alle Felder aus.",
        variant: "destructive",
      })
      return
    }

    try {
      const result = await createPackagingUnit({
        product_id: Number.parseInt(formData.product_id),
        amount_per_package: Number.parseFloat(formData.amount_per_package),
        packaging_unit: formData.packaging_unit,
      })
      if (result) {
        toast({
          title: "Erfolg",
          description: "Verpackungseinheit wurde erfolgreich erstellt.",
        })
        setIsAddDialogOpen(false)
        setFormData({ product_id: "", amount_per_package: "", packaging_unit: "" })
        loadProducts()
      }
    } catch (error) {
      console.error("Error creating packaging unit:", error)
      toast({
        title: "Fehler",
        description: "Verpackungseinheit konnte nicht erstellt werden.",
        variant: "destructive",
      })
    }
  }

  const handleEditPackaging = async () => {
    if (!currentProduct || !formData.amount_per_package || !formData.packaging_unit) {
      toast({
        title: "Fehler",
        description: "Bitte füllen Sie alle Felder aus.",
        variant: "destructive",
      })
      return
    }

    const packaging = packagingUnits[currentProduct.id]
    if (!packaging) {
      toast({
        title: "Fehler",
        description: "Keine Verpackungseinheit gefunden.",
        variant: "destructive",
      })
      return
    }

    try {
      const result = await updatePackagingUnit(packaging.id, {
        amount_per_package: Number.parseFloat(formData.amount_per_package),
        packaging_unit: formData.packaging_unit,
      })
      if (result) {
        toast({
          title: "Erfolg",
          description: "Verpackungseinheit wurde erfolgreich aktualisiert.",
        })
        setIsEditDialogOpen(false)
        setCurrentProduct(null)
        setFormData({ product_id: "", amount_per_package: "", packaging_unit: "" })
        loadProducts()
      }
    } catch (error) {
      console.error("Error updating packaging unit:", error)
      toast({
        title: "Fehler",
        description: "Verpackungseinheit konnte nicht aktualisiert werden.",
        variant: "destructive",
      })
    }
  }

  const handleDeletePackaging = async () => {
    if (!currentProduct) return

    const packaging = packagingUnits[currentProduct.id]
    if (!packaging) {
      toast({
        title: "Fehler",
        description: "Keine Verpackungseinheit gefunden.",
        variant: "destructive",
      })
      return
    }

    try {
      const result = await deletePackagingUnit(packaging.id)
      if (result) {
        toast({
          title: "Erfolg",
          description: "Verpackungseinheit wurde erfolgreich gelöscht.",
        })
        setIsDeleteDialogOpen(false)
        setCurrentProduct(null)
        loadProducts()
      }
    } catch (error) {
      console.error("Error deleting packaging unit:", error)
      toast({
        title: "Fehler",
        description: "Verpackungseinheit konnte nicht gelöscht werden.",
        variant: "destructive",
      })
    }
  }

  const openEditDialog = (product: Product) => {
    const packaging = packagingUnits[product.id]
    if (!packaging) return

    setCurrentProduct(product)
    setFormData({
      product_id: product.id.toString(),
      amount_per_package: packaging.amount_per_package.toString(),
      packaging_unit: packaging.packaging_unit,
    })
    setIsEditDialogOpen(true)
  }

  const openDeleteDialog = (product: Product) => {
    setCurrentProduct(product)
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
            placeholder="Produkte suchen..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <Button onClick={() => setIsAddDialogOpen(true)} className="gap-2">
          <Plus className="h-4 w-4" />
          Neue Verpackungseinheit
        </Button>
      </div>

      <Card>
        <CardContent className="p-6">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Produkt</TableHead>
                <TableHead>Kategorie</TableHead>
                <TableHead>Menge pro Verpackung</TableHead>
                <TableHead>Verpackungseinheit</TableHead>
                <TableHead className="w-[100px]">Aktionen</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredProducts.map((product) => {
                const packaging = packagingUnits[product.id]
                return (
                  <TableRow key={product.id}>
                    <TableCell>{product.name}</TableCell>
                    <TableCell>
                      {product.category?.symbol} {product.category?.name}
                    </TableCell>
                    <TableCell>
                      {packaging ? packaging.amount_per_package : <span className="text-gray-400">-</span>}
                    </TableCell>
                    <TableCell>
                      {packaging ? packaging.packaging_unit : <span className="text-gray-400">-</span>}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        {packaging ? (
                          <>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => openEditDialog(product)}
                              className="h-8 w-8"
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => openDeleteDialog(product)}
                              className="h-8 w-8 text-red-500 hover:text-red-600"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </>
                        ) : (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setFormData({
                                ...formData,
                                product_id: product.id.toString(),
                              })
                              setIsAddDialogOpen(true)
                            }}
                          >
                            <Plus className="h-4 w-4 mr-2" />
                            Hinzufügen
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                )
              })}
              {filteredProducts.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-gray-500">
                    Keine Produkte gefunden.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Add Packaging Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Neue Verpackungseinheit</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label htmlFor="product" className="text-sm font-medium">
                Produkt
              </label>
              <Select
                value={formData.product_id}
                onValueChange={(value) => setFormData({ ...formData, product_id: value })}
              >
                <SelectTrigger id="product">
                  <SelectValue placeholder="Produkt auswählen" />
                </SelectTrigger>
                <SelectContent>
                  {products
                    .filter((p) => !packagingUnits[p.id])
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
                Menge pro Verpackung
              </label>
              <Input
                id="amount"
                type="number"
                step="0.01"
                value={formData.amount_per_package}
                onChange={(e) => setFormData({ ...formData, amount_per_package: e.target.value })}
                placeholder="Menge"
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="packaging-unit" className="text-sm font-medium">
                Verpackungseinheit
              </label>
              <Input
                id="packaging-unit"
                value={formData.packaging_unit}
                onChange={(e) => setFormData({ ...formData, packaging_unit: e.target.value })}
                placeholder="Kiste, Sack, etc."
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
              Abbrechen
            </Button>
            <Button onClick={handleAddPackaging}>Erstellen</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Packaging Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Verpackungseinheit bearbeiten</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Produkt</label>
              <div className="p-2 border rounded-md bg-gray-50">{currentProduct?.name}</div>
            </div>
            <div className="space-y-2">
              <label htmlFor="edit-amount" className="text-sm font-medium">
                Menge pro Verpackung
              </label>
              <Input
                id="edit-amount"
                type="number"
                step="0.01"
                value={formData.amount_per_package}
                onChange={(e) => setFormData({ ...formData, amount_per_package: e.target.value })}
                placeholder="Menge"
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="edit-packaging-unit" className="text-sm font-medium">
                Verpackungseinheit
              </label>
              <Input
                id="edit-packaging-unit"
                value={formData.packaging_unit}
                onChange={(e) => setFormData({ ...formData, packaging_unit: e.target.value })}
                placeholder="Kiste, Sack, etc."
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
              Abbrechen
            </Button>
            <Button onClick={handleEditPackaging}>Speichern</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Packaging Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Verpackungseinheit löschen</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p>
              Sind Sie sicher, dass Sie die Verpackungseinheit für <strong>{currentProduct?.name}</strong> löschen
              möchten?
            </p>
            <p className="text-red-500 mt-2">Diese Aktion kann nicht rückgängig gemacht werden.</p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)}>
              Abbrechen
            </Button>
            <Button variant="destructive" onClick={handleDeletePackaging}>
              Löschen
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
