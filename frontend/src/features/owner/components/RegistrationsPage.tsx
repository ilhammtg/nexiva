import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useSearchParams } from 'react-router-dom'
import { Search, ChevronLeft, ChevronRight, Download, RefreshCw } from 'lucide-react'
import { ownerApi } from '../api/ownerApi'
import { StatusBadge, LoadingSpinner, EmptyState } from '@/components/ui'
import { formatDateTime } from '@/lib/utils'
import RegistrationDetailModal from '@/features/cs/components/RegistrationDetailModal'
import type { Registration } from '../types'

const STATUS_OPTIONS = [
  'all','pending_review','survey_scheduled','survey_done','survey_failed',
  'rejected','waiting_payment','payment_confirmed','installation_scheduled',
  'provisioning','provisioning_failed','active',
]

export default function RegistrationsPage() {
  const [searchParams] = useSearchParams()
  const [search, setSearch] = useState(searchParams.get('search') ?? '')
  const [status, setStatus] = useState('all')
  const [page, setPage] = useState(1)
  const [selected, setSelected] = useState<Registration | null>(null)

  const { data, isLoading, isFetching, refetch } = useQuery({
    queryKey: ['registrations', status, page, search],
    queryFn: () => ownerApi.getRegistrations({
      ...(status !== 'all' && { status }),
      page: String(page),
      per_page: '15',
      ...(search && { search }),
    }),
  })

  const regs = data?.data ?? []
  const meta = data?.meta

  const handleExport = () => {
    const token = localStorage.getItem('access_token')
    const baseUrl = (import.meta.env.VITE_API_URL ?? '/api/v1').replace(/\/$/, '')
    window.open(`${baseUrl}/owner/export/registrations?token=${token}`, '_blank')
  }

  return (
    <div className="p-4 sm:p-6 md:p-8 w-full">
      <div className="bg-white dark:bg-zinc-900 rounded-lg border border-gray-200 dark:border-zinc-805 overflow-hidden">

        {/* Toolbar */}
        <div className="px-4 sm:px-6 py-4 border-b border-gray-150 dark:border-zinc-850 flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between bg-gray-50/50 dark:bg-zinc-950/40">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-zinc-100">Daftar Registrasi</h3>
          <div className="flex gap-3 flex-wrap w-full sm:w-auto">
            <div className="relative w-full sm:w-auto">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1) }}
                placeholder="Cari nama / nomor..."
                className="pl-9 pr-4 py-1.5 text-xs rounded-md bg-white dark:bg-zinc-950 border border-gray-255 dark:border-zinc-800 focus:outline-none focus:ring-2 focus:ring-blue-500/40 w-full sm:w-48 text-gray-750 dark:text-zinc-200 placeholder-gray-400"
              />
            </div>
            <select
              value={status}
              onChange={(e) => { setStatus(e.target.value); setPage(1) }}
              className="text-xs rounded-md bg-white dark:bg-zinc-950 border border-gray-255 dark:border-zinc-800 px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500/40 text-gray-750 dark:text-zinc-200 font-medium w-full sm:w-auto"
            >
              {STATUS_OPTIONS.map((s) => (
                <option key={s} value={s}>
                  {s === 'all' ? 'Semua Status' : s.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}
                </option>
              ))}
            </select>
            <button
              onClick={() => refetch()}
              disabled={isFetching}
              className="px-3 py-1.5 text-xs rounded-md bg-white hover:bg-gray-100 dark:bg-zinc-950 dark:hover:bg-zinc-800 text-gray-700 dark:text-zinc-355 font-semibold transition-colors border border-gray-250 dark:border-zinc-800 inline-flex items-center justify-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed w-full sm:w-auto"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isFetching ? 'animate-spin' : ''}`} /> Refresh
            </button>
            <button
              onClick={handleExport}
              className="flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs rounded-md bg-emerald-600 hover:bg-emerald-700 text-white font-semibold transition-colors w-full sm:w-auto"
            >
              <Download className="w-4 h-4" /> Export CSV
            </button>
          </div>
        </div>

        {/* Table */}
        {isLoading ? (
          <LoadingSpinner className="py-16" />
        ) : regs.length === 0 ? (
          <EmptyState />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-gray-50/80 dark:bg-zinc-800/60 text-gray-500 dark:text-zinc-300 font-semibold uppercase tracking-wider border-b border-gray-200 dark:border-zinc-700">
                  <th className="px-5 py-3 text-left">No. Reg / Pelanggan</th>
                  <th className="px-5 py-3 text-left">Nama</th>
                  <th className="px-5 py-3 text-left">Telepon</th>
                  <th className="px-5 py-3 text-left">Kota</th>
                  <th className="px-5 py-3 text-left">Status</th>
                  <th className="px-5 py-3 text-left">Tanggal</th>
                  <th className="px-5 py-3 text-center">Detail</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-150 dark:divide-zinc-800/45">
                {regs.map((reg) => (
                  <tr
                    key={reg.ID}
                    className="hover:bg-gray-50/40 dark:hover:bg-zinc-800/20 transition-colors cursor-pointer group"
                    onClick={() => setSelected(reg)}
                  >
                    <td className="px-5 py-3.5 font-mono text-xs text-gray-650 dark:text-zinc-300 font-semibold">{reg.CustomerNumber || reg.RegNumber}</td>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-full bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 flex items-center justify-center flex-shrink-0 border border-blue-100/50 dark:border-blue-900/30">
                          <span className="text-blue-700 dark:text-blue-300 font-bold text-xs">{reg.FullName.charAt(0)}</span>
                        </div>
                        <span className="font-bold text-gray-900 dark:text-zinc-100 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">{reg.FullName}</span>
                      </div>
                    </td>
                    <td className="px-5 py-3.5 text-gray-600 dark:text-zinc-400">{reg.Phone}</td>
                    <td className="px-5 py-3.5 text-gray-600 dark:text-zinc-400">{reg.City}</td>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <StatusBadge status={reg.Status} />
                        {reg.PPPoEUsername && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/40 text-[10px] font-extrabold text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800" title={`PPPoE Provisioned: ${reg.PPPoEUsername}`}>
                            ✓ PPPoE Provisioned
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-5 py-3.5 text-gray-500 dark:text-zinc-450 text-xs">{formatDateTime(reg.CreatedAt)}</td>
                    <td className="px-5 py-3.5 text-center">
                      <span className="text-xs text-blue-600 dark:text-blue-400 font-semibold group-hover:underline">Buka →</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {meta && (
          <div className="px-6 py-3 border-t border-gray-150 dark:border-zinc-805 flex items-center justify-between text-xs">
            <p className="text-gray-500 dark:text-zinc-400">
              Total <span className="font-semibold text-gray-700 dark:text-zinc-200">{meta.total}</span> registrasi
            </p>
            <div className="flex gap-1 items-center">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="p-1.5 rounded-md text-gray-400 hover:text-gray-700 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-zinc-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="px-3 py-1 text-gray-650 dark:text-zinc-300 font-semibold">
                {page} / {Math.ceil(meta.total / meta.per_page) || 1}
              </span>
              <button
                onClick={() => setPage(p => p + 1)}
                disabled={!meta.total || page >= Math.ceil(meta.total / meta.per_page)}
                className="p-1.5 rounded-md text-gray-400 hover:text-gray-700 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-zinc-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Registration Detail Modal */}
      {selected && (
        <RegistrationDetailModal
          reg={selected}
          onClose={() => setSelected(null)}
          role="owner"
        />
      )}
    </div>
  )
}
