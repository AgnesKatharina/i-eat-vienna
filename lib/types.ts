export interface Event {
  id: number
  name: string
  type: string
  date: string | null
  end_date: string | null
  ft: string | null
  ka: string | null
  created_at: string
  updated_at: string
  print?: boolean
  finished?: boolean
}

export interface EventDetails {
  type: string
  name: string
  ft: string
  ka: string
  date: string
  supplierName: string
}

export interface SelectedProduct {
  quantity: number
  unit: string
}

export interface CalculatedIngredient {
  totalAmount: number
  unit: string
  packaging: string
  amountPerPackage: number
  packagingCount: number
}

export interface ProductWithCategory {
  id: number
  name: string
  unit: string
  category: {
    id: number
    name: string
  } | null
}
