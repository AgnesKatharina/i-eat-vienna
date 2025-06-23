"use client"

import { useState, useEffect } from "react"
import { supabase } from "@/lib/supabase-client"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

export function SupabaseTest() {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [stats, setStats] = useState({
    categories: 0,
    products: 0,
    recipes: 0,
    packagingUnits: 0,
  })
  const [activeTab, setActiveTab] = useState("overview")
  const [categoryData, setCategoryData] = useState([])
  const [productData, setProductData] = useState([])
  const [recipeData, setRecipeData] = useState([])
  const [packagingData, setPackagingData] = useState([])

  useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true)

        // Fetch counts
        const [
          { count: categoriesCount },
          { count: productsCount },
          { count: recipesCount },
          { count: packagingCount },
        ] = await Promise.all([
          supabase.from("categories").select("*", { count: "exact", head: true }),
          supabase.from("products").select("*", { count: "exact", head: true }),
          supabase.from("recipes").select("*", { count: "exact", head: true }),
          supabase.from("packaging_units").select("*", { count: "exact", head: true }),
        ])

        setStats({
          categories: categoriesCount || 0,
          products: productsCount || 0,
          recipes: recipesCount || 0,
          packagingUnits: packagingCount || 0,
        })

        // Fetch sample data
        const { data: categoryData } = await supabase.from("categories").select("*").limit(10)

        const { data: productData } = await supabase
          .from("products")
          .select(`
            *,
            category:categories(id, name, symbol)
          `)
          .limit(10)

        const { data: recipeData } = await supabase
          .from("recipes")
          .select(`
            *,
            product:products!recipes_product_id_fkey(id, name),
            ingredient:products!recipes_ingredient_id_fkey(id, name)
          `)
          .limit(10)

        const { data: packagingData } = await supabase
          .from("packaging_units")
          .select(`
            *,
            product:products(id, name)
          `)
          .limit(10)

        setCategoryData(categoryData || [])
        setProductData(productData || [])
        setRecipeData(recipeData || [])
        setPackagingData(packagingData || [])
      } catch (err) {
        console.error("Error fetching data:", err)
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [])

  return (
    <Card>
      <CardHeader>
        <CardTitle>Supabase Connection Test</CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex items-center justify-center p-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
            <span className="ml-2">Loading data from Supabase...</span>
          </div>
        ) : error ? (
          <div className="text-red-500 p-4 bg-red-50 rounded-lg">
            <p className="font-bold">Error connecting to Supabase:</p>
            <p>{error}</p>
          </div>
        ) : (
          <div>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
              <div className="bg-blue-50 p-4 rounded-lg">
                <h3 className="font-bold text-lg">{stats.categories}</h3>
                <p>Categories</p>
              </div>
              <div className="bg-green-50 p-4 rounded-lg">
                <h3 className="font-bold text-lg">{stats.products}</h3>
                <p>Products</p>
              </div>
              <div className="bg-amber-50 p-4 rounded-lg">
                <h3 className="font-bold text-lg">{stats.recipes}</h3>
                <p>Recipes</p>
              </div>
              <div className="bg-purple-50 p-4 rounded-lg">
                <h3 className="font-bold text-lg">{stats.packagingUnits}</h3>
                <p>Packaging Units</p>
              </div>
            </div>

            {stats.categories === 0 && stats.products === 0 && stats.recipes === 0 && stats.packagingUnits === 0 ? (
              <div className="bg-yellow-50 p-4 rounded-lg mb-6">
                <p className="font-bold">No data found in your Supabase database.</p>
                <p>Please run the data migration tool to populate your database.</p>
              </div>
            ) : (
              <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList className="mb-4">
                  <TabsTrigger value="overview">Overview</TabsTrigger>
                  <TabsTrigger value="categories">Categories</TabsTrigger>
                  <TabsTrigger value="products">Products</TabsTrigger>
                  <TabsTrigger value="recipes">Recipes</TabsTrigger>
                  <TabsTrigger value="packaging">Packaging</TabsTrigger>
                </TabsList>

                <TabsContent value="overview">
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <p className="text-green-600 font-bold mb-4">✅ Successfully connected to Supabase!</p>
                    <p>Your database contains:</p>
                    <ul className="list-disc pl-5 mt-2">
                      <li>{stats.categories} categories</li>
                      <li>{stats.products} products</li>
                      <li>{stats.recipes} recipes</li>
                      <li>{stats.packagingUnits} packaging units</li>
                    </ul>
                    <p className="mt-4">Select a tab above to view sample data.</p>
                  </div>
                </TabsContent>

                <TabsContent value="categories">
                  <div className="border rounded-lg overflow-hidden">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            ID
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Symbol
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Name
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {categoryData.map((category) => (
                          <tr key={category.id}>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{category.id}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm">{category.symbol}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm">{category.name}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  {categoryData.length === 0 && <p className="text-center py-4 text-gray-500">No categories found</p>}
                </TabsContent>

                <TabsContent value="products">
                  <div className="border rounded-lg overflow-hidden">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            ID
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Name
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Category
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Unit
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {productData.map((product) => (
                          <tr key={product.id}>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{product.id}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm">{product.name}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm">
                              {product.category ? (
                                <span>
                                  {product.category.symbol} {product.category.name}
                                </span>
                              ) : (
                                <span className="text-gray-400">No category</span>
                              )}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm">{product.unit}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  {productData.length === 0 && <p className="text-center py-4 text-gray-500">No products found</p>}
                </TabsContent>

                <TabsContent value="recipes">
                  <div className="border rounded-lg overflow-hidden">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            ID
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Product
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Ingredient
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Amount
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Unit
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {recipeData.map((recipe) => (
                          <tr key={recipe.id}>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{recipe.id}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm">{recipe.product?.name || "Unknown"}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm">
                              {recipe.ingredient?.name || "Unknown"}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm">{recipe.amount}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm">{recipe.unit}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  {recipeData.length === 0 && <p className="text-center py-4 text-gray-500">No recipes found</p>}
                </TabsContent>

                <TabsContent value="packaging">
                  <div className="border rounded-lg overflow-hidden">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            ID
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Product
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Amount Per Package
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Packaging Unit
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {packagingData.map((packaging) => (
                          <tr key={packaging.id}>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{packaging.id}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm">
                              {packaging.product?.name || "Unknown"}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm">{packaging.amount_per_package}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm">{packaging.packaging_unit}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  {packagingData.length === 0 && (
                    <p className="text-center py-4 text-gray-500">No packaging units found</p>
                  )}
                </TabsContent>
              </Tabs>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
