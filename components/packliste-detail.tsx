"use client"

import { useState, useEffect, useMemo } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import { useToast } from "@/components/ui/use-toast"
import {
  ArrowLeft,
  Plus,
  Search,
  Filter,
  MoreVertical,
  Check,
  X,
  Edit3,
  Trash2,
  Share2,
  Download,
  Calendar,
  MapPin,
  Users,
  Package,
  GripVertical,
  SortAsc,
  SortDesc,
  Grid3X3,
  List,
  CheckCircle2,
  Circle,
  Eye,
  EyeOff,
} from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { cn } from "@/lib/utils"
import { getEvent, getEventProducts, saveEventProducts, updatePrintReadyStatus, updateFinishedStatus } from "@/lib/event-service"
import type { Event } from "@/lib/event-service"
import { getAllProducts, getCategories } from "@/lib/supabase-service"
import type { ProductWithCategory } from "@/lib/supabase-service"

interface PacklistItem {
  id: string
  name: string
  quantity: number
  unit: string
  category: string
  packed: boolean
  priority: "low" | "medium" | "high"
  notes?: string
}

interface PacklisteDetailProps {
  eventId: string
}

const CATEGORY_COLORS = {
  "Essen": "bg-orange-100 text-orange-800 border-orange-200",
  "Getränke Pet": "bg-blue-100 text-blue-800 border-blue-200",
  "Getränke Glas": "bg-cyan-100 text-cyan-800 border-cyan-200",
  "Getränke Spezial": "bg-purple-100 text-purple-800 border-purple-200",
  "Equipment": "bg-green-100 text-green-800 border-green-200",
  "Kassa": "bg-yellow-100 text-yellow-800 border-yellow-200",
  "default": "bg-gray-100 text-gray-800 border-gray-200"
}

const PRIORITY_COLORS = {
  "high": "bg-red-100 text-red-800 border-red-200",
  "medium": "bg-yellow-100 text-yellow-800 border-yellow-200",
  "low": "bg-green-100 text-green-800 border-green-200"
}

