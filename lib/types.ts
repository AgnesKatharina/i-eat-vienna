export interface Event {
  id: number
  name: string
  type: string
  date: string | null
  end_date: string | null
  ft: string | null
  ka: string | null
  print: boolean
  finished: boolean
  created_at: string
}

export interface Product {
  id: number
  name: string
  category: string
  unit: string
  price?: number
  supplier?: string
  notes?: string
  created_at: string
  updated_at: string
}

export interface PacklisteItem {
  id: number
  event_id: number
  product_id: number
  quantity: number
  unit: string
  notes?: string
  created_at: string
  updated_at: string
  product?: Product
}

export interface Nachbestellung {
  id: number
  event_id: number
  product_name: string
  quantity: number
  unit: string
  priority: "low" | "medium" | "high"
  status: "pending" | "ordered" | "delivered" | "cancelled"
  notes?: string
  requested_by: string
  requested_at: string
  ordered_at?: string
  delivered_at?: string
  created_at: string
  updated_at: string
  event?: Event
}

export interface NachbestellungNotification {
  id: number
  nachbestellung_id: number
  user_id: string
  type: "new_request" | "status_change" | "urgent"
  title: string
  message: string
  read: boolean
  created_at: string
  nachbestellung?: Nachbestellung
}
