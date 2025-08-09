export interface Product {
  id: number
  name: string
  unit: string
  category?: string
  food_type?: string
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

export interface Event {
  id: string
  name: string
  type: string
  date?: string
  end_date?: string
  ft?: string
  ka?: string
  notes?: string
  print?: boolean
  finished?: boolean
  created_at?: string
  updated_at?: string
}

export interface EventDetails {
  id?: string
  type: string
  name: string
  ft?: string
  ka?: string
  date?: string
  endDate?: string
  supplierName?: string
  notes?: string
}

export interface Recipe {
  id: number
  product_id: number
  ingredient_id: number
  amount: number
}

export interface RecipeIngredient {
  ingredientName: string
  amount: number
  unit: string
}

export interface Nachbestellung {
  id: string
  name: string
  supplier_name: string
  date?: string
  notes?: string
  created_at?: string
  updated_at?: string
}

export interface UserPreferences {
  id: string
  userId: string
  defaultEventType?: string
  defaultFt?: string
  defaultKa?: string
  favoriteSuppliers?: string[]
  createdAt?: string
  updatedAt?: string
}

export interface Category {
  id: number
  name: string
}

export interface Supplier {
  id: string
  name: string
  contact?: string
  email?: string
  phone?: string
  address?: string
  notes?: string
  isActive: boolean
  createdAt?: string
  updatedAt?: string
}

// Database table types for Supabase
export interface Database {
  public: {
    Tables: {
      products: {
        Row: Product
        Insert: Omit<Product, "id" | "createdAt" | "updatedAt">
        Update: Partial<Omit<Product, "id" | "createdAt" | "updatedAt">>
      }
      events: {
        Row: Event
        Insert: Omit<Event, "id" | "createdAt" | "updatedAt">
        Update: Partial<Omit<Event, "id" | "createdAt" | "updatedAt">>
      }
      recipes: {
        Row: Recipe
        Insert: Omit<Recipe, "id" | "createdAt" | "updatedAt">
        Update: Partial<Omit<Recipe, "id" | "createdAt" | "updatedAt">>
      }
      nachbestellungen: {
        Row: Nachbestellung
        Insert: Omit<Nachbestellung, "id" | "createdAt" | "updatedAt">
        Update: Partial<Omit<Nachbestellung, "id" | "createdAt" | "updatedAt">>
      }
      user_preferences: {
        Row: UserPreferences
        Insert: Omit<UserPreferences, "id" | "createdAt" | "updatedAt">
        Update: Partial<Omit<UserPreferences, "id" | "createdAt" | "updatedAt">>
      }
      categories: {
        Row: Category
        Insert: Omit<Category, "id" | "createdAt" | "updatedAt">
        Update: Partial<Omit<Category, "id" | "createdAt" | "updatedAt">>
      }
      suppliers: {
        Row: Supplier
        Insert: Omit<Supplier, "id" | "createdAt" | "updatedAt">
        Update: Partial<Omit<Supplier, "id" | "createdAt" | "updatedAt">>
      }
      packaging_units: {
        Row: PackagingUnit
        Insert: Omit<PackagingUnit, "id">
        Update: Partial<Omit<PackagingUnit, "id">>
      }
      event_products: {
        Row: EventProduct
        Insert: Omit<EventProduct, "id">
        Update: Partial<Omit<EventProduct, "id">>
      }
      nachbestellung_items: {
        Row: NachbestellungItem
        Insert: Omit<NachbestellungItem, "id">
        Update: Partial<Omit<NachbestellungItem, "id">>
      }
    }
  }
}

// Utility types
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type ProductWithCategory = Product & {
  category: Category
}

export type EventWithProducts = Event & {
  productCount?: number
  ingredientCount?: number
}

export type NachbestellungWithEvent = Nachbestellung & {
  event?: Event
}

// Form types
export interface ProductFormData {
  name: string
  category: string
  unit: string
  packaging: string
  amountPerPackage: number
  supplier?: string
  price?: number
  notes?: string
  isActive: boolean
}

export interface EventFormData {
  name: string
  type: string
  date?: string
  endDate?: string
  ft?: string
  ka?: string
  notes?: string
}

export interface RecipeFormData {
  name: string
  category: string
  servings: number
  ingredients: RecipeIngredient[]
  instructions?: string
  notes?: string
  isActive: boolean
}

// API Response types
export interface ApiResponse<T> {
  data?: T
  error?: string
  message?: string
}

export interface PaginatedResponse<T> {
  data: T[]
  count: number
  page: number
  pageSize: number
  totalPages: number
}

// Filter and search types
export interface ProductFilter {
  category?: string
  supplier?: string
  isActive?: boolean
  search?: string
}

export interface EventFilter {
  type?: string
  dateFrom?: string
  dateTo?: string
  search?: string
}

export interface RecipeFilter {
  category?: string
  isActive?: boolean
  search?: string
}

// Export/Import types
export interface ExportData {
  products?: Product[]
  events?: Event[]
  recipes?: Recipe[]
  categories?: Category[]
  suppliers?: Supplier[]
  exportDate: string
  version: string
}

export interface ImportResult {
  success: boolean
  imported: number
  skipped: number
  errors: string[]
}

// Chart and analytics types
export interface EventStats {
  totalEvents: number
  eventsByType: Record<string, number>
  eventsByMonth: Record<string, number>
  mostUsedProducts: Array<{ name: string; count: number }>
}

export interface ProductStats {
  totalProducts: number
  productsByCategory: Record<string, number>
  productsBySupplier: Record<string, number>
  averagePrice: number
}

// Notification types
export interface Notification {
  id: string
  type: "info" | "success" | "warning" | "error"
  title: string
  message: string
  timestamp: string
  read: boolean
}

// User and auth types
export interface User {
  id: string
  email: string
  name?: string
  avatar?: string
  role: "admin" | "user"
  createdAt: string
  updatedAt: string
}

export interface AuthState {
  user: User | null
  loading: boolean
  error: string | null
}

// Theme and UI types
export interface ThemeConfig {
  mode: "light" | "dark" | "system"
  primaryColor: string
  fontSize: "small" | "medium" | "large"
}

export interface UIState {
  sidebarOpen: boolean
  theme: ThemeConfig
  notifications: Notification[]
}

export interface PackagingUnit {
  id: number
  product_id: number
  amount_per_package: number
  packaging_unit: string
}

export interface EventProduct {
  id: number
  event_id: string
  product_name: string
  quantity: number
  unit: string
}

export interface NachbestellungItem {
  id: number
  nachbestellung_id: string
  product_name: string
  quantity: number
  unit: string
  is_packed?: boolean
}
