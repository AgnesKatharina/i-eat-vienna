import { Skeleton } from "@/components/ui/skeleton"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"

export function PacklisteSkeleton() {
  return (
    <div className="container mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <Skeleton className="h-10 w-32" />
        <Skeleton className="h-8 w-48" />
        <div className="flex gap-2">
          <Skeleton className="h-10 w-24" />
          <Skeleton className="h-10 w-24" />
          <Skeleton className="h-10 w-24" />
        </div>
      </div>

      {/* Event Information */}
      <div className="bg-white p-4 rounded-lg shadow-sm">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i}>
              <Skeleton className="h-4 w-16 mb-1" />
              <Skeleton className="h-5 w-24" />
            </div>
          ))}
        </div>
      </div>

      {/* Category Tabs */}
      <Tabs value="Essen" className="w-full">
        <TabsList className="flex flex-wrap h-auto">
          {["Essen", "Getränke Pet", "Getränke Glas", "Getränke Spezial", "Equipment", "Kassa"].map((category) => (
            <TabsTrigger key={category} value={category} className="flex-grow">
              <span className="mr-2">📦</span>
              {category}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      {/* Search Bar */}
      <Skeleton className="h-10 w-full" />

      {/* Products Grid Skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[...Array(12)].map((_, i) => (
          <div key={i} className="flex items-center justify-between p-3 border rounded-md">
            <div className="flex-1">
              <Skeleton className="h-5 w-24 mb-1" />
              <Skeleton className="h-4 w-16" />
            </div>
            <div className="flex items-center gap-2">
              <Skeleton className="h-8 w-8 rounded" />
              <Skeleton className="h-8 w-10 rounded" />
              <Skeleton className="h-8 w-8 rounded" />
            </div>
          </div>
        ))}
      </div>

      {/* Two-column layout skeleton */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-8">
        {/* Selected Products Skeleton */}
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-40" />
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="flex items-center space-x-3 p-2 border rounded-md">
                  <div className="flex items-center gap-2">
                    <Skeleton className="h-7 w-7 rounded" />
                    <Skeleton className="h-7 w-8 rounded" />
                    <Skeleton className="h-7 w-7 rounded" />
                  </div>
                  <Skeleton className="h-5 flex-1" />
                  <Skeleton className="h-4 w-16" />
                  <Skeleton className="h-7 w-7 rounded" />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Ingredients Skeleton */}
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-32" />
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left p-2">
                      <Skeleton className="h-4 w-16" />
                    </th>
                    <th className="text-left p-2">
                      <Skeleton className="h-4 w-24" />
                    </th>
                    <th className="text-left p-2">
                      <Skeleton className="h-4 w-20" />
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {[...Array(8)].map((_, i) => (
                    <tr key={i} className="border-b">
                      <td className="p-2">
                        <Skeleton className="h-4 w-20" />
                      </td>
                      <td className="p-2">
                        <Skeleton className="h-4 w-16" />
                      </td>
                      <td className="p-2">
                        <Skeleton className="h-4 w-24" />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
