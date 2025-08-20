"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { Search, Plus, Edit, Trash2, Wrench } from "lucide-react"
import { toast } from "@/hooks/use-toast"
import {
  getAllFoodtruckEquipment,
  createFoodtruckEquipment,
  updateFoodtruckEquipment,
  deleteFoodtruckEquipment,
  getFoodtruckName,
  type FoodtruckEquipment,
  type CreateFoodtruckEquipmentData,
  type UpdateFoodtruckEquipmentData,
} from "@/lib/foodtruck-equipment-service"

const FOODTRUCK_OPTIONS = [
  { value: "ft1", label: "FT 1" },
  { value: "ft2", label: "FT 2" },
  { value: "ft3", label: "FT 3" },
  { value: "ft4", label: "FT 4" },
  { value: "ft5", label: "FT 5" },
]

const UNIT_OPTIONS = ["Stück", "Set", "Kiste", "Packung", "Rolle", "Beutel", "Flasche", "Dose", "Glas", "Sackerl"]

interface EquipmentFormData {
  name: string
  unit: string
  foodtruck: "ft1" | "ft2" | "ft3" | "ft4" | "ft5"
  notes: string
}

export function EquipmentManager() {
  const [equipment, setEquipment] = useState<FoodtruckEquipment[]>([])
  const [filteredEquipment, setFilteredEquipment] = useState<FoodtruckEquipment[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedFoodtruck, setSelectedFoodtruck] = useState<string>("all")
  const [loading, setLoading] = useState(true)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingEquipment, setEditingEquipment] = useState<FoodtruckEquipment | null>(null)
  const [formData, setFormData] = useState<EquipmentFormData>({
    name: "",
    unit: "Stück",
    foodtruck: "ft1",
    notes: "",
  })

  useEffect(() => {
    loadEquipment()
  }, [])

  useEffect(() => {
    filterEquipment()
  }, [equipment, searchTerm, selectedFoodtruck])

  const loadEquipment = async () => {
    try {
      setLoading(true)
      const data = await getAllFoodtruckEquipment()
      setEquipment(data)
    } catch (error) {
      console.error("Error loading equipment:", error)
      toast({
        title: "Fehler",
        description: "Equipment konnte nicht geladen werden",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const filterEquipment = () => {
    let filtered = equipment

    // Filter by search term
    if (searchTerm) {
      filtered = filtered.filter(
        (item) =>
          item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          (item.notes && item.notes.toLowerCase().includes(searchTerm.toLowerCase())),
      )
    }

    // Filter by foodtruck
    if (selectedFoodtruck !== "all") {
      filtered = filtered.filter((item) => item.foodtruck === selectedFoodtruck)
    }

    setFilteredEquipment(filtered)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.name.trim()) {
      toast({
        title: "Fehler",
        description: "Name ist erforderlich",
        variant: "destructive",
      })
      return
    }

    try {
      if (editingEquipment) {
        // Update existing equipment
        const updateData: UpdateFoodtruckEquipmentData = {
          name: formData.name.trim(),
          unit: formData.unit,
          foodtruck: formData.foodtruck,
          notes: formData.notes.trim() || undefined,
        }

        const result = await updateFoodtruckEquipment(editingEquipment.id, updateData)
        if (result) {
          toast({
            title: "Erfolg",
            description: "Equipment wurde aktualisiert",
          })
          await loadEquipment()
        } else {
          throw new Error("Update failed")
        }
      } else {
        // Create new equipment
        const createData: CreateFoodtruckEquipmentData = {
          name: formData.name.trim(),
          unit: formData.unit,
          foodtruck: formData.foodtruck,
          notes: formData.notes.trim() || undefined,
        }

        const result = await createFoodtruckEquipment(createData)
        if (result) {
          toast({
            title: "Erfolg",
            description: "Equipment wurde erstellt",
          })
          await loadEquipment()
        } else {
          throw new Error("Creation failed")
        }
      }

      // Reset form and close dialog
      setFormData({
        name: "",
        unit: "Stück",
        foodtruck: "ft1",
        notes: "",
      })
      setEditingEquipment(null)
      setIsDialogOpen(false)
    } catch (error) {
      console.error("Error saving equipment:", error)
      toast({
        title: "Fehler",
        description: editingEquipment
          ? "Equipment konnte nicht aktualisiert werden"
          : "Equipment konnte nicht erstellt werden",
        variant: "destructive",
      })
    }
  }

  const handleEdit = (item: FoodtruckEquipment) => {
    setEditingEquipment(item)
    setFormData({
      name: item.name,
      unit: item.unit,
      foodtruck: item.foodtruck,
      notes: item.notes || "",
    })
    setIsDialogOpen(true)
  }

  const handleDelete = async (id: number) => {
    try {
      const success = await deleteFoodtruckEquipment(id)
      if (success) {
        toast({
          title: "Erfolg",
          description: "Equipment wurde gelöscht",
        })
        await loadEquipment()
      } else {
        throw new Error("Delete failed")
      }
    } catch (error) {
      console.error("Error deleting equipment:", error)
      toast({
        title: "Fehler",
        description: "Equipment konnte nicht gelöscht werden",
        variant: "destructive",
      })
    }
  }

  const handleDialogClose = () => {
    setIsDialogOpen(false)
    setEditingEquipment(null)
    setFormData({
      name: "",
      unit: "Stück",
      foodtruck: "ft1",
      notes: "",
    })
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-600"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Wrench className="h-6 w-6 text-orange-600" />
            Foodtruck Equipment
          </h2>
          <p className="text-gray-600 mt-1">Verwalten Sie Equipment für die verschiedenen Foodtrucks</p>
        </div>

        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-orange-600 hover:bg-orange-700">
              <Plus className="h-4 w-4 mr-2" />
              Equipment hinzufügen
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px]">
            <form onSubmit={handleSubmit}>
              <DialogHeader>
                <DialogTitle>{editingEquipment ? "Equipment bearbeiten" : "Neues Equipment"}</DialogTitle>
                <DialogDescription>
                  {editingEquipment ? "Bearbeiten Sie die Equipment-Details" : "Fügen Sie ein neues Equipment hinzu"}
                </DialogDescription>
              </DialogHeader>

              <div className="grid gap-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Name *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Equipment Name"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="unit">Einheit</Label>
                  <Select value={formData.unit} onValueChange={(value) => setFormData({ ...formData, unit: value })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {UNIT_OPTIONS.map((unit) => (
                        <SelectItem key={unit} value={unit}>
                          {unit}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="foodtruck">Foodtruck</Label>
                  <Select
                    value={formData.foodtruck}
                    onValueChange={(value: "ft1" | "ft2" | "ft3" | "ft4" | "ft5") =>
                      setFormData({ ...formData, foodtruck: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {FOODTRUCK_OPTIONS.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="notes">Notizen</Label>
                  <Textarea
                    id="notes"
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    placeholder="Zusätzliche Informationen..."
                    rows={3}
                  />
                </div>
              </div>

              <DialogFooter>
                <Button type="button" variant="outline" onClick={handleDialogClose}>
                  Abbrechen
                </Button>
                <Button type="submit" className="bg-orange-600 hover:bg-orange-700">
                  {editingEquipment ? "Aktualisieren" : "Erstellen"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
          <Input
            placeholder="Equipment suchen..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>

        <Select value={selectedFoodtruck} onValueChange={setSelectedFoodtruck}>
          <SelectTrigger className="w-full sm:w-[200px]">
            <SelectValue placeholder="Alle Foodtrucks" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Alle Foodtrucks</SelectItem>
            {FOODTRUCK_OPTIONS.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Equipment Grid */}
      {filteredEquipment.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Wrench className="h-12 w-12 text-gray-400 mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Kein Equipment gefunden</h3>
            <p className="text-gray-600 text-center">
              {searchTerm || selectedFoodtruck !== "all"
                ? "Keine Equipment entspricht den aktuellen Filtern."
                : "Fügen Sie Ihr erstes Equipment hinzu."}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredEquipment.map((item) => (
            <Card key={item.id} className="hover:shadow-md transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <CardTitle className="text-lg text-gray-900 mb-1">{item.name}</CardTitle>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-orange-600 border-orange-200">
                        {getFoodtruckName(item.foodtruck)}
                      </Badge>
                      <span className="text-sm text-gray-500">{item.unit}</span>
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleEdit(item)}
                      className="h-8 w-8 text-gray-500 hover:text-orange-600"
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-gray-500 hover:text-red-600">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Equipment löschen</AlertDialogTitle>
                          <AlertDialogDescription>
                            Sind Sie sicher, dass Sie "{item.name}" löschen möchten? Diese Aktion kann nicht rückgängig
                            gemacht werden.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Abbrechen</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => handleDelete(item.id)}
                            className="bg-red-600 hover:bg-red-700"
                          >
                            Löschen
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>
              </CardHeader>
              {item.notes && (
                <CardContent className="pt-0">
                  <p className="text-sm text-gray-600">{item.notes}</p>
                </CardContent>
              )}
            </Card>
          ))}
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-orange-600">{filteredEquipment.length}</div>
            <div className="text-sm text-gray-600">Gesamt</div>
          </CardContent>
        </Card>
        {FOODTRUCK_OPTIONS.map((ft) => (
          <Card key={ft.value}>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-orange-600">
                {equipment.filter((item) => item.foodtruck === ft.value).length}
              </div>
              <div className="text-sm text-gray-600">{ft.label}</div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