export function PacklisteDetail({ eventId }: PacklisteDetailProps) {
  const router = useRouter()
  const { toast } = useToast()

  // State
  const [event, setEvent] = useState<Event | null>(null)
  const [items, setItems] = useState<PacklistItem[]>([])
  const [products, setProducts] = useState<ProductWithCategory[]>([])
  const [categories, setCategories] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  
  // UI State
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedCategory, setSelectedCategory] = useState<string>("all")
  const [sortBy, setSortBy] = useState<"name" | "category" | "priority" | "status">("name")
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc")
  const [viewMode, setViewMode] = useState<"grid" | "list">("list")
  const [showCompleted, setShowCompleted] = useState(true)
  
  // Dialog States
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [isShareDialogOpen, setIsShareDialogOpen] = useState(false)
  const [editingItem, setEditingItem] = useState<PacklistItem | null>(null)
  const [deletingItem, setDeleteingItem] = useState<PacklistItem | null>(null)
  
  // Form State
  const [formData, setFormData] = useState({
    name: "",
    quantity: 1,
    unit: "Stück",
    category: "",
    priority: "medium" as "low" | "medium" | "high",
    notes: ""
  })

  // Load data
  useEffect(() => {
    loadData()
  }, [eventId])

  const loadData = async () => {
    setLoading(true)
    try {
      const [eventData, productsData, categoriesData, eventProductsData] = await Promise.all([
        getEvent(eventId),
        getAllProducts(),
        getCategories(),
        getEventProducts(eventId)
      ])

      setEvent(eventData)
      setProducts(productsData)
      setCategories(categoriesData)

      // Transform event products to packlist items
      const packlistItems: PacklistItem[] = eventProductsData.map((product, index) => ({
        id: `item-${index}`,
        name: product.product_name,
        quantity: product.quantity,
        unit: product.unit,
        category: getProductCategory(product.product_name, productsData),
        packed: false,
        priority: "medium",
        notes: ""
      }))

      setItems(packlistItems)
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

  const getProductCategory = (productName: string, products: ProductWithCategory[]): string => {
    const product = products.find(p => p.name === productName)
    return product?.category?.name || "Sonstige"
  }

  // Filtered and sorted items
  const filteredItems = useMemo(() => {
    let filtered = items.filter(item => {
      const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase())
      const matchesCategory = selectedCategory === "all" || item.category === selectedCategory
      const matchesVisibility = showCompleted || !item.packed
      
      return matchesSearch && matchesCategory && matchesVisibility
    })

    // Sort items
    filtered.sort((a, b) => {
      let comparison = 0
      
      switch (sortBy) {
        case "name":
          comparison = a.name.localeCompare(b.name)
          break
        case "category":
          comparison = a.category.localeCompare(b.category)
          break
        case "priority":
          const priorityOrder = { high: 3, medium: 2, low: 1 }
          comparison = priorityOrder[b.priority] - priorityOrder[a.priority]
          break
        case "status":
          comparison = Number(a.packed) - Number(b.packed)
          break
      }
      
      return sortOrder === "asc" ? comparison : -comparison
    })

    return filtered
  }, [items, searchQuery, selectedCategory, sortBy, sortOrder, showCompleted])

  // Statistics
  const stats = useMemo(() => {
    const total = items.length
    const packed = items.filter(item => item.packed).length
    const unpacked = total - packed
    const progress = total > 0 ? Math.round((packed / total) * 100) : 0
    
    return { total, packed, unpacked, progress }
  }, [items])

  // Handlers
  const handleAddItem = () => {
    const newItem: PacklistItem = {
      id: `item-${Date.now()}`,
      name: formData.name,
      quantity: formData.quantity,
      unit: formData.unit,
      category: formData.category,
      priority: formData.priority,
      packed: false,
      notes: formData.notes
    }

    setItems(prev => [...prev, newItem])
    setIsAddDialogOpen(false)
    resetForm()
    
    toast({
      title: "Item hinzugefügt",
      description: `${formData.name} wurde zur Packliste hinzugefügt.`,
    })
  }

  const handleEditItem = () => {
    if (!editingItem) return

    setItems(prev => prev.map(item => 
      item.id === editingItem.id 
        ? { ...item, ...formData }
        : item
    ))
    
    setIsEditDialogOpen(false)
    setEditingItem(null)
    resetForm()
    
    toast({
      title: "Item aktualisiert",
      description: "Das Item wurde erfolgreich aktualisiert.",
    })
  }

  const handleDeleteItem = () => {
    if (!deletingItem) return

    setItems(prev => prev.filter(item => item.id !== deletingItem.id))
    setIsDeleteDialogOpen(false)
    setDeleteingItem(null)
    
    toast({
      title: "Item gelöscht",
      description: "Das Item wurde aus der Packliste entfernt.",
    })
  }

  const handleTogglePacked = (itemId: string) => {
    setItems(prev => prev.map(item => 
      item.id === itemId 
        ? { ...item, packed: !item.packed }
        : item
    ))
  }

  const handleMarkAllPacked = () => {
    setItems(prev => prev.map(item => ({ ...item, packed: true })))
    toast({
      title: "Alle Items gepackt",
      description: "Alle Items wurden als gepackt markiert.",
    })
  }

  const handleMarkAllUnpacked = () => {
    setItems(prev => prev.map(item => ({ ...item, packed: false })))
    toast({
      title: "Alle Items entpackt",
      description: "Alle Items wurden als ungepackt markiert.",
    })
  }

  const openEditDialog = (item: PacklistItem) => {
    setEditingItem(item)
    setFormData({
      name: item.name,
      quantity: item.quantity,
      unit: item.unit,
      category: item.category,
      priority: item.priority,
      notes: item.notes || ""
    })
    setIsEditDialogOpen(true)
  }

  const openDeleteDialog = (item: PacklistItem) => {
    setDeleteingItem(item)
    setIsDeleteDialogOpen(true)
  }

  const resetForm = () => {
    setFormData({
      name: "",
      quantity: 1,
      unit: "Stück",
      category: "",
      priority: "medium",
      notes: ""
    })
  }

  const handleShare = () => {
    const shareData = {
      title: `Packliste: ${event?.name}`,
      text: `Packliste für ${event?.name} - ${stats.packed}/${stats.total} Items gepackt`,
      url: window.location.href
    }

    if (navigator.share) {
      navigator.share(shareData)
    } else {
      navigator.clipboard.writeText(window.location.href)
      toast({
        title: "Link kopiert",
        description: "Der Link wurde in die Zwischenablage kopiert.",
      })
    }
    setIsShareDialogOpen(false)
  }

  const handleExport = () => {
    // Implementation for export functionality
    toast({
      title: "Export gestartet",
      description: "Die Packliste wird exportiert...",
    })
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="animate-pulse">
          {/* Header Skeleton */}
          <div className="bg-white border-b px-4 py-6">
            <div className="flex items-center gap-4 mb-4">
              <div className="w-8 h-8 bg-gray-200 rounded"></div>
              <div className="w-48 h-6 bg-gray-200 rounded"></div>
            </div>
            <div className="w-32 h-4 bg-gray-200 rounded mb-2"></div>
            <div className="w-24 h-4 bg-gray-200 rounded"></div>
          </div>
          
          {/* Content Skeleton */}
          <div className="p-4 space-y-4">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="bg-white p-4 rounded-lg">
                <div className="w-full h-4 bg-gray-200 rounded mb-2"></div>
                <div className="w-3/4 h-4 bg-gray-200 rounded"></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  if (!event) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-semibold mb-2">Event nicht gefunden</h2>
          <p className="text-gray-600 mb-4">Das angeforderte Event konnte nicht geladen werden.</p>
          <Button onClick={() => router.push("/app/packliste")}>
            Zurück zur Übersicht
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b sticky top-0 z-40">
        <div className="px-4 py-4">
          {/* Top Row */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => router.push("/app/packliste")}
                className="shrink-0"
              >
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <div className="min-w-0">
                <h1 className="text-xl font-bold truncate">{event.name}</h1>
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Calendar className="h-4 w-4" />
                  <span>{event.date || "Kein Datum"}</span>
                </div>
              </div>
            </div>
            
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon">
                  <MoreVertical className="h-5 w-5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => setIsShareDialogOpen(true)}>
                  <Share2 className="h-4 w-4 mr-2" />
                  Teilen
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleExport}>
                  <Download className="h-4 w-4 mr-2" />
                  Exportieren
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleMarkAllPacked}>
                  <CheckCircle2 className="h-4 w-4 mr-2" />
                  Alle als gepackt markieren
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleMarkAllUnpacked}>
                  <Circle className="h-4 w-4 mr-2" />
                  Alle als ungepackt markieren
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* Progress Bar */}
          <div className="mb-4">
            <div className="flex items-center justify-between text-sm mb-2">
              <span className="font-medium">Fortschritt</span>
              <span className="text-gray-600">{stats.packed}/{stats.total} Items</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className="bg-green-500 h-2 rounded-full transition-all duration-300"
                style={{ width: `${stats.progress}%` }}
              />
            </div>
            <div className="flex justify-between text-xs text-gray-500 mt-1">
              <span>{stats.progress}% abgeschlossen</span>
              <span>{stats.unpacked} verbleibend</span>
            </div>
          </div>

          {/* Search and Filters */}
          <div className="space-y-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Items suchen..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            
            <div className="flex items-center gap-2 overflow-x-auto pb-2">
              <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                <SelectTrigger className="w-40 shrink-0">
                  <SelectValue placeholder="Kategorie" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Alle Kategorien</SelectItem>
                  {categories.map((category) => (
                    <SelectItem key={category.id} value={category.name}>
                      {category.symbol} {category.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={sortBy} onValueChange={(value: any) => setSortBy(value)}>
                <SelectTrigger className="w-32 shrink-0">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="name">Name</SelectItem>
                  <SelectItem value="category">Kategorie</SelectItem>
                  <SelectItem value="priority">Priorität</SelectItem>
                  <SelectItem value="status">Status</SelectItem>
                </SelectContent>
              </Select>

              <Button
                variant="outline"
                size="icon"
                onClick={() => setSortOrder(sortOrder === "asc" ? "desc" : "asc")}
                className="shrink-0"
              >
                {sortOrder === "asc" ? <SortAsc className="h-4 w-4" /> : <SortDesc className="h-4 w-4" />}
              </Button>

              <Button
                variant="outline"
                size="icon"
                onClick={() => setViewMode(viewMode === "list" ? "grid" : "list")}
                className="shrink-0"
              >
                {viewMode === "list" ? <Grid3X3 className="h-4 w-4" /> : <List className="h-4 w-4" />}
              </Button>

              <Button
                variant="outline"
                size="icon"
                onClick={() => setShowCompleted(!showCompleted)}
                className="shrink-0"
              >
                {showCompleted ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-4">
        {filteredItems.length === 0 ? (
          <div className="text-center py-12">
            <Package className="h-16 w-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              {searchQuery || selectedCategory !== "all" ? "Keine Items gefunden" : "Keine Items vorhanden"}
            </h3>
            <p className="text-gray-500 mb-6">
              {searchQuery || selectedCategory !== "all" 
                ? "Versuchen Sie andere Suchbegriffe oder Filter."
                : "Fügen Sie Items zu Ihrer Packliste hinzu."
              }
            </p>
            {(!searchQuery && selectedCategory === "all") && (
              <Button onClick={() => setIsAddDialogOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Erstes Item hinzufügen
              </Button>
            )}
          </div>
        ) : (
          <div className={cn(
            "space-y-3",
            viewMode === "grid" && "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 space-y-0"
          )}>
            {filteredItems.map((item) => (
              <Card 
                key={item.id} 
                className={cn(
                  "transition-all duration-200 hover:shadow-md",
                  item.packed && "opacity-75 bg-green-50 border-green-200"
                )}
              >
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    {/* Checkbox */}
                    <Checkbox
                      checked={item.packed}
                      onCheckedChange={() => handleTogglePacked(item.id)}
                      className="mt-1 shrink-0"
                    />

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <h3 className={cn(
                            "font-medium truncate",
                            item.packed && "line-through text-gray-500"
                          )}>
                            {item.name}
                          </h3>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-sm text-gray-600">
                              {item.quantity} {item.unit}
                            </span>
                            <Badge 
                              variant="outline" 
                              className={cn(
                                "text-xs",
                                CATEGORY_COLORS[item.category as keyof typeof CATEGORY_COLORS] || CATEGORY_COLORS.default
                              )}
                            >
                              {item.category}
                            </Badge>
                            <Badge 
                              variant="outline" 
                              className={cn(
                                "text-xs",
                                PRIORITY_COLORS[item.priority]
                              )}
                            >
                              {item.priority}
                            </Badge>
                          </div>
                          {item.notes && (
                            <p className="text-xs text-gray-500 mt-1 truncate">
                              {item.notes}
                            </p>
                          )}
                        </div>

                        {/* Actions */}
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => openEditDialog(item)}>
                              <Edit3 className="h-4 w-4 mr-2" />
                              Bearbeiten
                            </DropdownMenuItem>
                            <DropdownMenuItem 
                              onClick={() => openDeleteDialog(item)}
                              className="text-red-600"
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Löschen
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Floating Action Button */}
      <Button
        onClick={() => setIsAddDialogOpen(true)}
        className="fixed bottom-6 right-6 h-14 w-14 rounded-full shadow-lg z-50"
        size="icon"
      >
        <Plus className="h-6 w-6" />
      </Button>

      {/* Add Item Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Item hinzufügen</DialogTitle>
            <DialogDescription>
              Fügen Sie ein neues Item zu Ihrer Packliste hinzu.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Name</label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Item Name"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Anzahl</label>
                <Input
                  type="number"
                  min="1"
                  value={formData.quantity}
                  onChange={(e) => setFormData({ ...formData, quantity: parseInt(e.target.value) || 1 })}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Einheit</label>
                <Input
                  value={formData.unit}
                  onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                  placeholder="Stück"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Kategorie</label>
                <Select value={formData.category} onValueChange={(value) => setFormData({ ...formData, category: value })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Wählen..." />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((category) => (
                      <SelectItem key={category.id} value={category.name}>
                        {category.symbol} {category.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Priorität</label>
                <Select value={formData.priority} onValueChange={(value: any) => setFormData({ ...formData, priority: value })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Niedrig</SelectItem>
                    <SelectItem value="medium">Mittel</SelectItem>
                    <SelectItem value="high">Hoch</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Notizen (optional)</label>
              <Input
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="Zusätzliche Informationen..."
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
              Abbrechen
            </Button>
            <Button onClick={handleAddItem} disabled={!formData.name || !formData.category}>
              Hinzufügen
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Item Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Item bearbeiten</DialogTitle>
            <DialogDescription>
              Bearbeiten Sie die Details des Items.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Name</label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Item Name"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Anzahl</label>
                <Input
                  type="number"
                  min="1"
                  value={formData.quantity}
                  onChange={(e) => setFormData({ ...formData, quantity: parseInt(e.target.value) || 1 })}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Einheit</label>
                <Input
                  value={formData.unit}
                  onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                  placeholder="Stück"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Kategorie</label>
                <Select value={formData.category} onValueChange={(value) => setFormData({ ...formData, category: value })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Wählen..." />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((category) => (
                      <SelectItem key={category.id} value={category.name}>
                        {category.symbol} {category.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Priorität</label>
                <Select value={formData.priority} onValueChange={(value: any) => setFormData({ ...formData, priority: value })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Niedrig</SelectItem>
                    <SelectItem value="medium">Mittel</SelectItem>
                    <SelectItem value="high">Hoch</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Notizen (optional)</label>
              <Input
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="Zusätzliche Informationen..."
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
              Abbrechen
            </Button>
            <Button onClick={handleEditItem} disabled={!formData.name || !formData.category}>
              Speichern
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Item löschen</DialogTitle>
            <DialogDescription>
              Sind Sie sicher, dass Sie "{deletingItem?.name}" aus der Packliste entfernen möchten?
              Diese Aktion kann nicht rückgängig gemacht werden.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)}>
              Abbrechen
            </Button>
            <Button variant="destructive" onClick={handleDeleteItem}>
              Löschen
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Share Dialog */}
      <Dialog open={isShareDialogOpen} onOpenChange={setIsShareDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Packliste teilen</DialogTitle>
            <DialogDescription>
              Teilen Sie diese Packliste mit anderen.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <p className="text-sm text-gray-600 mb-4">
              Fortschritt: {stats.packed}/{stats.total} Items gepackt ({stats.progress}%)
            </p>
            <div className="flex gap-2">
              <Button onClick={handleShare} className="flex-1">
                <Share2 className="h-4 w-4 mr-2" />
                Teilen
              </Button>
              <Button variant="outline" onClick={handleExport}>
                <Download className="h-4 w-4 mr-2" />
                Exportieren
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}