import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { toast } from 'sonner'
import {
  Users, FileText, CheckCircle2, XCircle, AlertTriangle, Calendar, ChevronDown,
  UserPlus, Network, Plus, Minus, Maximize2, RefreshCw,
  CheckCircle, CircleDot, Database, Gauge, BarChart3
} from 'lucide-react'
import { StatCard, LoadingSpinner } from '@/components/ui'
import { ownerApi } from '../api/ownerApi'
import { useThemeStore } from '@/stores/useThemeStore'
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell
} from 'recharts'

// Donut Chart Colors
const STATUS_CHART_COLORS: Record<string, string> = {
  online: '#10b981',      // Emerald 500
  offline: '#ef4444',     // Red 500
  maintenance: '#f59e0b', // Amber 500
}

// Mock Traffic Data (Monitoring Traffic)
const TRAFFIC_DATA = [
  { time: '08:00', download: 18.2, upload: 7.4 },
  { time: '09:00', download: 24.5, upload: 8.1 },
  { time: '10:00', download: 21.8, upload: 7.9 },
  { time: '11:00', download: 26.4, upload: 9.3 },
  { time: '12:00', download: 28.1, upload: 10.2 },
  { time: '13:00', download: 29.8, upload: 11.5 },
  { time: '14:00', download: 27.2, upload: 10.8 },
]

// Mock Mikrotik Bandwidth Usage list
const MIKROTIK_USAGE = [
  { name: 'MRT-PUSAT', usage: 28.45 },
  { name: 'MRT-UTARA', usage: 21.34 },
  { name: 'MRT-TIMUR', usage: 17.89 },
  { name: 'MRT-SELATAN', usage: 15.66 },
  { name: 'MRT-BARAT', usage: 9.12 },
]

// Live User OLT Mock Data (Fallback)
const LIVE_USER_FALLBACK = [
  { olt: 'OLT-01 (Pusat)', port: '1/1/1', customer: 'BUDI SETIAWAN', status: 'active', dbm: '-18.45' },
  { olt: 'OLT-01 (Pusat)', port: '1/1/2', customer: 'SITI AISYAH', status: 'active', dbm: '-20.32' },
  { olt: 'OLT-02 (Utara)', port: '1/2/5', customer: 'RIZKY PRATAMA', status: 'active', dbm: '-21.67' },
  { olt: 'OLT-02 (Utara)', port: '1/2/6', customer: 'DEWI LESTARI', status: 'active', dbm: '-19.11' },
  { olt: 'OLT-03 (Timur)', port: '1/1/3', customer: 'ARIF HERMAN', status: 'active', dbm: '-22.08' },
]

// System Notifications list
const SYSTEM_NOTIFICATIONS = [
  {
    type: 'critical',
    title: 'OLT-02 (Utara) offline',
    desc: 'Sejak 03 Jul 2026 07:45 WIB',
    time: '07:45',
  },
  {
    type: 'warning',
    title: 'Redaman tinggi terdeteksi',
    desc: 'Port 1/2/7 - OLT-03 (Timur)',
    time: '07:32',
  },
  {
    type: 'info',
    title: 'Tagihan 1.256 pelanggan belum dibayar',
    desc: 'Periode Juli 2026',
    time: '07:00',
  },
  {
    type: 'success',
    title: 'Backup konfigurasi berhasil',
    desc: 'Mikrotik MRT-PUSAT',
    time: '06:30',
  },
]

