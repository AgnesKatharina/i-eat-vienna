export interface Event {
  id: number
  name: string
  type: string
  date: string | null
  ft: string | null
  ka: string | null
  created_at: string
  is_ready_for_print?: boolean
}
