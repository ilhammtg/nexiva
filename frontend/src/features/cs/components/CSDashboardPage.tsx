import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import {
  ClipboardList, Clock, CheckCircle2, XCircle, Plus, Users,
  FileText, Activity, ArrowRight, Eye, MessageSquare
} from 'lucide-react'
import { StatusBadge, LoadingSpinner, EmptyState, StatCard } from '@/components/ui'
import { formatDateTime } from '@/lib/utils'
import { csApi } from '../api/csApi'
import RegistrationDetailModal from './RegistrationDetailModal'
import CSAdminRegisterModal from './CSAdminRegisterModal'
import type { Registration } from '@/features/owner/types'
import { useThemeStore } from '@/stores/useThemeStore'
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell
} from 'recharts'

export default function CSDashboardPage() {
  const navigate = useNavigate()
  const [selected, setSelected] = useState<Registration | null>(null)
  const [showRegisterModal, setShowRegisterModal] = useState(false)

  // Fetch registrations to compute counts and show recent submissions
  const { data, isLoading, refetch } = useQuery({
    queryKey: ['cs-dashboard-data'],
    queryFn: () => csApi.getRegistrations({ per_page: '100' }),
    refetchInterval: 30000,
  })

  const regs = data?.data ?? []
  const recentRegs = regs.slice(0, 5)

  // Compute status counts across the fetched dataset
  const pendingCount = regs.filter(r => r.Status === 'pending_review').length
  const surveyCount = regs.filter(r => r.Status === 'survey_scheduled').length
  const paymentCount = regs.filter(r => r.Status === 'waiting_payment').length
  const activeCount = regs.filter(r => r.Status === 'active').length

  const theme = useThemeStore((s) => s.theme)
  const isDark = theme === 'dark'

  const gridColor = isDark ? '#1e293b' : '#f1f5f9'
  const labelColor = isDark ? '#475569' : '#94a3b8'
  const tooltipBg = isDark ? '#0f172a' : '#ffffff'
  const tooltipBorder = isDark ? '#1e293b' : '#f1f5f9'

  // Donut Chart Colors
  const STATUS_CHART_COLORS: Record<string, string> = {
    'Menunggu Review': '#f59e0b',       // orange
    'Jadwal Survei': '#3b82f6',        // blue
    'Menunggu Pembayaran': '#a855f7',  // purple
    'Sudah Aktif': '#10b981',          // green
  }

  const statusChartData = [
    { name: 'Menunggu Review', value: pendingCount, fill: STATUS_CHART_COLORS['Menunggu Review'] },
    { name: 'Jadwal Survei', value: surveyCount, fill: STATUS_CHART_COLORS['Jadwal Survei'] },
    { name: 'Menunggu Pembayaran', value: paymentCount, fill: STATUS_CHART_COLORS['Menunggu Pembayaran'] },
    { name: 'Sudah Aktif', value: activeCount, fill: STATUS_CHART_COLORS['Sudah Aktif'] },
  ].filter(d => d.value > 0)

  // Weekly Trend: registrations created in the last 7 days
  const getWeeklyTrend = () => {
    const days = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu']
    const trendMap: Record<string, number> = {}
    
    // Last 7 days
    for (let i = 6; i >= 0; i--) {
      const d = new Date()
      d.setDate(d.getDate() - i)
      const dayName = days[d.getDay()]
      trendMap[dayName] = 0
    }
    
    // Populate counts
    regs.forEach(r => {
      if (!r.CreatedAt) return
      const date = new Date(r.CreatedAt)
      const dayName = days[date.getDay()]
      if (dayName in trendMap) {
        trendMap[dayName]++
      }
    })
    
    return Object.entries(trendMap).map(([name, count]) => ({
      name,
      'Registrasi': count
    }))
  }

  const weeklyTrendData = getWeeklyTrend()

  return (
    <div className="p-8 space-y-6 w-full">
      {/* Page Title & Actions */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl sm:text-[28px] font-bold text-slate-800 dark:text-white">Dashboard CS Admin</h1>
          <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">
            Pantau status registrasi harian dan input pendaftaran pelanggan baru
          </p>
        </div>
        <button
          onClick={() => setShowRegisterModal(true)}
          className="inline-flex items-center gap-1.5 px-4 py-2.5 text-sm rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold transition-all shadow-md shadow-blue-500/20"
        >
          <Plus className="w-4 h-4" /> Registrasi Pelanggan Baru
        </button>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Menunggu Review"
          value={pendingCount}
          icon={<ClipboardList className="w-5 h-5" />}
          color="orange"
          subtitle="Tinjau berkas & NIK"
        />
        <StatCard
          title="Jadwal Survei"
          value={surveyCount}
          icon={<Clock className="w-5 h-5" />}
          color="blue"
          subtitle="Proses survei lapangan"
        />
        <StatCard
          title="Menunggu Bayar"
          value={paymentCount}
          icon={<XCircle className="w-5 h-5" />}
          color="purple"
          subtitle="Biaya instalasi awal"
        />
        <StatCard
          title="Pelanggan Aktif"
          value={activeCount}
          icon={<CheckCircle2 className="w-5 h-5" />}
          color="green"
          subtitle="Internet sudah aktif"
        />
      </div>

      {/* Grid Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Left Column: Trend & Recent Registrations */}
        <div className="lg:col-span-2 space-y-6">
          {/* Registration Trend Chart Card */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 shadow-sm border border-slate-100 dark:border-slate-800 flex flex-col justify-between">
            <div className="mb-4">
              <h3 className="text-sm font-bold text-slate-800 dark:text-white">
                Trend Pendaftaran Mingguan <span className="text-xs font-medium text-slate-400 dark:text-slate-500">(7 Hari Terakhir)</span>
              </h3>
              <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-0.5">Jumlah calon pelanggan yang mendaftar baru</p>
            </div>
            
            <div className="w-full h-[220px] mt-2">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={weeklyTrendData} margin={{ top: 5, right: 5, left: -25, bottom: 0 }}>
                  <defs>
                    <linearGradient id="regGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.15} />
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke={gridColor} vertical={false} />
                  <XAxis
                    dataKey="name"
                    tick={{ fontSize: 12, fill: labelColor }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{ fontSize: 12, fill: labelColor }}
                    axisLine={false}
                    tickLine={false}
                    allowDecimals={false}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: tooltipBg,
                      borderColor: tooltipBorder,
                      borderRadius: 12,
                      boxShadow: '0 10px 40px rgba(0,0,0,0.1)',
                      color: isDark ? '#fff' : '#000',
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="Registrasi"
                    stroke="#3b82f6"
                    strokeWidth={2.5}
                    fillOpacity={1}
                    fill="url(#regGrad)"
                    name="Pendaftaran Baru"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800 overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-800 dark:text-white">Registrasi Terbaru</h3>
              <button
                onClick={() => navigate('/cs/registrations')}
                className="text-xs text-blue-600 hover:text-blue-700 font-semibold flex items-center gap-1 transition-colors"
              >
                Lihat Semua <ArrowRight className="w-3 h-3" />
              </button>
            </div>

            {isLoading ? (
              <LoadingSpinner className="py-12" />
            ) : recentRegs.length === 0 ? (
              <EmptyState message="Belum ada pendaftaran masuk hari ini" />
            ) : (
              <div className="divide-y divide-slate-50 dark:divide-slate-800">
                {recentRegs.map(reg => (
                  <div
                    key={reg.ID}
                    className="p-5 flex items-center justify-between hover:bg-slate-50/55 dark:hover:bg-slate-800/20 transition-colors group"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/25 dark:to-indigo-900/25 flex items-center justify-center flex-shrink-0">
                        <span className="text-blue-700 dark:text-blue-300 font-bold text-sm">
                          {reg.FullName.charAt(0)}
                        </span>
                      </div>
                      <div>
                        <p className="font-semibold text-sm text-slate-800 dark:text-slate-100 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                          {reg.FullName}
                        </p>
                        <div className="flex items-center gap-2 mt-0.5 text-xs text-slate-400 dark:text-slate-500">
                          <span className="font-mono text-[10px] bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded font-semibold text-slate-500 dark:text-slate-400">
                            {reg.CustomerNumber || reg.RegNumber}
                          </span>
                          <span>•</span>
                          <span>{reg.City}</span>
                          <span>•</span>
                          <span>{formatDateTime(reg.CreatedAt)}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <StatusBadge status={reg.Status} />
                      <button
                        onClick={() => setSelected(reg)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-500/10 transition-colors"
                        title="Lihat Detail"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Quick Actions & Office Info */}
        <div className="space-y-6">
          {/* Quick CS Actions */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800 p-5 space-y-4">
            <h3 className="text-sm font-bold text-slate-800 dark:text-white">Menu CS Cepat</h3>
            <div className="grid grid-cols-1 gap-2.5">
              <button
                onClick={() => setShowRegisterModal(true)}
                className="w-full flex items-center justify-between p-3.5 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50/50 hover:bg-blue-50/30 dark:bg-slate-800/20 dark:hover:bg-blue-950/20 hover:border-blue-200 dark:hover:border-blue-900/60 transition-all text-left group"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400">
                    <Plus className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-700 dark:text-slate-200">Registrasi Baru</h4>
                    <p className="text-[10px] text-slate-400 dark:text-slate-500">Daftarkan pelanggan walk-in kantor</p>
                  </div>
                </div>
                <ArrowRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-blue-600 dark:group-hover:text-blue-400 group-hover:translate-x-0.5 transition-all" />
              </button>

              <button
                onClick={() => navigate('/cs/registrations')}
                className="w-full flex items-center justify-between p-3.5 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50/50 hover:bg-blue-50/30 dark:bg-slate-800/20 dark:hover:bg-blue-950/20 hover:border-blue-200 dark:hover:border-blue-900/60 transition-all text-left group"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                    <FileText className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-700 dark:text-slate-200">Semua Registrasi</h4>
                    <p className="text-[10px] text-slate-400 dark:text-slate-500">Tinjau seluruh data pendaftaran</p>
                  </div>
                </div>
                <ArrowRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 group-hover:translate-x-0.5 transition-all" />
              </button>

              <button
                onClick={() => navigate('/cs/customers')}
                className="w-full flex items-center justify-between p-3.5 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50/50 hover:bg-blue-50/30 dark:bg-slate-800/20 dark:hover:bg-blue-950/20 hover:border-blue-200 dark:hover:border-blue-900/60 transition-all text-left group"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-purple-500/10 text-purple-600 dark:text-purple-400">
                    <Users className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-700 dark:text-slate-200">Database Pelanggan</h4>
                    <p className="text-[10px] text-slate-400 dark:text-slate-500">Kelola data pelanggan aktif</p>
                  </div>
                </div>
                <ArrowRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-purple-600 dark:group-hover:text-purple-400 group-hover:translate-x-0.5 transition-all" />
              </button>

              <button
                onClick={() => navigate('/cs/activity')}
                className="w-full flex items-center justify-between p-3.5 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50/50 hover:bg-blue-50/30 dark:bg-slate-800/20 dark:hover:bg-blue-950/20 hover:border-blue-200 dark:hover:border-blue-900/60 transition-all text-left group"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-orange-500/10 text-orange-600 dark:text-orange-400">
                    <Activity className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-700 dark:text-slate-200">Log Aktivitas</h4>
                    <p className="text-[10px] text-slate-400 dark:text-slate-500">Riwayat log aktivitas staff</p>
                  </div>
                </div>
                <ArrowRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-orange-600 dark:group-hover:text-orange-400 group-hover:translate-x-0.5 transition-all" />
              </button>
            </div>
          </div>

          {/* Status Distribution Donut Chart Card */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 shadow-sm border border-slate-100 dark:border-slate-800 flex flex-col justify-between">
            <div className="mb-2">
              <h3 className="text-sm font-bold text-slate-800 dark:text-white">Penyebaran Status</h3>
              <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-0.5">Komposisi status pendaftaran aktif</p>
            </div>

            {statusChartData.length === 0 ? (
              <div className="h-[180px] flex items-center justify-center text-xs text-slate-400">Tidak ada data status</div>
            ) : (
              <>
                <div className="relative w-full h-[180px] flex items-center justify-center mt-2">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={statusChartData}
                        cx="50%"
                        cy="50%"
                        innerRadius={50}
                        outerRadius={70}
                        paddingAngle={4}
                        dataKey="value"
                      >
                        {statusChartData.map((entry, i) => (
                          <Cell key={i} fill={entry.fill} />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{
                          backgroundColor: tooltipBg,
                          borderColor: tooltipBorder,
                          borderRadius: 12,
                          boxShadow: '0 10px 40px rgba(0,0,0,0.1)',
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                  {/* Center Content */}
                  <div className="absolute text-center">
                    <p className="text-2xl font-black text-slate-800 dark:text-white leading-none">
                      {regs.length}
                    </p>
                    <p className="text-[9px] text-slate-400 dark:text-slate-500 font-extrabold uppercase mt-1 leading-none">
                      Total Data
                    </p>
                  </div>
                </div>

                {/* Legend Items */}
                <div className="space-y-1.5 mt-2">
                  {statusChartData.map((entry) => (
                    <div key={entry.name} className="flex items-center justify-between text-xs font-semibold text-slate-600 dark:text-slate-400">
                      <div className="flex items-center gap-2">
                        <div className="w-2.5 h-2.5 rounded-full shadow-sm" style={{ background: entry.fill }} />
                        <span className="truncate max-w-[120px]">{entry.name}</span>
                      </div>
                      <span className="font-bold text-slate-800 dark:text-slate-200">
                        {entry.value} ({((entry.value / regs.length) * 100).toFixed(0)}%)
                      </span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>

          {/* WhatsApp gateway monitor */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800 p-5 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-800 dark:text-white">WhatsApp Notification Gateway</h3>
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
            </div>
            <p className="text-xs text-slate-400 dark:text-slate-500 leading-relaxed">
              Status gateway WhatsApp aktif. Notifikasi otomatis akan dikirim ke calon pelanggan saat status pendaftaran berubah.
            </p>
            <div className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-350 bg-slate-50 dark:bg-slate-800/50 p-2.5 rounded-xl border border-slate-100 dark:border-slate-800/60 font-semibold mt-1">
              <MessageSquare className="w-3.5 h-3.5 text-blue-500" /> Webhook Connected
            </div>
          </div>
        </div>

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