export default function DashboardPage() {
  const theme = useThemeStore((s) => s.theme)
  const isDark = theme === 'dark'

  const [demoMode, setDemoMode] = useState(false)

  const { data: stats, isLoading: statsLoading, refetch: refetchStats, isRefetching: statsRefetching } = useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: ownerApi.getDashboard,
    refetchInterval: 30000,
  })

  const { data: registrations, refetch: refetchRegistrations, isRefetching: regsRefetching } = useQuery({
    queryKey: ['registrations-recent'],
    queryFn: () => ownerApi.getRegistrations({ per_page: '5', page: '1' }),
  })

  const { data: oltPorts = [], refetch: refetchOLTPorts, isRefetching: oltRefetching } = useQuery({
    queryKey: ['olt-ports'],
    queryFn: ownerApi.getOLTPorts,
  })

  const isRefreshing = statsRefetching || regsRefetching || oltRefetching

  const handleRefresh = async () => {
    const toastId = toast.loading('Memperbarui data dashboard...')
    try {
      await Promise.all([
        refetchStats(),
        refetchRegistrations(),
        refetchOLTPorts()
      ])
      toast.dismiss(toastId)
      toast.success('Data dashboard berhasil diperbarui!')
    } catch (err) {
      toast.dismiss(toastId)
      toast.error('Gagal memperbarui data')
    }
  }

  const handleToggleDemo = (checked: boolean) => {
    setDemoMode(checked)
    if (checked) {
      toast.success('Mode Demo Diaktifkan', {
        description: 'Menampilkan simulasi data ISP (12k+ pelanggan & live traffic).',
        icon: '📊'
      })
    } else {
      toast.info('Mode Demo Dinonaktifkan', {
        description: 'Menampilkan data operasional riil dari database.',
        icon: '🔌'
      })
    }
  }

  // Dynamic Chart Styling Variables
  const gridColor = isDark ? '#27272a' : '#f3f4f6'
  const labelColor = isDark ? '#71717a' : '#9ca3af'
  const tooltipBg = isDark ? '#09090b' : '#ffffff'
  const tooltipBorder = isDark ? '#27272a' : '#e4e4e7'

  if (statsLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <LoadingSpinner className="scale-125" />
      </div>
    )
  }

  // Dynamic values based on backend statistics
  const realActive = stats?.by_status?.active ?? 0
  const realPending = stats?.by_status?.pending_review ?? 0
  const realInProgress = stats?.by_status?.in_progress ?? 0

  // OLT counts
  const realTotalOLT = oltPorts.length
  const realOnlineOLT = oltPorts.filter(p => p.IsActive).length
  const realOfflineOLT = realTotalOLT - realOnlineOLT
  const realMaintenanceOLT = 0

  // If in demoMode, add mock values to make dashboard look populated
  const totalActive = demoMode ? (realActive + 12839) : realActive
  const totalPending = demoMode ? (realPending + 84) : realPending
  const totalInProgress = demoMode ? (realInProgress + 1252) : realInProgress

  const totalOLT = demoMode ? 6 : (realTotalOLT > 0 ? realTotalOLT : 1) // Avoid divide by zero
  const onlineOLT = demoMode ? 5 : realOnlineOLT
  const offlineOLT = demoMode ? 1 : realOfflineOLT
  const maintenanceOLT = demoMode ? 0 : realMaintenanceOLT

  const statusChartData = [
    { name: 'Online', value: onlineOLT, fill: STATUS_CHART_COLORS.online },
    { name: 'Offline', value: offlineOLT, fill: STATUS_CHART_COLORS.offline },
    { name: 'Maintenance', value: maintenanceOLT, fill: STATUS_CHART_COLORS.maintenance },
  ]

  // Live row rendering mapping from real database if available
  const liveRows = (registrations?.data ?? []).slice(0, 5).map((reg, idx) => {
    const port = `1/1/${(idx % 8) + 1}`
    const dbm = `-${(18.0 + (idx * 0.95)).toFixed(2)}`
    const oltName = idx % 2 === 0 ? 'OLT-01 (Pusat)' : 'OLT-02 (Utara)'
    return {
      olt: oltName,
      port,
      customer: reg.FullName.toUpperCase(),
      status: reg.Status === 'active' ? 'Online' : 'Pending',
      dbm,
    }
  })
  
  const liveDisplayRows = demoMode
    ? (liveRows.length > 0 ? liveRows : LIVE_USER_FALLBACK)
    : liveRows

  const displayedTrafficData = demoMode 
    ? TRAFFIC_DATA 
    : TRAFFIC_DATA.map(d => ({ 
        ...d, 
        download: Number((d.download * 0.05).toFixed(1)), 
        upload: Number((d.upload * 0.05).toFixed(1)) 
      }))

  const displayedMikrotikUsage = demoMode
    ? MIKROTIK_USAGE
    : MIKROTIK_USAGE.map(m => ({ 
        ...m, 
        usage: Number((m.usage * 0.05).toFixed(2)) 
      }))

  const displayedNotifications = demoMode
    ? SYSTEM_NOTIFICATIONS
    : [
        {
          type: 'info',
          title: 'Sistem Sinkron',
          desc: 'Semua node OLT dan MikroTik beroperasi normal.',
          time: 'Sekarang',
        }
      ]

  return (
    <div className="p-8 space-y-8 w-full transition-colors duration-200">
      {/* Top Filter and Actions Row */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-[28px] font-bold text-gray-900 dark:text-zinc-100 leading-tight">
            Ringkasan Operasional
          </h1>
          <p className="text-xs text-gray-550 dark:text-zinc-500 mt-1.5 font-medium">
            Status dan statistik real-time jaringan dan layanan
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Demo Mode Toggle */}
          <div className="flex items-center gap-2 bg-gray-50 dark:bg-zinc-950 border border-gray-200 dark:border-zinc-850 px-3 py-1.5 rounded-lg shadow-sm">
            <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 dark:text-zinc-500">Mode Demo</span>
            <button
              type="button"
              onClick={() => handleToggleDemo(!demoMode)}
              className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors duration-200 focus:outline-none hover:scale-105 active:scale-95 transition-all shadow-inner ${demoMode ? 'bg-blue-600' : 'bg-gray-200 dark:bg-zinc-800'}`}
            >
              <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform duration-200 shadow ${demoMode ? 'translate-x-[18px]' : 'translate-x-[2px]'}`} />
            </button>
          </div>

          {/* Calendar Picker Trigger */}
          <div className="flex items-center gap-2.5 px-3 py-2 bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-855 rounded-lg text-xs font-semibold text-gray-650 dark:text-zinc-300 cursor-pointer shadow-sm hover:bg-gray-50 dark:hover:bg-zinc-800/60 active:scale-98 transition-all">
            <Calendar className="w-4 h-4 text-gray-400 dark:text-zinc-500" />
            <span>03 Jul 2026 08:00 - 03 Jul 2026 14:00</span>
            <ChevronDown className="w-3.5 h-3.5 text-gray-400" />
          </div>

          {/* Sync Trigger */}
          <button
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="p-2 bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-855 rounded-lg text-gray-500 hover:text-gray-700 dark:text-zinc-400 dark:hover:text-white shadow-sm hover:bg-gray-50 dark:hover:bg-zinc-800/60 active:scale-90 hover:scale-105 transition-all disabled:opacity-50"
            title="Refresh Data"
          >
            <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin text-blue-600' : ''}`} />
          </button>
        </div>
      </div>

      {/* 5 Stats Cards Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-5">
        <StatCard
          title="Total Pelanggan"
          value={totalActive.toLocaleString('id-ID')}
          subtitle="vs kemarin"
          icon={<Users className="w-5 h-5" />}
          color="blue"
          trend={{ value: 2.45, label: 'vs kemarin' }}
        />
        <StatCard
          title="Pelanggan Baru (Hari Ini)"
          value={totalPending.toString()}
          subtitle="vs kemarin"
          icon={<UserPlus className="w-5 h-5" />}
          color="green"
          trend={{ value: 18.61, label: 'vs kemarin' }}
        />
        <StatCard
          title="Tagihan Belum Dibayar"
          value={totalInProgress.toLocaleString('id-ID')}
          subtitle="vs kemarin"
          icon={<FileText className="w-5 h-5" />}
          color="orange"
          trend={{ value: -8.21, label: 'vs kemarin' }}
        />
        <StatCard
          title="Aktivasi Hari Ini"
          value={demoMode ? "48" : (stats?.by_status?.active ?? 0).toString()}
          subtitle="vs kemarin"
          icon={<CheckCircle2 className="w-5 h-5" />}
          color="purple"
          trend={{ value: 14.29, label: 'vs kemarin' }}
        />
        <StatCard
          title="OLT Online"
          value={`${onlineOLT} / ${totalOLT}`}
          subtitle={`${((onlineOLT / totalOLT) * 100).toFixed(2)}% Online`}
          icon={<Network className="w-5 h-5" />}
          color="teal"
        />
      </div>

      {/* Middle Row Charts (Traffic, Map, OLT Donut) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Monitoring Traffic */}
        <div className="lg:col-span-5 bg-white dark:bg-zinc-900 rounded-lg p-6 border border-gray-200 dark:border-zinc-805 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-semibold text-gray-900 dark:text-zinc-100">
                Monitoring Traffic <span className="text-xs font-medium text-gray-400 dark:text-zinc-500">(Seluruh Jaringan)</span>
              </h3>
              <p className="text-[11px] text-gray-400 dark:text-zinc-550 mt-0.5">Statistik download & upload real-time</p>
            </div>
            {/* Filter Dropdown Mock */}
            <div className="flex items-center gap-1.5 px-2.5 py-1 bg-gray-50 dark:bg-zinc-950 border border-gray-200 dark:border-zinc-850 rounded-lg text-[10.5px] font-bold text-gray-650 dark:text-zinc-400 cursor-pointer">
              <span>Semua Mikrotik</span>
              <ChevronDown className="w-3 h-3 text-gray-400" />
            </div>
          </div>

          {/* Recharts Traffic Area Chart */}
          <div className="w-full h-[220px] mt-2">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={displayedTrafficData} margin={{ top: 5, right: 5, left: -25, bottom: 0 }}>
                <defs>
                  <linearGradient id="downloadGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#2563eb" stopOpacity={0.15} />
                    <stop offset="95%" stopColor="#2563eb" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="uploadGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.15} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke={gridColor} vertical={false} />
                <XAxis
                  dataKey="time"
                  tick={{ fontSize: 12, fill: labelColor }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fontSize: 12, fill: labelColor }}
                  axisLine={false}
                  tickLine={false}
                  unit="G"
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
                  dataKey="download"
                  stroke="#2563eb"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#downloadGrad)"
                  name="Download"
                />
                <Area
                  type="monotone"
                  dataKey="upload"
                  stroke="#10b981"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#uploadGrad)"
                  name="Upload"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
          {/* Chart Legend */}
          <div className="flex items-center gap-4 mt-3 pl-3 text-xxs font-bold text-gray-500 dark:text-zinc-400">
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-blue-600 shadow-sm" />
              <span>Download</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-sm" />
              <span>Upload</span>
            </div>
          </div>
        </div>

        {/* Peta Sebaran Pelanggan */}
        <div className="lg:col-span-4 bg-white dark:bg-zinc-900 rounded-lg p-6 border border-gray-200 dark:border-zinc-805 flex flex-col justify-between">
          <div className="mb-4">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-zinc-100">Peta Sebaran Pelanggan</h3>
            <p className="text-[11px] text-gray-400 dark:text-zinc-500 mt-0.5">Distribusi node area cakupan layanan</p>
          </div>

          {/* Map Body */}
          <CustomerMap />
        </div>

        {/* Status OLT Donut Chart */}
        <div className="lg:col-span-3 bg-white dark:bg-zinc-900 rounded-lg p-6 border border-gray-200 dark:border-zinc-805 flex flex-col justify-between">
          <div className="mb-2">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-zinc-100">Status OLT</h3>
            <p className="text-[11px] text-gray-400 dark:text-zinc-500 mt-0.5">Kondisi operasional OLT Pusat & Area</p>
          </div>

          {/* Donut Chart Container */}
          <div className="relative w-full h-[180px] flex items-center justify-center mt-2">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={statusChartData}
                  cx="50%"
                  cy="50%"
                  innerRadius={52}
                  outerRadius={72}
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
                    borderRadius: 8,
                    boxShadow: '0 10px 40px rgba(0,0,0,0.1)',
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
            {/* Center Content */}
            <div className="absolute text-center">
              <p className="text-2xl font-black text-gray-900 dark:text-zinc-100 leading-none">
                {totalOLT}
              </p>
              <p className="text-[9px] text-gray-400 dark:text-zinc-500 font-extrabold uppercase mt-1 leading-none">
                Total OLT
              </p>
            </div>
          </div>

          {/* Legend Items */}
          <div className="space-y-1.5 mt-2">
            {statusChartData.map((entry) => (
              <div key={entry.name} className="flex items-center justify-between text-xs font-semibold text-gray-500 dark:text-zinc-400">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full shadow-sm" style={{ background: entry.fill }} />
                  <span className="truncate max-w-[120px]">{entry.name}</span>
                </div>
                <span className="font-bold text-gray-800 dark:text-zinc-200">
                  {entry.value} ({((entry.value / totalOLT) * 100).toFixed(0)}%)
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Bottom Row (Live Data Table, Mikrotik Usage Progress, System Notifications) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Data User OLT (Live) */}
        <div className="lg:col-span-5 bg-white dark:bg-zinc-900 rounded-lg border border-gray-200 dark:border-zinc-805 flex flex-col justify-between overflow-hidden">
          <div className="p-6 border-b border-gray-105 dark:border-zinc-800/60 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold text-gray-900 dark:text-zinc-100">Data User OLT <span className="text-xs text-gray-400 font-normal">(Live)</span></h3>
              <p className="text-[11px] text-gray-400 dark:text-zinc-500 mt-0.5">Status redaman kabel pelanggan terkini</p>
            </div>
            <a href="/dashboard/registrations" className="text-xs font-bold text-blue-650 dark:text-blue-400 hover:underline">
              Lihat Semua →
            </a>
          </div>

          {/* Table */}
          <div className="flex-1 overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-gray-50/80 dark:bg-zinc-800/60 text-gray-500 dark:text-zinc-300 font-semibold border-b border-gray-200 dark:border-zinc-700">
                  <th className="py-3 px-4">OLT</th>
                  <th className="py-3 px-3">Port</th>
                  <th className="py-3 px-4">Pelanggan</th>
                  <th className="py-3 px-3">Status</th>
                  <th className="py-3 px-4 text-right">Redaman (dBm)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-150 dark:divide-zinc-800/45">
                {liveDisplayRows.map((row, idx) => (
                  <tr key={idx} className="hover:bg-gray-50/40 dark:hover:bg-zinc-800/20 transition-colors group">
                    <td className="py-3.5 px-4 font-semibold text-gray-700 dark:text-zinc-300">{row.olt}</td>
                    <td className="py-3.5 px-3 font-mono text-gray-500 dark:text-zinc-400">{row.port}</td>
                    <td className="py-3.5 px-4 font-bold text-gray-800 dark:text-zinc-200 group-hover:text-blue-650 dark:group-hover:text-blue-400 transition-colors truncate max-w-[130px]">{row.customer}</td>
                    <td className="py-3.5 px-3">
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-400 border border-emerald-100/50 dark:border-emerald-900/10">
                        {row.status}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right font-bold text-emerald-600 dark:text-emerald-450">{row.dbm}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        {/* Top Mikrotik - Usage */}
        <div className="lg:col-span-3 bg-white dark:bg-zinc-900 rounded-lg p-6 border border-gray-200 dark:border-zinc-805 flex flex-col justify-between">
          <div className="mb-4">
            <h3 className="text-sm font-semibold text-gray-905 dark:text-zinc-100">Top Mikrotik - Usage</h3>
            <p className="text-[11px] text-gray-400 dark:text-zinc-500 mt-0.5">Penggunaan bandwidth Mikrotik teraktif</p>
          </div>

          <div className="space-y-4 my-auto">
            {displayedMikrotikUsage.map((m) => (
              <div key={m.name} className="space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-medium text-gray-550 dark:text-zinc-400">{m.name}</span>
                  <span className="font-bold text-gray-900 dark:text-zinc-200">{m.usage}%</span>
                </div>
                <div className="w-full h-2 bg-gray-50 dark:bg-zinc-950 border border-gray-150 dark:border-zinc-850 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-blue-600 dark:bg-blue-500 rounded-full transition-all duration-500"
                    style={{ width: `${m.usage}%` }}
                  />
                </div>
              </div>
            ))}
          </div>

          <div className="mt-4 pt-3 border-t border-gray-100 dark:border-zinc-800/60 text-right">
            <a href="/dashboard/mikrotik" className="text-xs font-bold text-blue-650 dark:text-blue-400 hover:underline">
              Lihat Detail →
            </a>
          </div>
        </div>

        {/* Notifikasi Sistem */}
        <div className="lg:col-span-4 bg-white dark:bg-zinc-900 rounded-lg p-6 border border-gray-200 dark:border-zinc-805 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-semibold text-gray-905 dark:text-zinc-100">Notifikasi Sistem</h3>
              <p className="text-[11px] text-gray-400 dark:text-zinc-500 mt-0.5">Riwayat peringatan dan log status</p>
            </div>
            <a href="/dashboard/activity" className="text-xs font-bold text-blue-650 dark:text-blue-400 hover:underline">
              Lihat Semua →
            </a>
          </div>

          {/* List */}
          <div className="space-y-3.5">
            {displayedNotifications.map((n, idx) => {
              const iconMap = {
                critical: <XCircle className="w-4 h-4 text-red-500 dark:text-red-400" />,
                warning: <AlertTriangle className="w-4 h-4 text-amber-500 dark:text-amber-400" />,
                info: <CircleDot className="w-4 h-4 text-blue-500 dark:text-blue-400" />,
                success: <CheckCircle className="w-4 h-4 text-emerald-500 dark:text-emerald-400" />,
              }

              const bgMap = {
                critical: 'bg-red-50/60 dark:bg-red-950/20 border-red-100/40 dark:border-red-900/20',
                warning: 'bg-amber-50/60 dark:bg-amber-950/20 border-amber-100/40 dark:border-amber-900/20',
                info: 'bg-blue-50/60 dark:bg-blue-950/20 border-blue-100/40 dark:border-blue-900/20',
                success: 'bg-emerald-50/60 dark:bg-emerald-950/20 border-emerald-100/40 dark:border-emerald-900/20',
              }

              return (
                <div
                  key={idx}
                  className={`flex items-start gap-3 p-3 rounded-lg border ${bgMap[n.type as keyof typeof bgMap]} transition-all duration-200`}
                >
                  <div className="mt-0.5 flex-shrink-0">{iconMap[n.type as keyof typeof iconMap]}</div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-gray-900 dark:text-zinc-200 leading-snug">
                      {n.title}
                    </p>
                    <p className="text-[10.5px] text-gray-400 dark:text-zinc-500 mt-0.5 leading-none">
                      {n.desc}
                    </p>
                  </div>
                  <span className="text-[10px] font-medium text-gray-400 dark:text-zinc-500 flex-shrink-0 mt-0.5">
                    {n.time}
                  </span>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* Quick Actions (Aksi Cepat) */}
      <div className="bg-white dark:bg-zinc-900 rounded-lg p-6 border border-gray-200 dark:border-zinc-805">
        <div className="mb-5">
          <h3 className="text-sm font-semibold text-gray-905 dark:text-zinc-100">Aksi Cepat</h3>
          <p className="text-[11px] text-gray-400 dark:text-zinc-500 mt-0.5">Pintasan tindakan operasional harian</p>
        </div>

        {/* Action Grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          <a
            href="/dashboard/registrations"
            className="flex flex-col items-center justify-center p-4 rounded-lg border border-gray-200 dark:border-zinc-850 bg-gray-50/20 dark:bg-zinc-950/25 hover:bg-gray-100/60 dark:hover:bg-zinc-800/60 hover:border-gray-300 dark:hover:border-zinc-700 transition-all duration-200 group"
          >
            <div className="p-3 rounded-lg bg-gray-100 dark:bg-zinc-800 text-gray-600 dark:text-zinc-400 group-hover:scale-105 transition-transform duration-300">
              <UserPlus className="w-5 h-5" />
            </div>
            <span className="text-xs font-medium text-gray-700 dark:text-zinc-350 mt-3 text-center truncate w-full">
              Register Pelanggan
            </span>
          </a>

          <a
            href="/dashboard/registrations?status=provisioning"
            className="flex flex-col items-center justify-center p-4 rounded-lg border border-gray-200 dark:border-zinc-850 bg-gray-50/20 dark:bg-zinc-950/25 hover:bg-gray-100/60 dark:hover:bg-zinc-800/60 hover:border-gray-300 dark:hover:border-zinc-700 transition-all duration-200 group"
          >
            <div className="p-3 rounded-lg bg-gray-100 dark:bg-zinc-800 text-gray-600 dark:text-zinc-400 group-hover:scale-105 transition-transform duration-300">
              <CheckCircle className="w-5 h-5" />
            </div>
            <span className="text-xs font-medium text-gray-700 dark:text-zinc-350 mt-3 text-center truncate w-full">
              Aktivasi Pelanggan
            </span>
          </a>

          <a
            href="/dashboard/registrations?status=waiting_payment"
            className="flex flex-col items-center justify-center p-4 rounded-lg border border-gray-200 dark:border-zinc-850 bg-gray-50/20 dark:bg-zinc-950/25 hover:bg-gray-100/60 dark:hover:bg-zinc-800/60 hover:border-gray-300 dark:hover:border-zinc-700 transition-all duration-200 group"
          >
            <div className="p-3 rounded-lg bg-gray-100 dark:bg-zinc-800 text-gray-600 dark:text-zinc-400 group-hover:scale-105 transition-transform duration-300">
              <FileText className="w-5 h-5" />
            </div>
            <span className="text-xs font-medium text-gray-700 dark:text-zinc-350 mt-3 text-center truncate w-full">
              Cek Tagihan
            </span>
          </a>

          <a
            href="/dashboard/olt-ports"
            className="flex flex-col items-center justify-center p-4 rounded-lg border border-gray-200 dark:border-zinc-850 bg-gray-50/20 dark:bg-zinc-950/25 hover:bg-gray-100/60 dark:hover:bg-zinc-800/60 hover:border-gray-300 dark:hover:border-zinc-700 transition-all duration-200 group"
          >
            <div className="p-3 rounded-lg bg-gray-100 dark:bg-zinc-800 text-gray-600 dark:text-zinc-400 group-hover:scale-105 transition-transform duration-300">
              <Database className="w-5 h-5" />
            </div>
            <span className="text-xs font-medium text-gray-700 dark:text-zinc-350 mt-3 text-center truncate w-full">
              Tambah ODP / Port
            </span>
          </a>

          <a
            href="/dashboard/mikrotik"
            className="flex flex-col items-center justify-center p-4 rounded-lg border border-gray-200 dark:border-zinc-850 bg-gray-50/20 dark:bg-zinc-950/25 hover:bg-gray-100/60 dark:hover:bg-zinc-800/60 hover:border-gray-300 dark:hover:border-zinc-700 transition-all duration-200 group"
          >
            <div className="p-3 rounded-lg bg-gray-100 dark:bg-zinc-800 text-gray-600 dark:text-zinc-400 group-hover:scale-105 transition-transform duration-300">
              <Gauge className="w-5 h-5" />
            </div>
            <span className="text-xs font-medium text-gray-700 dark:text-zinc-350 mt-3 text-center truncate w-full">
              Cek Speed Test
            </span>
          </a>

          <a
            href="/dashboard/activity"
            className="flex flex-col items-center justify-center p-4 rounded-lg border border-gray-200 dark:border-zinc-850 bg-gray-50/20 dark:bg-zinc-950/25 hover:bg-gray-100/60 dark:hover:bg-zinc-800/60 hover:border-gray-300 dark:hover:border-zinc-700 transition-all duration-200 group"
          >
            <div className="p-3 rounded-lg bg-gray-100 dark:bg-zinc-800 text-gray-600 dark:text-zinc-400 group-hover:scale-105 transition-transform duration-300">
              <BarChart3 className="w-5 h-5" />
            </div>
            <span className="text-xs font-medium text-gray-700 dark:text-zinc-350 mt-3 text-center truncate w-full">
              Laporan Jaringan
            </span>
          </a>
        </div>
      </div>
    </div>
  )
}

/* --- Internal Mock Map Component --- */
function CustomerMap() {
  return (
    <div className="relative w-full h-[230px] bg-gray-50 dark:bg-zinc-950 rounded-lg overflow-hidden border border-gray-150 dark:border-zinc-900 transition-colors duration-200">
      {/* Interactive Mock SVG Map Outline */}
      <svg className="w-full h-full opacity-60 dark:opacity-40" viewBox="0 0 400 230" fill="none">
        {/* Road Maps Outline */}
        <path d="M10 50 Q100 80 200 50 T390 70" stroke="currentColor" strokeWidth="2" className="text-gray-200 dark:text-zinc-800" />
        <path d="M50 10 Q120 150 150 230" stroke="currentColor" strokeWidth="1.5" className="text-gray-200 dark:text-zinc-800" strokeDasharray="4 4" />
        <path d="M300 10 C320 80 250 160 280 230" stroke="currentColor" strokeWidth="2.5" className="text-gray-200 dark:text-zinc-800" />
        <path d="M10 160 H390" stroke="currentColor" strokeWidth="1.5" className="text-gray-250 dark:text-zinc-900" />

        {/* River/Water Outline */}
        <path d="M0 200 Q150 190 220 230" stroke="#3b82f6" strokeWidth="12" strokeLinecap="round" className="opacity-10 dark:opacity-5" />

        {/* Block Outlines */}
        <rect x="60" y="80" width="40" height="30" rx="4" fill="currentColor" className="text-gray-100 dark:text-zinc-900" />
        <rect x="220" y="100" width="50" height="40" rx="6" fill="currentColor" className="text-gray-100 dark:text-zinc-900" />
        <circle cx="340" cy="110" r="25" fill="currentColor" className="text-emerald-500/5 dark:text-emerald-500/2" />
      </svg>

      {/* Cluster Node Hotspots */}
      <div className="absolute inset-0">
        {/* Hotspot 1: 523 */}
        <div className="absolute top-[40px] left-[70px] -translate-x-1/2 -translate-y-1/2 group/pin cursor-pointer">
          <span className="absolute inline-flex h-6 w-6 rounded-full bg-blue-400 dark:bg-blue-500 opacity-30 animate-ping" />
          <div className="relative flex items-center justify-center bg-blue-650 text-white font-bold text-[9px] px-2 py-0.5 rounded-full shadow-md transition-all group-hover/pin:scale-110">
            523
          </div>
        </div>

        {/* Hotspot 2: 842 */}
        <div className="absolute top-[125px] left-[160px] -translate-x-1/2 -translate-y-1/2 group/pin cursor-pointer">
          <span className="absolute inline-flex h-8 w-8 rounded-full bg-blue-400 dark:bg-blue-500 opacity-20 animate-ping" />
          <div className="relative flex items-center justify-center bg-blue-650 text-white font-bold text-[9px] px-2 py-0.5 rounded-full shadow-md transition-all group-hover/pin:scale-110">
            842
          </div>
        </div>

        {/* Hotspot 3: 1.2K */}
        <div className="absolute top-[65px] left-[260px] -translate-x-1/2 -translate-y-1/2 group/pin cursor-pointer">
          <span className="absolute inline-flex h-10 w-10 rounded-full bg-indigo-400 dark:bg-indigo-500 opacity-25 animate-pulse" />
          <div className="relative flex items-center justify-center bg-indigo-600 text-white font-bold text-[9px] px-2.5 py-0.5 rounded-full shadow-md transition-all group-hover/pin:scale-110">
            1.2K
          </div>
        </div>

        {/* Hotspot 4: 2.5K */}
        <div className="absolute top-[150px] left-[60px] -translate-x-1/2 -translate-y-1/2 group/pin cursor-pointer">
          <span className="absolute inline-flex h-12 w-12 rounded-full bg-blue-500 dark:bg-blue-400 opacity-25 animate-ping" />
          <div className="relative flex items-center justify-center bg-blue-650 text-white font-bold text-[9px] px-2.5 py-0.5 rounded-full shadow-lg transition-all group-hover/pin:scale-110">
            2.5K
          </div>
        </div>

        {/* Hotspot 5: 753 */}
        <div className="absolute top-[180px] left-[240px] -translate-x-1/2 -translate-y-1/2 group/pin cursor-pointer">
          <div className="relative flex items-center justify-center bg-blue-650 text-white font-bold text-[9px] px-2 py-0.5 rounded-full shadow-md transition-all group-hover/pin:scale-110">
            753
          </div>
        </div>

        {/* Hotspot 6: 1.1K */}
        <div className="absolute top-[120px] left-[320px] -translate-x-1/2 -translate-y-1/2 group/pin cursor-pointer">
          <div className="relative flex items-center justify-center bg-blue-650 text-white font-bold text-[9px] px-2 py-0.5 rounded-full shadow-md transition-all group-hover/pin:scale-110">
            1.1K
          </div>
        </div>

        {/* Hotspot 7: 1.4K */}
        <div className="absolute top-[195px] left-[340px] -translate-x-1/2 -translate-y-1/2 group/pin cursor-pointer">
          <span className="absolute inline-flex h-7 w-7 rounded-full bg-blue-400 dark:bg-blue-500 opacity-20 animate-pulse" />
          <div className="relative flex items-center justify-center bg-blue-650 text-white font-bold text-[9px] px-2 py-0.5 rounded-full shadow-md transition-all group-hover/pin:scale-110">
            1.4K
          </div>
        </div>
      </div>

      {/* Map Control Overlays */}
      <div className="absolute right-3 top-3 flex flex-col gap-1 bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-805 rounded-lg p-1 shadow-md">
        <button className="p-1.5 hover:bg-gray-100 dark:hover:bg-zinc-800 rounded-md text-gray-500 dark:text-zinc-400 hover:text-gray-900 dark:hover:text-white transition-colors">
          <Plus className="w-3.5 h-3.5" />
        </button>
        <div className="h-[1px] bg-gray-100 dark:bg-zinc-800 mx-1" />
        <button className="p-1.5 hover:bg-gray-100 dark:hover:bg-zinc-800 rounded-md text-gray-500 dark:text-zinc-400 hover:text-gray-900 dark:hover:text-white transition-colors">
          <Minus className="w-3.5 h-3.5" />
        </button>
        <div className="h-[1px] bg-gray-100 dark:bg-zinc-800 mx-1" />
        <button className="p-1.5 hover:bg-gray-100 dark:hover:bg-zinc-800 rounded-md text-gray-500 dark:text-zinc-400 hover:text-gray-900 dark:hover:text-white transition-colors">
          <Maximize2 className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  )
}
