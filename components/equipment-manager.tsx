"use client"

import { useState, useEffect, useMemo } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Trash2, Edit, Plus } from "lucide-react"
import { useToast } from "@/components/ui/use-toast"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  getFoodtruckEquipment,
  createFoodtruckEquipment,
  updateFoodtruckEquipment,
  deleteFoodtruckEquipment,
  getEquipmentByFoodtruck,
  type FoodtruckEquipment,
  type CreateFoodtruckEquipmentData,
} from "@/lib/foodtruck-equipment-service"

const EQUIPMENT_UNITS = ["Stück", "Liter", "Kilogramm", "Meter", "Set", "Paar", "Rolle", "Packung"]

const FOODTRUCK_OPTIONS = ["ft1", "ft2", "ft3", "ft4", "ft5"]

interface EquipmentManagerProps {
  selectedFoodtruck?: string
}

export function EquipmentManager({ selectedFoodtruck }: EquipmentManagerProps) {
  const { toast } = useToast()
  const [equipment, setEquipment] = useState<FoodtruckEquipment[]>([])
  const [loading, setLoading] = useState(true)
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [editingEquipment, setEditingEquipment] = useState<FoodtruckEquipment | null>(null)
  const [equipmentToDelete, setEquipmentToDelete] = useState<FoodtruckEquipment | null>(null)
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedFoodtruckFilter, setSelectedFoodtruckFilter] = useState<string>("all")

  const [formData, setFormData] = useState({
    name: "",
    unit: EQUIPMENT_UNITS[0],
    foodtruck: [] as string[],
    notes: "",
  })

  useEffect(() => {
    loadEquipment()
  }, [selectedFoodtruck])

  const loadEquipment = async () => {
    setLoading(true)
    try {
      console.log("[v0] Loading equipment, selectedFoodtruck:", selectedFoodtruck)
      let data: FoodtruckEquipment[]
      if (selectedFoodtruck && selectedFoodtruck !== "all") {
        data = await getEquipmentByFoodtruck(selectedFoodtruck)
      } else {
        data = await getFoodtruckEquipment()
      }
      console.log("[v0] Received equipment data:", data)
      const safeData = Array.isArray(data) ? data : []
      console.log("[v0] Setting equipment state to:", safeData)
      setEquipment(safeData)
    } catch (error) {
      console.error("[v0] Error loading equipment:", error)
      setEquipment([])
      toast({
        title: "Fehler",
        description: "Equipment konnte nicht geladen werden.",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleCreateEquipment = async () => {
    if (!formData.name.trim()) {
      toast({
        title: "Fehler",
        description: "Bitte geben Sie einen Namen ein.",
        variant: "destructive",
      })
      return
    }

    if (formData.foodtruck.length === 0) {
      toast({
        title: "Fehler",
        description: "Bitte wählen Sie mindestens einen Foodtruck aus.",
        variant: "destructive",
      })
      return
    }

    try {
      const createData: CreateFoodtruckEquipmentData = {
        name: formData.name,
        unit: formData.unit,
        foodtruck: formData.foodtruck,
        notes: formData.notes,
      }
      const newEquipment = await createFoodtruckEquipment(createData)
      console.log("[v0] Created new equipment:", newEquipment)
      const currentEquipment = Array.isArray(equipment) ? equipment : []
      setEquipment([...currentEquipment, newEquipment])
      setFormData({
        name: "",
        unit: EQUIPMENT_UNITS[0],
        foodtruck: [],
        notes: "",
      })
      setIsCreateDialogOpen(false)
      toast({
        title: "Erfolg",
        description: "Equipment wurde erfolgreich erstellt.",
      })
    } catch (error) {
      console.error("Error creating equipment:", error)
      toast({
        title: "Fehler",
        description: "Equipment konnte nicht erstellt werden.",
        variant: "destructive",
      })
    }
  }

  const handleEditEquipment = (equipment: FoodtruckEquipment) => {
    setEditingEquipment(equipment)
    setFormData({
      name: equipment.name,
      unit: equipment.unit || EQUIPMENT_UNITS[0],
      foodtruck: equipment.foodtruck || [],
      notes: equipment.notes || "",
    })
    setIsEditDialogOpen(true)
  }

  const handleUpdateEquipment = async () => {
    if (!editingEquipment) return

    if (!formData.name.trim()) {
      toast({
        title: "Fehler",
        description: "Bitte geben Sie einen Namen ein.",
        variant: "destructive",
      })
      return
    }

    if (formData.foodtruck.length === 0) {
      toast({
        title: "Fehler",
        description: "Bitte wählen Sie mindestens einen Foodtruck aus.",
        variant: "destructive",
      })
      return
    }

    try {
      const updateData = {
        name: formData.name,
        unit: formData.unit,
        foodtruck: formData.foodtruck,
        notes: formData.notes,
      }
      const updatedEquipment = await updateFoodtruckEquipment(editingEquipment.id, updateData)
      const currentEquipment = Array.isArray(equipment) ? equipment : []
      setEquipment(currentEquipment.map((item) => (item.id === updatedEquipment.id ? updatedEquipment : item)))
      setIsEditDialogOpen(false)
      setEditingEquipment(null)
      toast({
        title: "Erfolg",
        description: "Equipment wurde erfolgreich aktualisiert.",
      })
    } catch (error) {
      console.error("Error updating equipment:", error)
      toast({
        title: "Fehler",
        description: "Equipment konnte nicht aktualisiert werden.",
        variant: "destructive",
      })
    }
  }

  const handleDeleteEquipment = async () => {
    if (!equipmentToDelete) return

    try {
      const success = await deleteFoodtruckEquipment(equipmentToDelete.id)
      if (success) {
        const currentEquipment = Array.isArray(equipment) ? equipment : []
        setEquipment(currentEquipment.filter((item) => item.id !== equipmentToDelete.id))
        setIsDeleteDialogOpen(false)
        setEquipmentToDelete(null)
        toast({
          title: "Erfolg",
          description: "Equipment wurde erfolgreich gelöscht.",
        })
      }
    } catch (error) {
      console.error("Error deleting equipment:", error)
      toast({
        title: "Fehler",
        description: "Equipment konnte nicht gelöscht werden.",
        variant: "destructive",
      })
    }
  }

  const handleFoodtruckToggle = (foodtruck: string) => {
    setFormData((prev) => ({
      ...prev,
      foodtruck: prev.foodtruck.includes(foodtruck)
        ? prev.foodtruck.filter((ft) => ft !== foodtruck)
        : [...prev.foodtruck, foodtruck],
    }))
  }

  const filteredEquipment = useMemo(() => {
    console.log("[v0] Filtering equipment, current equipment:", equipment)
    const safeEquipment = Array.isArray(equipment) ? equipment : []
    return safeEquipment.filter((item) => {
      if (!item || typeof item !== "object") return false
      const matchesSearch = item.name && item.name.toLowerCase().includes(searchTerm.toLowerCase())
      const matchesFoodtruck =
        selectedFoodtruckFilter === "all" || (item.foodtruck && item.foodtruck.includes(selectedFoodtruckFilter))
      return matchesSearch && matchesFoodtruck
    })
  }, [equipment, searchTerm, selectedFoodtruckFilter])

  const resetForm = () => {
    setFormData({
      name: "",
      unit: EQUIPMENT_UNITS[0],
      foodtruck: [],
      notes: "",
    })
  }

  if (loading) {
    return (
      <div className="container mx-auto py-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
          <p className="mt-2">Lade Equipment...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto py-8 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Foodtruck Equipment</h1>
        <Button onClick={() => setIsCreateDialogOpen(true)} className="flex items-center gap-2">
          <Plus className="h-4 w-4" />
          Neues Equipment
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1">
          <Input placeholder="Equipment suchen..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
        </div>
        <div className="w-full sm:w-48">
          <Select value={selectedFoodtruckFilter} onValueChange={setSelectedFoodtruckFilter}>
            <SelectTrigger>
              <SelectValue placeholder="Foodtruck wählen" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Alle Foodtrucks</SelectItem>
              {FOODTRUCK_OPTIONS.map((ft) => (
                <SelectItem key={ft} value={ft}>
                  {ft.toUpperCase()}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Equipment List */}
      <div className="grid gap-4">
        {filteredEquipment.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            {searchTerm || selectedFoodtruckFilter !== "all"
              ? "Kein Equipment gefunden."
              : "Noch kein Equipment vorhanden."}
          </div>
        ) : (
          filteredEquipment.map((item) => (
            <Card key={item.id}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold">{item.name}</h3>
                    <p className="text-sm text-gray-600 mb-2">Einheit: {item.unit}</p>
                    {item.notes && <p className="text-sm text-gray-500 mb-2">{item.notes}</p>}
                    <div className="flex flex-wrap gap-1">
                      {(item.foodtruck || []).map((ft) => (
                        <Badge key={ft} variant="secondary">
                          {ft.toUpperCase()}
                        </Badge>
                      ))}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button variant="ghost" size="icon" onClick={() => handleEditEquipment(item)}>
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => {
                        setEquipmentToDelete(item)
                        setIsDeleteDialogOpen(true)
                      }}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Create Equipment Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Neues Equipment erstellen</DialogTitle>
            <DialogDescription>Erstellen Sie ein neues Equipment für die Foodtrucks.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="name">Name *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Equipment-Name eingeben..."
              />
            </div>
            <div>
              <Label htmlFor="unit">Einheit</Label>
              <Select value={formData.unit} onValueChange={(value) => setFormData({ ...formData, unit: value })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {EQUIPMENT_UNITS.map((unit) => (
                    <SelectItem key={unit} value={unit}>
                      {unit}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="notes">Notizen</Label>
              <Input
                id="notes"
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="Zusätzliche Informationen..."
              />
            </div>
            <div>
              <Label>Foodtrucks *</Label>
              <div className="grid grid-cols-3 gap-2 mt-2">
                {FOODTRUCK_OPTIONS.map((ft) => (
                  <label key={ft} className="flex items-center space-x-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.foodtruck.includes(ft)}
                      onChange={() => handleFoodtruckToggle(ft)}
                      className="rounded"
                    />
                    <span className="text-sm">{ft.toUpperCase()}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsCreateDialogOpen(false)
                resetForm()
              }}
            >
              Abbrechen
            </Button>
            <Button onClick={handleCreateEquipment}>Erstellen</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Equipment Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Equipment bearbeiten</DialogTitle>
            <DialogDescription>Bearbeiten Sie die Equipment-Details.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="edit-name">Name *</Label>
              <Input
                id="edit-name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Equipment-Name eingeben..."
              />
            </div>
            <div>
              <Label htmlFor="edit-unit">Einheit</Label>
              <Select value={formData.unit} onValueChange={(value) => setFormData({ ...formData, unit: value })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {EQUIPMENT_UNITS.map((unit) => (
                    <SelectItem key={unit} value={unit}>
                      {unit}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="edit-notes">Notizen</Label>
              <Input
                id="edit-notes"
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="Zusätzliche Informationen..."
              />
            </div>
            <div>
              <Label>Foodtrucks *</Label>
              <div className="grid grid-cols-3 gap-2 mt-2">
                {FOODTRUCK_OPTIONS.map((ft) => (
                  <label key={ft} className="flex items-center space-x-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.foodtruck.includes(ft)}
                      onChange={() => handleFoodtruckToggle(ft)}
                      className="rounded"
                    />
                    <span className="text-sm">{ft.toUpperCase()}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsEditDialogOpen(false)
                setEditingEquipment(null)
                resetForm()
              }}
            >
              Abbrechen
            </Button>
            <Button onClick={handleUpdateEquipment}>Speichern</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Equipment löschen</DialogTitle>
            <DialogDescription>
              Sind Sie sicher, dass Sie "{equipmentToDelete?.name}" löschen möchten? Diese Aktion kann nicht rückgängig
              gemacht werden.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)}>
              Abbrechen
            </Button>
            <Button variant="destructive" onClick={handleDeleteEquipment}>
              Löschen
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
