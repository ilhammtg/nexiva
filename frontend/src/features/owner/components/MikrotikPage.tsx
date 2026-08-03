import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { 
  Plus, Pencil, Trash2, Loader2, Wifi, WifiOff, RefreshCw, 
  Activity, Server, FileText, Database, 
  Trash, X, Power, ArrowUpRight, ArrowDownLeft, ArrowLeft,
  Eye, EyeOff
} from 'lucide-react'
import { ownerApi } from '../api/ownerApi'
import { LoadingSpinner, EmptyState } from '@/components/ui'
import { formatDateTime } from '@/lib/utils'
import type { MikrotikConfig } from '../types'
import { toast } from 'sonner'
import { useThemeStore } from '@/stores/useThemeStore'
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'

// Seeded client details for realistic simulation
const SEEDED_CLIENTS = [
  { username: 'jsn_repeater_ulee', name: 'REPEATER_ULEE_JALAN', ip: '10.100.10.2', mac: 'FC:EC:DA:11:22:01', profile: 'PKT-HOME-50' },
  { username: 'jsn_sdn3_ulee', name: 'SDN3_ULEE_JALAN_PEUSANGAN_SELATAN', ip: '10.100.10.3', mac: 'FC:EC:DA:11:22:02', profile: 'PKT-PRO-100' },
  { username: 'jsn_rizal_ulee', name: 'WARUNG_M_RIZAL_ULEE_JALAN', ip: '10.100.10.4', mac: 'FC:EC:DA:11:22:03', profile: 'PKT-HOME-20' },
  { username: 'jsn_yusnidar_ulee', name: 'YUSNIDAR_ULEE_JALAN', ip: '10.100.10.5', mac: 'FC:EC:DA:11:22:04', profile: 'PKT-HOME-20' },
  { username: 'jsn_test_china', name: 'TEST_MODEM_CHINA_5G_BARU', ip: '10.100.10.6', mac: 'FC:EC:DA:11:22:05', profile: 'PKT-BIZ-200' },
  { username: 'jsn_test_f663', name: 'TEST_MODEM_F663_NEW', ip: '10.100.10.7', mac: 'FC:EC:DA:11:22:06', profile: 'PKT-HOME-20' },
  { username: 'jsn_test_gm220', name: 'TEST_MODEM_GM220NEW', ip: '10.100.10.8', mac: 'FC:EC:DA:11:22:07', profile: 'PKT-HOME-20' },
  { username: 'jsn_test_f660', name: 'TEST_F660V8_NEW', ip: '10.100.10.9', mac: 'FC:EC:DA:11:22:08', profile: 'PKT-HOME-20' },
  { username: 'jsn_test_hioso', name: 'TEST_SERVER_HIOSO_F670', ip: '10.100.10.10', mac: 'FC:EC:DA:11:22:09', profile: 'PKT-HOME-50' },
  { username: 'jsn_test_gm630', name: 'TEST_GM_630_5G', ip: '10.100.10.11', mac: 'FC:EC:DA:11:22:10', profile: 'PKT-HOME-20' },
  { username: 'jsn_m22x_blang', name: 'TEST_M22X_BLANG_DALAM', ip: '10.100.10.12', mac: 'FC:EC:DA:11:22:11', profile: 'PKT-HOME-20' },
  { username: 'jsn_test_m69x', name: 'TEST_MODEM_M69X', ip: '10.100.10.13', mac: 'FC:EC:DA:11:22:12', profile: 'PKT-LITE-10' },
  { username: 'jsn_kantor_desa', name: 'KANTOR_DESA_PEUSANGAN_SELATAN', ip: '10.100.10.14', mac: 'FC:EC:DA:11:22:13', profile: 'PKT-HOME-50' },
  { username: 'jsn_warkop_didi', name: 'WARKOP_DIDI_PEUSANGAN', ip: '10.100.10.15', mac: 'FC:EC:DA:11:22:14', profile: 'PKT-HOME-20' },
  { username: 'jsn_klinik_utara', name: 'KLINIK_KESEHATAN_UTARA', ip: '10.100.10.16', mac: 'FC:EC:DA:11:22:15', profile: 'PKT-PRO-100' },
  { username: 'jsn_kafe_kuta', name: 'KAFE_KUTA_BARO_UTARA', ip: '10.100.10.17', mac: 'FC:EC:DA:11:22:16', profile: 'PKT-HOME-20' }
]

function MikrotikModal({ config, onClose }: { config?: MikrotikConfig; onClose: () => void }) {
  const qc = useQueryClient()
  const [form, setForm] = useState({
    name: config?.name ?? '',
    host: config?.host ?? '',
    port: config?.port ?? 443,
    username: config?.username ?? '',
    password: '',
    is_active: config?.is_active ?? true,
  })

  const mut = useMutation({
    mutationFn: () =>
      config
        ? ownerApi.updateMikrotikConfig(config.id, form)
        : ownerApi.createMikrotikConfig(form),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['mikrotik'] })
      toast.success(config ? 'Konfigurasi diperbarui' : 'Mikrotik ditambahkan')
      onClose()
    },
    onError: () => toast.error('Gagal menyimpan'),
  })

  return (
    <div className="fixed inset-0 bg-black/45 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fadeIn">
      <div className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-805 rounded-lg shadow-xl w-full max-w-md overflow-hidden transform scale-95 transition-all">
        <div className="px-6 py-4 border-b border-gray-150 dark:border-zinc-850 flex items-center justify-between bg-gray-50/50 dark:bg-zinc-955/40">
          <h3 className="font-semibold text-gray-900 dark:text-zinc-100 text-sm">{config ? 'Edit Router Mikrotik' : 'Tambah Router Mikrotik'}</h3>
          <button onClick={onClose} className="p-2 rounded-md hover:bg-gray-100 dark:hover:bg-zinc-800 text-gray-450">✕</button>
        </div>
        <div className="p-6 space-y-4">
          {[
            { label: 'Nama Router', key: 'name', placeholder: 'Mikrotik Utama' },
            { label: 'IP Remote / Host', key: 'host', placeholder: '192.168.1.1' },
            { label: 'Username API', key: 'username', placeholder: 'admin' },
          ].map(({ label, key, placeholder }) => (
            <div key={key}>
              <label className="block text-[10px] font-bold text-gray-500 dark:text-zinc-450 mb-1.5 uppercase tracking-wider">{label}</label>
              <input
                value={(form as any)[key]}
                onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
                placeholder={placeholder}
                className="w-full px-3 py-2 rounded-md bg-white dark:bg-zinc-950 border border-gray-255 dark:border-zinc-800 text-gray-900 dark:text-zinc-100 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium placeholder-gray-400"
              />
            </div>
          ))}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[10px] font-bold text-gray-500 dark:text-zinc-450 mb-1.5 uppercase tracking-wider">Port API</label>
              <input
                type="number"
                value={form.port}
                onChange={(e) => setForm((f) => ({ ...f, port: Number(e.target.value) }))}
                className="w-full px-3 py-2 rounded-md bg-white dark:bg-zinc-950 border border-gray-255 dark:border-zinc-800 text-gray-900 dark:text-zinc-100 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium"
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-gray-500 dark:text-zinc-450 mb-1.5 uppercase tracking-wider">
                Password
              </label>
              <input
                type="password"
                value={form.password}
                onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
                placeholder={config ? '••••••' : 'Password baru'}
                className="w-full px-3 py-2 rounded-md bg-white dark:bg-zinc-950 border border-gray-255 dark:border-zinc-800 text-gray-900 dark:text-zinc-100 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium placeholder-gray-400"
              />
            </div>
          </div>
        </div>
        <div className="px-6 py-4 border-t border-gray-150 dark:border-zinc-850 flex gap-3 justify-end bg-gray-50/50 dark:bg-zinc-955/40">
          <button onClick={onClose} className="px-3 py-1.5 rounded-md text-xs text-gray-650 dark:text-zinc-400 hover:bg-gray-100 dark:hover:bg-zinc-800 font-semibold transition-colors">Batal</button>
          <button
            onClick={() => mut.mutate()}
            disabled={mut.isPending}
            className="px-4 py-1.5 rounded-md bg-blue-600 text-white text-xs font-semibold hover:bg-blue-700 disabled:opacity-60 flex items-center gap-2"
          >
            {mut.isPending && <Loader2 className="w-4 h-4 animate-spin" />} Simpan
          </button>
        </div>
      </div>
    </div>
  )
}

