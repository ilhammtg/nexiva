export interface Invoice {
  id: string
  invoice_number: string
  registration_id: string
  period: string
  amount: number
  tax_amount: number
  due_date: string
  status: 'unpaid' | 'paid' | 'overdue'
  paid_at?: string | null
  payment_bank?: string | null
  payment_confirmed_at?: string | null
  payment_confirmed_by?: string | null
  created_at: string
  updated_at: string

  // Joined fields
  customer_number?: string | null
  customer_name?: string | null
  phone?: string | null
  package_name?: string | null
  package_speed?: number | null
}
