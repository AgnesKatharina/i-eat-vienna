"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { ArrowLeft } from "lucide-react"
import { CategoryManager } from "@/components/category-manager"
import { ProductManager } from "@/components/product-manager"
import { RecipeManager } from "@/components/recipe-manager"
import { PackagingManager } from "@/components/packaging-manager"
import { EquipmentManager } from "@/components/equipment-manager"

export function ProductManagementDashboard() {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState("categories")
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Simulate loading
    const timer = setTimeout(() => {
      setLoading(false)
    }, 500)
    return () => clearTimeout(timer)
  }, [])

  return (
    <div className="container mx-auto space-y-6">
      <div className="flex items-center justify-between mb-6">
        <Button variant="outline" onClick={() => router.push("/")} className="flex items-center gap-2">
          <ArrowLeft className="h-4 w-4" />
          Zurück zum Menü
        </Button>
        <h1 className="text-2xl font-bold">Produkte Verwalten</h1>
      </div>

      <div className="bg-white rounded-lg shadow-md p-6">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid grid-cols-5 mb-8">
            <TabsTrigger value="categories">Kategorien</TabsTrigger>
            <TabsTrigger value="products">Produkte</TabsTrigger>
            <TabsTrigger value="recipes">Rezepte</TabsTrigger>
            <TabsTrigger value="packaging">Verpackungen</TabsTrigger>
            <TabsTrigger value="equipment">Foodtruck Equipment</TabsTrigger>
          </TabsList>

          <TabsContent value="categories" className="space-y-4">
            {loading ? (
              <div className="flex justify-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900"></div>
              </div>
            ) : (
              <CategoryManager />
            )}
          </TabsContent>

          <TabsContent value="products" className="space-y-4">
            {loading ? (
              <div className="flex justify-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900"></div>
              </div>
            ) : (
              <ProductManager />
            )}
          </TabsContent>

          <TabsContent value="recipes" className="space-y-4">
            {loading ? (
              <div className="flex justify-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900"></div>
              </div>
            ) : (
              <RecipeManager />
            )}
          </TabsContent>

          <TabsContent value="packaging" className="space-y-4">
            {loading ? (
              <div className="flex justify-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900"></div>
              </div>
            ) : (
              <PackagingManager />
            )}
          </TabsContent>

          <TabsContent value="equipment" className="space-y-4">
            {loading ? (
              <div className="flex justify-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900"></div>
              </div>
            ) : (
              <EquipmentManager />
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
