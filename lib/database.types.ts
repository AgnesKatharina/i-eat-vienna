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
}

export interface EventProduct {
  id: number
  event_id: number
  product_id: number
  quantity: number
  unit: string
  created_at: string
  updated_at: string
  product?: {
    id: number
    name: string
    unit: string
    category?: {
      name: string
    }
  }
}

export interface EventIngredient {
  product_id: number
  product_name: string
  ingredient_id: number
  ingredient_name: string
  ingredient_unit: string
  quantity_needed: number
  original_recipe_quantity: number
  event_product_quantity: number
  used_in_products: Array<{
    product_name: string
    quantity: number
  }>
}
