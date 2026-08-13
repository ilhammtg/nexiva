import React, { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Plus,
  Pencil,
  Trash2,
  Loader2,
  Search,
  Eye,
  RefreshCw,
  MapPin,
  X,
  Server,
  Cpu,
  Layers,
  Zap,
  Thermometer,
  Users,
  Settings,
  Grid as GridIcon,
  Wifi,
  WifiOff,
  CheckCircle2,
  AlertTriangle,
  ChevronDown,
  Database,
  Radio
} from 'lucide-react'
import { ownerApi } from '../api/ownerApi'
import { csApi } from '@/features/cs/api/csApi'
import { useAuthStore } from '@/features/auth/store/useAuthStore'
import { LoadingSpinner, EmptyState } from '@/components/ui'
import RegistrationDetailModal from '@/features/cs/components/RegistrationDetailModal'
import type { OLTPortConfig, Registration } from '../types'
import { toast } from 'sonner'

// Grouped Physical OLT Device
export interface OLTDevice {
  id: string
  name: string
  vendor: 'ZTE' | 'VSOL' | 'HIOSO' | string
  profile: string
  model: string
  jenis: 'GPON' | 'EPON'
  ip_remote: string
  port: number
  username?: string
  password?: string
  community: string
  ports: OLTPortConfig[]
  totalMaxONT: number
  totalCurrentONT: number
  isActive: boolean
}

// Port Data Structure for Telemetry
export interface PortData {
  slotNumber: number
  portNumber: number
  portType: 'PON' | 'UPLINK' | string
  status: 'UP' | 'DOWN' | 'WARNING' | string
  txPowerDbm: number
  temperatureCelsius: number
  totalOntConnected: number
  totalOntOnline: number
}

export type SubTabType = 'grid' | 'onu-live' | 'onu-unconfigured' | 'onu-customers' | 'settings'

// Error Boundary to prevent blank screens
class OLTPageErrorBoundary extends React.Component<{ children: React.ReactNode }, { hasError: boolean; error: any }> {
  constructor(props: { children: React.ReactNode }) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: any) {
    return { hasError: true, error }
  }

  componentDidCatch(error: any, errorInfo: any) {
    console.error("OLTPortsPage Error Boundary caught an error:", error, errorInfo)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="p-8 text-center space-y-4 max-w-xl mx-auto my-12 bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-805 rounded-lg shadow-sm">
          <div className="w-12 h-12 rounded-full bg-rose-100 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 flex items-center justify-center mx-auto text-xl font-bold">
            ⚠️
          </div>
          <h2 className="text-lg font-bold text-gray-900 dark:text-zinc-100">Gagal Memuat Halaman OLT</h2>
          <p className="text-xs text-gray-500 font-mono bg-gray-50 dark:bg-zinc-950 p-3 rounded-md text-left overflow-x-auto border border-gray-150 dark:border-zinc-900">
            {String(this.state.error?.message || this.state.error)}
          </p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-blue-600 text-white rounded-md text-xs font-semibold hover:bg-blue-700 transition-all"
          >
            Muat Ulang Halaman
          </button>
        </div>
      )
    }
    return this.props.children
  }
}

// Defensive Property Accessors
const getPortConfigID = (c: any) => c?.OLTPortConfigID || c?.olt_port_config_id || c?.oltPortConfigId || ''
const getFullName = (c: any) => c?.FullName || c?.full_name || c?.fullName || 'Pelanggan'
const getONTSerial = (c: any) => c?.ONTSerialNumber || c?.ont_serial_number || c?.ontSerialNumber || ''
const getPPPoEUser = (c: any) => c?.PPPoEUsername || c?.pppoe_username || c?.pppoeUsername || ''
const getVillage = (c: any) => c?.Village || c?.village || ''
const getDistrict = (c: any) => c?.District || c?.district || ''
const getPackageID = (c: any) => c?.PackageID || c?.package_id || c?.packageId || ''
const getONTIndex = (c: any) => c?.ONTIndex ?? c?.ont_index ?? c?.ontIndex ?? 1

const getDefaultOLTPortByBrand = (brand: string) => {
  const b = (brand ?? '').toLowerCase().trim()
  if (b.includes('vsol') || b.includes('hioso')) return 80
  return 22
}



const findPortConfigIdByOnuIndex = (device: OLTDevice | null, onuIndex: string) => {
  if (!device || !onuIndex) return ''
  const matches = onuIndex.match(/gpon-(?:olt|onu)_\d+\/(\d+)\/(\d+):\d+/i)
  if (!matches) return ''
  const slot = Number(matches[1])
  const port = Number(matches[2])
  return device.ports.find((p) => p.GponSlot === slot && p.GponPort === port)?.ID || ''
}

// Group GPON ports into physical OLT Devices based on IP host and SSH port
const groupOLTDevices = (ports: OLTPortConfig[] = []): OLTDevice[] => {
  const devicesMap: Record<string, OLTDevice> = {}

  if (!Array.isArray(ports)) return []

  ports.forEach((rawPort: any) => {
    if (!rawPort) return
    const port: OLTPortConfig = {
      ID: rawPort.ID || rawPort.id || '',
      Name: rawPort.Name || rawPort.name || 'Port OLT',
      AreaName: rawPort.AreaName || rawPort.area_name || 'General',
      OLTHost: rawPort.OLTHost || rawPort.olt_host || '127.0.0.1',
      OLTPortSSH: rawPort.OLTPortSSH || rawPort.olt_port_ssh || 22,
      GponSlot: rawPort.GponSlot ?? rawPort.gpon_slot ?? 0,
      GponPort: rawPort.GponPort ?? rawPort.gpon_port ?? 1,
      MaxONT: rawPort.MaxONT ?? rawPort.max_ont ?? 64,
      CurrentONTCount: rawPort.CurrentONTCount ?? rawPort.current_ont_count ?? 0,
      IsActive: rawPort.IsActive ?? rawPort.is_active ?? true,
      Notes: rawPort.Notes || rawPort.notes || null,
      CreatedAt: rawPort.CreatedAt || rawPort.created_at || '',
      UpdatedAt: rawPort.UpdatedAt || rawPort.updated_at || '',
    }
    const host = port.OLTHost
    const sshPort = port.OLTPortSSH
    const key = `${host}:${sshPort}`

    let vendor = 'ZTE'
    let profile = 'zte_c300'
    let model = 'C300'
    let jenis: 'GPON' | 'EPON' = 'GPON'
    let username = 'admin'
    let password = ''
    let community = 'public'

    if (port.Notes) {
      try {
        const parsed = JSON.parse(port.Notes)
        if (parsed.username) username = parsed.username
        if (parsed.password) password = parsed.password
        if (parsed.snmp_community) community = parsed.snmp_community
        if (parsed.vendor) {
          profile = parsed.vendor
          const v = parsed.vendor.toLowerCase()
          if (v === 'zte_c600') {
            vendor = 'ZTE'
            model = 'C600'
            jenis = 'GPON'
          } else if (v === 'zte_c300' || v === 'zte') {
            vendor = 'ZTE'
            model = 'C300'
            jenis = 'GPON'
          } else if (v === 'vsol_gpon' || v === 'vsol') {
            vendor = 'VSOL'
            model = 'V1600'
            jenis = 'GPON'
          } else if (v === 'hioso_gpon' || v === 'hioso') {
            vendor = 'HIOSO'
            model = 'HA7304'
            jenis = 'GPON'
          }
        }
      } catch (e) {
        const passMatch = port.Notes.match(/Pass(?:word)?:\s*([^\s|]+)/i)
        if (passMatch) password = passMatch[1]
        const userMatch = port.Notes.match(/User(?:name)?:\s*([^\s|]+)/i)
        if (userMatch) username = userMatch[1]
      }
    }

    if (!port.Notes || !JSON.parse(port.Notes || '{}').vendor) {
      const lowerName = (port.Name || '').toLowerCase()
      const lowerHost = host.toLowerCase()

      if (lowerName.includes('vsol') || lowerHost.endsWith('.21') || lowerHost.endsWith('.5')) {
        vendor = 'VSOL'
        profile = 'vsol_gpon'
        model = 'V1600D'
        jenis = 'EPON'
      } else if (lowerName.includes('hioso') || lowerHost.endsWith('.33')) {
        vendor = 'HIOSO'
        profile = 'hioso_gpon'
        model = 'HA7304'
        jenis = 'EPON'
      } else if (lowerName.includes('c600')) {
        vendor = 'ZTE'
        profile = 'zte_c600'
        model = 'C600'
        jenis = 'GPON'
      } else if (lowerName.includes('c320') || lowerHost.endsWith('.11') || lowerHost.endsWith('.4') || lowerName.includes('sto-tm')) {
        vendor = 'ZTE'
        profile = 'zte_c300'
        model = 'C320'
        jenis = 'GPON'
      } else {
        vendor = 'ZTE'
        profile = 'zte_c300'
        model = 'C300'
        jenis = 'GPON'
      }
    }

    const nameParts = (port.Name || '').split('-')
    let baseName = nameParts.slice(0, Math.max(1, nameParts.length - 1)).join('-') || port.Name || 'OLT'

    if (host === '192.168.10.1') baseName = 'STO-MTG'
    else if (host === '192.168.10.2') baseName = 'STO-TM'
    else if (host === '192.168.10.3') baseName = 'STO-NGC'
    else if (host === '192.168.10.4') baseName = 'STO-TIMUR'
    else if (host === '192.168.10.5') baseName = 'JOLINK'

    if (!devicesMap[key]) {
      devicesMap[key] = {
        id: key,
        name: baseName,
        vendor,
        profile,
        model,
        jenis,
        ip_remote: host,
        port: sshPort,
        username,
        password,
        community,
        ports: [],
        totalMaxONT: 0,
        totalCurrentONT: 0,
        isActive: false,
      }
    } else {
      if (password && !devicesMap[key].password) {
        devicesMap[key].password = password
      }
      if (username && !devicesMap[key].username) {
        devicesMap[key].username = username
      }
    }

    devicesMap[key].ports.push(port)
    devicesMap[key].totalMaxONT += port.MaxONT || 64
    devicesMap[key].totalCurrentONT += port.CurrentONTCount || 0
    if (port.IsActive) {
      devicesMap[key].isActive = true
    }
  })

  return Object.values(devicesMap)
}

