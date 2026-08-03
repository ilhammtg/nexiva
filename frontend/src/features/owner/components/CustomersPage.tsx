import { useState, useEffect } from 'react'
import { useQuery, useMutation } from '@tanstack/react-query'
import { Search, ChevronLeft, ChevronRight, Eye, Calendar, MapPin, Phone, Trash2, RefreshCw } from 'lucide-react'
import { ownerApi } from '../api/ownerApi'
import { csApi } from '@/features/cs/api/csApi'
import { LoadingSpinner, EmptyState } from '@/components/ui'
import { formatDateTime } from '@/lib/utils'
import RegistrationDetailModal from '@/features/cs/components/RegistrationDetailModal'
import type { Registration } from '../types'
import { toast } from 'sonner'

interface CustomersPageProps {
  role?: 'owner' | 'cs_admin'
}

export default function CustomersPage({ role = 'owner' }: CustomersPageProps) {
  const [searchVal, setSearchVal] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [page, setPage] = useState(1)
  const [selected, setSelected] = useState<Registration | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null)

  // Debounce search input to make queries extremely light and fast
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(searchVal)
      setPage(1)
    }, 300)
    return () => clearTimeout(handler)
  }, [searchVal])

  const { data, isLoading, isFetching, refetch } = useQuery({
    queryKey: ['active-customers', role, debouncedSearch, page],
    queryFn: () => {
      const apiCall = role === 'owner' ? ownerApi.getRegistrations : csApi.getRegistrations
      return apiCall({
        status: 'active',
        page: String(page),
        per_page: '15',
        ...(debouncedSearch && { search: debouncedSearch }),
      })
    },
  })

  // Live PPPoE active connections monitoring query
  const { data: activeConns } = useQuery({
    queryKey: ['active-pppoe-conns'],
    queryFn: async () => {
      try {
        const configs = await ownerApi.getMikrotikConfigs()
        if (configs && configs.length > 0) {
          const activeM = configs.find((m) => m.is_active) || configs[0]
          if (activeM) {
            return await ownerApi.getMikrotikActiveConnections(activeM.id)
          }
        }
      } catch (e) {
        // Router might be offline / unreachable
      }
      return []
    },
    refetchInterval: 10000,
  })

  // Create a fast lookup set of online PPPoE usernames
  const onlineUsernames = new Set(
    (activeConns || []).map((c: any) => (c.name || c.Name || '').toLowerCase())
  )

  const deleteMutation = useMutation({
    mutationFn: (id: string) => csApi.deleteRegistration(id),
    onSuccess: () => {
      toast.success('Data pelanggan berhasil dihapus')
      setDeleteTarget(null)
      refetch()
    },
    onError: (err: any) => {
      const errMsg = err?.response?.data?.error?.message || 'Gagal menghapus data pelanggan'
      toast.error(errMsg)
      setDeleteTarget(null)
    }
  })

  const handleDelete = (id: string, name: string) => {
    setDeleteTarget({ id, name })
  }

  const customers = data?.data ?? []
  const meta = data?.meta

  return (
    <div className="p-6 space-y-4 w-full">
      {/* Table Card */}
      <div className="bg-white dark:bg-zinc-900 rounded-lg border border-gray-250 dark:border-zinc-800 overflow-hidden">
        {/* Toolbar */}
        <div className="px-6 py-4 border-b border-gray-200 dark:border-zinc-800 flex flex-wrap gap-3 items-center justify-between">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-zinc-100">Pelanggan Aktif</h3>
          <div className="flex gap-3 flex-wrap">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-zinc-400" />
              <input
                value={searchVal}
                onChange={(e) => setSearchVal(e.target.value)}
                placeholder="Cari nama, no. pelanggan, telp..."
                className="pl-9 pr-4 py-1.5 text-xs rounded-md bg-white dark:bg-zinc-950 border border-gray-200 dark:border-zinc-800 focus:outline-none focus:ring-2 focus:ring-blue-500/40 w-64 text-gray-750 dark:text-zinc-200 placeholder-gray-400"
              />
            </div>
            <button
              onClick={() => refetch()}
              disabled={isFetching}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-md bg-blue-600 hover:bg-blue-700 text-white font-semibold transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isFetching ? 'animate-spin' : ''}`} />
              <span>Refresh</span>
            </button>
          </div>
        </div>

        {/* Table */}
        {isLoading ? (
          <LoadingSpinner className="py-16" />
        ) : customers.length === 0 ? (
          <EmptyState message="Tidak ada data pelanggan aktif" />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-gray-50/80 dark:bg-zinc-800/60 text-gray-500 dark:text-zinc-300 font-semibold uppercase tracking-wider border-b border-gray-250 dark:border-zinc-800">
                  <th className="px-5 py-3 text-left">No. Pelanggan</th>
                  <th className="px-5 py-3 text-left">Pelanggan</th>
                  <th className="px-5 py-3 text-left">Kontak</th>
                  <th className="px-5 py-3 text-left">Alamat / Wilayah</th>
                  <th className="px-5 py-3 text-left">Status Koneksi</th>
                  <th className="px-5 py-3 text-left">Tanggal Aktif</th>
                  <th className="px-5 py-3 text-center">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-zinc-800/45">
                {customers.map((cust) => {
                  const pppoeUser = (cust.PPPoEUsername || '').toLowerCase()
                  const isOnline = Boolean(pppoeUser && onlineUsernames.has(pppoeUser))
                  const isIsolir = cust.Status === 'isolir'

                  return (
                    <tr
                      key={cust.ID}
                      className="hover:bg-gray-50/40 dark:hover:bg-zinc-800/20 transition-colors group"
                    >
                      {/* Customer Number / Reg Number */}
                      <td className="px-5 py-4 font-mono text-gray-650 dark:text-zinc-300 font-semibold">
                        {cust.CustomerNumber || cust.RegNumber}
                      </td>

                      {/* Customer */}
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 flex items-center justify-center flex-shrink-0 border border-blue-100/50 dark:border-blue-900/30">
                            <span className="text-blue-700 dark:text-blue-300 font-bold text-xs">
                              {cust.FullName.charAt(0)}
                            </span>
                          </div>
                          <div>
                            <p className="font-bold text-gray-900 dark:text-zinc-100 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                              {cust.FullName}
                            </p>
                            <p className="text-[10px] text-gray-400 dark:text-zinc-500">
                              NIK: {cust.NIK || '-'}
                            </p>
                          </div>
                        </div>
                      </td>

                      {/* Contact */}
                      <td className="px-5 py-4">
                        <div className="space-y-0.5 text-gray-605 dark:text-zinc-400">
                          <div className="flex items-center gap-1">
                            <Phone className="w-3.5 h-3.5 text-gray-400" />
                            <span>{cust.Phone}</span>
                          </div>
                          {cust.Email && <p className="text-[10px] text-gray-400 dark:text-zinc-500">{cust.Email}</p>}
                        </div>
                      </td>

                      {/* Address */}
                      <td className="px-5 py-4">
                        <div className="flex items-start gap-1.5 max-w-xs text-gray-605 dark:text-zinc-400">
                          <MapPin className="w-3.5 h-3.5 text-gray-400 mt-0.5 flex-shrink-0" />
                          <div>
                            <p className="truncate font-medium">{cust.AddressDetail}</p>
                            <p className="text-[10px] text-gray-400 dark:text-zinc-500">
                              {cust.Village}, {cust.District}, {cust.City}
                            </p>
                          </div>
                        </div>
                      </td>

                      {/* Status Koneksi / Layanan */}
                      <td className="px-5 py-4">
                        {isIsolir ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-50 dark:bg-amber-950/20 text-amber-700 dark:text-amber-400 border border-amber-200/50 dark:border-amber-900/30 shadow-sm" title="Pelanggan di-isolir / tunggakan">
                            <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                            Isolir (Offline)
                          </span>
                        ) : isOnline ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-450 border border-emerald-250/60 dark:border-emerald-900/30 shadow-sm" title="Sesi PPPoE terhubung aktif">
                            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                            Online
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-zinc-400 border border-slate-200 dark:border-zinc-700 shadow-sm" title="Sesi PPPoE tidak aktif / router offline / ONT mati">
                            <span className="w-2 h-2 rounded-full bg-slate-400 dark:bg-zinc-500" />
                            Offline
                          </span>
                        )}
                      </td>

                      {/* Activation Date */}
                      <td className="px-5 py-4 text-gray-500 dark:text-zinc-400">
                        <div className="flex items-center gap-1.5">
                          <Calendar className="w-3.5 h-3.5 text-gray-400" />
                          <span>{cust.ActivatedAt ? formatDateTime(cust.ActivatedAt) : '-'}</span>
                        </div>
                      </td>

                      {/* Actions */}
                      <td className="px-5 py-4 text-center">
                        <div className="flex justify-center items-center gap-1">
                          <button
                            onClick={() => setSelected(cust)}
                            className="p-1 rounded text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50/50 dark:hover:bg-blue-950/30 transition-colors"
                            title="Detail Pelanggan"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          {role === 'owner' && (
                            <button
                              onClick={() => handleDelete(cust.ID, cust.FullName)}
                              className="p-1 rounded text-gray-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50/50 dark:hover:bg-red-950/30 transition-colors"
                              title="Hapus Pelanggan"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {meta && (
          <div className="px-6 py-3 border-t border-gray-250 dark:border-zinc-800 flex items-center justify-between text-xs">
            <p className="text-gray-500 dark:text-zinc-400">
              Total <span className="font-semibold text-gray-700 dark:text-zinc-200">{meta.total}</span> pelanggan aktif
            </p>
            <div className="flex gap-1 items-center">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="p-1.5 rounded-md text-gray-400 hover:text-gray-700 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-zinc-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="px-3 py-1 text-gray-650 dark:text-zinc-300 font-semibold">
                {page} / {Math.ceil(meta.total / meta.per_page) || 1}
              </span>
              <button
                onClick={() => setPage((p) => p + 1)}
                disabled={!meta.total || page >= Math.ceil(meta.total / meta.per_page)}
                className="p-1.5 rounded-md text-gray-400 hover:text-gray-700 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-zinc-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Customer Detail modal (Reuses same RegistrationDetailModal) */}
      {selected && (
        <RegistrationDetailModal
          reg={selected}
          onClose={() => setSelected(null)}
          role={role}
        />
      )}

      {/* Custom Confirmation Modal */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <div 
            className="absolute inset-0 bg-black/45 backdrop-blur-sm transition-opacity"
            onClick={() => !deleteMutation.isPending && setDeleteTarget(null)}
          />
          
          {/* Modal Content */}
          <div className="relative bg-white dark:bg-zinc-900 rounded-lg max-w-md w-full p-6 shadow-2xl border border-gray-200 dark:border-zinc-805 transform transition-all animate-in fade-in zoom-in-95 duration-200 animate-duration-200">
            <div className="flex flex-col items-center text-center space-y-4">
              {/* Warning Icon Banner */}
              <div className="w-12 h-12 rounded-full bg-red-50/60 dark:bg-red-950/20 flex items-center justify-center text-red-650 dark:text-red-400 ring-4 ring-red-500/10">
                <Trash2 className="w-6 h-6" />
              </div>
              
              <div className="space-y-2">
                <h3 className="text-base font-bold text-gray-900 dark:text-zinc-100">
                  Hapus Data Pelanggan
                </h3>
                <p className="text-xs text-gray-500 dark:text-zinc-400 px-2 leading-relaxed">
                  Apakah Anda yakin ingin menghapus data pelanggan <span className="font-semibold text-gray-800 dark:text-zinc-200">"{deleteTarget.name}"</span>? 
                  Tindakan ini bersifat permanen dan data yang telah dihapus tidak dapat dipulihkan kembali.
                </p>
              </div>
            </div>
            
            {/* Actions */}
            <div className="flex gap-3 mt-6">
              <button
                type="button"
                disabled={deleteMutation.isPending}
                onClick={() => setDeleteTarget(null)}
                className="flex-1 px-4 py-2 text-xs font-semibold rounded-md border border-gray-250 dark:border-zinc-800 text-gray-600 dark:text-zinc-300 hover:bg-gray-50 dark:hover:bg-zinc-800 transition-colors disabled:opacity-50"
              >
                Batal
              </button>
              <button
                type="button"
                disabled={deleteMutation.isPending}
                onClick={() => deleteMutation.mutate(deleteTarget.id)}
                className="flex-1 px-4 py-2 text-xs font-semibold rounded-md bg-red-600 hover:bg-red-700 text-white transition-all flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {deleteMutation.isPending ? (
                  <>
                    <LoadingSpinner className="w-4 h-4 !py-0" />
                    <span>Menghapus...</span>
                  </>
                ) : (
                  <span>Ya, Hapus</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
