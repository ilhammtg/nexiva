import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useSearchParams } from 'react-router-dom'
import { Search, Eye, ChevronLeft, ChevronRight, RefreshCw, Plus } from 'lucide-react'
import { StatusBadge, LoadingSpinner, EmptyState } from '@/components/ui'
import { formatDateTime } from '@/lib/utils'
import { csApi } from '../api/csApi'
import RegistrationDetailModal from './RegistrationDetailModal'
import CSAdminRegisterModal from './CSAdminRegisterModal'
import type { Registration } from '@/features/owner/types'

const STATUS_OPTIONS = [
  'all', 'pending_review', 'survey_scheduled', 'survey_done', 'survey_failed',
  'rejected', 'waiting_payment', 'payment_confirmed', 'installation_scheduled',
  'provisioning', 'provisioning_failed', 'active',
]

export default function CSRegistrationsPage() {
  const [searchParams] = useSearchParams()
  const [search, setSearch] = useState(searchParams.get('search') ?? '')
  const [status, setStatus] = useState('all')
  const [page, setPage] = useState(1)
  const [selected, setSelected] = useState<Registration | null>(null)
  const [showRegisterModal, setShowRegisterModal] = useState(false)

  const { data, isLoading, isFetching, refetch } = useQuery({
    queryKey: ['cs-registrations', status, page, search],
    queryFn: () => csApi.getRegistrations({
      ...(status !== 'all' && { status }),
      page: String(page),
      per_page: '15',
      ...(search && { search }),
    }),
    refetchInterval: 30000,
  })

  const regs = data?.data ?? []
  const meta = data?.meta

  return (
    <div className="p-8 space-y-6 w-full">
      {/* Page Title & Actions */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-800 dark:text-white">Registrasi Pelanggan Baru</h1>
          <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">
            Kelola dan tinjau semua pengajuan pendaftaran wifi calon pelanggan baru
          </p>
        </div>
        <button
          onClick={() => setShowRegisterModal(true)}
          className="inline-flex items-center gap-1.5 px-4 py-2 text-sm rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold transition-all shadow-md shadow-blue-500/20"
        >
          <Plus className="w-4 h-4" /> Registrasi Pelanggan Baru
        </button>
      </div>

      {/* Table Card */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800 overflow-hidden">
        {/* Toolbar */}
        <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex flex-wrap gap-3 items-center justify-between">
          <h3 className="text-base font-semibold text-slate-800 dark:text-white">Daftar Registrasi</h3>
          <div className="flex gap-3 flex-wrap">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                value={search}
                onChange={e => { setSearch(e.target.value); setPage(1) }}
                placeholder="Cari nama / nomor..."
                className="pl-9 pr-4 py-2 text-sm rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/40 w-52 text-slate-700 dark:text-slate-200 placeholder-slate-400"
              />
            </div>
            <select
              value={status}
              onChange={e => { setStatus(e.target.value); setPage(1) }}
              className="text-sm rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500/40 text-slate-700 dark:text-slate-200"
            >
              {STATUS_OPTIONS.map(s => (
                <option key={s} value={s}>
                  {s === 'all' ? 'Semua Status' : s.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}
                </option>
              ))}
            </select>
            <button
              onClick={() => refetch()}
              disabled={isFetching}
              className="px-3 py-2 text-sm rounded-xl bg-slate-50 hover:bg-slate-100 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-350 font-medium transition-colors border border-slate-200 dark:border-slate-750 inline-flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isFetching ? 'animate-spin' : ''}`} /> Refresh
            </button>
          </div>
        </div>

        {/* Table */}
        {isLoading ? (
          <LoadingSpinner className="py-16" />
        ) : regs.length === 0 ? (
          <EmptyState message="Tidak ada data registrasi" />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-800/50 text-xs text-slate-500 dark:text-slate-400 font-semibold uppercase tracking-wider">
                  <th className="px-5 py-3 text-left">No. Reg / Pelanggan</th>
                  <th className="px-5 py-3 text-left">Nama Pelanggan</th>
                  <th className="px-5 py-3 text-left">Telepon</th>
                  <th className="px-5 py-3 text-left">Kota</th>
                  <th className="px-5 py-3 text-left">Status</th>
                  <th className="px-5 py-3 text-left">Tanggal Daftar</th>
                  <th className="px-5 py-3 text-center">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50 dark:divide-slate-800">
                {regs.map(reg => (
                  <tr key={reg.ID} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors group">
                    <td className="px-5 py-3.5 font-mono text-xs text-slate-600 dark:text-slate-300 font-semibold">
                      {reg.CustomerNumber || reg.RegNumber}
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-full bg-gradient-to-br from-blue-100 to-indigo-100 dark:from-blue-900/30 dark:to-indigo-900/30 flex items-center justify-center flex-shrink-0">
                          <span className="text-blue-700 dark:text-blue-300 font-bold text-xs">{reg.FullName.charAt(0)}</span>
                        </div>
                        <span className="font-semibold text-slate-800 dark:text-slate-100 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                          {reg.FullName}
                        </span>
                      </div>
                    </td>
                    <td className="px-5 py-3.5 text-slate-600 dark:text-slate-400">{reg.Phone}</td>
                    <td className="px-5 py-3.5 text-slate-600 dark:text-slate-400">{reg.City}</td>
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
                    <td className="px-5 py-3.5 text-slate-500 dark:text-slate-400 text-xs">{formatDateTime(reg.CreatedAt)}</td>
                    <td className="px-5 py-3.5 text-center">
                      <button
                        onClick={() => setSelected(reg)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-500/10 transition-colors"
                        title="Lihat Detail & Aksi"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {meta && (
          <div className="px-6 py-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-sm">
            <p className="text-slate-500 dark:text-slate-400">
              Total <span className="font-semibold text-slate-700 dark:text-slate-200">{meta.total}</span> registrasi
            </p>
            <div className="flex gap-1 items-center">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="px-3 py-1 text-slate-600 dark:text-slate-300 font-medium">
                {page} / {Math.ceil(meta.total / meta.per_page) || 1}
              </span>
              <button
                onClick={() => setPage(p => p + 1)}
                disabled={!meta.total || page >= Math.ceil(meta.total / meta.per_page)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
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
          role="cs_admin"
        />
      )}

      {/* Register Customer Modal */}
      {showRegisterModal && (
        <CSAdminRegisterModal
          onClose={() => setShowRegisterModal(false)}
          onSuccess={() => refetch()}
        />
      )}
    </div>
  )
}
