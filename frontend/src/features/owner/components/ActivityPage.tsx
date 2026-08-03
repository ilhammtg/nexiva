import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { ownerApi } from '../api/ownerApi'
import { csApi } from '@/features/cs/api/csApi'
import { LoadingSpinner, StatusBadge } from '@/components/ui'
import { formatDateTime } from '@/lib/utils'
import { 
  Search, Filter, X, ChevronRight, Copy, ExternalLink, 
  User, Clock, FileText, CheckCircle2, RefreshCw 
} from 'lucide-react'
import { toast } from 'sonner'

const ROLE_OPTIONS = [
  { value: 'all', label: 'Semua Peran' },
  { value: 'owner', label: 'Super Admin' },
  { value: 'cs_admin', label: 'CS Admin' },
  { value: 'technician', label: 'Teknisi' },
  { value: 'system', label: 'System' },
]

const STATUS_OPTIONS = [
  { value: 'all', label: 'Semua Status' },
  { value: 'pending_review', label: 'Pending Review' },
  { value: 'survey_scheduled', label: 'Survey Scheduled' },
  { value: 'survey_done', label: 'Survey Done' },
  { value: 'survey_failed', label: 'Survey Failed' },
  { value: 'rejected', label: 'Rejected' },
  { value: 'waiting_payment', label: 'Waiting Payment' },
  { value: 'payment_confirmed', label: 'Payment Confirmed' },
  { value: 'installation_scheduled', label: 'Installation Scheduled' },
  { value: 'provisioning', label: 'Provisioning' },
  { value: 'provisioning_failed', label: 'Provisioning Failed' },
  { value: 'active', label: 'Active' },
]

