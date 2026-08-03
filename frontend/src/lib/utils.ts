import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
  }).format(amount)
}

export function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return '-'
  return new Intl.DateTimeFormat('id-ID', {
    day: '2-digit', month: 'short', year: 'numeric',
  }).format(new Date(dateStr))
}

export function formatDateTime(dateStr: string | null | undefined): string {
  if (!dateStr) return '-'
  return new Intl.DateTimeFormat('id-ID', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  }).format(new Date(dateStr))
}

export const STATUS_LABEL: Record<string, string> = {
  pending_review: 'Pending Review',
  survey_scheduled: 'Survey Dijadwalkan',
  survey_done: 'Survey Selesai',
  survey_failed: 'Survey Gagal',
  survey_pending: 'Survey Pending',
  rejected: 'Ditolak',
  waiting_payment: 'Menunggu Pembayaran',
  payment_confirmed: 'Pembayaran Dikonfirmasi',
  installation_scheduled: 'Jadwal Instalasi',
  provisioning: 'Provisioning',
  provisioning_failed: 'Provisioning Gagal',
  active: 'Aktif',
}

export const STATUS_COLOR: Record<string, string> = {
  pending_review: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  survey_scheduled: 'bg-blue-100 text-blue-800 border-blue-200',
  survey_done: 'bg-indigo-100 text-indigo-800 border-indigo-200',
  survey_failed: 'bg-red-100 text-red-800 border-red-200',
  survey_pending: 'bg-amber-100 text-amber-800 border-amber-200',
  rejected: 'bg-red-100 text-red-800 border-red-200',
  waiting_payment: 'bg-orange-100 text-orange-800 border-orange-200',
  payment_confirmed: 'bg-cyan-100 text-cyan-800 border-cyan-200',
  installation_scheduled: 'bg-purple-100 text-purple-800 border-purple-200',
  provisioning: 'bg-violet-100 text-violet-800 border-violet-200',
  provisioning_failed: 'bg-red-100 text-red-800 border-red-200',
  active: 'bg-green-100 text-green-800 border-green-200',
}