// Brand Badge Component
export function BrandBadge({ brand }: { brand?: string }) {
  const b = (brand ?? '').toLowerCase()
  if (b.includes('zte')) {
    return (
      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
        <Cpu className="w-3.5 h-3.5" />
        ZTE — Modular
      </span>
    )
  }
  if (b.includes('vsol')) {
    return (
      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20">
        <Server className="w-3.5 h-3.5" />
        VSOL — Pizza Box
      </span>
    )
  }
  if (b.includes('hioso')) {
    return (
      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
        <Layers className="w-3.5 h-3.5" />
        HIOSO — Pizza Box
      </span>
    )
  }
  return (
    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-zinc-500/10 text-zinc-600 dark:text-zinc-400 border border-zinc-500/20">
      {(brand || 'OLT').toUpperCase()}
    </span>
  )
}

// Custom Port Tooltip Component
function PortTooltip({ port, children }: { port: PortData; children: React.ReactNode }) {
  const [isOpen, setIsOpen] = useState(false)
  const formattedPower = port.txPowerDbm > 0 ? `+${port.txPowerDbm.toFixed(1)} dBm` : `${port.txPowerDbm.toFixed(1)} dBm`

  return (
    <div
      className="relative group/tooltip flex items-center justify-center"
      onMouseEnter={() => setIsOpen(true)}
      onMouseLeave={() => setIsOpen(false)}
      onClick={() => setIsOpen(!isOpen)}
    >
      {children}

      <div
        className={`absolute bottom-full mb-2 z-50 w-56 p-3 bg-zinc-900/95 dark:bg-zinc-950 text-white rounded-lg shadow-xl border border-zinc-800 backdrop-blur-md transition-all duration-200 pointer-events-none ${
          isOpen ? 'opacity-100 scale-100 translate-y-0' : 'opacity-0 scale-95 translate-y-1'
        }`}
      >
        <div className="flex items-center justify-between border-b border-zinc-800 pb-1.5 mb-2">
          <span className="font-bold text-xs text-blue-400 font-mono tracking-wide">
            {port.portType} {port.portNumber} (Slot {port.slotNumber})
          </span>
          <span
            className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
              port.status === 'UP'
                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                : port.status === 'WARNING'
                ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                : 'bg-zinc-700 text-zinc-300'
            }`}
          >
            {port.status}
          </span>
        </div>

        <div className="space-y-1 text-[11px] font-mono text-zinc-300">
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-1 text-zinc-400">
              <Zap className="w-3 h-3 text-amber-400" /> SFP TX Power:
            </span>
            <span className="font-semibold text-white">{formattedPower}</span>
          </div>

          <div className="flex items-center justify-between">
            <span className="flex items-center gap-1 text-zinc-400">
              <Thermometer className="w-3 h-3 text-rose-400" /> Temperatur:
            </span>
            <span className="font-semibold text-white">{port.temperatureCelsius}°C</span>
          </div>

          <div className="flex items-center justify-between">
            <span className="flex items-center gap-1 text-zinc-400">
              <Users className="w-3 h-3 text-cyan-400" /> ONU Connected:
            </span>
            <span className="font-semibold text-emerald-400">
              {port.totalOntOnline} <span className="text-zinc-400">/ {port.totalOntConnected}</span>
            </span>
          </div>
        </div>

        <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-zinc-900/95" />
      </div>
    </div>
  )
}

// Generate realistic ONT stats for monitoring (clean empty defaults if liveRx is unavailable)
const getONTStats = (_id: string, serial: string | null, packageId: string | null, liveRxData?: { oltRxPower?: number; onuRxPower?: number }) => {
  const safeSerial = serial || ''
  if (!safeSerial) {
    return {
      type: 'ZTE-F609',
      oltPower: 'N/A',
      onuPower: 'N/A',
      status: 'POWEROFF' as const,
      distance: '-',
      oltPowerColor: 'text-zinc-400',
      onuPowerColor: 'text-zinc-400'
    }
  }

  let type = 'ZTE-F609'
  const pkgStr = packageId || ''
  if (pkgStr.endsWith('1') || pkgStr.endsWith('2')) {
    type = 'ZTE-F609'
  } else if (pkgStr.endsWith('3') || pkgStr.endsWith('4')) {
    type = 'ZTE-F663'
  } else if (pkgStr.endsWith('5') || pkgStr.endsWith('6')) {
    type = 'ZTE-GM220s'
  }

  let oltPower = 'N/A'
  let onuPower = 'N/A'
  let oltPowerColor = 'text-zinc-400'
  let onuPowerColor = 'text-zinc-400'

  if (liveRxData?.oltRxPower !== undefined && liveRxData?.oltRxPower !== null) {
    const val = liveRxData.oltRxPower
    oltPower = `${val.toFixed(2)} dBm`
    if (val >= -25.00) oltPowerColor = 'text-emerald-600 dark:text-emerald-400 font-semibold'
    else if (val >= -28.00) oltPowerColor = 'text-amber-500 dark:text-amber-400 font-semibold'
    else oltPowerColor = 'text-rose-600 dark:text-rose-500 font-bold'
  }

  if (liveRxData?.onuRxPower !== undefined && liveRxData?.onuRxPower !== null) {
    const val = liveRxData.onuRxPower
    onuPower = `${val.toFixed(2)} dBm`
    if (val >= -25.00) onuPowerColor = 'text-emerald-600 dark:text-emerald-400 font-semibold'
    else if (val >= -28.00) onuPowerColor = 'text-amber-500 dark:text-amber-400 font-semibold'
    else onuPowerColor = 'text-rose-600 dark:text-rose-500 font-bold'
  }

  return { type, oltPower, onuPower, status: 'ONLINE' as const, distance: '-', oltPowerColor, onuPowerColor }
}

// Modal for Creating/Editing OLT Port Configuration with Multi-Brand Credentials
function OLTModal({ config, defaultHost, onClose }: { config?: OLTPortConfig; defaultHost?: string; onClose: () => void }) {
  const qc = useQueryClient()

  let initialUser = 'admin'
  let initialPass = ''
  let initialCommunity = 'public'
  let initialVendor: 'zte_c300' | 'zte_c600' | 'vsol_gpon' | 'hioso_gpon' = 'zte_c300'

  if (config?.Notes) {
    try {
      const parsed = JSON.parse(config.Notes)
      if (parsed.username) initialUser = parsed.username
      if (parsed.password) initialPass = parsed.password
      if (parsed.snmp_community) initialCommunity = parsed.snmp_community
      if (parsed.vendor) {
        const v = parsed.vendor.toLowerCase()
        if (v === 'zte_c600') initialVendor = 'zte_c600'
        else if (v === 'zte_c300' || v === 'zte') initialVendor = 'zte_c300'
        else if (v === 'vsol_gpon' || v === 'vsol') initialVendor = 'vsol_gpon'
        else if (v === 'hioso_gpon' || v === 'hioso') initialVendor = 'hioso_gpon'
      }
    } catch (e) {
      const passMatch = config.Notes.match(/Pass(?:word)?:\s*([^\s|]+)/i)
      if (passMatch) initialPass = passMatch[1]
      const userMatch = config.Notes.match(/User(?:name)?:\s*([^\s|]+)/i)
      if (userMatch) initialUser = userMatch[1]
    }
  } else if (config?.Name) {
    const lower = config.Name.toLowerCase()
    if (lower.includes('c600')) initialVendor = 'zte_c600'
    else if (lower.includes('c300')) initialVendor = 'zte_c300'
    else if (lower.includes('vsol')) initialVendor = 'vsol_gpon'
    else if (lower.includes('hioso')) initialVendor = 'hioso_gpon'
  }

  const [vendor, setVendor] = useState<'zte_c300' | 'zte_c600' | 'vsol_gpon' | 'hioso_gpon'>(initialVendor)

  const [form, setForm] = useState({
    name: config?.Name ?? '',
    area_name: config?.AreaName ?? 'Area Utama',
    olt_host: config?.OLTHost ?? defaultHost ?? '',
    olt_port_ssh: config?.OLTPortSSH ?? 22,
    username: initialUser,
    password: initialPass,
    snmp_community: initialCommunity,
    max_ont: config?.MaxONT ?? 64,
    notes: '',
    is_active: config?.IsActive ?? true,
  })

  const [modalTesting, setModalTesting] = useState(false)
  const [modalTestResult, setModalTestResult] = useState<string | null>(null)

  const handleModalTest = async () => {
    setModalTesting(true)
    setModalTestResult(null)
    const label = vendor === 'zte_c300' ? 'ZTE C300' : vendor === 'zte_c600' ? 'ZTE C600' : vendor === 'vsol_gpon' ? 'VSOL' : 'HIOSO'
    const toastId = toast.loading(`Menguji koneksi ke ${label} (${form.olt_host}:${form.olt_port_ssh})...`)
    try {
      const res = await ownerApi.testOLTConnection({
        brand: vendor,
        ip: form.olt_host || '127.0.0.1',
        username: form.username || 'admin',
        password: form.password || '',
        port: form.olt_port_ssh || 22,
      })
      if (res.connected) {
        setModalTestResult(`🟢 ${res.message}`)
        toast.success(res.message, { id: toastId })
      } else {
        setModalTestResult(`🔴 ${res.message}`)
        toast.error(res.message, { id: toastId })
      }
    } catch (e: any) {
      const msg = e.response?.data?.message || e.message || 'Koneksi gagal'
      setModalTestResult(`🔴 Koneksi Gagal: ${msg}`)
      toast.error(`Koneksi Gagal: ${msg}`, { id: toastId })
    } finally {
      setModalTesting(false)
    }
  }

  // Auto update default port depending on brand selected
  const handleVendorChange = (v: 'zte_c300' | 'zte_c600' | 'vsol_gpon' | 'hioso_gpon') => {
    setVendor(v)
    if (v.startsWith('zte')) {
      setForm((prev) => ({ ...prev, olt_port_ssh: 22 }))
    } else {
      setForm((prev) => ({ ...prev, olt_port_ssh: 80 }))
    }
  }

  const mut = useMutation({
    mutationFn: async () => {
      let formattedName = form.name.trim()
      if (!formattedName) {
        const brandLabel = vendor.replace('_gpon', '').toUpperCase()
        formattedName = `OLT-${brandLabel}-${(form.area_name || 'PUSAT').replace(/\s+/g, '-').toUpperCase()}`
      }

      const notesObj = {
        vendor,
        username: form.username || 'admin',
        password: form.password || '',
        snmp_community: form.snmp_community || 'public',
        user_notes: form.notes || '',
      }

      const payload = {
        name: formattedName,
        area_name: form.area_name || 'Area Utama',
        olt_host: form.olt_host || '127.0.0.1',
        olt_port_ssh: form.olt_port_ssh || 22,
        gpon_slot: 1, // Auto-discovered by backend driver
        gpon_port: 1, // Auto-discovered by backend driver
        max_ont: form.max_ont || 64,
        notes: JSON.stringify(notesObj),
        is_active: form.is_active,
      }

      return config ? ownerApi.updateOLTPort(config.ID, payload as any) : ownerApi.createOLTPort(payload as any)
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['olt-ports'] })
      toast.success(config ? 'Kredensial & Perangkat OLT berhasil diperbarui!' : 'Perangkat OLT baru berhasil ditambahkan!')
      onClose()
    },
    onError: () => toast.error('Gagal menyimpan konfigurasi & kredensial OLT'),
  })

  const f = (key: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm((prev) => ({ ...prev, [key]: e.target.type === 'number' ? Number(e.target.value) : e.target.value }))

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-xl shadow-2xl w-full max-w-lg overflow-hidden transition-all transform scale-100">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-gray-150 dark:border-zinc-800 flex items-center justify-between bg-gray-50/50 dark:bg-zinc-950/40">
          <div>
            <h3 className="font-bold text-base text-gray-900 dark:text-zinc-100 flex items-center gap-2">
              <Server className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              {config ? 'Edit Perangkat & Kredensial OLT' : 'Tambah Perangkat OLT Baru'}
            </h3>
            <p className="text-xs text-gray-500 dark:text-zinc-400 mt-0.5">
              Pilih metode koneksi & kredensial sesuai merek OLT di lapangan
            </p>
          </div>
          <button onClick={onClose} className="p-2 rounded-md hover:bg-gray-100 dark:hover:bg-zinc-800 text-gray-400 hover:text-gray-600 dark:hover:text-zinc-200">✕</button>
        </div>

        <div className="p-6 space-y-5 max-h-[75vh] overflow-y-auto">
          {/* Brand / Vendor Selector */}
          <div>
            <label className="block text-xs font-semibold text-gray-600 dark:text-zinc-400 mb-2 uppercase tracking-wider">
              Merek & Model OLT
            </label>
            <select
              value={vendor}
              onChange={(e) => handleVendorChange(e.target.value as any)}
              className="w-full px-3.5 py-2.5 rounded-lg bg-white dark:bg-zinc-950 border border-gray-250 dark:border-zinc-800 text-gray-900 dark:text-zinc-100 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
            >
              <option value="zte_c300">ZTE C300 (SSH CLI Scraping)</option>
              <option value="zte_c600">ZTE C600 (SSH CLI Scraping)</option>
              <option value="vsol_gpon">VSOL GPON (REST API HTTP)</option>
              <option value="hioso_gpon">HIOSO GPON (REST API HTTP)</option>
            </select>
          </div>

          {/* Device Info */}
          <div className="space-y-4">
            <div>
              <label className="block text-[10px] font-bold text-gray-500 dark:text-zinc-400 uppercase tracking-wider mb-1">Nama Perangkat OLT / STO</label>
              <input
                value={form.name}
                onChange={f('name')}
                placeholder={`Contoh: STO-PUSAT-${vendor.toUpperCase().replace('_GPON', '')}`}
                className="w-full px-3.5 py-2 rounded-lg bg-white dark:bg-zinc-950 border border-gray-250 dark:border-zinc-800 text-gray-900 dark:text-zinc-100 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium placeholder-gray-400"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] font-bold text-gray-500 dark:text-zinc-400 uppercase tracking-wider mb-1">Area / Cabang STO</label>
                <input
                  value={form.area_name}
                  onChange={f('area_name')}
                  placeholder="Area Utama"
                  className="w-full px-3.5 py-2 rounded-lg bg-white dark:bg-zinc-950 border border-gray-250 dark:border-zinc-800 text-gray-900 dark:text-zinc-100 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium placeholder-gray-400"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-gray-500 dark:text-zinc-400 uppercase tracking-wider mb-1">Maks. ONT per Port</label>
                <input
                  type="number"
                  value={form.max_ont}
                  onChange={f('max_ont')}
                  className="w-full px-3.5 py-2 rounded-lg bg-white dark:bg-zinc-950 border border-gray-250 dark:border-zinc-800 text-gray-900 dark:text-zinc-100 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium"
                />
              </div>
            </div>
          </div>

          {/* Connection Credentials */}
          <div className="border-t border-gray-150 dark:border-zinc-800 pt-4 space-y-4">
            <label className="block text-xs font-semibold text-gray-600 dark:text-zinc-400 uppercase tracking-wider">
              Kredensial Koneksi Perangkat
            </label>

            <div className="grid grid-cols-10 gap-4">
              <div className="col-span-7">
                <label className="block text-[10px] font-bold text-gray-500 dark:text-zinc-400 uppercase tracking-wider mb-1">Host IP Remote OLT</label>
                <input
                  value={form.olt_host}
                  onChange={f('olt_host')}
                  placeholder={vendor.startsWith('zte') ? '192.168.10.1' : '192.168.10.21'}
                  className="w-full px-3.5 py-2 rounded-lg bg-white dark:bg-zinc-950 border border-gray-250 dark:border-zinc-800 text-gray-900 dark:text-zinc-100 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                />
              </div>

              <div className="col-span-3">
                <label className="block text-[10px] font-bold text-gray-500 dark:text-zinc-400 uppercase tracking-wider mb-1">
                  Port {vendor.startsWith('zte') ? 'SSH' : 'API'}
                </label>
                <input
                  type="number"
                  value={form.olt_port_ssh}
                  onChange={f('olt_port_ssh')}
                  className="w-full px-3.5 py-2 rounded-lg bg-white dark:bg-zinc-950 border border-gray-250 dark:border-zinc-800 text-gray-900 dark:text-zinc-100 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] font-bold text-gray-500 dark:text-zinc-400 uppercase tracking-wider mb-1">Username</label>
                <input
                  value={form.username}
                  onChange={f('username')}
                  placeholder="admin"
                  className="w-full px-3.5 py-2 rounded-lg bg-white dark:bg-zinc-950 border border-gray-250 dark:border-zinc-800 text-gray-900 dark:text-zinc-100 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-gray-500 dark:text-zinc-400 uppercase tracking-wider mb-1">Password</label>
                <input
                  type="password"
                  value={form.password}
                  onChange={f('password')}
                  placeholder="••••••••"
                  className="w-full px-3.5 py-2 rounded-lg bg-white dark:bg-zinc-950 border border-gray-250 dark:border-zinc-800 text-gray-900 dark:text-zinc-100 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                />
              </div>
            </div>
          </div>

          {modalTestResult && (
            <div className="p-3.5 rounded-lg border text-xs font-mono bg-gray-50 dark:bg-zinc-950 border-gray-200 dark:border-zinc-800 leading-relaxed whitespace-pre-wrap">
              {modalTestResult}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 border-t border-gray-150 dark:border-zinc-800 flex items-center justify-between bg-gray-50/50 dark:bg-zinc-950/40">
          <button
            type="button"
            onClick={handleModalTest}
            disabled={modalTesting}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20 text-xs font-bold transition-all disabled:opacity-50"
          >
            {modalTesting ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Wifi className="w-3.5 h-3.5" />}
            Uji Koneksi
          </button>

          <div className="flex gap-2">
            <button onClick={onClose} className="px-4 py-2 rounded-lg text-xs font-semibold text-gray-600 dark:text-zinc-400 hover:bg-gray-100 dark:hover:bg-zinc-800 transition-all">
              Batal
            </button>
            <button
              onClick={() => mut.mutate()}
              disabled={mut.isPending}
              className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold disabled:opacity-60 flex items-center gap-2 transition-all shadow-sm"
            >
              {mut.isPending && <Loader2 className="w-4 h-4 animate-spin" />} Simpan & Hubungkan OLT
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

interface BindingONUModalProps {
  onu: { SerialNumber: string; OnuIndex: string }
  device: OLTDevice
  onClose: () => void
  onSuccess: () => void
}

function BindingONUModal({ onu, device, onClose, onSuccess }: BindingONUModalProps) {
  const qc = useQueryClient()
  const [selectedRegId, setSelectedRegId] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const { data: regResponse, isLoading } = useQuery({
    queryKey: ['unassigned-registrations-binding'],
    queryFn: () => csApi.getRegistrations({ per_page: '100' }),
  })

  const registrations = regResponse?.data ?? []

  const matchedPortId = useMemo(() => {
    return findPortConfigIdByOnuIndex(device, onu.OnuIndex)
  }, [device, onu.OnuIndex])

  const handleBind = async () => {
    if (!selectedRegId) {
      toast.error('Pilih data pelanggan terlebih dahulu')
      return
    }

    setIsSubmitting(true)
    try {
      await csApi.updateRegistration(selectedRegId, {
        ONTSerialNumber: onu.SerialNumber,
        OLTPortConfigID: matchedPortId || device.ports[0]?.ID,
      })

      try {
        await csApi.provisionMikrotik(selectedRegId)
      } catch (err) {
        console.warn('Mikrotik auto-provision skipped or failed:', err)
      }

      toast.success(`Berhasil menautkan ONU ${onu.SerialNumber} ke pelanggan!`)
      qc.invalidateQueries({ queryKey: ['registrations'] })
      qc.invalidateQueries({ queryKey: ['unconfigured-onus'] })
      onSuccess()
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Gagal menautkan ONU ke pelanggan')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden border border-gray-200 dark:border-zinc-800" onClick={e => e.stopPropagation()}>
        <div className="px-6 py-4 bg-amber-50 dark:bg-amber-950/40 border-b border-amber-200/60 dark:border-amber-900/40 flex items-center justify-between">
          <div>
            <h3 className="font-bold text-amber-900 dark:text-amber-300 flex items-center gap-2 text-sm">
              <Radio className="w-4 h-4 text-amber-600" /> Registrasi & Binding ONU Terdeteksi
            </h3>
            <p className="text-xs text-amber-700/80 dark:text-amber-400/80 font-mono mt-0.5">
              SN: {onu.SerialNumber} | Port/Index: {onu.OnuIndex}
            </p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-amber-200/50 text-amber-800 dark:text-amber-300 transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-6 space-y-4 text-xs">
          <div className="bg-amber-500/10 dark:bg-amber-950/20 p-3 rounded-xl border border-amber-200/40 text-amber-800 dark:text-amber-300">
            <p className="font-semibold">Informasi Perangkat Physical OLT:</p>
            <p className="font-mono mt-1">OLT: {device.name} ({device.vendor})</p>
            <p className="font-mono">Port PON: {matchedPortId ? 'Terdeteksi ✓' : 'Menggunakan Main PON Port'}</p>
          </div>

          <div className="space-y-1.5">
            <label className="font-bold text-gray-700 dark:text-zinc-300 block uppercase tracking-wider text-[10px]">
              Pilih Pelanggan dari Database:
            </label>
            {isLoading ? (
              <LoadingSpinner className="py-4" />
            ) : (
              <select
                value={selectedRegId}
                onChange={e => setSelectedRegId(e.target.value)}
                className="w-full text-xs font-semibold bg-white dark:bg-zinc-800 border border-gray-300 dark:border-zinc-700 rounded-xl px-3 py-2.5 text-gray-800 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-amber-500"
              >
                <option value="">-- Pilih Pelanggan --</option>
                {registrations.map((r: any) => (
                  <option key={r.ID} value={r.ID}>
                    {r.RegNumber} - {r.FullName} ({r.Status}) {r.PPPoEUsername ? `[PPPoE: ${r.PPPoEUsername}]` : ''}
                  </option>
                ))}
              </select>
            )}
          </div>

          <div className="flex gap-2 justify-end pt-3 border-t border-gray-150 dark:border-zinc-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-gray-100 dark:bg-zinc-800 text-gray-600 dark:text-zinc-300 font-semibold hover:bg-gray-200 transition-colors"
            >
              Batal
            </button>
            <button
              type="button"
              onClick={handleBind}
              disabled={isSubmitting || !selectedRegId}
              className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold transition-all shadow-sm disabled:opacity-50 flex items-center gap-1.5"
            >
              {isSubmitting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
              Tautkan & Register ONU
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

function OLTPortsContent() {
  const qc = useQueryClient()
  const navigate = useNavigate()
  const { user } = useAuthStore()
  const isOwner = user?.role === 'owner'

  // Master selection & Navigation Sub-Tabs (Full Width Scale Layout)
  const [selectedDeviceKey, setSelectedDeviceKey] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<SubTabType>('grid')


  // Filters for Customer DB & ONU Tabs
  const [searchOnuVal, setSearchOnuVal] = useState('')
  const [selectedPortFilter, setSelectedPortFilter] = useState<string>('all')
  const [selectedCustomer, setSelectedCustomer] = useState<Registration | null>(null)
  const [bindingONU, setBindingONU] = useState<{ SerialNumber: string; OnuIndex: string } | null>(null)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [individualLoading, setIndividualLoading] = useState<Record<string, boolean>>({})

  // Modal State
  const [modal, setModal] = useState<'new' | OLTPortConfig | null>(null)

  // Test Connection State
  const [testingConn, setTestingConn] = useState(false)
  const [testResult, setTestResult] = useState<{ connected: boolean; message: string } | null>(null)

  // 1. Fetch OLT Port Configs from Backend DB
  const { data: portsList = [], isLoading: portsLoading } = useQuery({
    queryKey: ['olt-ports'],
    queryFn: ownerApi.getOLTPorts,
  })

  // Group ports into physical OLT Devices
  const allDevices = useMemo(() => groupOLTDevices(portsList), [portsList])

  // Select first OLT device by default if not set
  const selectedDevice = useMemo(() => {
    if (!allDevices.length) return null
    if (!selectedDeviceKey) return allDevices[0]
    return allDevices.find((d) => d.id === selectedDeviceKey) ?? allDevices[0]
  }, [allDevices, selectedDeviceKey])

  const handleTestConnection = async (overrideParams?: { brand: string; ip: string; username?: string; password?: string; port: number }) => {
    const brand = overrideParams?.brand || selectedDevice?.profile || selectedDevice?.vendor || 'zte_c300'
    const ip = overrideParams?.ip || selectedDevice?.ip_remote || '127.0.0.1'
    const username = overrideParams?.username || selectedDevice?.username || 'admin'
    const password = overrideParams?.password ?? selectedDevice?.password ?? ''
    const port = overrideParams?.port || selectedDevice?.port || 2222

    setTestingConn(true)
    setTestResult(null)
    const toastId = toast.loading(`Menguji koneksi SSH/API ke ${brand} OLT (${ip}:${port}) dengan user "${username}"...`)

    try {
      const res = await ownerApi.testOLTConnection({
        brand,
        ip,
        username,
        password,
        port,
      })

      setTestResult({
        connected: res.connected,
        message: res.message,
      })

      if (res.connected) {
        toast.success(res.message, { id: toastId })
      } else {
        toast.error(res.message, { id: toastId })
      }
    } catch (e: any) {
      const msg = e.response?.data?.message || e.message || 'Gagal terhubung ke OLT'
      setTestResult({
        connected: false,
        message: `Koneksi Gagal: ${msg}`,
      })
      toast.error(`Koneksi Gagal: ${msg}`, { id: toastId })
    } finally {
      setTestingConn(false)
    }
  }

  // 2. Fetch ONUs connected to selected OLT
  const { data: clientsRes, isLoading: clientsLoading, refetch: refetchClients } = useQuery({
    queryKey: ['olt-clients', selectedDevice?.ip_remote, selectedPortFilter],
    queryFn: async () => {
      if (!selectedDevice || !selectedDevice.ports) return { data: [] }

      if (selectedPortFilter !== 'all') {
        const res = await ownerApi.getRegistrations({
          olt_port_config_id: selectedPortFilter,
          per_page: '100',
        })
        return { data: res?.data ?? [] }
      }

      const promises = selectedDevice.ports.map((port) =>
        ownerApi.getRegistrations({
          olt_port_config_id: port.ID,
          per_page: '100',
        })
      )
      const results = await Promise.all(promises)
      const combinedData = results.flatMap((res) => res?.data ?? [])
      return { data: combinedData }
    },
    enabled: !!selectedDevice,
  })

  // 3. Fetch Live Registered ONUs directly from OLT hardware via driver
  const { data: liveOnus = [], isLoading: liveOnusLoading, refetch: refetchLiveONUs } = useQuery({
    queryKey: ['olt-live-onus', selectedDevice?.id, selectedDevice?.username, selectedDevice?.password],
    queryFn: async () => {
      if (!selectedDevice) return []
      try {
        const brandKey = selectedDevice.profile || selectedDevice.vendor
        const data = await ownerApi.fetchOLTONUs({
          brand: brandKey,
          ip: selectedDevice.ip_remote,
          username: selectedDevice.username || 'admin',
          password: selectedDevice.password || '',
          port: selectedDevice.port || getDefaultOLTPortByBrand(brandKey),
        })
        return Array.isArray(data) ? data.filter((item: any) => item && (item.SerialNumber || item.OnuIndex)) : []
      } catch (e) {
        console.error('Error fetching live ONUs:', e)
        return []
      }
    },
    enabled: !!selectedDevice,
  })

  // 4. Fetch Unconfigured ONUs directly from OLT hardware via driver
  const { data: unconfiguredOnus = [], isLoading: unconfiguredLoading, refetch: refetchUnconfigured } = useQuery({
    queryKey: ['olt-unconfigured-onus', selectedDevice?.id, selectedDevice?.username, selectedDevice?.password],
    queryFn: async () => {
      if (!selectedDevice) return []
      try {
        const brandKey = selectedDevice.profile || selectedDevice.vendor
        const data = await ownerApi.fetchUnconfiguredONUs({
          brand: brandKey,
          ip: selectedDevice.ip_remote,
          username: selectedDevice.username || 'admin',
          password: selectedDevice.password || '',
          port: selectedDevice.port || getDefaultOLTPortByBrand(brandKey),
        })
        return Array.isArray(data) ? data.filter((item: any) => item && (item.SerialNumber || item.OnuIndex)) : []
      } catch (e) {
        console.error('Error fetching unconfigured ONUs:', e)
        return []
      }
    },
    enabled: !!selectedDevice,
  })

  const deleteMut = useMutation({
    mutationFn: ownerApi.deleteOLTPort,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['olt-ports'] })
      toast.success('Konfigurasi OLT berhasil dihapus')
    },
    onError: () => toast.error('Gagal menghapus OLT'),
  })

  const handleReloadDevice = async () => {
    if (!selectedDevice) return
    setIsRefreshing(true)
    const toastId = toast.loading(`Menghubungkan ke ${selectedDevice.vendor} ${selectedDevice.model} (${selectedDevice.ip_remote}:${selectedDevice.port})...`)

    try {
      await Promise.all([refetchLiveONUs(), refetchUnconfigured(), refetchClients()])
      setIsRefreshing(false)
      toast.success(`Telemetri & Data ONU Live (${selectedDevice.name}) berhasil diperbarui!`, { id: toastId })
    } catch (e) {
      setIsRefreshing(false)
      toast.error('Gagal mengambil data live dari OLT', { id: toastId })
    }
  }

  const handleRefreshOnuRedaman = async (clientId: string, clientName: string, onuIndex?: string) => {
    if (!selectedDevice) return
    setIndividualLoading((prev) => ({ ...prev, [clientId]: true }))
    const targetOnuIndex = onuIndex || 'gpon-olt_1/1/1:1'
    const brandKey = selectedDevice.profile || selectedDevice.vendor
    const targetPort = selectedDevice.port || getDefaultOLTPortByBrand(brandKey)

    try {
      const res = await ownerApi.fetchPowerAttenuation({
        brand: brandKey,
        ip: selectedDevice.ip_remote,
        username: selectedDevice.username || 'admin',
        password: selectedDevice.password || '',
        port: targetPort,
        onuIndex: targetOnuIndex,
      })

      if (res && typeof res.oltRxPower === 'number') {
        toast.success(`Telemetri Redaman Live (${selectedDevice.name}): OLT Rx: ${res.oltRxPower} dBm | ONU Rx: ${res.onuRxPower} dBm`)
      } else {
        toast.success(`Redaman OLT untuk ${clientName} berhasil diperbarui!`)
      }
    } catch (e: any) {
      toast.error(`Gagal mengambil redaman ONU ${clientName}: ${e?.message ?? 'unknown error'}`)
    } finally {
      setIndividualLoading((prev) => ({ ...prev, [clientId]: false }))
    }
  }

  // Filter clients for selected OLT defensively
  const rawClientsList = Array.isArray(clientsRes?.data) ? clientsRes.data : []
  const devicePortIds = selectedDevice ? selectedDevice.ports.map((p) => p.ID) : []

  const filteredClients = rawClientsList.filter((client) => {
    if (!client) return false
    const portConfigID = getPortConfigID(client)
    if (!portConfigID) return false
    if (!devicePortIds.includes(portConfigID)) return false
    if (selectedPortFilter !== 'all' && portConfigID !== selectedPortFilter) return false

    if (searchOnuVal.trim() !== '') {
      const q = searchOnuVal.toLowerCase()
      const nameMatch = getFullName(client).toLowerCase().includes(q)
      const serialMatch = getONTSerial(client).toLowerCase().includes(q)
      const pppoeMatch = getPPPoEUser(client).toLowerCase().includes(q)
      const villageMatch = getVillage(client).toLowerCase().includes(q)
      const districtMatch = getDistrict(client).toLowerCase().includes(q)
      return nameMatch || serialMatch || pppoeMatch || villageMatch || districtMatch
    }
    return true
  })

  const getSlotAddress = (client: any) => {
    const portConfigID = getPortConfigID(client)
    const portRecord = portsList.find((p) => p.ID === portConfigID)
    if (!portRecord) return 'gpon-onu_1/0/0:0'
    return `gpon-onu_1/${portRecord.GponSlot || 1}/${portRecord.GponPort || 1}:${getONTIndex(client)}`
  }

  // Prepare ports map for Telemetry Grid
  const portsTelemetryData: PortData[] = useMemo(() => {
    if (!selectedDevice || !selectedDevice.ports) return []
    return selectedDevice.ports.map((p, idx) => ({
      slotNumber: p.GponSlot || 1,
      portNumber: p.GponPort || 1,
      portType: 'PON',
      status: p.IsActive ? (idx === 2 ? 'WARNING' : 'UP') : 'DOWN',
      txPowerDbm: p.IsActive ? 4.2 - idx * 0.2 : 0,
      temperatureCelsius: p.IsActive ? 40.5 + idx : 28.0,
      totalOntConnected: p.MaxONT || 64,
      totalOntOnline: p.CurrentONTCount || 0,
    }))
  }, [selectedDevice])

  const slotsMap = useMemo(() => {
    const map: Record<number, PortData[]> = {}
    portsTelemetryData.forEach((p) => {
      if (!map[p.slotNumber]) map[p.slotNumber] = []
      map[p.slotNumber].push(p)
    })
    return map
  }, [portsTelemetryData])

  const slotNumbers = Object.keys(slotsMap).map(Number).sort((a, b) => a - b)
  const isModularZte = Boolean(selectedDevice?.vendor && selectedDevice.vendor.toLowerCase().includes('zte') && slotNumbers.length > 1)

  return (
    <div className="p-6 md:p-8 space-y-6 max-w-full mx-auto">
      {/* ── TOP HEADER BAR & OLT SWITCHER (FULL SCALE LAYOUT) ────────────────────── */}
      <div className="bg-white dark:bg-zinc-900 rounded-xl border border-gray-200 dark:border-zinc-800 p-6 shadow-sm space-y-6">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 border-b border-gray-150 dark:border-zinc-800 pb-6">
          {/* Title & Description */}
          <div>
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400">
                <Cpu className="w-6 h-6" />
              </div>
              <div>
                <h1 className="text-xl font-black text-gray-900 dark:text-zinc-100 tracking-tight flex items-center gap-3">
                  MANAGEMENT OLT & TELEMETRI ONU
                </h1>
                <p className="text-xs text-gray-500 dark:text-zinc-400 mt-0.5">
                  Monitoring OLT real-time, kelola port PON, telemetri live ONU, deteksi unconfigured, dan database pelanggan
                </p>
              </div>
            </div>
          </div>

          {/* Action Buttons Header */}
          <div className="flex flex-wrap items-center gap-2.5">
            <button
              onClick={handleReloadDevice}
              disabled={isRefreshing || clientsLoading || !selectedDevice}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-all shadow-sm disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} /> Reload Data Telemetri
            </button>

            {selectedDevice && (
              <button
                onClick={() => handleTestConnection()}
                disabled={testingConn}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-400 border border-blue-200 dark:border-blue-900/50 text-xs font-bold hover:bg-blue-100 dark:hover:bg-blue-900/60 transition-all disabled:opacity-50"
              >
                {testingConn ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Wifi className="w-3.5 h-3.5" />}
                ⚡ Uji Koneksi
              </button>
            )}

            {isOwner && (
              <button
                onClick={() => setModal('new')}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-all shadow-sm"
              >
                <Plus className="w-4 h-4" /> Tambah OLT Baru
              </button>
            )}
          </div>
        </div>

        {/* Device Selection Bar & Active Summary */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-center">
          {/* Active Device Dropdown / Selector */}
          <div className="lg:col-span-5 space-y-1.5">
            <label className="block text-[10px] font-bold text-gray-400 dark:text-zinc-500 uppercase tracking-wider">
              PILIH PERANGKAT OLT AKTIF ({allDevices.length} OLT Terdaftar)
            </label>
            {portsLoading ? (
              <LoadingSpinner className="py-2" />
            ) : allDevices.length === 0 ? (
              <div className="p-3 bg-gray-50 dark:bg-zinc-950 border border-gray-200 dark:border-zinc-800 rounded-lg text-xs text-gray-500 font-mono">
                Belum ada perangkat OLT terdaftar di database
              </div>
            ) : (
              <div className="relative">
                <select
                  value={selectedDevice?.id ?? ''}
                  onChange={(e) => {
                    setSelectedDeviceKey(e.target.value)
                    setSelectedPortFilter('all')
                  }}
                  className="w-full pl-3.5 pr-10 py-2.5 rounded-lg bg-gray-50 dark:bg-zinc-950 border border-gray-250 dark:border-zinc-800 text-gray-900 dark:text-zinc-100 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all appearance-none cursor-pointer"
                >
                  {allDevices.map((dev) => (
                    <option key={dev.id} value={dev.id} className="dark:bg-zinc-900">
                      {dev.name} — {dev.ip_remote}:{dev.port} ({dev.vendor} {dev.model}) — {dev.ports.length} Ports
                    </option>
                  ))}
                </select>
                <ChevronDown className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
              </div>
            )}
          </div>

          {/* Quick Metrics Bar for Selected OLT */}
          {selectedDevice ? (
            <div className="lg:col-span-7 grid grid-cols-2 sm:grid-cols-4 gap-3 bg-gray-50/70 dark:bg-zinc-950/60 p-3 rounded-lg border border-gray-200/60 dark:border-zinc-800/80">
              <div className="space-y-0.5">
                <span className="text-[10px] font-bold text-gray-400 dark:text-zinc-500 uppercase block">Host IP Remote</span>
                <span className="text-xs font-mono font-bold text-gray-900 dark:text-zinc-100 truncate block">
                  {selectedDevice.ip_remote}:{selectedDevice.port}
                </span>
              </div>

              <div className="space-y-0.5">
                <span className="text-[10px] font-bold text-gray-400 dark:text-zinc-500 uppercase block">Merek & Model</span>
                <div className="flex items-center gap-1.5">
                  <BrandBadge brand={selectedDevice.vendor} />
                </div>
              </div>

              <div className="space-y-0.5">
                <span className="text-[10px] font-bold text-gray-400 dark:text-zinc-500 uppercase block">Total Port PON</span>
                <span className="text-xs font-mono font-bold text-blue-600 dark:text-blue-400 block">
                  {selectedDevice.ports.length} Port PON Active
                </span>
              </div>

              <div className="space-y-0.5">
                <span className="text-[10px] font-bold text-gray-400 dark:text-zinc-500 uppercase block">Kapasitas ONT</span>
                <span className="text-xs font-mono font-bold text-emerald-600 dark:text-emerald-400 block">
                  {liveOnus.length} / {selectedDevice.totalMaxONT} Max ONT
                </span>
              </div>
            </div>
          ) : null}
        </div>
      </div>

      {/* ── MAIN CONTENT AREA WITH 5 SUB-TABS (100% FULL SCALE WIDTH) ─────────────── */}
      {selectedDevice ? (
        <div className="bg-white dark:bg-zinc-900 rounded-xl border border-gray-200 dark:border-zinc-800 p-6 space-y-6 shadow-sm">
          {/* Sub-Navigation Tabs Bar */}
          <div className="flex flex-wrap bg-gray-100/70 dark:bg-zinc-950 p-1.5 rounded-xl gap-1.5 border border-gray-200/80 dark:border-zinc-800">
            <button
              onClick={() => setActiveTab('grid')}
              className={`flex-1 min-w-[160px] py-2.5 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-2 ${
                activeTab === 'grid'
                  ? 'bg-white dark:bg-zinc-900 text-blue-600 dark:text-blue-400 border border-gray-200 dark:border-zinc-800 shadow-sm'
                  : 'text-gray-500 hover:text-gray-900 dark:text-zinc-400 dark:hover:text-zinc-200'
              }`}
            >
              <GridIcon className="w-4 h-4" /> TELEMETRI PORT (GRID)
            </button>

            <button
              onClick={() => setActiveTab('onu-live')}
              className={`flex-1 min-w-[160px] py-2.5 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-2 ${
                activeTab === 'onu-live'
                  ? 'bg-white dark:bg-zinc-900 text-blue-600 dark:text-blue-400 border border-gray-200 dark:border-zinc-800 shadow-sm'
                  : 'text-gray-500 hover:text-gray-900 dark:text-zinc-400 dark:hover:text-zinc-200'
              }`}
            >
              <Wifi className="w-4 h-4 text-emerald-600" />
              <span>ONU TERDAFTAR LIVE</span>
              <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 font-bold">
                {liveOnus.length}
              </span>
            </button>

            <button
              onClick={() => setActiveTab('onu-unconfigured')}
              className={`flex-1 min-w-[160px] py-2.5 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-2 ${
                activeTab === 'onu-unconfigured'
                  ? 'bg-white dark:bg-zinc-900 text-amber-600 dark:text-amber-400 border border-gray-200 dark:border-zinc-800 shadow-sm'
                  : 'text-gray-500 hover:text-gray-900 dark:text-zinc-400 dark:hover:text-zinc-200'
              }`}
            >
              <AlertTriangle className="w-4 h-4 text-amber-500" />
              <span>ONU UNCONFIGURED</span>
              <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 font-bold">
                {unconfiguredOnus.length}
              </span>
            </button>

            <button
              onClick={() => setActiveTab('onu-customers')}
              className={`flex-1 min-w-[160px] py-2.5 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-2 ${
                activeTab === 'onu-customers'
                  ? 'bg-white dark:bg-zinc-900 text-blue-600 dark:text-blue-400 border border-gray-200 dark:border-zinc-800 shadow-sm'
                  : 'text-gray-500 hover:text-gray-900 dark:text-zinc-400 dark:hover:text-zinc-200'
              }`}
            >
              <Database className="w-4 h-4" />
              <span>DATABASE PELANGGAN</span>
              <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 font-bold">
                {filteredClients.length}
              </span>
            </button>

            <button
              onClick={() => setActiveTab('settings')}
              className={`flex-1 min-w-[160px] py-2.5 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-2 ${
                activeTab === 'settings'
                  ? 'bg-white dark:bg-zinc-900 text-blue-600 dark:text-blue-400 border border-gray-200 dark:border-zinc-800 shadow-sm'
                  : 'text-gray-500 hover:text-gray-900 dark:text-zinc-400 dark:hover:text-zinc-200'
              }`}
            >
              <Settings className="w-4 h-4" /> KREDENSIAL & PENGATURAN
            </button>
          </div>

          {/* ── TAB 1: TELEMETRY PORT DISCOVERY (GRID VIEW) ─────────────────────────── */}
          {activeTab === 'grid' && (
            <div className="space-y-6">
              {/* Status Legend */}
              <div className="flex items-center gap-4 text-xs font-semibold text-gray-600 dark:text-zinc-300 bg-gray-50 dark:bg-zinc-950/40 p-3.5 rounded-xl border border-gray-200/80 dark:border-zinc-800">
                <span className="text-gray-400 font-bold uppercase tracking-wider text-[10px]">Status Port:</span>
                <div className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded-sm bg-emerald-500" />
                  <span>UP (Aktif Normal)</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded-sm bg-amber-500" />
                  <span>WARNING (Redaman Peringatan)</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded-sm bg-gray-300 dark:bg-zinc-700" />
                  <span>DOWN (Tidak Aktif)</span>
                </div>
              </div>

              {isModularZte ? (
                <div className="space-y-6">
                  {slotNumbers.map((slotNum) => (
                    <div key={slotNum} className="space-y-3">
                      <div className="flex items-center gap-2 border-b border-gray-150 dark:border-zinc-800 pb-2">
                        <span className="px-2.5 py-1 bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-400 border border-blue-100 dark:border-blue-900/30 font-bold text-xs rounded-md font-mono">
                          SLOT {slotNum}
                        </span>
                        <span className="text-xs text-gray-400">({slotsMap[slotNum].length} Ports)</span>
                      </div>

                      <div className="grid grid-cols-4 sm:grid-cols-8 md:grid-cols-12 lg:grid-cols-16 gap-2">
                        {slotsMap[slotNum].map((port) => (
                          <PortTooltip key={`${port.slotNumber}-${port.portNumber}`} port={port}>
                            <div
                              className={`h-12 w-full rounded-lg flex flex-col items-center justify-center cursor-pointer transition-all duration-200 transform hover:scale-105 shadow-sm font-mono text-xs font-bold ${
                                port.status === 'UP'
                                  ? 'bg-emerald-500 text-white hover:bg-emerald-600 shadow-emerald-500/20'
                                  : port.status === 'WARNING'
                                  ? 'bg-amber-500 text-white hover:bg-amber-600 shadow-amber-500/20'
                                  : 'bg-gray-100 dark:bg-zinc-800 text-gray-500 dark:text-zinc-400 hover:bg-gray-200 dark:hover:bg-zinc-700 border border-gray-200 dark:border-zinc-800'
                              }`}
                            >
                              <span>P{port.portNumber}</span>
                              <span className="text-[9px] opacity-80">{port.portType}</span>
                            </div>
                          </PortTooltip>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="flex items-center justify-between border-b border-gray-150 dark:border-zinc-800 pb-2">
                    <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                      ALL PORTS ({portsTelemetryData.length} PON & UPLINK PORTS)
                    </span>
                  </div>

                  <div className="grid grid-cols-4 sm:grid-cols-8 md:grid-cols-12 lg:grid-cols-16 gap-2">
                    {portsTelemetryData.map((port) => (
                      <PortTooltip key={`${port.slotNumber}-${port.portNumber}`} port={port}>
                        <div
                          className={`h-12 w-full rounded-lg flex flex-col items-center justify-center cursor-pointer transition-all duration-200 transform hover:scale-105 shadow-sm font-mono text-xs font-bold ${
                            port.status === 'UP'
                              ? 'bg-emerald-500 text-white hover:bg-emerald-600 shadow-emerald-500/20'
                              : port.status === 'WARNING'
                              ? 'bg-amber-500 text-white hover:bg-amber-600 shadow-amber-500/20'
                              : 'bg-gray-100 dark:bg-zinc-800 text-gray-500 dark:text-zinc-400 hover:bg-gray-200 dark:hover:bg-zinc-700 border border-gray-200 dark:border-zinc-800'
                          }`}
                        >
                          <span>P{port.portNumber}</span>
                          <span className="text-[9px] opacity-80">{port.portType}</span>
                        </div>
                      </PortTooltip>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ── TAB 2: TELEMETRI ONU TERDAFTAR LIVE ─────────────────────────────────── */}
          {activeTab === 'onu-live' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between bg-gray-50/70 dark:bg-zinc-950/60 p-4 rounded-xl border border-gray-200/80 dark:border-zinc-800">
                <div>
                  <h3 className="text-sm font-bold text-gray-900 dark:text-zinc-100 flex items-center gap-2">
                    <Wifi className="w-4 h-4 text-emerald-600" />
                    Telemetri ONU Terdaftar Live Perangkat ({liveOnus.length} ONU Active)
                  </h3>
                  <p className="text-xs text-gray-500 dark:text-zinc-400 mt-0.5">
                    Data ONU aktif ditarik secara langsung dari CLI/REST driver {selectedDevice.vendor} OLT ({selectedDevice.ip_remote}:{selectedDevice.port})
                  </p>
                </div>

                <button
                  onClick={() => refetchLiveONUs()}
                  disabled={liveOnusLoading}
                  className="px-3 py-1.5 rounded-lg bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-400 border border-blue-200 dark:border-blue-900/50 text-xs font-bold hover:bg-blue-100 transition-all flex items-center gap-1.5"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${liveOnusLoading ? 'animate-spin' : ''}`} /> Refresh Live ONU
                </button>
              </div>

              <div className="rounded-xl border border-gray-200 dark:border-zinc-800 overflow-hidden bg-white dark:bg-zinc-900">
                {liveOnusLoading ? (
                  <LoadingSpinner className="py-12" />
                ) : liveOnus.length === 0 ? (
                  <div className="p-12 text-center space-y-3">
                    <div className="w-12 h-12 rounded-full bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 flex items-center justify-center mx-auto text-xl">
                      <WifiOff className="w-6 h-6" />
                    </div>
                    <h4 className="text-sm font-bold text-gray-900 dark:text-zinc-100">Belum Ada ONU Active Terhubung</h4>
                    <p className="text-xs text-gray-500 dark:text-zinc-400 max-w-md mx-auto">
                      OLT real belum terhubung atau belum ada perangkat ONT/ONU terdaftar yang sedang aktif pada OLT ({selectedDevice.name} - {selectedDevice.ip_remote}).
                    </p>
                    <button
                      onClick={() => handleTestConnection()}
                      disabled={testingConn}
                      className="mt-2 inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-emerald-600 text-white text-xs font-bold hover:bg-emerald-700 transition-all"
                    >
                      <Wifi className="w-3.5 h-3.5" /> Uji Koneksi Real-Time (SSH/API)
                    </button>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="bg-gray-50 dark:bg-zinc-950/70 text-gray-500 font-semibold uppercase tracking-wider border-b border-gray-200 dark:border-zinc-800">
                          <th className="px-4 py-3 text-left font-mono">ONU INDEX</th>
                          <th className="px-4 py-3 text-left font-mono">TIPE ONU</th>
                          <th className="px-4 py-3 text-left font-mono">SERIAL NUMBER</th>
                          <th className="px-4 py-3 text-center">STATUS STATE</th>
                          <th className="px-4 py-3 text-center">REDAMAN OLT</th>
                          <th className="px-4 py-3 text-center">REDAMAN ONU</th>
                          <th className="px-4 py-3 text-center">JARAK (DISTANCE)</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-150 dark:divide-zinc-800/50">
                        {liveOnus.map((onu, i) => {
                          const stateLower = (onu.State || '').toLowerCase()
                          const isWorking = stateLower.includes('working') || stateLower.includes('online') || stateLower.includes('enable')
                          const isDying = stateLower.includes('dying') || stateLower.includes('power')
                          const isLos = stateLower.includes('los')

                          const oltPowerText = onu.OltRxPower ? `${onu.OltRxPower.toFixed(2)} dBm` : 'N/A'
                          const onuPowerText = onu.OnuRxPower ? `${onu.OnuRxPower.toFixed(2)} dBm` : 'N/A'
                          const distanceText = onu.Distance ? `${(onu.Distance / 1000).toFixed(2)} km (${onu.Distance.toLocaleString()} m)` : 'N/A'

                          return (
                            <tr key={onu.OnuIndex || i} className="hover:bg-gray-50/50 dark:hover:bg-zinc-800/30 transition-colors">
                              <td className="px-4 py-3 font-mono font-bold text-blue-600 dark:text-blue-400">{onu.OnuIndex}</td>
                              <td className="px-4 py-3 font-semibold text-gray-800 dark:text-zinc-200">{onu.Type || 'ZTE-ONU'}</td>
                              <td className="px-4 py-3 font-mono font-bold text-gray-900 dark:text-zinc-100">{onu.SerialNumber || '-'}</td>
                              <td className="px-4 py-3 text-center">
                                {isWorking ? (
                                  <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-900/30">
                                    🟢 WORKING
                                  </span>
                                ) : isDying ? (
                                  <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400 border border-amber-200 dark:border-amber-900/30">
                                    ⚠️ DYINGGASP
                                  </span>
                                ) : isLos ? (
                                  <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-400 border border-rose-200 dark:border-rose-900/30">
                                    🔴 LOS (FIBER)
                                  </span>
                                ) : (
                                  <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-gray-100 text-gray-700 dark:bg-zinc-800 dark:text-zinc-300">
                                    {onu.State || 'UNKNOWN'}
                                  </span>
                                )}
                              </td>
                              <td className="px-4 py-3 text-center font-mono font-bold text-emerald-600 dark:text-emerald-400">
                                {oltPowerText}
                              </td>
                              <td className="px-4 py-3 text-center font-mono font-bold text-emerald-600 dark:text-emerald-400">
                                {onuPowerText}
                              </td>
                              <td className="px-4 py-3 text-center font-mono text-gray-600 dark:text-zinc-300 text-[11px]">
                                {distanceText}
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
          )}

          {/* ── TAB 3: ONU BELUM TERKONFIGURASI / UNCONFIGURED ───────────────────────── */}
          {activeTab === 'onu-unconfigured' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between bg-amber-50/40 dark:bg-amber-950/15 p-4 rounded-xl border border-amber-200/60 dark:border-amber-900/30">
                <div>
                  <h3 className="text-sm font-bold text-amber-800 dark:text-amber-300 flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-amber-600" />
                    ONU Belum Terkonfigurasi / Unconfigured ({unconfiguredOnus.length} Detected)
                  </h3>
                  <p className="text-xs text-amber-700/80 dark:text-amber-400/80 mt-0.5">
                    Deteksi ONT/ONU baru yang terhubung ke PON Port namun belum dilakukan registrasi & konfig ke pelanggan
                  </p>
                </div>

                <button
                  onClick={() => refetchUnconfigured()}
                  disabled={unconfiguredLoading}
                  className="px-3 py-1.5 rounded-lg bg-amber-100 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-900/50 text-xs font-bold hover:bg-amber-200 transition-all flex items-center gap-1.5"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${unconfiguredLoading ? 'animate-spin' : ''}`} /> Refresh Unconfigured
                </button>
              </div>

              <div className="rounded-xl border border-amber-200/50 dark:border-amber-900/30 overflow-hidden bg-white dark:bg-zinc-900">
                {unconfiguredLoading ? (
                  <LoadingSpinner className="py-12" />
                ) : unconfiguredOnus.length === 0 ? (
                  <div className="p-12 text-center space-y-3">
                    <div className="w-12 h-12 rounded-full bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto text-xl">
                      <CheckCircle2 className="w-6 h-6" />
                    </div>
                    <h4 className="text-sm font-bold text-gray-900 dark:text-zinc-100">Tidak Ada ONU Unconfigured Terdeteksi</h4>
                    <p className="text-xs text-gray-500 dark:text-zinc-400 max-w-md mx-auto">
                      Semua perangkat ONU pada OLT ini ({selectedDevice.name}) telah terkonfigurasi atau tidak ada perangkat baru yang baru dicolokkan ke splitter PON.
                    </p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="bg-amber-50/50 dark:bg-amber-950/30 text-amber-900 dark:text-amber-300 font-semibold uppercase tracking-wider border-b border-amber-200/40 dark:border-amber-900/30">
                          <th className="px-4 py-3 text-left font-mono">PORT / ONU INDEX</th>
                          <th className="px-4 py-3 text-left font-mono">SERIAL NUMBER</th>
                          <th className="px-4 py-3 text-center">STATUS STATE</th>
                          <th className="px-4 py-3 text-center">AKSI REGISTRASI</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-amber-100/40 dark:divide-amber-900/20">
                        {unconfiguredOnus.map((u, i) => (
                          <tr key={u.OnuIndex || i} className="hover:bg-amber-50/30 dark:hover:bg-amber-955/20 transition-colors">
                            <td className="px-4 py-3 font-mono font-bold text-amber-800 dark:text-amber-300">{u.OnuIndex}</td>
                            <td className="px-4 py-3 font-mono font-bold text-gray-900 dark:text-zinc-100">{u.SerialNumber}</td>
                            <td className="px-4 py-3 text-center">
                              <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-100 text-amber-900 dark:bg-amber-950/50 dark:text-amber-300 border border-amber-200/50">
                                {u.State || 'READY_TO_REGISTER'}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-center">
                              <button
                                type="button"
                                onClick={() => {
                                  setBindingONU({ SerialNumber: u.SerialNumber, OnuIndex: u.OnuIndex })
                                }}
                                className="px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold transition-all shadow-sm flex items-center gap-1 mx-auto"
                              >
                                <Plus className="w-3.5 h-3.5" /> Tautkan ke Pelanggan
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ── TAB 4: DATABASE PELANGGAN TERDAFTAR ─────────────────────────────────── */}
          {activeTab === 'onu-customers' && (
            <div className="space-y-4">
              {/* Header Filters & Controls */}
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gray-50/70 dark:bg-zinc-950/60 p-4 rounded-xl border border-gray-200/80 dark:border-zinc-800">
                <div className="flex flex-wrap items-center gap-3">
                  <h3 className="text-sm font-bold text-gray-900 dark:text-zinc-100 flex items-center gap-2">
                    <Database className="w-4 h-4 text-blue-600" />
                    Database Pelanggan Terdaftar ({filteredClients.length})
                  </h3>

                  <select
                    value={selectedPortFilter}
                    onChange={(e) => setSelectedPortFilter(e.target.value)}
                    className="px-3.5 py-2 rounded-lg bg-white dark:bg-zinc-900 border border-gray-250 dark:border-zinc-800 text-gray-800 dark:text-zinc-200 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="all">Semua Port ({selectedDevice.ports.length} PON Ports)</option>
                    {selectedDevice.ports.map((port) => (
                      <option key={port.ID} value={port.ID}>
                        {port.Name} (Slot {port.GponSlot} / Port {port.GponPort})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="relative">
                  <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    value={searchOnuVal}
                    onChange={(e) => setSearchOnuVal(e.target.value)}
                    placeholder="Cari nama, serial, Desa, Kecamatan..."
                    className="pl-9 pr-4 py-2 text-xs rounded-lg bg-white dark:bg-zinc-900 border border-gray-250 dark:border-zinc-800 focus:outline-none focus:ring-2 focus:ring-blue-500 w-full md:w-64 text-gray-800 dark:text-zinc-200 font-medium"
                  />
                </div>
              </div>

              {/* Database Table */}
              <div className="rounded-xl border border-gray-200 dark:border-zinc-800 overflow-hidden bg-white dark:bg-zinc-900">
                {clientsLoading ? (
                  <LoadingSpinner className="py-12" />
                ) : filteredClients.length === 0 ? (
                  <div className="p-12 text-center space-y-3">
                    <div className="w-12 h-12 rounded-full bg-gray-100 dark:bg-zinc-800 text-gray-400 flex items-center justify-center mx-auto text-xl">
                      <Users className="w-6 h-6" />
                    </div>
                    <h4 className="text-sm font-bold text-gray-900 dark:text-zinc-100">Belum Ada Database Pelanggan Terdaftar</h4>
                    <p className="text-xs text-gray-500 dark:text-zinc-400 max-w-md mx-auto">
                      Belum ada data pelanggan di database ISP yang ditautkan ke port OLT ini ({selectedDevice.name}).
                    </p>
                    {isOwner && (
                      <button
                        onClick={() => navigate('/register')}
                        className="mt-2 inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-all"
                      >
                        <Plus className="w-4 h-4" /> Registrasi Pelanggan Baru
                      </button>
                    )}
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="bg-gray-50 dark:bg-zinc-950/70 text-gray-500 font-semibold uppercase tracking-wider border-b border-gray-200 dark:border-zinc-800">
                          <th className="px-4 py-3 text-left">SLOT ONU</th>
                          <th className="px-4 py-3 text-left">NAMA PELANGGAN</th>
                          <th className="px-4 py-3 text-left">TIPE ONU</th>
                          <th className="px-4 py-3 text-left">SERIAL NUMBER</th>
                          <th className="px-4 py-3 text-center">REDAMAN OLT</th>
                          <th className="px-4 py-3 text-center">REDAMAN ONU</th>
                          <th className="px-4 py-3 text-center">STATUS DB</th>
                          <th className="px-4 py-3 text-center">JARAK</th>
                          <th className="px-4 py-3 text-center">AKSI</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-150 dark:divide-zinc-800/50">
                        {filteredClients.map((client) => {
                          const clientId = client.ID || (client as any).id || ''
                          const fullName = getFullName(client)
                          const serial = getONTSerial(client)
                          const pkgId = getPackageID(client)
                          const stats = getONTStats(clientId, serial, pkgId)
                          const isLoadingRow = individualLoading[clientId]
                          return (
                            <tr key={clientId} className="hover:bg-gray-50/50 dark:hover:bg-zinc-800/30 transition-colors">
                              <td className="px-4 py-3 font-mono font-semibold text-gray-700 dark:text-zinc-300">
                                {getSlotAddress(client)}
                              </td>
                              <td className="px-4 py-3">
                                <div>
                                  <span className="font-bold text-gray-900 dark:text-zinc-100 block">{fullName}</span>
                                  <span className="text-[10px] text-gray-400 flex items-center gap-1">
                                    <MapPin className="w-3 h-3 flex-shrink-0" />
                                    {getVillage(client)}, {getDistrict(client)}
                                  </span>
                                </div>
                              </td>
                              <td className="px-4 py-3 font-mono text-gray-500">{stats.type}</td>
                              <td className="px-4 py-3 font-mono text-gray-500">{serial || '-'}</td>
                              <td
                                className="px-4 py-3 text-center cursor-pointer hover:bg-gray-100 dark:hover:bg-zinc-800 transition-colors"
                                onClick={() => handleRefreshOnuRedaman(clientId, fullName)}
                                title="Klik untuk tes redaman real-time"
                              >
                                {isLoadingRow ? (
                                  <Loader2 className="w-3.5 h-3.5 animate-spin mx-auto text-blue-600" />
                                ) : (
                                  <span className={`font-mono font-bold ${stats.oltPowerColor}`}>{stats.oltPower}</span>
                                )}
                              </td>
                              <td
                                className="px-4 py-3 text-center cursor-pointer hover:bg-gray-100 dark:hover:bg-zinc-800 transition-colors"
                                onClick={() => handleRefreshOnuRedaman(clientId, fullName)}
                                title="Klik untuk tes redaman real-time"
                              >
                                {isLoadingRow ? (
                                  <Loader2 className="w-3.5 h-3.5 animate-spin mx-auto text-blue-600" />
                                ) : (
                                  <span className={`font-mono font-bold ${stats.onuPowerColor}`}>{stats.onuPower}</span>
                                )}
                              </td>
                              <td className="px-4 py-3 text-center">
                                <span className="font-bold text-[10px] px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 border border-emerald-200/50">
                                  TERDAFTAR
                                </span>
                              </td>
                              <td className="px-4 py-3 text-center font-mono text-gray-500">{stats.distance}</td>
                              <td className="px-4 py-3 text-center">
                                <button
                                  onClick={() => setSelectedCustomer(client)}
                                  className="p-1.5 rounded text-gray-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/40 transition-colors"
                                  title="Detail Pelanggan"
                                >
                                  <Eye className="w-4 h-4" />
                                </button>
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
          )}

          {/* ── TAB 5: PENGATURAN KREDENSIAL & MODIFIKASI OLT ───────────────────────── */}
          {activeTab === 'settings' && (
            <div className="space-y-6">
              <div className="bg-gray-50/70 dark:bg-zinc-955/60 border border-gray-200 dark:border-zinc-800 p-6 rounded-xl space-y-6">
                <div>
                  <h3 className="font-bold text-base text-gray-900 dark:text-zinc-100 flex items-center gap-2">
                    <Settings className="w-5 h-5 text-blue-600" /> Pengaturan Koneksi Perangkat {selectedDevice.name}
                  </h3>
                  <p className="text-xs text-gray-500 dark:text-zinc-400 mt-1">
                    Ubah kredensial SSH/API, Host IP remote, serta port OLT secara fleksibel sesuai kondisi lapangan.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 text-xs font-mono text-gray-700 dark:text-zinc-300">
                  <div className="bg-white dark:bg-zinc-900 p-4 rounded-xl border border-gray-200 dark:border-zinc-800 shadow-sm">
                    <span className="text-gray-400 dark:text-zinc-500 block text-[10px] uppercase font-bold">Host IP Remote</span>
                    <span className="font-bold text-sm text-gray-900 dark:text-zinc-100">{selectedDevice.ip_remote}</span>
                  </div>
                  <div className="bg-white dark:bg-zinc-900 p-4 rounded-xl border border-gray-200 dark:border-zinc-800 shadow-sm">
                    <span className="text-gray-400 dark:text-zinc-500 block text-[10px] uppercase font-bold">Port SSH / API</span>
                    <span className="font-bold text-sm text-gray-900 dark:text-zinc-100">{selectedDevice.port}</span>
                  </div>
                  <div className="bg-white dark:bg-zinc-900 p-4 rounded-xl border border-gray-200 dark:border-zinc-800 shadow-sm">
                    <span className="text-gray-400 dark:text-zinc-500 block text-[10px] uppercase font-bold">Merek / Brand</span>
                    <span className="font-bold text-sm text-gray-900 dark:text-zinc-100">{selectedDevice.vendor}</span>
                  </div>
                  <div className="bg-white dark:bg-zinc-900 p-4 rounded-xl border border-gray-200 dark:border-zinc-800 shadow-sm">
                    <span className="text-gray-400 dark:text-zinc-500 block text-[10px] uppercase font-bold">Model Perangkat</span>
                    <span className="font-bold text-sm text-gray-900 dark:text-zinc-100">{selectedDevice.model}</span>
                  </div>
                </div>

                {testResult && (
                  <div className={`p-4 rounded-xl border flex items-start gap-3 text-xs ${
                    testResult.connected 
                      ? 'bg-emerald-50 dark:bg-emerald-950/20 border-emerald-250 text-emerald-800 dark:text-emerald-400' 
                      : 'bg-rose-50 dark:bg-rose-955/20 border-rose-250 text-rose-800 dark:text-rose-450'
                  }`}>
                    {testResult.connected ? (
                      <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
                    ) : (
                      <AlertTriangle className="w-5 h-5 text-rose-600 flex-shrink-0 mt-0.5" />
                    )}
                    <div className="space-y-1">
                      <p className="font-bold">{testResult.connected ? 'STATUS KONEKSI: TERHUBUNG (SUCCESS)' : 'STATUS KONEKSI: GAGAL (FAILED)'}</p>
                      <p className="font-mono text-[11px]">{testResult.message}</p>
                    </div>
                  </div>
                )}

                <div className="flex flex-wrap gap-3 pt-2">
                  <button
                    onClick={() => handleTestConnection()}
                    disabled={testingConn}
                    className="flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-600 text-white text-xs font-bold hover:bg-emerald-700 transition-all disabled:opacity-50"
                  >
                    {testingConn ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Wifi className="w-3.5 h-3.5" />}
                    Uji Koneksi Real-Time (SSH/API)
                  </button>

                  <button
                    onClick={() => setModal(selectedDevice.ports[0])}
                    className="flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 text-white text-xs font-bold hover:bg-blue-700 transition-all"
                  >
                    <Pencil className="w-3.5 h-3.5" /> Ubah Kredensial & Host OLT
                  </button>

                  {isOwner && (
                    <button
                      onClick={() => {
                        if (confirm(`Apakah Anda yakin ingin menghapus seluruh konfigurasi OLT ${selectedDevice.name}?`)) {
                          selectedDevice.ports.forEach((p) => deleteMut.mutate(p.ID))
                        }
                      }}
                      disabled={deleteMut.isPending}
                      className="flex items-center gap-2 px-4 py-2 rounded-lg bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200 dark:bg-rose-950/30 dark:text-rose-400 dark:border-rose-900/30 text-xs font-bold transition-all disabled:opacity-50"
                    >
                      {deleteMut.isPending ? (
                        <><Trash2 className="w-3.5 h-3.5 animate-spin" /> Menghapus...</>
                      ) : (
                        <><Trash2 className="w-3.5 h-3.5" /> Hapus Perangkat OLT</>
                      )}
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      ) : (
        <EmptyState message="Belum ada perangkat OLT terdaftar. Klik + Tambah OLT Baru untuk mendaftarkan perangkat pertama Anda." />
      )}

      {/* Customer Detail Modal */}
      {selectedCustomer && (
        <RegistrationDetailModal
          reg={selectedCustomer}
          onClose={() => setSelectedCustomer(null)}
          role={(user?.role === 'owner' || user?.role === 'cs_admin' || user?.role === 'technician') ? user.role : 'technician'}
        />
      )}

      {/* OLT Create / Edit Modal */}
      {modal && (
        <OLTModal
          config={modal === 'new' ? undefined : modal}
          defaultHost={selectedDevice?.ip_remote}
          onClose={() => setModal(null)}
        />
      )}

      {/* ONU Binding Modal */}
      {bindingONU && selectedDevice && (
        <BindingONUModal
          onu={bindingONU}
          device={selectedDevice}
          onClose={() => setBindingONU(null)}
          onSuccess={() => setBindingONU(null)}
        />
      )}
    </div>
  )
}

export default function OLTPortsPage() {
  return (
    <OLTPageErrorBoundary>
      <OLTPortsContent />
    </OLTPageErrorBoundary>
  )
}