export default function ActivityPage({ role = 'owner' }: { role?: 'owner' | 'cs_admin' }) {
  const navigate = useNavigate()
  const [search, setSearch] = useState('')
  const [selectedRole, setSelectedRole] = useState('all')
  const [selectedStatus, setSelectedStatus] = useState('all')
  const [selectedLog, setSelectedLog] = useState<any | null>(null)

  const { data, isLoading, refetch, isFetching } = useQuery({
    queryKey: ['activity-logs', role],
    queryFn: () => role === 'cs_admin'
      ? csApi.getActivityLogs({ per_page: '100' })
      : ownerApi.getActivityLogs({ per_page: '100' }),
  })

  const logs = data?.data ?? []

  // Filter logs client-side
  const filteredLogs = logs.filter((log: any) => {
    const matchesSearch = 
      !search ||
      (log.RegistrationID && log.RegistrationID.toLowerCase().includes(search.toLowerCase())) ||
      (log.Reason && log.Reason.toLowerCase().includes(search.toLowerCase())) ||
      (log.ChangedByRole && log.ChangedByRole.toLowerCase().includes(search.toLowerCase()))

    const matchesRole = selectedRole === 'all' || (log.ChangedByRole || 'system').toLowerCase() === selectedRole.toLowerCase()
    const matchesStatus = selectedStatus === 'all' || log.StatusTo === selectedStatus

    return matchesSearch && matchesRole && matchesStatus
  })

  const handleCopyId = (id: string, e: React.MouseEvent) => {
    e.stopPropagation()
    navigator.clipboard.writeText(id)
    toast.success('ID Registrasi disalin ke clipboard')
  }

  const handleInspectRegistration = (regId: string) => {
    const targetPath = role === 'owner' ? '/dashboard/registrations' : '/cs/registrations'
    navigate(`${targetPath}?search=${regId}`)
  }

  return (
    <div className="p-8 space-y-6 w-full">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-zinc-100">Activity Log</h1>
          <p className="text-xs text-gray-500 dark:text-zinc-400 mt-1">
            Riwayat audit perubahan status registrasi pelanggan dan tindak operasional staff
          </p>
        </div>
        <button
          onClick={() => refetch()}
          disabled={isLoading || isFetching}
          className="p-2 rounded-md border border-gray-250 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-gray-500 dark:text-zinc-400 hover:bg-gray-50 dark:hover:bg-zinc-800/60 transition-colors shadow-sm disabled:opacity-50 inline-flex items-center gap-1.5 text-xs font-semibold"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isFetching ? 'animate-spin' : ''}`} />
          Refresh Log
        </button>
      </div>

      {/* Filter Bar */}
      <div className="bg-white dark:bg-zinc-900 p-4 rounded-lg border border-gray-200 dark:border-zinc-805 flex flex-wrap items-center gap-3.5">
        <div className="relative flex-1 min-w-[240px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-zinc-500" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari ID Registrasi, catatan, atau peran..."
            className="pl-9 pr-4 py-1.5 w-full text-xs rounded-md bg-gray-50 dark:bg-zinc-950 border border-gray-250 dark:border-zinc-800 focus:outline-none focus:ring-2 focus:ring-blue-500/40 text-gray-700 dark:text-zinc-200 placeholder-gray-450"
          />
          {search && (
            <button 
              onClick={() => setSearch('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-650 dark:hover:text-white"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Role Filter */}
        <div className="flex items-center gap-2">
          <Filter className="w-3.5 h-3.5 text-gray-400" />
          <select
            value={selectedRole}
            onChange={(e) => setSelectedRole(e.target.value)}
            className="text-xs rounded-md bg-gray-50 dark:bg-zinc-955 border border-gray-250 dark:border-zinc-800 px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500/40 text-gray-700 dark:text-zinc-200"
          >
            {ROLE_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>

        {/* Status Filter */}
        <select
          value={selectedStatus}
          onChange={(e) => setSelectedStatus(e.target.value)}
          className="text-xs rounded-md bg-gray-50 dark:bg-zinc-955 border border-gray-255 dark:border-zinc-800 px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500/40 text-gray-700 dark:text-zinc-200"
        >
          {STATUS_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>

      {/* Main List */}
      <div className="bg-white dark:bg-zinc-900 rounded-lg border border-gray-200 dark:border-zinc-805 overflow-hidden">
        {isLoading ? (
          <LoadingSpinner className="py-20" />
        ) : filteredLogs.length === 0 ? (
          <div className="p-16 text-center text-gray-400 dark:text-zinc-550">
            <FileText className="w-10 h-10 mx-auto mb-3 opacity-40" />
            <p className="text-sm font-semibold">Tidak ada log aktivitas ditemukan</p>
            <p className="text-xs mt-1">Coba sesuaikan kata kunci pencarian atau filter Anda</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-150 dark:divide-zinc-800/45">
            {filteredLogs.map((log: any, idx: number) => {
              const displayId = log.RegistrationID ? log.RegistrationID.slice(-8).toUpperCase() : '-'
              return (
                <div 
                  key={idx} 
                  onClick={() => setSelectedLog(log)}
                  className="px-6 py-4 flex items-start justify-between gap-4 hover:bg-gray-50/30 dark:hover:bg-zinc-800/15 transition-all cursor-pointer group"
                >
                  <div className="flex items-start gap-3.5 min-w-0 flex-1">
                    <div className="w-2 h-2 rounded-full bg-blue-600 mt-2 flex-shrink-0 group-hover:scale-110 transition-transform" />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-[10px] font-bold font-mono bg-gray-50 dark:bg-zinc-955 text-gray-600 dark:text-zinc-400 px-2 py-0.5 rounded border border-gray-200 dark:border-zinc-850">
                          #{displayId}
                        </span>
                        {log.StatusFrom && (
                          <>
                            <StatusBadge status={log.StatusFrom} />
                            <ChevronRight className="w-3 h-3 text-gray-400 dark:text-zinc-500" />
                          </>
                        )}
                        <StatusBadge status={log.StatusTo} />
                      </div>
                      
                      {log.Reason ? (
                        <p className="text-xs text-gray-750 dark:text-zinc-300 mt-1.5 line-clamp-1 italic font-medium">
                          "{log.Reason}"
                        </p>
                      ) : (
                        <p className="text-[11px] text-gray-400 dark:text-zinc-500 mt-1.5 italic">
                          Tidak ada catatan alasan tambahan
                        </p>
                      )}

                      <div className="flex items-center gap-2 flex-wrap text-[9px] font-bold text-gray-400 dark:text-zinc-500 mt-2 uppercase tracking-wider">
                        <span className="inline-flex items-center gap-1">
                          <User className="w-3 h-3 text-blue-600" /> {log.ChangedByRole || 'system'}
                        </span>
                        <span>•</span>
                        <span className="inline-flex items-center gap-1">
                          <Clock className="w-3 h-3 text-emerald-600" /> {formatDateTime(log.CreatedAt)}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 flex-shrink-0">
                    <button
                      onClick={(e) => handleCopyId(log.RegistrationID, e)}
                      className="p-1 rounded text-gray-450 hover:text-gray-700 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-zinc-800 transition-colors"
                      title="Salin ID Registrasi"
                    >
                      <Copy className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        handleInspectRegistration(log.RegistrationID)
                      }}
                      className="p-1 rounded text-gray-450 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50/50 dark:hover:bg-blue-950/20 transition-colors"
                      title="Tinjau Registrasi"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Log Detail Modal */}
      {selectedLog && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 backdrop-blur-sm p-4"
          onClick={() => setSelectedLog(null)}
        >
          <div 
            className="bg-white dark:bg-zinc-900 rounded-lg w-full max-w-lg shadow-2xl border border-gray-205 dark:border-zinc-800 overflow-hidden flex flex-col p-6 animate-in fade-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-4 border-b border-gray-150 dark:border-zinc-850">
              <div>
                <h3 className="text-sm font-bold text-gray-900 dark:text-zinc-100">Detail Log Audit</h3>
                <p className="text-[10px] text-gray-450 dark:text-zinc-500 mt-0.5">Catatan aktivitas perubahan status registrasi</p>
              </div>
              <button 
                onClick={() => setSelectedLog(null)}
                className="p-2 bg-gray-50 dark:bg-zinc-950 hover:bg-gray-100 dark:hover:bg-zinc-800 text-gray-400 hover:text-gray-650 dark:hover:text-white rounded-md transition-all"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="py-5 space-y-4 flex-1">
              {/* Reg ID Box */}
              <div className="space-y-1">
                <span className="text-[9px] font-bold text-gray-450 dark:text-zinc-500 uppercase tracking-widest block">ID Registrasi</span>
                <div className="flex items-center gap-2 bg-gray-50 dark:bg-zinc-955 px-3 py-2 rounded-md border border-gray-200 dark:border-zinc-850">
                  <span className="text-xs font-mono font-bold text-gray-700 dark:text-zinc-300 select-all truncate flex-1">
                    {selectedLog.RegistrationID}
                  </span>
                  <button
                    onClick={(e) => handleCopyId(selectedLog.RegistrationID, e)}
                    className="p-1 text-gray-450 hover:text-gray-700 dark:hover:text-white transition-colors"
                  >
                    <Copy className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Status Transition Row */}
              <div className="space-y-1.5">
                <span className="text-[9px] font-bold text-gray-450 dark:text-zinc-500 uppercase tracking-widest block">Transisi Status</span>
                <div className="flex items-center gap-3 bg-gray-50 dark:bg-zinc-955 p-3 rounded-md border border-gray-200 dark:border-zinc-850">
                  {selectedLog.StatusFrom ? (
                    <>
                      <StatusBadge status={selectedLog.StatusFrom} />
                      <ChevronRight className="w-4 h-4 text-gray-400" />
                    </>
                  ) : (
                    <>
                      <span className="text-xs text-gray-450 dark:text-zinc-500 font-semibold italic">Registrasi Masuk</span>
                      <ChevronRight className="w-4 h-4 text-gray-400" />
                    </>
                  )}
                  <StatusBadge status={selectedLog.StatusTo} />
                </div>
              </div>

              {/* Catatan / Alasan */}
              <div className="space-y-1.5">
                <span className="text-[9px] font-bold text-gray-450 dark:text-zinc-500 uppercase tracking-widest block">Alasan / Catatan Perubahan</span>
                <div className="bg-gray-50 dark:bg-zinc-955 p-4 rounded-md border border-gray-200 dark:border-zinc-850 text-xs text-gray-700 dark:text-zinc-350 min-h-[80px] italic leading-relaxed whitespace-pre-line">
                  {selectedLog.Reason ? `"${selectedLog.Reason}"` : "Tidak ada catatan / alasan spesifik yang dimasukkan."}
                </div>
              </div>

              {/* Metadata */}
              <div className="grid grid-cols-2 gap-3 pt-2">
                <div className="bg-gray-50 dark:bg-zinc-955 p-3 rounded-md border border-gray-200 dark:border-zinc-850">
                  <span className="text-[8px] font-bold text-gray-450 dark:text-zinc-500 uppercase tracking-widest block mb-1">Diubah Oleh</span>
                  <div className="flex items-center gap-2 text-xs font-bold text-gray-700 dark:text-zinc-200">
                    <User className="w-3.5 h-3.5 text-blue-600" />
                    <span className="capitalize">{selectedLog.ChangedByRole || 'system'}</span>
                  </div>
                </div>
                
                <div className="bg-gray-50 dark:bg-zinc-955 p-3 rounded-md border border-gray-200 dark:border-zinc-850">
                  <span className="text-[8px] font-bold text-gray-450 dark:text-zinc-500 uppercase tracking-widest block mb-1">Tanggal & Waktu</span>
                  <div className="flex items-center gap-2 text-xs font-bold text-gray-700 dark:text-zinc-200">
                    <Clock className="w-3.5 h-3.5 text-emerald-600" />
                    <span>{formatDateTime(selectedLog.CreatedAt)}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Modal Footer Actions */}
            <div className="pt-4 border-t border-gray-150 dark:border-zinc-850 flex items-center justify-between gap-3">
              <button 
                onClick={() => setSelectedLog(null)}
                className="px-4 py-2 text-xs rounded-md bg-gray-100 dark:bg-zinc-800 text-gray-650 dark:text-zinc-300 hover:bg-gray-200 dark:hover:bg-zinc-700 font-semibold transition-colors"
              >
                Tutup Detail
              </button>
              
              <button
                onClick={() => {
                  setSelectedLog(null)
                  handleInspectRegistration(selectedLog.RegistrationID)
                }}
                className="px-4 py-2 text-xs rounded-md bg-blue-600 hover:bg-blue-700 text-white font-semibold transition-all inline-flex items-center gap-1.5"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                Tinjau Registrasi
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