export default function MikrotikPage() {
  const qc = useQueryClient()
  const theme = useThemeStore((s) => s.theme)
  const isDark = theme === 'dark'

  const [modal, setModal] = useState<'new' | MikrotikConfig | null>(null)
  const [selectedConfig, setSelectedConfig] = useState<MikrotikConfig | null>(null)
  
  // Selected Router Details State (Stateful Dummy Data)
  const [activeConns, setActiveConns] = useState<any[]>([])
  const [secrets, setSecrets] = useState<any[]>([])
  const [logs, setLogs] = useState<any[]>([])
  const [cpuUsage, setCpuUsage] = useState(12)
  const [ramUsed, setRamUsed] = useState(768)
  const [txRate, setTxRate] = useState(45.2)
  const [rxRate, setRxRate] = useState(5.1)
  const [trafficHistory, setTrafficHistory] = useState<any[]>([])
  
  const [activeSearch, setActiveSearch] = useState('')
  const [secretSearch, setSecretSearch] = useState('')
  const [activeTab, setActiveTab] = useState<'active' | 'secrets' | 'resources' | 'traffic' | 'logs'>('active')

  // States for adding a PPPoE secret in a beautiful modal
  const [showAddSecretModal, setShowAddSecretModal] = useState(false)
  const [newSecretForm, setNewSecretForm] = useState({ username: '', password: '', profile: 'default' })
  const [showSecretModalPassword, setShowSecretModalPassword] = useState(false)
  const [visiblePasswords, setVisiblePasswords] = useState<Record<string, boolean>>({})

  // State for delete confirmation modal
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null)

  const { data: configs, isLoading } = useQuery({
    queryKey: ['mikrotik'],
    queryFn: ownerApi.getMikrotikConfigs,
  })

  // Detect if mock
  const isMock = !selectedConfig || selectedConfig.id.startsWith('30000000-')

  // Real-time React Query Hooks for physical Mikrotik routeros connection
  const { data: resources } = useQuery({
    queryKey: ['mikrotik-resources', selectedConfig?.id],
    queryFn: () => ownerApi.getMikrotikResources(selectedConfig!.id),
    enabled: !!selectedConfig && !isMock && activeTab === 'resources',
    refetchInterval: activeTab === 'resources' ? 3000 : false,
  })

  const { data: activeConnections, refetch: refetchActive } = useQuery({
    queryKey: ['mikrotik-active', selectedConfig?.id],
    queryFn: () => ownerApi.getMikrotikActiveConnections(selectedConfig!.id),
    enabled: !!selectedConfig && !isMock && activeTab === 'active',
    refetchInterval: activeTab === 'active' ? 5000 : false,
  })

  const { data: pppSecrets, refetch: refetchSecrets } = useQuery({
    queryKey: ['mikrotik-secrets', selectedConfig?.id],
    queryFn: () => ownerApi.getMikrotikPPPSecrets(selectedConfig!.id),
    enabled: !!selectedConfig && !isMock && activeTab === 'secrets',
  })

  const { data: deviceLogs } = useQuery({
    queryKey: ['mikrotik-logs', selectedConfig?.id],
    queryFn: () => ownerApi.getMikrotikLogs(selectedConfig!.id),
    enabled: !!selectedConfig && !isMock && activeTab === 'logs',
    refetchInterval: activeTab === 'logs' ? 10000 : false,
  })

  const { data: trafficRates } = useQuery({
    queryKey: ['mikrotik-traffic', selectedConfig?.id],
    queryFn: () => ownerApi.getMikrotikTraffic(selectedConfig!.id),
    enabled: !!selectedConfig && !isMock,
    refetchInterval: 2000,
  })

  const disconnectConnMut = useMutation({
    mutationFn: ({ name }: { name: string }) => 
      ownerApi.disconnectMikrotikActiveConnection(selectedConfig!.id, name),
    onSuccess: () => {
      toast.success('Koneksi PPPoE berhasil diputus')
      refetchActive()
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Gagal memutus koneksi')
    }
  })

  const toggleSecretMut = useMutation({
    mutationFn: ({ name, disabled }: { name: string, disabled: boolean }) => 
      ownerApi.toggleMikrotikSecret(selectedConfig!.id, name, disabled),
    onSuccess: (_, variables) => {
      toast.success(variables.disabled ? 'Secret dinonaktifkan' : 'Secret diaktifkan')
      refetchSecrets()
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Gagal mengubah status secret')
    }
  })

  const addSecretMut = useMutation({
    mutationFn: (data: { name: string; password?: string; profile?: string }) => 
      ownerApi.addMikrotikSecret(selectedConfig!.id, { ...data, service: 'pppoe' }),
    onSuccess: () => {
      toast.success('PPP Secret berhasil ditambahkan ke Mikrotik')
      refetchSecrets()
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Gagal menambahkan PPP Secret')
    }
  })

  // Initialize and update simulated statistics when selectedConfig changes
  useEffect(() => {
    if (selectedConfig && isMock) {
      // Deterministic generation based on config ID
      const seedNum = selectedConfig.id.charCodeAt(0) || 1
      
      // Active connections: 10-14 online clients from seeded list
      const onlineCount = 10 + (seedNum % 5)
      const mockActive = SEEDED_CLIENTS.slice(0, onlineCount).map((c, idx) => {
        const hours = 1 + ((seedNum + idx) % 24)
        const mins = 10 + ((seedNum * idx) % 50)
        const secs = 15 + ((seedNum + idx * 3) % 45)
        const uptimeStr = hours > 24 ? `${Math.floor(hours/24)}d ${hours%24}h ${mins}m` : `${hours}j ${mins}m ${secs}s`
        
        // Random Tx/Rx rate
        const tx = (1.5 + ((seedNum + idx) % 15) + Math.random()).toFixed(1)
        const rx = (0.2 + ((seedNum * idx) % 2) + Math.random()).toFixed(1)
        
        return {
          username: c.username,
          ip: c.ip,
          mac: c.mac,
          uptime: uptimeStr,
          tx: `${tx} Mbps`,
          rx: `${rx} Mbps`,
          name: c.name.replace(/_/g, ' ')
        }
      })
      
      // PPPoE Secrets: All 16 seeded users
      const mockSecrets = SEEDED_CLIENTS.map((c, idx) => {
        // Deterministic active status
        const isAct = idx % 9 !== 0 // 1 or 2 disabled
        const activeConn = mockActive.find((conn: any) => conn.username === c.username)
        return {
          username: c.username,
          password: `jsn_pass_${idx + 123}`,
          profile: c.profile,
          remote_ip: c.ip,
          is_active: isAct,
          is_online: !!activeConn,
          is_dynamic_ip: false
        }
      })

      // Logs
      const mockLogs = [
        { time: '01:24:12', topic: 'pppoe,info', message: 'jsn_repeater_ulee: logged in' },
        { time: '01:23:45', topic: 'system,info,account', message: `user ${selectedConfig.username} logged in from 192.168.10.15 via api` },
        { time: '01:20:00', topic: 'pppoe,info', message: 'jsn_sdn3_ulee: logged in' },
        { time: '01:15:30', topic: 'pppoe,info', message: 'jsn_rizal_ulee: logged in' },
        { time: '01:12:08', topic: 'pppoe,info', message: 'jsn_test_china: logged in' },
        { time: '01:05:52', topic: 'interface,info', message: 'ether1-gateway link up (speed 1Gbps, full duplex)' },
        { time: '00:58:14', topic: 'system,warning', message: 'Router rebooted due to power cycle' }
      ]

      setActiveConns(mockActive)
      setSecrets(mockSecrets)
      setLogs(mockLogs)
      setCpuUsage(8 + (seedNum % 15))
      setRamUsed(650 + (seedNum % 200))

      // Pre-populate traffic history for graph (20 data points)
      const baseTx = 45.2 + (seedNum % 20)
      const baseRx = 5.1 + (seedNum % 5)
      const initialHistory = Array.from({ length: 20 }).map((_, i) => {
        const timeVal = new Date(Date.now() - (20 - i) * 2000)
        const timeStr = timeVal.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
        const randOffsetTx = Math.sin(i / 2) * 5 + (Math.random() * 4 - 2)
        const randOffsetRx = Math.cos(i / 2) * 0.8 + (Math.random() * 0.4 - 0.2)
        return {
          time: timeStr,
          tx: Number(Math.max(10, baseTx + randOffsetTx).toFixed(1)),
          rx: Number(Math.max(1, baseRx + randOffsetRx).toFixed(1))
        }
      })
      setTrafficHistory(initialHistory)
    } else if (!selectedConfig) {
      setActiveConns([])
      setSecrets([])
      setLogs([])
      setTrafficHistory([])
    }
  }, [selectedConfig])

  // Live simulation/polling for real-time rates and history
  useEffect(() => {
    if (!selectedConfig) return

    if (isMock) {
      const interval = setInterval(() => {
        let nextTx = 45.2
        let nextRx = 5.1

        // Fluctuate CPU
        setCpuUsage(prev => {
          const change = Math.floor(Math.random() * 7) - 3
          return Math.max(5, Math.min(85, prev + change))
        })

        // Fluctuate Traffic
        setTxRate(prev => {
          const change = (Math.random() * 6 - 3)
          const val = Math.max(10, Math.min(150, Number((prev + change).toFixed(1))))
          nextTx = val
          return val
        })
        setRxRate(prev => {
          const change = (Math.random() * 1.6 - 0.8)
          const val = Math.max(1, Math.min(30, Number((prev + change).toFixed(1))))
          nextRx = val
          return val
        })

        // Update traffic history
        setTrafficHistory(prev => {
          const now = new Date()
          const timeStr = now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
          const nextPt = {
            time: timeStr,
            tx: nextTx,
            rx: nextRx
          }
          return [...prev.slice(1), nextPt]
        })

        // Randomly append logs to make console feel alive
        if (Math.random() > 0.8) {
          const randomClient = SEEDED_CLIENTS[Math.floor(Math.random() * SEEDED_CLIENTS.length)]
          const actions = ['logged in', 'logged out', 'authenticated successfully']
          const action = actions[Math.floor(Math.random() * actions.length)]
          
          const now = new Date()
          const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`
          
          setLogs(prev => [
            { time: timeStr, topic: 'pppoe,info', message: `${randomClient.username}: ${action}` },
            ...prev.slice(0, 19)
          ])
        }
      }, 2000)

      return () => clearInterval(interval)
    } else {
      // For real Mikrotik routers, handle traffic rates and historical updates when trafficRates updates
      if (trafficRates && trafficRates.length > 0) {
        let wanRx = 0
        let wanTx = 0

        // Search WAN (matches 'ether1' or 'wan')
        const wanIf = trafficRates.find((t: any) => 
          t.name.toLowerCase().includes('ether1') || t.name.toLowerCase().includes('wan')
        ) || trafficRates[0]

        if (wanIf) {
          wanRx = wanIf.rx
          wanTx = wanIf.tx
        }

        setRxRate(wanRx)
        setTxRate(wanTx)

        setTrafficHistory(prev => {
          // Initialize history if empty
          const current = prev.length > 2 ? prev : Array.from({ length: 20 }).map((_, i) => {
            const timeVal = new Date(Date.now() - (20 - i) * 2000)
            return {
              time: timeVal.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
              tx: wanTx,
              rx: wanRx
            }
          })
          const now = new Date()
          const timeStr = now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
          const nextPt = {
            time: timeStr,
            tx: wanTx,
            rx: wanRx
          }
          return [...current.slice(1), nextPt]
        })
      }
    }
  }, [selectedConfig, isMock, trafficRates])

  const deleteMut = useMutation({
    mutationFn: ownerApi.deleteMikrotikConfig,
    onSuccess: () => { 
      qc.invalidateQueries({ queryKey: ['mikrotik'] })
      toast.success('Router Mikrotik berhasil dihapus')
      if (selectedConfig) setSelectedConfig(null)
    },
    onError: () => toast.error('Gagal menghapus perangkat'),
  })

  const testMut = useMutation({
    mutationFn: ownerApi.testMikrotikConnection,
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['mikrotik'] })
      toast.success(data?.is_online ? '✅ Koneksi berhasil' : '⚠️ Mikrotik tidak dapat dijangkau')
    },
    onError: () => toast.error('Gagal test koneksi'),
  })

  const handleDisconnect = (username: string) => {
    if (isMock) {
      setActiveConns(prev => prev.filter((c: any) => c.username !== username))
      toast.success(`PPPoE session '${username}' disconnected successfully`)
    } else {
      disconnectConnMut.mutate({ name: username })
    }
  }

  const handleToggleSecret = (username: string) => {
    if (isMock) {
      setSecrets(prev => prev.map((s: any) => {
        if (s.username === username) {
          const nextState = !s.is_active
          toast.success(`Secret '${username}' ${nextState ? 'diaktifkan' : 'dinonaktifkan'}`)
          return { ...s, is_active: nextState }
        }
        return s
      }))
    } else {
      const secret = normalizedSecrets.find((s: any) => s.username === username)
      if (secret) {
        toggleSecretMut.mutate({ name: username, disabled: secret.is_active })
      }
    }
  }

  const handleAddSecret = () => {
    setNewSecretForm({ username: '', password: '', profile: 'default' })
    setShowSecretModalPassword(false)
    setShowAddSecretModal(true)
  }

  const submitNewSecret = () => {
    if (!newSecretForm.username.trim()) {
      toast.error('Username tidak boleh kosong')
      return
    }
    if (!newSecretForm.password.trim()) {
      toast.error('Password tidak boleh kosong')
      return
    }
    
    const currentList = isMock ? secrets : normalizedSecrets
    if (currentList.some((s: any) => s.username === newSecretForm.username)) {
      toast.error('Username sudah digunakan')
      return
    }

    if (isMock) {
      setSecrets(prev => [
        {
          username: newSecretForm.username,
          password: newSecretForm.password,
          profile: newSecretForm.profile,
          remote_ip: '10.100.10.' + (20 + prev.length),
          is_active: true
        },
        ...prev
      ])
      toast.success(`Secret '${newSecretForm.username}' berhasil dibuat!`)
      setShowAddSecretModal(false)
    } else {
      addSecretMut.mutate({ 
        name: newSecretForm.username, 
        password: newSecretForm.password, 
        profile: newSecretForm.profile 
      }, {
        onSuccess: () => {
          setShowAddSecretModal(false)
        }
      })
    }
  }

  // Normalized lists from either simulator or real Mikrotik API
  const normalizedActive = isMock 
    ? activeConns 
    : (activeConnections ?? []).map((conn: any) => {
        // Find matching traffic rate for this PPPoE session
        const matchingIf = trafficRates?.find((t: any) => 
          t.name.toLowerCase().includes(conn.name.toLowerCase())
        )
        // For PPPoE client:
        // - Upload speed (ArrowUpRight) is traffic received by the router (RX)
        // - Download speed (ArrowDownLeft) is traffic transmitted by the router (TX)
        const txRateStr = matchingIf ? `${matchingIf.rx.toFixed(1)} Mbps` : '0.0 Mbps'
        const rxRateStr = matchingIf ? `${matchingIf.tx.toFixed(1)} Mbps` : '0.0 Mbps'

        return {
          name: conn.name,
          username: conn.name,
          ip: conn.address,
          mac: conn.caller_id || '-',
          uptime: conn.uptime || '-',
          tx: txRateStr,
          rx: rxRateStr
        }
      })

  const normalizedSecrets = isMock
    ? secrets
    : (pppSecrets ?? []).map((sec: any) => {
        const activeConn = normalizedActive.find((conn: any) => conn.username === sec.name)
        return {
          username: sec.name,
          password: sec.password || '******',
          profile: sec.profile || 'default',
          remote_ip: sec.remote_address || (activeConn ? activeConn.ip : '-'),
          is_active: !sec.disabled,
          is_online: !!activeConn,
          is_dynamic_ip: !sec.remote_address && !!activeConn
        }
      })

  const normalizedLogs = isMock
    ? logs
    : (deviceLogs ?? []).map((log: any) => ({
        time: log.time,
        topic: log.topics,
        message: log.message
      }))

  // Filtered lists
  const filteredActive = normalizedActive.filter((c: any) => 
    c.username.toLowerCase().includes(activeSearch.toLowerCase()) ||
    c.ip.toLowerCase().includes(activeSearch.toLowerCase())
  )

  const filteredSecrets = normalizedSecrets.filter((s: any) => 
    s.username.toLowerCase().includes(secretSearch.toLowerCase()) ||
    s.profile.toLowerCase().includes(secretSearch.toLowerCase())
  )

  // Resources calculations
  const cpuVal = isMock ? cpuUsage : (resources?.cpu_load ?? 0)
  
  // RAM (MB)
  const totalRamVal = isMock ? 2048 : Math.round((resources?.total_memory ?? 0) / (1024 * 1024))
  const freeRamVal = isMock ? (2048 - ramUsed) : Math.round((resources?.free_memory ?? 0) / (1024 * 1024))
  const ramUsedVal = totalRamVal - freeRamVal
  const ramPct = totalRamVal > 0 ? Math.round((ramUsedVal / totalRamVal) * 100) : 0

  // HDD (MB)
  const totalHddVal = isMock ? 128 : Math.round((resources?.total_hdd ?? 0) / (1024 * 1024))
  const freeHddVal = isMock ? 83 : Math.round((resources?.free_hdd ?? 0) / (1024 * 1024))
  const hddUsedVal = totalHddVal - freeHddVal
  const hddPct = totalHddVal > 0 ? Math.round((hddUsedVal / totalHddVal) * 100) : 0

  // Device Info
  const boardName = isMock ? 'CCR2004-16G-2S+' : (resources?.board_name ?? '-')
  const osVersion = isMock ? 'v7.12.1 (Stable)' : (resources?.version ?? '-')
  const uptimeVal = isMock ? '45 Hari, 18 Jam' : (resources?.uptime ?? '-')
  const tempVal = isMock ? 42 : (resources?.temperature ?? 0)
  const voltVal = isMock ? 24.1 : (resources?.voltage ?? 0)

  // Chart config variables
  const gridColor = isDark ? '#1e293b' : '#e2e8f0'
  const labelColor = isDark ? '#64748b' : '#94a3b8'
  const tooltipBg = isDark ? '#0f172a' : '#ffffff'
  const tooltipBorder = isDark ? '#1e293b' : '#e2e8f0'

  return (
    <div className="p-8 space-y-6 w-full">
      {/* View 1: Router List Table (only visible if no router is selected) */}
      {!selectedConfig ? (
        <div className="space-y-6">
          {/* Page Title Header */}
          <div>
            <h1 className="text-2xl sm:text-[28px] font-bold text-gray-900 dark:text-zinc-100 leading-tight">
              Router Gateway Mikrotik
            </h1>
            <p className="text-xs text-gray-550 dark:text-zinc-550 mt-1.5 font-medium">
              Integrasi Router MikroTik untuk otomatisasi manajemen bandwidth & PPPoE pelanggan
            </p>
          </div>

          <div className="bg-white dark:bg-zinc-900 rounded-lg border border-gray-200 dark:border-zinc-805 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-150 dark:border-zinc-850 flex items-center justify-between bg-gray-50/50 dark:bg-zinc-950/40">
              <div>
                <h3 className="text-sm font-semibold text-gray-900 dark:text-zinc-100">Daftar Router MikroTik</h3>
                <p className="text-xs text-gray-500 dark:text-zinc-400 mt-0.5">Kelola konfigurasi koneksi API router gateway</p>
              </div>
              <button
                onClick={() => setModal('new')}
                className="flex items-center gap-1.5 px-4 py-2 rounded-md bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold transition-colors"
              >
                <Plus className="w-4 h-4" /> Tambah Router
              </button>
            </div>

          {isLoading ? (
            <LoadingSpinner className="py-16" />
          ) : !configs?.length ? (
            <EmptyState message="Belum ada konfigurasi Mikrotik" />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead>
                  <tr className="bg-gray-50/80 dark:bg-zinc-800/60 text-gray-500 dark:text-zinc-300 font-semibold uppercase tracking-wider border-b border-gray-200 dark:border-zinc-700">
                    <th className="px-6 py-4 text-center w-16">Status</th>
                    <th className="px-6 py-4">Nama Perangkat</th>
                    <th className="px-6 py-4">Host / IP</th>
                    <th className="px-6 py-4">Kapasitas PPPoE</th>
                    <th className="px-6 py-4">Spesifikasi Router</th>
                    <th className="px-6 py-4 text-center">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-150 dark:divide-zinc-800/45">
                  {configs.map((cfg) => {
                    const seedVal = cfg.id.charCodeAt(0) || 5
                    const mockCpu = (5 + (seedVal % 15))
                    const mockRam = (25 + (seedVal % 30))
                    const secretsCount = 14 + (seedVal % 3)

                    return (
                      <tr
                        key={cfg.id}
                        onClick={() => setSelectedConfig(cfg)}
                        className="hover:bg-gray-50/40 dark:hover:bg-zinc-800/20 transition-colors cursor-pointer group"
                      >
                        <td className="px-6 py-4.5 text-center">
                          <span className={`inline-flex items-center justify-center p-2 rounded-md ${
                            cfg.is_online === true
                              ? 'bg-emerald-50 dark:bg-emerald-950/20 text-emerald-655 dark:text-emerald-400'
                              : cfg.is_online === false
                              ? 'bg-rose-50 dark:bg-rose-950/20 text-rose-600 dark:text-rose-400'
                              : 'bg-gray-50 dark:bg-zinc-800 text-gray-400 dark:text-zinc-500'
                          }`}>
                            {cfg.is_online === true ? <Wifi className="w-4 h-4" /> : <WifiOff className="w-4 h-4" />}
                          </span>
                        </td>
                        <td className="px-6 py-4.5">
                          <div className="font-bold text-gray-900 dark:text-zinc-100 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">{cfg.name}</div>
                          <div className="text-[11px] text-gray-500 dark:text-zinc-450 font-medium">Model: RouterOS v7.x • Mipsbe / Arm</div>
                        </td>
                        <td className="px-6 py-4.5">
                          <span className="font-mono text-xs text-gray-700 dark:text-zinc-300 font-semibold">{cfg.host}:{cfg.port}</span>
                          <div className="text-[11px] text-gray-400 dark:text-zinc-550 font-medium mt-0.5">Username: {cfg.username}</div>
                        </td>
                        <td className="px-6 py-4.5">
                          <div className="flex items-center justify-between text-xs text-gray-750 dark:text-zinc-300 font-semibold mb-1">
                            <span>{secretsCount} / 250</span>
                            <span className="text-[10px] text-gray-455 dark:text-zinc-550 font-bold">{(secretsCount/250*100).toFixed(0)}%</span>
                          </div>
                          <div className="w-28 h-1.5 bg-gray-100 dark:bg-zinc-800 rounded-full overflow-hidden">
                            <div className="h-full bg-blue-600 rounded-full" style={{ width: `${(secretsCount/250*100)}%` }} />
                          </div>
                        </td>
                        <td className="px-6 py-4.5">
                          <div className="flex items-center gap-4 text-xs font-semibold text-gray-700 dark:text-zinc-300">
                            <div>
                              <span className="text-gray-400 dark:text-zinc-550 mr-1">CPU:</span>
                              <span>{mockCpu}%</span>
                            </div>
                            <div>
                              <span className="text-gray-400 dark:text-zinc-550 mr-1">RAM:</span>
                              <span>{mockRam}%</span>
                            </div>
                          </div>
                          {cfg.last_checked_at && (
                            <div className="text-[10px] text-gray-400 dark:text-zinc-550 font-medium mt-1">Dicek: {formatDateTime(cfg.last_checked_at)}</div>
                          )}
                        </td>
                        <td className="px-6 py-4.5" onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              onClick={() => testMut.mutate(cfg.id)}
                              disabled={testMut.isPending}
                              title="Test koneksi ke router"
                              className="p-1.5 rounded-md bg-gray-50 dark:bg-zinc-800 text-gray-655 dark:text-zinc-300 hover:bg-emerald-50 hover:text-emerald-600 dark:hover:bg-emerald-950/20 dark:hover:text-emerald-450 border border-gray-200 dark:border-zinc-750 transition-all disabled:opacity-50"
                            >
                              <RefreshCw className={`w-4 h-4 ${testMut.isPending ? 'animate-spin' : ''}`} />
                            </button>
                            <button 
                              onClick={() => setModal(cfg)} 
                              title="Edit konfigurasi"
                              className="p-1.5 rounded-md bg-gray-50 dark:bg-zinc-800 text-gray-650 dark:text-zinc-300 hover:bg-blue-50 hover:text-blue-600 dark:hover:bg-blue-950/20 dark:hover:text-blue-400 border border-gray-200 dark:border-zinc-750 transition-all"
                            >
                              <Pencil className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => setDeleteConfirmId(cfg.id)}
                              title="Hapus"
                              className="p-1.5 rounded-md bg-gray-50 dark:bg-zinc-800 text-gray-500 hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-955/20 dark:hover:text-rose-455 border border-gray-200 dark:border-zinc-750 transition-all"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
          </div>
        </div>
      ) : (
        /* View 2: Router Manager Panel (visible only when router is selected, hiding list) */
        <div className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-805 rounded-lg overflow-hidden animate-slideUp">
          
          {/* Back Navigation Header */}
          <div className="px-6 py-4 bg-gray-50/50 dark:bg-zinc-950/40 border-b border-gray-150 dark:border-zinc-850 flex flex-wrap gap-4 items-center justify-between">
            <div className="flex items-center gap-3">
              <button 
                onClick={() => setSelectedConfig(null)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-white hover:bg-gray-100 dark:bg-zinc-950 dark:hover:bg-zinc-800 text-gray-700 dark:text-zinc-200 text-xs font-semibold transition-all border border-gray-255 dark:border-zinc-800 shadow-sm"
              >
                <ArrowLeft className="w-4 h-4" /> Kembali
              </button>
              <div className="h-6 w-px bg-gray-200 dark:bg-zinc-850" />
              <div>
                <h2 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                  <span>Mikrotik Manager: {selectedConfig.name}</span>
                  <span className="font-mono text-[11px] px-2.5 py-0.5 bg-blue-100/60 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 rounded border border-blue-200/20">{selectedConfig.host}</span>
                </h2>
                <p className="text-xs text-gray-550 dark:text-zinc-400 mt-0.5 font-medium">Layanan monitor & konfigurasi port, secret, koneksi aktif, dan log sistem secara realtime</p>
              </div>
            </div>
            <button 
              onClick={() => setSelectedConfig(null)}
              className="p-1.5 rounded-md hover:bg-gray-250 dark:hover:bg-zinc-850 text-gray-400 dark:text-zinc-500 transition-colors"
              title="Close panel"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Tabs Menu */}
          <div className="flex border-b border-gray-200 dark:border-zinc-805 overflow-x-auto bg-gray-50/20 dark:bg-zinc-950/20">
            {[
              { id: 'active', label: 'Koneksi Aktif', icon: Activity },
              { id: 'secrets', label: 'PPP Secrets', icon: Database },
              { id: 'resources', label: 'Sumber Daya', icon: Server },
              { id: 'traffic', label: 'Trafik Interface', icon: ArrowUpRight },
              { id: 'logs', label: 'Log Perangkat', icon: FileText }
            ].map(t => {
              const Icon = t.icon
              const isActive = activeTab === t.id
              return (
                <button
                  key={t.id}
                  onClick={() => setActiveTab(t.id as any)}
                  className={`flex items-center gap-2.5 px-6 py-3.5 text-[11px] font-bold uppercase tracking-wider border-b-2 whitespace-nowrap transition-all ${
                    isActive 
                      ? 'border-blue-600 text-blue-600 dark:text-blue-400 bg-white dark:bg-zinc-900' 
                      : 'border-transparent text-gray-550 hover:text-gray-900 dark:hover:text-white'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {t.label}
                </button>
              )
            })}
          </div>

          <div className="p-6">
            
            {/* Tab: Active Connections */}
            {activeTab === 'active' && (
              <div className="space-y-4">
                <div className="flex flex-wrap gap-3 items-center justify-between">
                  <div className="relative flex-1 max-w-sm">
                    <input
                      type="text"
                      placeholder="Cari username / IP..."
                      value={activeSearch}
                      onChange={e => setActiveSearch(e.target.value)}
                      className="w-full pl-4 pr-10 py-1.5 text-xs rounded-md bg-gray-50 dark:bg-zinc-955 border border-gray-255 dark:border-zinc-800 text-gray-900 dark:text-zinc-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/40"
                    />
                  </div>
                  <span className="text-[11px] font-semibold text-emerald-650 dark:text-emerald-450 bg-emerald-50 dark:bg-emerald-950/20 px-2.5 py-1 rounded-md border border-emerald-200 dark:border-emerald-900/10">
                    ● {filteredActive.length} Sesi Online
                  </span>
                </div>

                <div className="border border-gray-150 dark:border-zinc-805 rounded-lg overflow-hidden">
                  <table className="w-full text-xs text-left">
                    <thead>
                      <tr className="bg-gray-50/80 dark:bg-zinc-800/60 text-[10px] text-gray-500 dark:text-zinc-300 font-semibold uppercase tracking-wider border-b border-gray-200 dark:border-zinc-700">
                        <th className="px-5 py-3">Nama Pelanggan</th>
                        <th className="px-5 py-3">Username PPPoE</th>
                        <th className="px-5 py-3">IP Address</th>
                        <th className="px-5 py-3">MAC Address</th>
                        <th className="px-5 py-3">Uptime</th>
                        <th className="px-5 py-3">Traffic (TX/RX)</th>
                        <th className="px-5 py-3 text-center">Aksi</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-150 dark:divide-zinc-800/45">
                      {filteredActive.length === 0 ? (
                        <tr>
                          <td colSpan={7} className="px-5 py-8 text-center text-gray-500 dark:text-zinc-400">Tidak ada sesi online ditemukan</td>
                        </tr>
                      ) : (
                        filteredActive.map((c: any) => (
                          <tr key={c.username} className="hover:bg-gray-50/40 dark:hover:bg-zinc-800/20 transition-colors">
                            <td className="px-5 py-3 font-semibold text-gray-700 dark:text-zinc-200">{c.name}</td>
                            <td className="px-5 py-3 font-mono font-bold text-blue-600 dark:text-blue-400">{c.username}</td>
                            <td className="px-5 py-3 font-mono text-gray-650 dark:text-zinc-350">{c.ip}</td>
                            <td className="px-5 py-3 font-mono text-gray-500 dark:text-zinc-400">{c.mac}</td>
                            <td className="px-5 py-3 text-gray-650 dark:text-zinc-300 font-medium">{c.uptime}</td>
                            <td className="px-5 py-3">
                              <div className="flex items-center gap-3 font-semibold">
                                <span className="flex items-center gap-0.5 text-blue-600 dark:text-blue-400"><ArrowUpRight className="w-3.5 h-3.5" />{c.tx}</span>
                                <span className="flex items-center gap-0.5 text-emerald-600 dark:text-emerald-400"><ArrowDownLeft className="w-3.5 h-3.5" />{c.rx}</span>
                              </div>
                            </td>
                            <td className="px-5 py-3 text-center">
                              <button 
                                type="button"
                                onClick={() => handleDisconnect(c.username)}
                                disabled={disconnectConnMut.isPending}
                                className="px-2 py-1 text-[10px] font-semibold rounded-md border border-rose-200 dark:border-rose-900/60 hover:border-rose-500 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/20 transition-all disabled:opacity-50"
                              >
                                {disconnectConnMut.isPending ? (
                                  <span className="inline-flex items-center gap-1">
                                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                    Memutuskan
                                  </span>
                                ) : (
                                  'Putuskan'
                                )}
                              </button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Tab: PPP Secrets */}
            {activeTab === 'secrets' && (
              <div className="space-y-4">
                <div className="flex flex-wrap gap-3 items-center justify-between">
                  <div className="relative flex-1 max-w-sm">
                    <input
                      type="text"
                      placeholder="Cari secret username..."
                      value={secretSearch}
                      onChange={e => setSecretSearch(e.target.value)}
                      className="w-full pl-4 pr-10 py-1.5 text-xs rounded-md bg-gray-50 dark:bg-zinc-955 border border-gray-255 dark:border-zinc-800 text-gray-900 dark:text-zinc-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/40"
                    />
                  </div>
                  <button
                    onClick={handleAddSecret}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold transition-colors"
                  >
                    <Plus className="w-3.5 h-3.5" /> Tambah Secret
                  </button>
                </div>

                <div className="border border-gray-150 dark:border-zinc-805 rounded-lg overflow-hidden">
                  <table className="w-full text-xs text-left">
                    <thead>
                      <tr className="bg-gray-50/80 dark:bg-zinc-800/60 text-[10px] text-gray-500 dark:text-zinc-300 font-semibold uppercase tracking-wider border-b border-gray-200 dark:border-zinc-700">
                        <th className="px-5 py-3">Username PPPoE</th>
                        <th className="px-5 py-3">Password</th>
                        <th className="px-5 py-3">Layanan</th>
                        <th className="px-5 py-3">Profil Paket</th>
                        <th className="px-5 py-3">Remote Address</th>
                        <th className="px-5 py-3 text-center">Status</th>
                        <th className="px-5 py-3 text-center">Aksi</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-150 dark:divide-zinc-800/45">
                      {filteredSecrets.length === 0 ? (
                        <tr>
                          <td colSpan={7} className="px-5 py-8 text-center text-gray-550 dark:text-zinc-400">Tidak ada PPPoE secret ditemukan</td>
                        </tr>
                      ) : (
                        filteredSecrets.map((s: any) => (
                          <tr key={s.username} className={`hover:bg-gray-50/40 dark:hover:bg-zinc-800/10 transition-colors ${!s.is_active ? 'opacity-55' : ''}`}>
                            <td className="px-5 py-3 font-mono font-bold text-gray-900 dark:text-white">{s.username}</td>
                            <td className="px-5 py-3 font-mono text-gray-500 dark:text-zinc-400">
                              <div className="flex items-center gap-1.5 min-w-[120px]">
                                <span className="font-semibold">{visiblePasswords[s.username] ? s.password : '••••••••'}</span>
                                <button 
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setVisiblePasswords(prev => ({ ...prev, [s.username]: !prev[s.username] }));
                                  }}
                                  className="p-1 rounded-md hover:bg-gray-100 dark:hover:bg-zinc-800 text-gray-400 hover:text-gray-600 dark:hover:text-zinc-350 transition-colors"
                                  title={visiblePasswords[s.username] ? 'Sembunyikan password' : 'Lihat password'}
                                >
                                  {visiblePasswords[s.username] ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                                </button>
                              </div>
                            </td>
                            <td className="px-5 py-3 font-semibold text-gray-500 dark:text-zinc-400">pppoe</td>
                            <td className="px-5 py-3">
                              <span className="font-bold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/20 px-2 py-0.5 rounded border border-blue-100/60 dark:border-blue-900/10 text-[10px]">{s.profile}</span>
                            </td>
                            <td className="px-5 py-3 font-mono text-gray-655 dark:text-zinc-300">
                              <div className="flex items-center gap-1.5">
                                {s.is_dynamic_ip ? (
                                  <>
                                    <span className="relative flex h-2 w-2">
                                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                      <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                                    </span>
                                    <span>{s.remote_ip}</span>
                                    <span className="text-[9px] font-bold text-emerald-650 dark:text-emerald-400 bg-emerald-50/50 dark:bg-emerald-950/30 px-1 py-0.2 rounded border border-emerald-100/50 dark:border-emerald-900/10 select-none">
                                      Active
                                    </span>
                                  </>
                                ) : s.remote_ip !== '-' ? (
                                  <>
                                    <span className="h-1.5 w-1.5 rounded-full bg-blue-500"></span>
                                    <span>{s.remote_ip}</span>
                                    <span className="text-[9px] font-bold text-blue-600 dark:text-blue-400 bg-blue-50/50 dark:bg-blue-950/30 px-1 py-0.2 rounded border border-blue-100/50 dark:border-blue-900/10 select-none">
                                      Static
                                    </span>
                                  </>
                                ) : (
                                  <span className="text-gray-400 select-none">-</span>
                                )}
                              </div>
                            </td>
                            <td className="px-5 py-3 text-center">
                              <span className={`inline-flex px-2 py-0.5 rounded text-[10px] font-bold ${
                                s.is_active 
                                  ? 'bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-400' 
                                  : 'bg-gray-100 dark:bg-zinc-800 text-gray-500 dark:text-zinc-400'
                              }`}>
                                {s.is_active ? 'Aktif' : 'Disabled'}
                              </span>
                            </td>
                            <td className="px-5 py-3 text-center" onClick={e => e.stopPropagation()}>
                              <div className="flex items-center justify-center gap-1.5">
                                <button 
                                  onClick={() => handleToggleSecret(s.username)}
                                  disabled={toggleSecretMut.isPending}
                                  className={`p-1.5 rounded-md border transition-all disabled:opacity-50 ${
                                    s.is_active 
                                      ? 'border-gray-200 text-gray-550 hover:bg-gray-100 hover:text-gray-700 dark:border-zinc-800 dark:hover:bg-zinc-800 dark:text-zinc-400' 
                                      : 'border-emerald-200 text-emerald-600 hover:bg-emerald-50 hover:text-emerald-700 dark:border-emerald-900/25 dark:hover:bg-emerald-950/15'
                                  }`}
                                  title={s.is_active ? 'Disable Secret' : 'Enable Secret'}
                                >
                                  {toggleSecretMut.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Power className="w-3.5 h-3.5" />}
                                </button>
                                <button 
                                  onClick={() => {
                                    const nextPass = prompt(`Edit Password untuk '${s.username}':`, s.password)
                                    if (nextPass) {
                                      setSecrets(prev => prev.map(p => p.username === s.username ? { ...p, password: nextPass } : p))
                                      toast.success('Password diperbarui')
                                    }
                                  }}
                                  className="p-1.5 rounded-md border border-gray-200 dark:border-zinc-800 text-gray-550 hover:bg-gray-100 dark:hover:bg-zinc-800 hover:text-blue-600 dark:text-zinc-400 dark:hover:text-blue-400"
                                >
                                  <Pencil className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {activeTab === 'resources' && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
                
                {/* CPU Usage Card */}
                <div className="bg-gray-50/40 dark:bg-zinc-950/20 border border-gray-150 dark:border-zinc-800 rounded-lg p-5 flex flex-col items-center justify-center space-y-3">
                  <span className="text-[11px] font-bold text-gray-500 dark:text-zinc-400 uppercase tracking-wide">Beban CPU</span>
                  <div className="relative w-24 h-24 flex items-center justify-center">
                    <svg className="w-full h-full transform -rotate-90">
                      <circle cx="48" cy="48" r="40" strokeWidth="6" stroke="currentColor" className="text-gray-100 dark:text-zinc-800" fill="transparent" />
                      <circle cx="48" cy="48" r="40" strokeWidth="6" stroke="currentColor" 
                        className={cpuVal > 75 ? 'text-rose-500' : cpuVal > 45 ? 'text-amber-500' : 'text-blue-600'} 
                        fill="transparent" 
                        strokeDasharray={251.2}
                        strokeDashoffset={251.2 - (251.2 * cpuVal) / 100}
                        style={{ transition: 'stroke-dashoffset 0.8s ease-out' }}
                      />
                    </svg>
                    <span className="absolute text-lg font-extrabold text-gray-900 dark:text-white">{cpuVal}%</span>
                  </div>
                  <span className="text-xs text-gray-500 dark:text-zinc-400 font-semibold">Multi-core (4 Core CPU)</span>
                </div>

                {/* RAM Usage Card */}
                <div className="bg-gray-50/40 dark:bg-zinc-950/20 border border-gray-150 dark:border-zinc-800 rounded-lg p-5 space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-gray-500 dark:text-zinc-400 uppercase tracking-wide">RAM / Memory</span>
                    <span className="text-[10px] font-bold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/20 px-2 py-0.5 rounded border border-blue-100/30 dark:border-blue-900/20">{totalRamVal} MB Max</span>
                  </div>
                  <div className="space-y-1.5 pt-2">
                    <div className="flex justify-between text-xs font-semibold text-gray-700 dark:text-zinc-200">
                      <span>Terpakai</span>
                      <span>{ramUsedVal} MB ({ramPct}%)</span>
                    </div>
                    <div className="w-full h-1.5 bg-gray-100 dark:bg-zinc-800 rounded-full overflow-hidden">
                      <div className="h-full bg-blue-600 rounded-full transition-all duration-700" style={{ width: `${ramPct}%` }} />
                    </div>
                  </div>
                  <div className="flex justify-between text-[11px] text-gray-500 dark:text-zinc-400">
                    <span>Sisa Memory:</span>
                    <span className="font-bold text-gray-700 dark:text-zinc-250">{freeRamVal} MB</span>
                  </div>
                </div>

                {/* HDD Usage Card */}
                <div className="bg-gray-50/40 dark:bg-zinc-950/20 border border-gray-150 dark:border-zinc-800 rounded-lg p-5 space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-gray-500 dark:text-zinc-400 uppercase tracking-wide">Penyimpanan HDD</span>
                    <span className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/20 px-2 py-0.5 rounded border border-indigo-150/40 dark:border-indigo-900/20">{totalHddVal} MB Max</span>
                  </div>
                  <div className="space-y-1.5 pt-2">
                    <div className="flex justify-between text-xs font-semibold text-gray-700 dark:text-zinc-200">
                      <span>Terpakai</span>
                      <span>{hddUsedVal} MB ({hddPct}%)</span>
                    </div>
                    <div className="w-full h-1.5 bg-gray-100 dark:bg-zinc-800 rounded-full overflow-hidden">
                      <div className="h-full bg-indigo-600 rounded-full" style={{ width: `${hddPct}%` }} />
                    </div>
                  </div>
                  <div className="flex justify-between text-[11px] text-gray-500 dark:text-zinc-400">
                    <span>Sisa Storage:</span>
                    <span className="font-bold text-gray-700 dark:text-zinc-250">{freeHddVal} MB</span>
                  </div>
                </div>

                {/* Router Info Card */}
                <div className="bg-gray-50/40 dark:bg-zinc-950/20 border border-gray-150 dark:border-zinc-800 rounded-lg p-5 text-xs text-gray-600 dark:text-zinc-400 space-y-2.5">
                  <span className="text-[11px] font-bold text-gray-500 dark:text-zinc-400 uppercase tracking-wide block mb-1">Informasi Perangkat</span>
                  <div className="flex justify-between">
                    <span>Uptime:</span>
                    <span className="font-bold text-gray-800 dark:text-zinc-200">{uptimeVal}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Versi ROS:</span>
                    <span className="font-bold text-gray-800 dark:text-zinc-200">{osVersion}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Board Name:</span>
                    <span className="font-bold text-gray-800 dark:text-zinc-200">{boardName}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Temp / Volt:</span>
                    <span className="font-bold text-emerald-600 dark:text-emerald-450">{tempVal > 0 ? `${tempVal} °C` : '-'} / {voltVal > 0 ? `${voltVal} V` : '-'}</span>
                  </div>
                </div>

              </div>
            )}

            {/* Tab: Realtime Interface Traffic */}
            {activeTab === 'traffic' && (
              <div className="space-y-6">
                {/* Traffic Interface List */}
                <div className="bg-white dark:bg-zinc-900 rounded-lg border border-gray-250 dark:border-zinc-805 overflow-hidden">
                  <div className="overflow-x-auto max-h-[300px] overflow-y-auto">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="bg-gray-50/80 dark:bg-zinc-800/60 text-gray-500 dark:text-zinc-300 font-semibold uppercase tracking-wider border-b border-gray-200 dark:border-zinc-700 sticky top-0 z-10">
                          <th className="px-5 py-3 bg-gray-50/80 dark:bg-zinc-800/60">Interface</th>
                          <th className="px-5 py-3 bg-gray-50/80 dark:bg-zinc-800/60 text-center">Type</th>
                          <th className="px-5 py-3 bg-gray-50/80 dark:bg-zinc-800/60 text-center">Status</th>
                          <th className="px-5 py-3 bg-gray-50/80 dark:bg-zinc-800/60 text-right">TX (Out)</th>
                          <th className="px-5 py-3 bg-gray-50/80 dark:bg-zinc-800/60 text-right">RX (In)</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-150 dark:divide-zinc-800/45">
                        {(isMock ? [
                          { name: 'ether1-gateway (WAN)', rx: rxRate, tx: txRate, running: true, disabled: false, type: 'ether' },
                          { name: 'bridge-local (LAN)', rx: txRate * 0.9, tx: rxRate * 0.9, running: true, disabled: false, type: 'bridge' },
                          { name: 'wlan1', rx: 0, tx: 0, running: false, disabled: true, type: 'wlan' },
                          { name: 'ether2-local', rx: 1.2, tx: 0.5, running: true, disabled: false, type: 'ether' },
                          { name: 'ether5-local', rx: 0.8, tx: 2.1, running: true, disabled: false, type: 'ether' }
                        ] : (trafficRates ?? [])).map((iface: any) => {
                          const isRunning = iface.running
                          const isDisabled = iface.disabled
                          
                          return (
                            <tr 
                              key={iface.name} 
                              className={`hover:bg-gray-50/40 dark:hover:bg-zinc-800/20 transition-colors ${
                                isDisabled ? 'opacity-50 bg-gray-100/10 dark:bg-zinc-900/10' : ''
                              }`}
                            >
                              <td className="px-5 py-2.5 font-bold text-gray-800 dark:text-zinc-200 flex items-center gap-2">
                                <span className={`w-2 h-2 rounded-full flex-shrink-0 ${
                                  isDisabled 
                                    ? 'bg-gray-400' 
                                    : isRunning 
                                    ? 'bg-emerald-500 animate-pulse' 
                                    : 'bg-amber-500'
                                }`} />
                                <span className="truncate max-w-[200px]" title={iface.name}>{iface.name}</span>
                              </td>
                              <td className="px-5 py-2.5 text-center">
                                <span className="text-[9px] font-extrabold px-1.5 py-0.5 rounded bg-gray-100 dark:bg-zinc-800 text-gray-500 dark:text-zinc-400 uppercase">
                                  {iface.type || 'ether'}
                                </span>
                              </td>
                              <td className="px-5 py-2.5 text-center font-semibold">
                                <span className={`text-[10px] ${
                                  isDisabled ? 'text-rose-500' : isRunning ? 'text-emerald-500' : 'text-amber-500'
                                }`}>
                                  {isDisabled ? 'Disabled' : isRunning ? 'Active' : 'No Link'}
                                </span>
                              </td>
                              <td className="px-5 py-2.5 text-right font-mono font-bold text-blue-650 dark:text-blue-400">
                                {iface.tx ? `${iface.tx.toFixed(2)} Mbps` : '0.00 Mbps'}
                              </td>
                              <td className="px-5 py-2.5 text-right font-mono font-bold text-emerald-655 dark:text-emerald-450">
                                {iface.rx ? `${iface.rx.toFixed(2)} Mbps` : '0.00 Mbps'}
                              </td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Winbox-like Traffic Chart Redesign using Recharts */}
                <div className="bg-gray-50/30 dark:bg-zinc-950/30 text-gray-750 dark:text-zinc-200 p-5 rounded-lg border border-gray-200 dark:border-zinc-805 flex flex-col space-y-4">
                  <div className="flex justify-between items-center text-[10px] font-bold uppercase tracking-wider text-gray-500 dark:text-zinc-400 px-1">
                    <span>Grafik Traffic Interface (Realtime)</span>
                    <div className="flex items-center gap-3">
                      <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded bg-emerald-500 inline-block" /> Rx (Download)</span>
                      <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded bg-blue-500 inline-block" /> Tx (Upload)</span>
                    </div>
                  </div>
                  
                  {/* Recharts AreaChart with proper Winbox styling */}
                  <div className="h-64 w-full bg-white dark:bg-zinc-900 rounded-md border border-gray-200 dark:border-zinc-805 overflow-hidden pt-2">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={trafficHistory} margin={{ top: 10, right: 15, left: -10, bottom: 5 }}>
                        <defs>
                          <linearGradient id="colorRx" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#10b981" stopOpacity={0.25} />
                            <stop offset="95%" stopColor="#10b981" stopOpacity={0.02} />
                          </linearGradient>
                          <linearGradient id="colorTx" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.25} />
                            <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.02} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke={gridColor} strokeOpacity={isDark ? 0.1 : 0.6} />
                        <XAxis 
                          dataKey="time" 
                          tick={{ fontSize: 9, fill: labelColor }} 
                          axisLine={false} 
                          tickLine={false}
                        />
                        <YAxis 
                          tick={{ fontSize: 9, fill: labelColor }} 
                          axisLine={false} 
                          tickLine={false}
                          unit="M"
                        />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: tooltipBg,
                            borderColor: tooltipBorder,
                            borderRadius: 6,
                            boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
                            fontSize: '11px',
                            color: isDark ? '#fff' : '#000',
                          }}
                        />
                        <Area 
                          type="monotone" 
                          dataKey="rx" 
                          stroke="#10b981" 
                          strokeWidth={2}
                          fillOpacity={1} 
                          fill="url(#colorRx)" 
                          name="Rx (Download)"
                        />
                        <Area 
                          type="monotone" 
                          dataKey="tx" 
                          stroke="#3b82f6" 
                          strokeWidth={2}
                          fillOpacity={1} 
                          fill="url(#colorTx)" 
                          name="Tx (Upload)"
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>
            )}

            {/* Tab: System Logs */}
            {activeTab === 'logs' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between text-xs text-gray-500">
                  <span className="font-semibold uppercase tracking-wider">Terminal Log Mikrotik RouterOS</span>
                  <button 
                    onClick={() => { setLogs([]); toast.info('Log history cleared') }} 
                    className="flex items-center gap-1.5 text-rose-500 hover:text-rose-600 font-semibold border border-rose-200 dark:border-rose-900/30 px-2.5 py-1 rounded-md"
                  >
                    <Trash className="w-3.5 h-3.5" /> Bersihkan Log
                  </button>
                </div>

                <div className="bg-zinc-950 text-zinc-300 p-5 rounded-lg border border-zinc-850 font-mono text-[11px] leading-relaxed h-[320px] overflow-y-auto space-y-1.5">
                  {normalizedLogs.length === 0 ? (
                    <div className="text-zinc-650 text-center py-20">[ Logs Empty / Cleared ]</div>
                  ) : (
                    normalizedLogs.map((l: any, index: number) => {
                      const isWarn = l.topic.includes('warning')
                      const isAccount = l.topic.includes('account')
                      return (
                        <div key={index} className="flex gap-4 hover:bg-zinc-900/40 py-0.5 px-2 rounded">
                          <span className="text-zinc-500 select-none">{l.time}</span>
                          <span className={isWarn ? 'text-amber-500 font-bold' : isAccount ? 'text-blue-450' : 'text-zinc-500 font-semibold'}>[{l.topic}]</span>
                          <span className={isWarn ? 'text-amber-400' : 'text-zinc-350'}>{l.message}</span>
                        </div>
                      )
                    })
                  )}
                </div>
              </div>
            )}

          </div>
        </div>
      )}

      {/* Edit / New Mikrotik Modal */}
      {modal && <MikrotikModal config={modal === 'new' ? undefined : modal} onClose={() => setModal(null)} />}

      {/* Tambah PPPoE Secret Modal */}
      {showAddSecretModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-805 rounded-lg shadow-xl w-full max-w-sm overflow-hidden transform scale-95 transition-all">
            <div className="px-6 py-4 border-b border-gray-150 dark:border-zinc-850 flex items-center justify-between bg-gray-50/50 dark:bg-zinc-955/40">
              <h3 className="font-semibold text-gray-900 dark:text-white text-sm">Tambah PPPoE Secret Baru</h3>
              <button onClick={() => setShowAddSecretModal(false)} className="text-gray-400 hover:text-gray-650 dark:hover:text-zinc-300">✕</button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-500 dark:text-zinc-400 mb-1.5 uppercase tracking-wide">Username PPPoE</label>
                <input
                  value={newSecretForm.username}
                  onChange={(e) => setNewSecretForm((f) => ({ ...f, username: e.target.value }))}
                  placeholder="contoh: jsn_pelanggan_baru"
                  className="w-full px-3.5 py-2 rounded-md bg-white dark:bg-zinc-950 border border-gray-255 dark:border-zinc-800 text-gray-750 dark:text-zinc-200 placeholder-gray-400 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/40"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 dark:text-zinc-400 mb-1.5 uppercase tracking-wide">Password</label>
                <div className="relative">
                  <input
                    type={showSecretModalPassword ? "text" : "password"}
                    value={newSecretForm.password}
                    onChange={(e) => setNewSecretForm((f) => ({ ...f, password: e.target.value }))}
                    placeholder="Password rahasia"
                    className="w-full pl-3.5 pr-10 py-2 rounded-md bg-white dark:bg-zinc-950 border border-gray-255 dark:border-zinc-800 text-gray-750 dark:text-zinc-200 placeholder-gray-400 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/40"
                  />
                  <button
                    type="button"
                    onClick={() => setShowSecretModalPassword(!showSecretModalPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-zinc-350"
                  >
                    {showSecretModalPassword ? <EyeOff className="w-4.5 h-4.5" /> : <Eye className="w-4.5 h-4.5" />}
                  </button>
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 dark:text-zinc-400 mb-1.5 uppercase tracking-wide">Profil Paket</label>
                <select
                  value={newSecretForm.profile}
                  onChange={(e) => setNewSecretForm((f) => ({ ...f, profile: e.target.value }))}
                  className="w-full px-3.5 py-2 rounded-md bg-white dark:bg-zinc-950 border border-gray-255 dark:border-zinc-800 text-gray-750 dark:text-zinc-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/40"
                >
                  <option value="default">default</option>
                  <option value="PKT-LITE-10">PKT-LITE-10 (10 Mbps)</option>
                  <option value="PKT-HOME-20">PKT-HOME-20 (20 Mbps)</option>
                  <option value="PKT-HOME-50">PKT-HOME-50 (50 Mbps)</option>
                  <option value="PKT-PRO-100">PKT-PRO-100 (100 Mbps)</option>
                  <option value="PKT-BIZ-200">PKT-BIZ-200 (200 Mbps)</option>
                </select>
              </div>
            </div>
            <div className="px-6 py-4 border-t border-gray-150 dark:border-zinc-850 flex gap-3 justify-end bg-gray-50/50 dark:bg-zinc-955/40">
              <button onClick={() => setShowAddSecretModal(false)} className="px-3 py-1.5 rounded-md text-xs text-gray-600 dark:text-zinc-450 hover:bg-gray-100 dark:hover:bg-zinc-800 transition-colors">Batal</button>
              <button
                onClick={submitNewSecret}
                disabled={addSecretMut.isPending}
                className="px-4 py-1.5 rounded-md bg-blue-600 text-white text-xs font-semibold hover:bg-blue-700 disabled:opacity-60 flex items-center gap-2"
              >
                {addSecretMut.isPending && <Loader2 className="w-3.5 h-3.5 animate-spin" />} Buat Secret
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirmId && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-805 rounded-lg shadow-xl w-full max-w-sm overflow-hidden transform scale-95 transition-all">
            <div className="p-6 text-center space-y-4">
              <div className="mx-auto w-12 h-12 bg-rose-50 dark:bg-rose-950/30 rounded-full flex items-center justify-center text-rose-500">
                <Trash2 className="w-5 h-5" />
              </div>
              <div className="space-y-1">
                <h3 className="font-bold text-gray-900 dark:text-white text-sm">Hapus Konfigurasi Mikrotik?</h3>
                <p className="text-xs text-gray-500 dark:text-zinc-400">Tindakan ini tidak dapat dibatalkan. Koneksi ke router ini akan dihapus dari sistem.</p>
              </div>
            </div>
            <div className="px-6 py-4 border-t border-gray-150 dark:border-zinc-850 flex gap-3 bg-gray-50/50 dark:bg-zinc-955/40">
              <button 
                onClick={() => setDeleteConfirmId(null)} 
                className="flex-1 px-3 py-1.5 rounded-md text-xs font-semibold text-gray-600 dark:text-zinc-400 hover:bg-gray-100 dark:hover:bg-zinc-800 border border-gray-255 dark:border-zinc-800 transition-colors"
              >
                Batal
              </button>
              <button
                onClick={() => {
                  deleteMut.mutate(deleteConfirmId);
                  setDeleteConfirmId(null);
                }}
                disabled={deleteMut.isPending}
                className="flex-1 px-3 py-1.5 rounded-md bg-rose-600 text-white text-xs font-semibold hover:bg-rose-700 transition-colors disabled:opacity-50"
              >
                {deleteMut.isPending ? 'Menghapus...' : 'Ya, Hapus'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
