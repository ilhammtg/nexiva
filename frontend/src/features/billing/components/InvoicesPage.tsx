import { useState } from 'react'
import { createPortal } from 'react-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { 
  Search, DollarSign, CheckCircle2, Clock, 
  Send, FileText, ExternalLink, Calendar, ShieldAlert,
  Loader2, ChevronLeft, ChevronRight, X, Printer
} from 'lucide-react'
import { billingApi } from '../api/billingApi'
import { formatCurrency, formatDate } from '@/lib/utils'
import { toast } from 'sonner'
import ReceiptModal from './ReceiptModal'
import type { Invoice } from '../types'

export default function InvoicesPage() {
  const qc = useQueryClient()
  const [page, setPage] = useState(1)
  const [limit] = useState(10)
  const [statusFilter, setStatusFilter] = useState<'all' | 'unpaid' | 'paid' | 'overdue'>('all')
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  
  // Payment confirmation modal state
  const [selectedInvoiceId, setSelectedInvoiceId] = useState<string | null>(null)
  const [confirmBank, setConfirmBank] = useState('BCA')
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false)

  // Receipt print modal state
  const [receiptInvoice, setReceiptInvoice] = useState<Invoice | null>(null)

  // Fetch invoices query
  const { data, isLoading } = useQuery({
    queryKey: ['invoices', page, statusFilter, debouncedSearch],
    queryFn: () => billingApi.listInvoices({
      page,
      limit,
      status: statusFilter === 'all' ? '' : statusFilter,
      search: debouncedSearch,
    }),
  })

  // Confirm payment mutation
  const confirmPaymentMut = useMutation({
    mutationFn: ({ id, bank }: { id: string; bank: string }) => billingApi.confirmPayment(id, bank),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['invoices'] })
      toast.success('Pembayaran invoice berhasil dikonfirmasi!')
      setIsConfirmModalOpen(false)
      setSelectedInvoiceId(null)
    },
    onError: (err: any) => {
      const errMsg = err?.response?.data?.error?.message || 'Gagal mengkonfirmasi pembayaran'
      toast.error(errMsg)
    }
  })

  // Resend notification mutation
  const resendNotifMut = useMutation({
    mutationFn: (id: string) => billingApi.resendNotification(id),
    onSuccess: () => {
      toast.success('Notifikasi invoice berhasil dikirim ulang via WhatsApp!')
    },
    onError: (err: any) => {
      const errMsg = err?.response?.data?.error?.message || 'Gagal mengirim ulang notifikasi'
      toast.error(errMsg)
    }
  })

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setDebouncedSearch(search)
    setPage(1)
  }

  const handleClearSearch = () => {
    setSearch('')
    setDebouncedSearch('')
    setPage(1)
  }

  const handleOpenConfirmModal = (id: string) => {
    setSelectedInvoiceId(id)
    setConfirmBank('BCA')
    setIsConfirmModalOpen(true)
  }

  const handleConfirmPayment = () => {
    if (!selectedInvoiceId) return
    confirmPaymentMut.mutate({ id: selectedInvoiceId, bank: confirmBank })
  }

  const handleResendNotif = (id: string) => {
    resendNotifMut.mutate(id)
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'paid':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/20">
            <CheckCircle2 className="w-3.5 h-3.5" /> Lunas
          </span>
        )
      case 'overdue':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-50 dark:bg-rose-500/10 text-rose-700 dark:text-rose-450 border border-rose-200 dark:border-rose-500/20">
            <ShieldAlert className="w-3.5 h-3.5" /> Isolir (Overdue)
          </span>
        )
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-500/20">
            <Clock className="w-3.5 h-3.5" /> Belum Bayar
          </span>
        )
    }
  }

  const formatPeriod = (dateStr: string) => {
    if (!dateStr) return '-'
    const d = new Date(dateStr)
    return d.toLocaleString('id-ID', { month: 'long', year: 'numeric' })
  }

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header Summary */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white dark:bg-zinc-900 p-6 rounded-2xl border border-gray-150 dark:border-zinc-800 shadow-sm">
        <div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-zinc-50 flex items-center gap-2">
            <DollarSign className="w-5 h-5 text-blue-600 dark:text-blue-500" />
            Manajemen Tagihan Bulanan
          </h2>
          <p className="text-xs text-gray-500 dark:text-zinc-400 mt-1">
            Pantau pembayaran invoice pelanggan, kelola status penangguhan (isolir), dan konfirmasi pembayaran manual.
          </p>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-4 bg-white dark:bg-zinc-900 p-4 rounded-xl border border-gray-150 dark:border-zinc-800">
        {/* Status Filter Tabs */}
        <div className="flex flex-wrap items-center gap-1.5 w-full md:w-auto">
          {(['all', 'unpaid', 'paid', 'overdue'] as const).map((status) => (
            <button
              key={status}
              onClick={() => {
                setStatusFilter(status)
                setPage(1)
              }}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold capitalize transition-all border ${
                statusFilter === status
                  ? 'bg-blue-600 border-blue-600 text-white shadow-sm'
                  : 'bg-gray-50 dark:bg-zinc-950 border-gray-200 dark:border-zinc-800 text-gray-600 dark:text-zinc-400 hover:bg-gray-100 dark:hover:bg-zinc-850'
              }`}
            >
              {status === 'all' ? 'Semua' : status === 'unpaid' ? 'Belum Bayar' : status === 'paid' ? 'Lunas' : 'Isolir / Overdue'}
            </button>
          ))}
        </div>

        {/* Search Input Form */}
        <form onSubmit={handleSearchSubmit} className="flex items-center gap-2 w-full md:w-80">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Cari nama, no reg, no invoice..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-8 py-2 rounded-lg bg-gray-50 dark:bg-zinc-950 border border-gray-200 dark:border-zinc-800 text-gray-900 dark:text-zinc-100 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
            />
            {search && (
              <button
                type="button"
                onClick={handleClearSearch}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 p-0.5 rounded-full hover:bg-gray-200 dark:hover:bg-zinc-800 text-gray-400 hover:text-gray-600"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>
          <button
            type="submit"
            className="px-3.5 py-2 rounded-lg bg-gray-100 dark:bg-zinc-800 hover:bg-gray-200 dark:hover:bg-zinc-700 text-gray-700 dark:text-zinc-200 text-xs font-semibold transition-all border border-gray-200 dark:border-zinc-750"
          >
            Cari
          </button>
        </form>
      </div>

      {/* Main Content Table */}
      <div className="bg-white dark:bg-zinc-900 rounded-xl border border-gray-150 dark:border-zinc-800 overflow-hidden shadow-sm">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
            <p className="text-xs text-gray-500 dark:text-zinc-400">Memuat data invoice...</p>
          </div>
        ) : !data?.data || data.data.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-12 h-12 rounded-full bg-gray-50 dark:bg-zinc-950 flex items-center justify-center border border-gray-200 dark:border-zinc-800 text-gray-400 mb-4">
              <FileText className="w-6 h-6" />
            </div>
            <h3 className="font-semibold text-sm text-gray-900 dark:text-zinc-100">Tidak ada data invoice</h3>
            <p className="text-xs text-gray-500 dark:text-zinc-400 mt-1 max-w-sm">
              Tidak ada data invoice yang sesuai dengan filter atau kata kunci pencarian Anda.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50/50 dark:bg-zinc-950/40 border-b border-gray-150 dark:border-zinc-850 text-[10px] font-bold text-gray-500 dark:text-zinc-400 uppercase tracking-wider">
                  <th className="px-4 py-3">No. Invoice</th>
                  <th className="px-4 py-3">Periode / Jatuh Tempo</th>
                  <th className="px-4 py-3">Pelanggan</th>
                  <th className="px-4 py-3">No. HP</th>
                  <th className="px-4 py-3 text-right">Total Tagihan</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-center">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-150 dark:divide-zinc-850 text-xs font-medium text-gray-700 dark:text-zinc-300">
                {data.data.map((inv) => (
                  <tr key={inv.id} className="hover:bg-gray-50/50 dark:hover:bg-zinc-850/20 transition-all">
                    <td className="px-4 py-3 font-mono font-bold text-gray-900 dark:text-zinc-100 text-xs">
                      {inv.invoice_number}
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-semibold text-gray-950 dark:text-zinc-200">
                        {formatPeriod(inv.period)}
                      </div>
                      <div className="text-[10px] text-gray-500 dark:text-zinc-400 flex items-center gap-1 mt-0.5">
                        <Calendar className="w-3 h-3 flex-shrink-0" /> Due: {formatDate(inv.due_date)}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-semibold text-gray-950 dark:text-zinc-200">
                        {inv.customer_name || '-'}
                      </div>
                      <div className="text-[10px] text-gray-500 dark:text-zinc-400 font-mono mt-0.5">
                        {inv.customer_number || '-'}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-xs text-gray-700 dark:text-zinc-300 font-mono">
                        {inv.phone || '-'}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right font-mono font-bold text-gray-900 dark:text-zinc-100">
                      {formatCurrency(inv.amount + inv.tax_amount)}
                      <div className="text-[10px] text-gray-400 font-normal mt-0.5">
                        Tax: {formatCurrency(inv.tax_amount)}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      {getStatusBadge(inv.status)}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-center gap-1.5">
                        {/* Customer Bill View Link */}
                        <a
                          href={`/billing-invoice/${inv.id}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-1.5 rounded-lg bg-gray-50 dark:bg-zinc-950 hover:bg-gray-100 dark:hover:bg-zinc-800 border border-gray-200 dark:border-zinc-800 text-gray-500 hover:text-gray-900 dark:hover:text-white transition-colors"
                          title="Buka Halaman Invoice Pelanggan"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                        </a>

                        {/* Print Receipt button — only for paid invoices */}
                        {inv.status === 'paid' && (
                          <button
                            onClick={() => setReceiptInvoice(inv)}
                            className="p-1.5 rounded-lg bg-blue-50 dark:bg-blue-950/30 hover:bg-blue-100 dark:hover:bg-blue-900/30 border border-blue-200 dark:border-blue-800/40 text-blue-600 dark:text-blue-400 transition-colors"
                            title="Cetak Struk Pembayaran"
                          >
                            <Printer className="w-3.5 h-3.5" />
                          </button>
                        )}

                        {inv.status !== 'paid' && (
                          <>
                            {/* Confirm Payment button */}
                            <button
                              onClick={() => handleOpenConfirmModal(inv.id)}
                              className="px-2.5 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs shadow-sm transition-all flex items-center gap-1"
                              title="Konfirmasi Pembayaran Manual"
                            >
                              Konfirmasi
                            </button>

                            {/* Resend WhatsApp button */}
                            <button
                              onClick={() => handleResendNotif(inv.id)}
                              disabled={resendNotifMut.isPending}
                              className="p-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/20 hover:bg-emerald-100 dark:hover:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-900/30 text-emerald-600 dark:text-emerald-450 transition-colors disabled:opacity-50"
                              title="Kirim Ulang Invoice via WhatsApp"
                            >
                              {resendNotifMut.isPending && selectedInvoiceId === inv.id ? (
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              ) : (
                                <Send className="w-3.5 h-3.5" />
                              )}
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination controls */}
        {data?.meta && data.meta.total_pages > 1 && (
          <div className="px-5 py-4 bg-gray-50/50 dark:bg-zinc-950/30 border-t border-gray-150 dark:border-zinc-850 flex items-center justify-between">
            <span className="text-xs text-gray-500 dark:text-zinc-400">
              Menampilkan {data.data.length} dari {data.meta.total} tagihan
            </span>
            <div className="flex items-center gap-2">
              <button
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="p-1.5 rounded-lg bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 hover:bg-gray-100 dark:hover:bg-zinc-800 text-gray-600 dark:text-zinc-350 disabled:opacity-50 transition-all"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="text-xs font-semibold text-gray-700 dark:text-zinc-300">
                Halaman {page} dari {data.meta.total_pages}
              </span>
              <button
                disabled={page >= data.meta.total_pages}
                onClick={() => setPage((p) => p + 1)}
                className="p-1.5 rounded-lg bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 hover:bg-gray-100 dark:hover:bg-zinc-800 text-gray-600 dark:text-zinc-350 disabled:opacity-50 transition-all"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Confirmation Payment Modal */}
      {isConfirmModalOpen && createPortal(
        <div className="fixed inset-0 bg-black/45 backdrop-blur-sm z-[9999] flex items-center justify-center p-4">
          <div className="bg-white dark:bg-zinc-900 border border-gray-205 dark:border-zinc-800 rounded-lg shadow-2xl w-full max-w-md animate-in fade-in zoom-in-95 duration-150">
            <div className="px-6 py-4 border-b border-gray-150 dark:border-zinc-850 flex items-center justify-between bg-gray-50/50 dark:bg-zinc-950/40">
              <h3 className="font-bold text-sm text-gray-900 dark:text-zinc-100">Konfirmasi Pembayaran</h3>
              <button 
                onClick={() => setIsConfirmModalOpen(false)}
                className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-zinc-800 text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            
            <div className="p-6 space-y-4">
              <p className="text-xs text-gray-500 dark:text-zinc-400">
                Tindakan ini akan menandai invoice sebagai <strong className="text-emerald-600 dark:text-emerald-450">LUNAS</strong>, mencatat bank penerima pembayaran, memperbarui status pelanggan kembali ke <strong className="text-blue-600">Aktif</strong>, dan memulihkan profil PPPoE di Mikrotik secara otomatis.
              </p>

              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-zinc-300 mb-1.5">
                  Metode / Bank Penerima
                </label>
                <select
                  value={confirmBank}
                  onChange={(e) => setConfirmBank(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-lg bg-gray-50 dark:bg-zinc-950 border border-gray-255 dark:border-zinc-800 text-gray-950 dark:text-zinc-100 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-semibold"
                >
                  <option value="BCA">BCA (Transfer)</option>
                  <option value="Mandiri">Mandiri (Transfer)</option>
                  <option value="BRI">BRI (Transfer)</option>
                  <option value="BSI">BSI (Transfer)</option>
                  <option value="Cash">Tunai (Cash / Loket)</option>
                </select>
              </div>
            </div>

            <div className="px-6 py-4 bg-gray-50 dark:bg-zinc-950/40 border-t border-gray-150 dark:border-zinc-850 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsConfirmModalOpen(false)}
                className="px-4 py-2 rounded-lg bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 hover:bg-gray-100 dark:hover:bg-zinc-800 text-gray-600 dark:text-zinc-300 text-xs font-semibold transition-all"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleConfirmPayment}
                disabled={confirmPaymentMut.isPending}
                className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow-sm transition-all flex items-center gap-1 disabled:opacity-50"
              >
                {confirmPaymentMut.isPending ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" /> Mengonfirmasi...
                  </>
                ) : (
                  'Ya, Konfirmasi Lunas'
                )}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Receipt Print Modal */}
      {receiptInvoice && (
        <ReceiptModal
          invoice={receiptInvoice}
          onClose={() => setReceiptInvoice(null)}
        />
      )}
    </div>
  )
}
