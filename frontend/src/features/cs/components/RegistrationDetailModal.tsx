import { useState, useEffect } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import {
  X, CheckCircle, XCircle, CreditCard, Wrench, MapPin, Pencil, Save,
  ZoomIn, ZoomOut, RotateCw, RotateCcw, Download, Send, Loader2, Server, ShieldAlert, Play,
  Eye, EyeOff, Calendar, Clock
} from 'lucide-react'
import { StatusBadge } from '@/components/ui'
import { formatDateTime, formatCurrency } from '@/lib/utils'
import { csApi } from '../api/csApi'
import { ownerApi } from '@/features/owner/api/ownerApi'
import { publicApi } from '@/features/public/api/publicApi'
import type { Registration } from '@/features/owner/types'

interface Props {
  reg: Registration
  onClose: () => void
  role: 'owner' | 'cs_admin' | 'technician'
}

type ActionMode =
  | 'approve'
  | 'reject'
  | 'confirm-payment'
  | 'schedule-installation'
  | 'notes'
  | 'activate'
  | null

const getFileUrl = (path?: string | null) => {
  if (!path) return ''
  if (path.startsWith('http://') || path.startsWith('https://')) return path
  const apiBase = import.meta.env.VITE_API_URL ?? 'http://localhost:8880/api/v1'
  const host = apiBase.replace('/api/v1', '')
  const cleanPath = path.replace(/^\./, '')
  return `${host}${cleanPath}`
}

function MapPreviewTabs({ lat, lng, gmapsLink }: { lat: number | null; lng: number | null; gmapsLink?: string | null }) {
  const [mapTab, setMapTab] = useState<'google_street' | 'google_hybrid' | 'carto_dark' | 'osm'>('google_hybrid')
  const [zoom, setZoom] = useState(16)
  const [interact, setInteract] = useState(false)

  if (!lat || !lng) {
    return (
      <div className="bg-slate-50 dark:bg-slate-800/50 rounded-xl p-4 border border-slate-100 dark:border-slate-800/40">
        <p className="text-xs text-slate-400 dark:text-slate-500 mb-2">Koordinat peta belum diatur (Latitude & Longitude kosong).</p>
        {gmapsLink && (
          <a
            href={gmapsLink}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400 hover:bg-blue-500/20 text-xs font-semibold transition-colors animate-fade-in"
          >
            <MapPin className="w-3.5 h-3.5" /> Buka Link Google Maps Eksternal ↗
          </a>
        )}
      </div>
    )
  }

  const openUrl = gmapsLink || `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`

  const tileConfigs: Record<string, { url: string; attr: string }> = {
    google_street: {
      url: 'https://mt1.google.com/vt/lyrs=m&x={x}&y={y}&z={z}',
      attr: '&copy; Google Maps'
    },
    google_hybrid: {
      url: 'https://mt1.google.com/vt/lyrs=y&x={x}&y={y}&z={z}',
      attr: '&copy; Google Maps Satellite'
    },
    carto_dark: {
      url: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
      attr: '&copy; CARTO'
    },
    osm: {
      url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
      attr: '&copy; OpenStreetMap'
    }
  }

  const currentTile = tileConfigs[mapTab] || tileConfigs.google_hybrid

  const srcDoc = `
    <!DOCTYPE html>
    <html>
    <head>
      <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
      <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
      <style>
        html, body, #map {
          margin: 0;
          padding: 0;
          width: 100%;
          height: 100%;
        }
      </style>
    </head>
    <body>
      <div id="map"></div>
      <script>
        const map = L.map('map', {
          center: [${lat}, ${lng}],
          zoom: ${zoom},
          scrollWheelZoom: true,
          dragging: true,
          touchZoom: true
        });
        
        L.tileLayer('${currentTile.url}', {
          maxZoom: 20,
          attribution: '${currentTile.attr}'
        }).addTo(map);

        const defaultIcon = L.icon({
          iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
          shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
          iconSize: [25, 41],
          iconAnchor: [12, 41],
          popupAnchor: [1, -34],
          shadowSize: [41, 41]
        });
        L.marker([${lat}, ${lng}], { icon: defaultIcon }).addTo(map);
      </script>
    </body>
    </html>
  `

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex gap-1 bg-slate-100 dark:bg-slate-800 p-0.5 rounded-lg text-xs flex-wrap">
          <button
            type="button"
            onClick={() => setMapTab('google_street')}
            className={`px-2.5 py-1 rounded-md font-medium transition-colors ${mapTab === 'google_street' ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-sm font-bold' : 'text-slate-500'}`}
          >
            Google Street
          </button>
          <button
            type="button"
            onClick={() => setMapTab('google_hybrid')}
            className={`px-2.5 py-1 rounded-md font-medium transition-colors ${mapTab === 'google_hybrid' ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-sm font-bold' : 'text-slate-500'}`}
          >
            Satelit Hybrid
          </button>
          <button
            type="button"
            onClick={() => setMapTab('carto_dark')}
            className={`px-2.5 py-1 rounded-md font-medium transition-colors ${mapTab === 'carto_dark' ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-sm font-bold' : 'text-slate-500'}`}
          >
            Dark Canvas
          </button>
          <button
            type="button"
            onClick={() => setMapTab('osm')}
            className={`px-2.5 py-1 rounded-md font-medium transition-colors ${mapTab === 'osm' ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-sm font-bold' : 'text-slate-500'}`}
          >
            OSM
          </button>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center bg-slate-100 dark:bg-slate-800 rounded-lg p-0.5 border border-slate-200/40 dark:border-slate-700/40">
            <button
              type="button"
              onClick={() => setZoom(z => Math.max(8, z - 1))}
              className="w-6 h-6 flex items-center justify-center text-slate-600 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-700 rounded text-sm font-bold transition-all"
              title="Zoom Out"
            >
              -
            </button>
            <span className="text-[10px] px-1 font-mono text-slate-500 dark:text-slate-400 min-w-4 text-center">z{zoom}</span>
            <button
              type="button"
              onClick={() => setZoom(z => Math.min(21, z + 1))}
              className="w-6 h-6 flex items-center justify-center text-slate-600 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-700 rounded text-sm font-bold transition-all"
              title="Zoom In"
            >
              +
            </button>
          </div>

          <a
            href={openUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold transition-colors"
          >
            <MapPin className="w-3 h-3" /> Visit to Google Maps ↗
          </a>
        </div>
      </div>

      <div className="relative w-full h-48 rounded-xl overflow-hidden border border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-950">
        <iframe
          srcDoc={srcDoc}
          className={`w-full h-full border-0 ${interact ? 'pointer-events-auto' : 'pointer-events-none'}`}
          title="Interactive Map"
        />
        {!interact && (
          <div 
            onClick={() => setInteract(true)}
            className="absolute inset-0 bg-slate-900/5 dark:bg-slate-950/5 flex items-center justify-center cursor-pointer select-none"
          >
            <span className="px-3 py-1.5 rounded-lg bg-white/95 dark:bg-slate-900/95 text-[10px] font-bold text-slate-700 dark:text-slate-200 shadow-sm border border-slate-200/50 dark:border-slate-800 backdrop-blur-sm flex items-center gap-1.5 hover:bg-white dark:hover:bg-slate-800 transition-all">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-ping" />
              Sentuh untuk Menggeser Peta
            </span>
          </div>
        )}
        {interact && (
          <button
            type="button"
            onClick={() => setInteract(false)}
            className="absolute bottom-2 right-2 px-2 py-1 rounded bg-slate-800/80 hover:bg-slate-800 text-white text-[9px] font-bold shadow transition-colors animate-fade-in"
          >
            Kunci Peta
          </button>
        )}
      </div>
    </div>
  )
}

// Helper to calculate active billing period
function getMasaAktif(activatedAt: string | null): string {
  if (!activatedAt) return '-'
  const date = new Date(activatedAt)
  const start = new Date(date)
  const end = new Date(date)
  end.setMonth(end.getMonth() + 1)
  
  const formatOpts: Intl.DateTimeFormatOptions = { day: '2-digit', month: 'short', year: 'numeric' }
  return `${start.toLocaleDateString('id-ID', formatOpts)} s/d ${end.toLocaleDateString('id-ID', formatOpts)}`
}

export default function RegistrationDetailModal({ reg, onClose, role }: Props) {
  const qc = useQueryClient()
  const [mode, setMode] = useState<ActionMode>(null)
  
  // Interactive KTP Viewer States
  const [showKTPPreview, setShowKTPPreview] = useState(false)
  const [ktpRotate, setKtpRotate] = useState(0)
  const [ktpZoom, setKtpZoom] = useState(1)

  // Interactive ONT Viewer States
  const [showONTPreview, setShowONTPreview] = useState(false)
  const [ontRotate, setOntRotate] = useState(0)
  const [ontZoom, setOntZoom] = useState(1)

  // Form state
  const [techId, setTechId] = useState('')
  const [scheduledDate, setScheduledDate] = useState('')
  const [scheduledTime, setScheduledTime] = useState('09:00')
  const [reason, setReason] = useState('')
  const [payAmount, setPayAmount] = useState('')
  const [payBank, setPayBank] = useState('')
  const [payDate, setPayDate] = useState('')
  const [payNotes, setPayNotes] = useState('')
  const [paymentType, setPaymentType] = useState<'TRANSFER' | 'TUNAI'>('TRANSFER')
  const [notes, setNotes] = useState(reg.InternalNotes ?? '')

  // Activation state
  const [oltPortId, setOltPortId] = useState(reg.OLTPortConfigID ?? '')
  const [ontSn, setOntSn] = useState(reg.ONTSerialNumber ?? '')
  const [lat, setLat] = useState(reg.MapsLat ? String(reg.MapsLat) : '')
  const [lng, setLng] = useState(reg.MapsLng ? String(reg.MapsLng) : '')
  const [odp, setOdp] = useState(reg.ODPInfo ?? '')
  const [gmapsLink, setGmapsLink] = useState(reg.GoogleMapsLink ?? '')

  // PPPoE custom states
  const [pppoeUser, setPppoeUser] = useState('')
  const [passwordOption, setPasswordOption] = useState<'date' | 'random'>('date')
  const [randomType, setRandomType] = useState<'numeric' | 'alphanumeric'>('numeric')
  const [pppoePass, setPppoePass] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [userEdited, setUserEdited] = useState(false)
  const [passEdited, setPassEdited] = useState(false)
  const [showDetailPassword, setShowDetailPassword] = useState(false)

  const generateRandomPassword = (type: 'numeric' | 'alphanumeric') => {
    const digits = '0123456789'
    const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
    const source = type === 'numeric' ? digits : chars
    let result = ''
    for (let i = 0; i < 8; i++) {
      result += source.charAt(Math.floor(Math.random() * source.length))
    }
    return result
  }

  const getFormattedToday = () => {
    const today = new Date()
    const dd = String(today.getDate()).padStart(2, '0')
    const mm = String(today.getMonth() + 1).padStart(2, '0')
    const yyyy = today.getFullYear()
    return `${dd}${mm}${yyyy}`
  }

  const { data: publicConfigs } = useQuery({
    queryKey: ['public-configs'],
    queryFn: publicApi.getPublicConfigs,
  })

  const { data: packages = [] } = useQuery({
    queryKey: ['packages'],
    queryFn: publicApi.getPackages,
  })

  const { data: nextCustNum } = useQuery({
    queryKey: ['next-customer-number', reg.ID],
    queryFn: () => csApi.getNextCustomerNumber(reg.ID),
    enabled: mode === 'activate',
  })

  // Live PPPoE active connections monitoring query
  const { data: activeConns } = useQuery({
    queryKey: ['active-pppoe-conns', reg.ID],
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
    enabled: Boolean(reg.PPPoEUsername),
  })

  const selectedPkg = packages?.find((p: any) => p.ID === reg.PackageID)
  const taxRate = parseFloat(publicConfigs?.invoice_tax_rate || '11')
  const instFee = reg.InstallationFee ?? 0
  const packPrice = selectedPkg?.PriceMonthly ?? 0
  const subtotal = instFee + packPrice
  const ppn = Math.round((subtotal * taxRate) / 100)
  const totalAmount = subtotal + ppn

  useEffect(() => {
    if (mode === 'confirm-payment') {
      if (!payAmount && totalAmount > 0) {
        setPayAmount(String(totalAmount))
      }
      if (!payDate) {
        setPayDate(new Date().toISOString().split('T')[0])
      }
    }
  }, [mode, totalAmount, payAmount, payDate])

  // Sync payBank when paymentType changes
  useEffect(() => {
    if (mode === 'confirm-payment') {
      if (paymentType === 'TUNAI') {
        setPayBank('TUNAI')
      } else {
        if (payBank === 'TUNAI' || !payBank) {
          setPayBank('TRANSFER')
        }
      }
    }
  }, [paymentType, mode, payBank])

  useEffect(() => {
    if (mode !== 'confirm-payment') {
      setPayAmount('')
      setPayBank('')
      setPayDate('')
      setPayNotes('')
      setPaymentType('TRANSFER')
    }
  }, [mode])

  useEffect(() => {
    if (mode === 'activate') {
      const suffix = publicConfigs?.pppoe_domain_suffix || 'ptnat.net'
      const cleanSuffix = suffix.startsWith('@') ? suffix : `@${suffix}`
      
      const customerNum = reg.CustomerNumber || nextCustNum
      if (!userEdited && customerNum) {
        setPppoeUser(`${customerNum}${cleanSuffix}`)
      }
      
      if (!passEdited) {
        if (passwordOption === 'date') {
          setPppoePass(getFormattedToday())
        } else {
          setPppoePass(generateRandomPassword(randomType))
        }
      }
    } else {
      setUserEdited(false)
      setPassEdited(false)
      setShowPassword(false)
    }
  }, [mode, nextCustNum, reg.CustomerNumber, publicConfigs, passwordOption, randomType, userEdited, passEdited])

  // Edit mode state
  const [isEditing, setIsEditing] = useState(false)
  const [editForm, setEditForm] = useState({
    FullName: reg.FullName,
    NIK: reg.NIK ?? '',
    Phone: reg.Phone,
    Email: reg.Email ?? '',
    Province: reg.Province,
    City: reg.City,
    District: reg.District,
    Village: reg.Village,
    RT: reg.RT ?? '',
    RW: reg.RW ?? '',
    AddressDetail: reg.AddressDetail,
    MapsLat: reg.MapsLat ? String(reg.MapsLat) : '',
    MapsLng: reg.MapsLng ? String(reg.MapsLng) : '',
    GoogleMapsLink: reg.GoogleMapsLink ?? '',
    PPPoEUsername: reg.PPPoEUsername ?? '',
    ONTSerialNumber: reg.ONTSerialNumber ?? '',
    ODPInfo: reg.ODPInfo ?? '',
  })

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ['registrations'] })
    qc.invalidateQueries({ queryKey: ['admin-registrations'] })
    qc.invalidateQueries({ queryKey: ['cs-registrations'] })
    qc.invalidateQueries({ queryKey: ['active-customers'] })
  }

  // Load technicians list
  const { data: technicians = [] } = useQuery({
    queryKey: ['technicians'],
    queryFn: csApi.listTechnicians,
    enabled: mode === 'approve' || mode === 'schedule-installation',
  })

  // Load OLT ports
  const { data: oltPorts = [] } = useQuery({
    queryKey: ['olt-ports'],
    queryFn: ownerApi.getOLTPorts,
    enabled: mode === 'activate',
  })

  // Load provisioning logs
  const { data: provLogs = [] } = useQuery({
    queryKey: ['prov-logs', reg.ID],
    queryFn: () => csApi.getProvisioningLogs(reg.ID),
    enabled: ['provisioning', 'provisioning_failed', 'active'].includes(reg.Status),
  })

  const approveMut = useMutation({
    mutationFn: () => csApi.approve(reg.ID, {
      technician_id: techId,
      scheduled_at: scheduledDate && scheduledTime ? `${scheduledDate}T${scheduledTime}:00` : "",
    }),
    onSuccess: () => { toast.success('Jadwal survei dibuat'); invalidate(); onClose() },
    onError: (e: any) => toast.error(e?.response?.data?.message ?? 'Gagal approve'),
  })

  const rejectMut = useMutation({
    mutationFn: () => csApi.reject(reg.ID, reason),
    onSuccess: () => { toast.success('Registrasi ditolak'); invalidate(); onClose() },
    onError: (e: any) => toast.error(e?.response?.data?.message ?? 'Gagal reject'),
  })

  const payMut = useMutation({
    mutationFn: () => csApi.confirmPayment(reg.ID, {
      amount: Number(payAmount), bank: payBank, date: payDate, notes: payNotes,
    }),
    onSuccess: () => { toast.success('Pembayaran dikonfirmasi'); invalidate(); onClose() },
    onError: (e: any) => toast.error(e?.response?.data?.message ?? 'Gagal konfirmasi'),
  })

  const installMut = useMutation({
    mutationFn: () => csApi.scheduleInstallation(reg.ID, {
      technician_id: techId,
      scheduled_at: scheduledDate && scheduledTime ? `${scheduledDate}T${scheduledTime}:00` : "",
    }),
    onSuccess: () => { toast.success('Jadwal instalasi dibuat'); invalidate(); onClose() },
    onError: (e: any) => toast.error(e?.response?.data?.message ?? 'Gagal jadwalkan instalasi'),
  })

  const notesMut = useMutation({
    mutationFn: () => csApi.updateInternalNotes(reg.ID, notes),
    onSuccess: () => { toast.success('Catatan disimpan'); invalidate() },
    onError: (e: any) => toast.error(e?.response?.data?.message ?? 'Gagal simpan catatan'),
  })

  const activateMut = useMutation({
    mutationFn: () => csApi.activate(reg.ID, {
      ont_serial_number: ontSn,
      olt_port_config_id: oltPortId,
      maps_lat: lat ? Number(lat) : null,
      maps_lng: lng ? Number(lng) : null,
      odp_info: odp,
      google_maps_link: gmapsLink,
      pppoe_username: pppoeUser || undefined,
      pppoe_password: pppoePass || undefined,
    }),
    onSuccess: () => { toast.success('Aktivasi layanan (provisioning) berhasil dimulai!'); invalidate(); onClose() },
    onError: (e: any) => toast.error(e?.response?.data?.message ?? 'Gagal memulai aktivasi'),
  })

  const provisionMikrotikMut = useMutation({
    mutationFn: () => csApi.provisionMikrotik(reg.ID),
    onSuccess: (res) => {
      toast.success(res.message || `Akun PPPoE (${res.data?.pppoe_username}) berhasil di-provision!`)
      invalidate()
    },
    onError: (e: any) => toast.error(e?.response?.data?.message ?? 'Gagal melakukan provisioning Mikrotik'),
  })

  const updateDetailsMut = useMutation({
    mutationFn: () => {
      const payload: Partial<Registration> = {
        FullName: editForm.FullName,
        NIK: editForm.NIK || undefined,
        Phone: editForm.Phone,
        Email: editForm.Email || null,
        Province: editForm.Province,
        City: editForm.City,
        District: editForm.District,
        Village: editForm.Village,
        RT: editForm.RT || null,
        RW: editForm.RW || null,
        AddressDetail: editForm.AddressDetail,
        MapsLat: editForm.MapsLat ? Number(editForm.MapsLat) : null,
        MapsLng: editForm.MapsLng ? Number(editForm.MapsLng) : null,
        GoogleMapsLink: editForm.GoogleMapsLink || null,
        PPPoEUsername: editForm.PPPoEUsername || null,
        ONTSerialNumber: editForm.ONTSerialNumber || null,
        ODPInfo: editForm.ODPInfo || null,
      }
      return csApi.updateRegistration(reg.ID, payload)
    },
    onSuccess: () => {
      toast.success('Data pelanggan berhasil diperbarui')
      invalidate()
      setIsEditing(false)
    },
    onError: (e: any) => {
      toast.error(e?.response?.data?.message ?? 'Gagal memperbarui data')
    }
  })

  const toggleIsolirMut = useMutation({
    mutationFn: (targetStatus: 'isolir' | 'active') => {
      return csApi.updateRegistration(reg.ID, { status: targetStatus } as any)
    },
    onSuccess: (_, targetStatus) => {
      toast.success(targetStatus === 'isolir' ? 'Pelanggan berhasil di-isolir' : 'Isolir pelanggan berhasil dibuka')
      invalidate()
    },
    onError: (e: any) => toast.error(e?.response?.data?.message ?? 'Gagal mengubah status isolir pelanggan'),
  })

  const resendNotifMut = useMutation({
    mutationFn: (type?: string) => csApi.resendNotification(reg.ID, type),
    onSuccess: (res) => {
      const d = res.data
      if (d?.wa_sent && d?.email_sent) {
        toast.success('Notifikasi WA & Email berhasil dikirim!')
      } else if (d?.wa_sent) {
        toast.info(`WA Terkirim! (Email: ${d?.email_error || 'Gagal'})`)
      } else if (d?.email_sent) {
        toast.info(`Email Terkirim! (WA: ${d?.wa_error || 'Gagal / WA ter-ban'})`)
      } else {
        const waReason = d?.wa_error ? `WA: ${d.wa_error}` : 'WA: Gagal'
        const emailReason = d?.email_error ? `Email: ${d.email_error}` : 'Email: Gagal'
        toast.error(`Gagal Kirim Notifikasi — ${waReason} | ${emailReason}`)
      }
    },
    onError: (e: any) => {
      toast.error(e?.response?.data?.message ?? 'Gagal terhubung ke server')
    },
  })

  const isCS = role === 'cs_admin' || role === 'owner'
  const isPending = approveMut.isPending || rejectMut.isPending || payMut.isPending || installMut.isPending || notesMut.isPending || activateMut.isPending || updateDetailsMut.isPending

  // Available actions per status
  const canApprove = isCS && reg.Status === 'pending_review'
  const canReject  = isCS && ['pending_review', 'survey_done'].includes(reg.Status)
  const canConfirmPayment = isCS && reg.Status === 'waiting_payment'
  const canScheduleInstall = isCS && reg.Status === 'survey_done'
  const canProvisionMikrotik = isCS && ['payment_confirmed', 'installation_scheduled', 'survey_done', 'active', 'provisioning'].includes(reg.Status)

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="bg-white dark:bg-zinc-900 rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto border border-gray-200 dark:border-zinc-800"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="relative sticky top-0 bg-white dark:bg-zinc-900 px-6 py-4 border-b border-gray-200 dark:border-zinc-800 flex flex-wrap items-center justify-between rounded-t-xl z-20 gap-3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-blue-600 text-white flex items-center justify-center font-bold text-sm shrink-0">
              {reg.FullName ? reg.FullName.charAt(0).toUpperCase() : 'P'}
            </div>
            <div>
              <h3 className="font-semibold text-sm text-gray-900 dark:text-white">
                {isEditing ? 'Edit Data Pelanggan' : (reg.Status === 'active' ? 'Data Pelanggan' : 'Detail Registrasi')}
              </h3>
              <p className="text-xs text-gray-500 dark:text-zinc-400 font-mono">
                {reg.CustomerNumber ? `#${reg.CustomerNumber}` : reg.RegNumber}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <StatusBadge status={reg.Status} />

            {reg.PPPoEUsername ? (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 border border-green-200 dark:border-green-800">
                <CheckCircle className="w-3 h-3" /> PPPoE Active
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-yellow-50 dark:bg-yellow-900/20 text-yellow-700 dark:text-yellow-500 border border-yellow-200 dark:border-yellow-800">
                Belum Provisioning
              </span>
            )}

            {(role === 'cs_admin' || role === 'owner') && (
              <button
                type="button"
                onClick={() => resendNotifMut.mutate('auto')}
                disabled={resendNotifMut.isPending}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-gray-100 hover:bg-gray-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-gray-700 dark:text-gray-200 text-xs font-medium transition-colors border border-gray-200 dark:border-zinc-700 disabled:opacity-50"
              >
                {resendNotifMut.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <Send className="w-3 h-3" />}
                {resendNotifMut.isPending ? 'Mengirim...' : 'Kirim Notif'}
              </button>
            )}

            {role === 'owner' && (
              <button
                onClick={() => setIsEditing(!isEditing)}
                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-medium transition-colors ${
                  isEditing
                    ? 'bg-gray-100 border-gray-300 dark:bg-zinc-800 dark:border-zinc-600 text-gray-700 dark:text-gray-300'
                    : 'bg-blue-600 hover:bg-blue-700 border-blue-600 text-white'
                }`}
              >
                <Pencil className="w-3 h-3" />
                {isEditing ? 'Batal' : 'Edit Data'}
              </button>
            )}
          </div>

          {/* Close button — absolute top-right corner */}
          <button
            onClick={onClose}
            className="absolute top-3 right-3 p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-zinc-800 text-gray-400 hover:text-gray-700 dark:hover:text-white transition-colors"
            title="Tutup"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-6 space-y-5">
          {/* PPPoE Info Bar */}
          {reg.PPPoEUsername && (
            <div className="flex items-center justify-between px-4 py-3 bg-green-50 dark:bg-green-900/15 border border-green-200 dark:border-green-800 rounded-lg">
              <div className="flex items-center gap-2.5">
                <Server className="w-4 h-4 text-green-600 dark:text-green-400 shrink-0" />
                <div>
                  <p className="text-xs font-semibold text-green-800 dark:text-green-300">PPPoE Provisioned</p>
                  <p className="text-xs text-green-700 dark:text-green-400 font-mono">{reg.PPPoEUsername}</p>
                </div>
              </div>
              {reg.ActivatedAt && (
                <p className="text-xs text-green-600 dark:text-green-500">{formatDateTime(reg.ActivatedAt)}</p>
              )}
            </div>
          )}
          {isEditing ? (
            <div className="space-y-4 text-gray-800 dark:text-gray-100">
              {/* Section 1: Data Diri */}
              <div className="bg-slate-50 dark:bg-slate-800/20 p-4 rounded-2xl border border-slate-100 dark:border-slate-800 space-y-3">
                <h4 className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">Data Diri</h4>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Nama Lengkap</label>
                    <input
                      type="text"
                      value={editForm.FullName}
                      onChange={e => setEditForm({ ...editForm, FullName: e.target.value })}
                      className="w-full text-sm bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/40"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">NIK</label>
                    <input
                      type="text"
                      value={editForm.NIK}
                      onChange={e => setEditForm({ ...editForm, NIK: e.target.value })}
                      className="w-full text-sm bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/40"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Telepon</label>
                    <input
                      type="text"
                      value={editForm.Phone}
                      onChange={e => setEditForm({ ...editForm, Phone: e.target.value })}
                      className="w-full text-sm bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/40"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Email</label>
                    <input
                      type="email"
                      value={editForm.Email}
                      onChange={e => setEditForm({ ...editForm, Email: e.target.value })}
                      className="w-full text-sm bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/40"
                    />
                  </div>
                </div>
              </div>

              {/* Section 2: Alamat */}
              <div className="bg-slate-50 dark:bg-slate-800/20 p-4 rounded-2xl border border-slate-100 dark:border-slate-800 space-y-3">
                <h4 className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">Alamat Lengkap</h4>
                <div className="space-y-3">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Alamat Detail (Jalan, No Rumah, dll)</label>
                    <textarea
                      rows={2}
                      value={editForm.AddressDetail}
                      onChange={e => setEditForm({ ...editForm, AddressDetail: e.target.value })}
                      className="w-full text-sm bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/40 resize-none"
                    />
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">RT</label>
                      <input
                        type="text"
                        value={editForm.RT}
                        onChange={e => setEditForm({ ...editForm, RT: e.target.value })}
                        className="w-full text-sm bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/40"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">RW</label>
                      <input
                        type="text"
                        value={editForm.RW}
                        onChange={e => setEditForm({ ...editForm, RW: e.target.value })}
                        className="w-full text-sm bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/40"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Desa/Kelurahan</label>
                      <input
                        type="text"
                        value={editForm.Village}
                        onChange={e => setEditForm({ ...editForm, Village: e.target.value })}
                        className="w-full text-sm bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/40"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Kecamatan</label>
                      <input
                        type="text"
                        value={editForm.District}
                        onChange={e => setEditForm({ ...editForm, District: e.target.value })}
                        className="w-full text-sm bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/40"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Kabupaten/Kota</label>
                      <input
                        type="text"
                        value={editForm.City}
                        onChange={e => setEditForm({ ...editForm, City: e.target.value })}
                        className="w-full text-sm bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/40"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Provinsi</label>
                      <input
                        type="text"
                        value={editForm.Province}
                        onChange={e => setEditForm({ ...editForm, Province: e.target.value })}
                        className="w-full text-sm bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/40"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Section 3: Teknis & Koordinat */}
              <div className="bg-slate-50 dark:bg-slate-800/20 p-4 rounded-2xl border border-slate-100 dark:border-slate-800 space-y-3">
                <h4 className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">Teknis & Lokasi</h4>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Username PPPoE</label>
                    <input
                      type="text"
                      value={editForm.PPPoEUsername}
                      onChange={e => setEditForm({ ...editForm, PPPoEUsername: e.target.value })}
                      className="w-full text-sm bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/40"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Serial Number ONT</label>
                    <input
                      type="text"
                      value={editForm.ONTSerialNumber}
                      onChange={e => setEditForm({ ...editForm, ONTSerialNumber: e.target.value })}
                      className="w-full text-sm bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/40"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Informasi ODP</label>
                    <input
                      type="text"
                      value={editForm.ODPInfo}
                      onChange={e => setEditForm({ ...editForm, ODPInfo: e.target.value })}
                      className="w-full text-sm bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/40"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Google Maps Link</label>
                    <input
                      type="url"
                      value={editForm.GoogleMapsLink}
                      onChange={e => setEditForm({ ...editForm, GoogleMapsLink: e.target.value })}
                      className="w-full text-sm bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/40"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Latitude</label>
                    <input
                      type="text"
                      placeholder="Masukkan Latitude"
                      value={editForm.MapsLat}
                      onChange={e => setEditForm({ ...editForm, MapsLat: e.target.value })}
                      className="w-full text-sm bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/40"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Longitude</label>
                    <input
                      type="text"
                      placeholder="Masukkan Longitude"
                      value={editForm.MapsLng}
                      onChange={e => setEditForm({ ...editForm, MapsLng: e.target.value })}
                      className="w-full text-sm bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/40"
                    />
                  </div>
                </div>
              </div>

              {/* Form Buttons */}
              <div className="flex gap-2 justify-end pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsEditing(false)}
                  className="px-4 py-2 text-xs rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors font-semibold"
                >
                  Batal
                </button>
                <button
                  type="button"
                  onClick={() => updateDetailsMut.mutate()}
                  disabled={updateDetailsMut.isPending || !editForm.FullName || !editForm.Phone}
                  className="px-4 py-2 text-xs rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold transition-colors flex items-center gap-1.5 disabled:opacity-50"
                >
                  <Save className="w-3.5 h-3.5" />
                  {updateDetailsMut.isPending ? 'Menyimpan...' : 'Simpan Perubahan'}
                </button>
              </div>
            </div>
          ) : (
            <>
              {/* Data Pelanggan */}
              <section>
                <h4 className="text-xs font-semibold text-gray-500 dark:text-zinc-400 mb-3">Informasi Pelanggan</h4>
                <div className="border border-gray-200 dark:border-zinc-800 rounded-lg overflow-hidden divide-y divide-gray-100 dark:divide-zinc-800">
                  <div className="flex items-center px-4 py-3">
                    <span className="w-32 text-xs text-gray-500 dark:text-zinc-400 shrink-0">Nama Lengkap</span>
                    <span className="text-sm font-semibold text-gray-900 dark:text-white">{reg.FullName}</span>
                  </div>
                  <div className="flex items-center px-4 py-3">
                    <span className="w-32 text-xs text-gray-500 dark:text-zinc-400 shrink-0">NIK KTP</span>
                    <span className="text-sm font-mono text-gray-900 dark:text-white">{reg.NIK || '-'}</span>
                  </div>
                  <div className="flex items-center px-4 py-3">
                    <span className="w-32 text-xs text-gray-500 dark:text-zinc-400 shrink-0">Telepon</span>
                    <span className="text-sm text-gray-900 dark:text-white">{reg.Phone}</span>
                  </div>
                  <div className="flex items-center px-4 py-3">
                    <span className="w-32 text-xs text-gray-500 dark:text-zinc-400 shrink-0">Email</span>
                    <span className="text-sm text-gray-900 dark:text-white">{reg.Email || '-'}</span>
                  </div>
                </div>
              </section>

          {/* Alamat */}
          <section>
            <h4 className="text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-3">Alamat</h4>
            <div className="bg-slate-50 dark:bg-slate-800/50 rounded-xl px-4 py-3">
              <p className="text-sm text-slate-700 dark:text-slate-200">
                {reg.AddressDetail}, RT {reg.RT}/RW {reg.RW}, {reg.Village}, {reg.District}, {reg.City}, {reg.Province}
              </p>
            </div>
            <div className="mt-3">
              <MapPreviewTabs lat={reg.MapsLat} lng={reg.MapsLng} gmapsLink={reg.GoogleMapsLink} />
            </div>
          </section>

          {/* Dokumen KTP */}
          {reg.KTPFilePath && (
            <section>
              <h4 className="text-xs font-semibold text-gray-500 dark:text-zinc-400 mb-2">Dokumen KTP</h4>
              <div
                className="relative rounded-lg overflow-hidden border border-gray-200 dark:border-zinc-800 max-h-48 flex items-center justify-center bg-gray-50 dark:bg-zinc-950 cursor-pointer group/ktp"
                onClick={() => { setKtpZoom(1); setKtpRotate(0); setShowKTPPreview(true) }}
              >
                <img
                  src={getFileUrl(reg.KTPFilePath)}
                  alt="Foto KTP"
                  className="max-h-48 object-contain group-hover/ktp:opacity-90 transition-opacity"
                  onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
                />
                <div className="absolute inset-0 bg-black/25 opacity-0 group-hover/ktp:opacity-100 transition-opacity flex items-center justify-center">
                  <span className="px-3 py-1.5 bg-white text-gray-900 rounded text-xs font-medium shadow">Perbesar</span>
                </div>
              </div>
            </section>
          )}

          {/* Foto Label/Fisik ONT */}
          {reg.ONTPhotoPath && (
            <section>
              <h4 className="text-xs font-semibold text-gray-500 dark:text-zinc-400 mb-2">Foto Label ONT</h4>
              <div
                className="relative rounded-lg overflow-hidden border border-gray-200 dark:border-zinc-800 max-h-48 flex items-center justify-center bg-gray-50 dark:bg-zinc-950 cursor-pointer group/ont"
                onClick={() => { setOntZoom(1); setOntRotate(0); setShowONTPreview(true) }}
              >
                <img
                  src={getFileUrl(reg.ONTPhotoPath)}
                  alt="Foto Label ONT"
                  className="max-h-48 object-contain group-hover/ont:opacity-90 transition-opacity"
                  onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
                />
                <div className="absolute inset-0 bg-black/25 opacity-0 group-hover/ont:opacity-100 transition-opacity flex items-center justify-center">
                  <span className="px-3 py-1.5 bg-white text-gray-900 rounded text-xs font-medium shadow">Perbesar</span>
                </div>
              </div>
            </section>
          )}

          {/* Jadwal & Pembayaran */}
          {(reg.SurveyScheduledAt || reg.InstallationScheduledAt || reg.PaymentAmount) && (
            <section>
              <h4 className="text-xs font-semibold text-gray-500 dark:text-zinc-400 mb-2">Info Proses</h4>
              <div className="border border-gray-200 dark:border-zinc-800 rounded-lg overflow-hidden divide-y divide-gray-100 dark:divide-zinc-800">
                {reg.SurveyScheduledAt && (
                  <div className="flex items-center px-4 py-3">
                    <span className="w-36 text-xs text-gray-500 dark:text-zinc-400 shrink-0">Jadwal Survei</span>
                    <span className="text-sm text-gray-900 dark:text-white">{formatDateTime(reg.SurveyScheduledAt)}</span>
                  </div>
                )}
                {reg.InstallationScheduledAt && (
                  <div className="flex items-center px-4 py-3">
                    <span className="w-36 text-xs text-gray-500 dark:text-zinc-400 shrink-0">Jadwal Instalasi</span>
                    <span className="text-sm text-gray-900 dark:text-white">{formatDateTime(reg.InstallationScheduledAt)}</span>
                  </div>
                )}
                {reg.PaymentAmount && (
                  <div className="flex items-center px-4 py-3">
                    <span className="w-36 text-xs text-gray-500 dark:text-zinc-400 shrink-0">Biaya Pasang</span>
                    <span className="text-sm font-semibold text-gray-900 dark:text-white">{formatCurrency(reg.PaymentAmount)}</span>
                  </div>
                )}
                {reg.PaymentBank && (
                  <div className="flex items-center px-4 py-3">
                    <span className="w-36 text-xs text-gray-500 dark:text-zinc-400 shrink-0">Bank</span>
                    <span className="text-sm text-gray-900 dark:text-white">{reg.PaymentBank}</span>
                  </div>
                )}
              </div>
            </section>
          )}

          {/* Provisioning */}
          {(reg.PPPoEUsername || reg.ONTSerialNumber || reg.ODPInfo || reg.CustomerNumber) && (() => {
            const connInfo = (activeConns || []).find(
              (c: any) => (c.name || c.Name || '').toLowerCase() === (reg.PPPoEUsername || '').toLowerCase()
            )
            const liveIP = connInfo ? (connInfo.address || connInfo.Address || '-') : '-'
            const liveUptime = connInfo ? (connInfo.uptime || connInfo.Uptime || '-') : '-'
            
            const isIsolir = reg.Status === 'isolir'
            const isOnline = Boolean(reg.Status === 'active' && connInfo)
            const isOffline = Boolean(reg.Status === 'active' && !connInfo)
            
            return (
              <section>
                <h4 className="text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-3">Provisioning & Detail Layanan</h4>
                <div className="grid grid-cols-2 gap-2.5">
                  {reg.CustomerNumber && (
                    <div className="bg-slate-50 dark:bg-slate-800/50 rounded-xl px-4 py-3">
                      <p className="text-[10px] text-slate-400 uppercase tracking-wide mb-0.5">Nomor Pelanggan</p>
                      <p className="text-sm font-mono font-semibold text-slate-800 dark:text-slate-100">{reg.CustomerNumber}</p>
                    </div>
                  )}
                  {reg.PPPoEUsername && (
                    <div className="bg-slate-50 dark:bg-slate-800/50 rounded-xl px-4 py-3">
                      <p className="text-[10px] text-slate-400 uppercase tracking-wide mb-0.5">Status Internet</p>
                      <div className="flex items-center gap-1.5 mt-1">
                        {isIsolir ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/20 text-amber-600 dark:text-amber-400">
                            <ShieldAlert className="w-3 h-3" /> Isolir (Offline)
                          </span>
                        ) : isOnline ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-600 dark:text-emerald-400" title={`Uptime: ${liveUptime}`}>
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" /> Online
                          </span>
                        ) : isOffline ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-rose-500/20 text-rose-600 dark:text-rose-450">
                            <span className="w-1.5 h-1.5 rounded-full bg-rose-500" /> Offline / LOS
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-slate-500/20 text-slate-600 dark:text-slate-400">
                            {reg.Status}
                          </span>
                        )}
                      </div>
                    </div>
                  )}
                  {reg.PPPoEUsername && (
                    <div className="bg-slate-50 dark:bg-slate-800/50 rounded-xl px-4 py-3">
                      <p className="text-[10px] text-slate-400 uppercase tracking-wide mb-0.5">PPPoE Username</p>
                      <p className="text-sm font-mono font-semibold text-slate-800 dark:text-slate-100">{reg.PPPoEUsername}</p>
                    </div>
                  )}
                  {reg.PPPoEPassword && (
                    <div className="bg-slate-50 dark:bg-slate-800/50 rounded-xl px-4 py-3">
                      <p className="text-[10px] text-slate-400 uppercase tracking-wide mb-0.5">PPPoE Password</p>
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-mono font-semibold text-slate-800 dark:text-slate-100">
                          {showDetailPassword ? reg.PPPoEPassword : '••••••••'}
                        </p>
                        <button
                          type="button"
                          onClick={() => setShowDetailPassword(!showDetailPassword)}
                          className="text-slate-400 hover:text-slate-600 dark:hover:text-white"
                          title={showDetailPassword ? "Sembunyikan password" : "Lihat password"}
                        >
                          {showDetailPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                    </div>
                  )}
                  {reg.PPPoEUsername && (
                    <div className="bg-slate-50 dark:bg-slate-800/50 rounded-xl px-4 py-3 col-span-2">
                      <p className="text-[10px] text-slate-400 uppercase tracking-wide mb-0.5 flex items-center gap-1">
                        <Server className="w-3.5 h-3.5 text-slate-400" /> IP Address (Mikrotik)
                      </p>
                      <p className="text-sm font-mono font-semibold text-slate-800 dark:text-slate-100 mt-0.5">{liveIP}</p>
                    </div>
                  )}
                  {reg.CreatedAt && (
                    <div className="bg-slate-50 dark:bg-slate-800/50 rounded-xl px-4 py-3">
                      <p className="text-[10px] text-slate-400 uppercase tracking-wide mb-0.5 flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5 text-slate-400" /> Tanggal Registrasi
                      </p>
                      <p className="text-sm font-medium text-slate-800 dark:text-slate-100">{formatDateTime(reg.CreatedAt)}</p>
                    </div>
                  )}
                  {reg.ActivatedAt && (
                    <div className="bg-slate-50 dark:bg-slate-800/50 rounded-xl px-4 py-3">
                      <p className="text-[10px] text-slate-400 uppercase tracking-wide mb-0.5 flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5 text-slate-400" /> Tanggal Aktivasi
                      </p>
                      <p className="text-sm font-medium text-slate-800 dark:text-slate-100">{formatDateTime(reg.ActivatedAt)}</p>
                    </div>
                  )}
                  {reg.ActivatedAt && (
                    <div className="bg-slate-50 dark:bg-slate-800/50 rounded-xl px-4 py-3 col-span-2">
                      <p className="text-[10px] text-slate-400 uppercase tracking-wide mb-0.5 flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5 text-slate-400" /> Masa Aktif Layanan (Bulanan)
                      </p>
                      <p className="text-sm font-medium text-slate-800 dark:text-slate-100 mt-0.5">{getMasaAktif(reg.ActivatedAt)}</p>
                    </div>
                  )}
                  {reg.ONTSerialNumber && (
                    <div className="bg-slate-50 dark:bg-slate-800/50 rounded-xl px-4 py-3">
                      <p className="text-[10px] text-slate-400 uppercase tracking-wide mb-0.5">ONT Serial</p>
                      <p className="text-sm font-mono font-semibold text-slate-800 dark:text-slate-100">{reg.ONTSerialNumber}</p>
                    </div>
                  )}
                  {reg.ODPInfo && (
                    <div className="bg-slate-50 dark:bg-slate-800/50 rounded-xl px-4 py-3 col-span-2">
                      <p className="text-[10px] text-slate-400 uppercase tracking-wide mb-0.5">Informasi ODP</p>
                      <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">{reg.ODPInfo}</p>
                    </div>
                  )}
                  {reg.MapsLat && reg.MapsLng && (
                    <div className="bg-slate-50 dark:bg-slate-800/50 rounded-xl px-4 py-3 col-span-2">
                      <p className="text-[10px] text-slate-400 uppercase tracking-wide mb-0.5">Koordinat Akurat Lapangan</p>
                      <p className="text-sm font-mono font-semibold text-slate-800 dark:text-slate-100">{reg.MapsLat}, {reg.MapsLng}</p>
                    </div>
                  )}
                </div>
              </section>
            )
          })()}

          {/* Provisioning Logs */}
          {provLogs.length > 0 && (
            <section>
              <h4 className="text-xs font-semibold text-gray-500 dark:text-zinc-400 mb-2">Log Provisioning</h4>
              <div className="space-y-1.5 max-h-32 overflow-y-auto">
                {provLogs.map((log: any, i: number) => (
                  <div key={i} className={`flex gap-3 px-3 py-2 rounded-lg text-xs ${log.IsSuccess ? 'bg-green-50 dark:bg-green-900/15 border border-green-100 dark:border-green-900' : 'bg-red-50 dark:bg-red-900/15 border border-red-100 dark:border-red-900'}`}>
                    <span className={log.IsSuccess ? 'text-green-600 dark:text-green-400' : 'text-red-500'}>{log.IsSuccess ? '✓' : '✗'}</span>
                    <span className="text-gray-600 dark:text-zinc-300 flex-1">{log.Message}</span>
                    <span className="text-gray-400 dark:text-zinc-500 shrink-0">{formatDateTime(log.CreatedAt)}</span>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Catatan Internal */}
          {isCS && (
            <section>
              <h4 className="text-xs font-semibold text-gray-500 dark:text-zinc-400 mb-2">Catatan Internal</h4>
              <textarea
                rows={3}
                value={notes}
                onChange={e => setNotes(e.target.value)}
                placeholder="Tambah catatan internal..."
                className="w-full text-sm bg-gray-50 dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 rounded-lg px-3 py-2.5 text-gray-700 dark:text-gray-200 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/30 resize-none"
              />
              <button
                onClick={() => notesMut.mutate()}
                disabled={notesMut.isPending}
                className="mt-1.5 text-xs font-medium text-blue-600 hover:text-blue-700 dark:text-blue-400 hover:underline disabled:opacity-50"
              >
                {notesMut.isPending ? 'Menyimpan...' : 'Simpan Catatan'}
              </button>
            </section>
          )}

          {/* Timestamps */}
          <div className="flex gap-4 text-xs text-gray-400 dark:text-zinc-500 pt-2 border-t border-gray-100 dark:border-zinc-800">
            <span>Dibuat: {formatDateTime(reg.CreatedAt)}</span>
            <span>Diperbarui: {formatDateTime(reg.UpdatedAt)}</span>
          </div>

          {/* Action Buttons */}
          {isCS && (canApprove || canReject || canConfirmPayment || canScheduleInstall || canProvisionMikrotik) && (
            <div className="pt-2 border-t border-gray-100 dark:border-zinc-800">
              <p className="text-xs font-medium text-gray-500 dark:text-zinc-400 mb-2">Aksi</p>
              <div className="flex flex-wrap gap-2">
                {canProvisionMikrotik && (
                  <button
                    type="button"
                    onClick={() => provisionMikrotikMut.mutate()}
                    disabled={provisionMikrotikMut.isPending}
                    className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold transition-all disabled:opacity-50 shadow-sm"
                  >
                    {provisionMikrotikMut.isPending ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <>
                        <Server className="w-3.5 h-3.5" />
                        <span>Provisioning PPPoE Mikrotik</span>
                      </>
                    )}
                  </button>
                )}
                {canApprove && (
                  <button onClick={() => setMode(mode === 'approve' ? null : 'approve')}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-semibold transition-colors">
                    <CheckCircle className="w-3.5 h-3.5" /> Approve & Jadwal Survei
                  </button>
                )}
                {canReject && (
                  <button onClick={() => setMode(mode === 'reject' ? null : 'reject')}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-red-500 hover:bg-red-600 text-white text-xs font-semibold transition-colors">
                    <XCircle className="w-3.5 h-3.5" /> Tolak
                  </button>
                )}
                {canConfirmPayment && (
                  <button onClick={() => setMode(mode === 'confirm-payment' ? null : 'confirm-payment')}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-blue-500 hover:bg-blue-600 text-white text-xs font-semibold transition-colors">
                    <CreditCard className="w-3.5 h-3.5" /> Konfirmasi Pembayaran
                  </button>
                )}
                {canScheduleInstall && (
                  <button onClick={() => setMode(mode === 'schedule-installation' ? null : 'schedule-installation')}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-purple-500 hover:bg-purple-600 text-white text-xs font-semibold transition-colors">
                    <Wrench className="w-3.5 h-3.5" /> Jadwal Instalasi
                  </button>
                )}
                {reg.Status === 'active' && (role === 'owner' || role === 'cs_admin') && (
                  <button
                    onClick={() => toggleIsolirMut.mutate('isolir')}
                    disabled={toggleIsolirMut.isPending}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold transition-colors shadow-sm disabled:opacity-50"
                    title="Isolir akses internet pelanggan ini"
                  >
                    {toggleIsolirMut.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ShieldAlert className="w-3.5 h-3.5" />}
                    <span>Isolir Pelanggan</span>
                  </button>
                )}
                {reg.Status === 'isolir' && (role === 'owner' || role === 'cs_admin') && (
                  <button
                    onClick={() => toggleIsolirMut.mutate('active')}
                    disabled={toggleIsolirMut.isPending}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold transition-colors shadow-sm disabled:opacity-50"
                    title="Buka isolir pelanggan dan aktifkan kembali layanan"
                  >
                    {toggleIsolirMut.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle className="w-3.5 h-3.5" />}
                    <span>Buka Isolir (Aktifkan)</span>
                  </button>
                )}
              </div>

              {/* Sub-forms */}
              {(mode === 'approve' || mode === 'schedule-installation') && (
                <div className="mt-4 p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl space-y-3 border border-slate-200 dark:border-slate-700">
                  <p className="text-xs font-bold text-slate-600 dark:text-slate-300">
                    {mode === 'approve' ? 'Jadwal Survei' : 'Jadwal Instalasi'}
                  </p>
                  <select value={techId} onChange={e => setTechId(e.target.value)}
                    className="w-full text-sm bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl px-3 py-2 text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/40">
                    <option value="">-- Pilih Teknisi --</option>
                    {technicians.map((t: any) => (
                      <option key={t.ID} value={t.ID}>{t.FullName}</option>
                    ))}
                  </select>
                   <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block">Tanggal</label>
                      <input
                        type="date"
                        value={scheduledDate}
                        onChange={e => setScheduledDate(e.target.value)}
                        className="w-full text-sm bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl px-3 py-2 text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/40"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block">Jam Kerja</label>
                      <select
                        value={scheduledTime}
                        onChange={e => setScheduledTime(e.target.value)}
                        className="w-full text-sm bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl px-3 py-2 text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/40"
                      >
                        <option value="08:00">08:00 WIB</option>
                        <option value="09:00">09:00 WIB</option>
                        <option value="10:00">10:00 WIB</option>
                        <option value="11:00">11:00 WIB</option>
                        <option value="13:00">13:00 WIB</option>
                        <option value="14:00">14:00 WIB</option>
                        <option value="15:00">15:00 WIB</option>
                        <option value="16:00">16:00 WIB</option>
                        <option value="17:00">17:00 WIB</option>
                      </select>
                    </div>
                  </div>
                  <div className="flex gap-2 justify-end">
                    <button onClick={() => setMode(null)} className="px-3 py-2 text-xs rounded-xl bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-300 dark:hover:bg-slate-600 transition-colors">Batal</button>
                    <button
                      onClick={() => mode === 'approve' ? approveMut.mutate() : installMut.mutate()}
                      disabled={!techId || !scheduledDate || isPending}
                      className="px-3 py-2 text-xs rounded-xl bg-blue-600 text-white font-semibold hover:bg-blue-700 disabled:opacity-50 transition-colors"
                    >
                      {isPending ? 'Menyimpan...' : 'Simpan'}
                    </button>
                  </div>
                </div>
              )}

              {mode === 'reject' && (
                <div className="mt-4 p-4 bg-red-50 dark:bg-red-500/10 rounded-xl space-y-3 border border-red-200 dark:border-red-500/20">
                  <p className="text-xs font-bold text-red-600 dark:text-red-400">Alasan Penolakan</p>
                  <textarea rows={3} value={reason} onChange={e => setReason(e.target.value)}
                    placeholder="Tulis alasan penolakan..."
                    className="w-full text-sm bg-white dark:bg-slate-800 border border-red-200 dark:border-red-500/30 rounded-xl px-3 py-2 text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-red-400/40 resize-none" />
                  <div className="flex gap-2 justify-end">
                    <button onClick={() => setMode(null)} className="px-3 py-2 text-xs rounded-xl bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-300 dark:hover:bg-slate-600 transition-colors">Batal</button>
                    <button onClick={() => rejectMut.mutate()} disabled={!reason || isPending}
                      className="px-3 py-2 text-xs rounded-xl bg-red-600 text-white font-semibold hover:bg-red-700 disabled:opacity-50 transition-colors">
                      {isPending ? 'Memproses...' : 'Tolak Registrasi'}
                    </button>
                  </div>
                </div>
              )}

              {mode === 'confirm-payment' && (
                <div className="mt-4 p-5 bg-emerald-50/50 dark:bg-emerald-950/20 rounded-2xl space-y-4 border border-emerald-200/50 dark:border-emerald-800/30 animate-fade-in shadow-inner">
                  <div className="flex items-center justify-between border-b border-emerald-100 dark:border-emerald-905/30 pb-2">
                    <p className="text-xs font-bold text-emerald-800 dark:text-emerald-450 flex items-center gap-1.5 uppercase tracking-wider">
                      💳 Konfirmasi Pembayaran Pasang Baru
                    </p>
                    <span className="text-[10px] bg-emerald-100 dark:bg-emerald-900/60 text-emerald-750 dark:text-emerald-350 px-2 py-0.5 rounded font-mono font-bold">
                      {reg.RegNumber}
                    </span>
                  </div>

                  {/* Billing Details Breakdown */}
                  <div className="bg-white dark:bg-slate-900/60 p-4 rounded-xl border border-emerald-100/50 dark:border-slate-800 space-y-2.5">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Rincian Tagihan Resmi</p>
                    
                    <div className="space-y-1.5 text-xs text-slate-650 dark:text-slate-300">
                      <div className="flex justify-between items-center">
                        <span>Paket: <strong className="text-slate-800 dark:text-slate-100">{selectedPkg?.Name || 'Paket Internet'}</strong></span>
                        <span className="font-mono">{formatCurrency(packPrice)}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span>Biaya Pemasangan (Instalasi):</span>
                        <span className="font-mono">{formatCurrency(instFee)}</span>
                      </div>
                      
                      <div className="h-[1px] bg-slate-100 dark:bg-slate-850 my-1" />
                      
                      <div className="flex justify-between items-center font-medium">
                        <span>Subtotal:</span>
                        <span className="font-mono">{formatCurrency(subtotal)}</span>
                      </div>
                      
                      <div className="flex justify-between items-center text-slate-400">
                        <span>PPN ({taxRate}%):</span>
                        <span className="font-mono">{formatCurrency(ppn)}</span>
                      </div>
                      
                      <div className="h-[1px] bg-slate-100 dark:bg-slate-850 my-1" />
                      
                      <div className="flex justify-between items-center text-sm font-bold text-emerald-700 dark:text-emerald-400 pt-1">
                        <span>Total yang Harus Dibayar:</span>
                        <span className="font-mono bg-emerald-100/60 dark:bg-emerald-950/60 px-2.5 py-1 rounded-lg text-base">
                          {formatCurrency(totalAmount)}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Input Form Fields */}
                  <div className="space-y-3">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Input Bukti Pembayaran</p>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div className="space-y-1 md:col-span-2">
                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Nominal Diterima (Rp) <span className="text-red-500">*</span></label>
                        <div className="relative flex items-center">
                          <span className="absolute left-3.5 text-xs font-bold text-slate-400">Rp</span>
                          <input 
                            type="number" 
                            placeholder="Contoh: 350000" 
                            value={payAmount} 
                            onChange={e => setPayAmount(e.target.value)}
                            className="w-full text-sm font-semibold bg-white dark:bg-slate-850 border border-slate-200 dark:border-slate-700 rounded-xl pl-9 pr-4 py-2.5 text-slate-850 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/30" 
                          />
                        </div>
                      </div>

                      {/* Metode Pembayaran Selection */}
                      <div className="space-y-1 md:col-span-2">
                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Metode Pembayaran <span className="text-red-500">*</span></label>
                        <div className="flex gap-2 p-1 bg-slate-100 dark:bg-slate-800/80 rounded-xl">
                          <button
                            type="button"
                            onClick={() => setPaymentType('TRANSFER')}
                            className={`flex-1 py-2 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                              paymentType === 'TRANSFER'
                                ? 'bg-white dark:bg-slate-700 text-slate-800 dark:text-white shadow-sm'
                                : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-350'
                            }`}
                          >
                            🏦 Transfer Bank
                          </button>
                          <button
                            type="button"
                            onClick={() => setPaymentType('TUNAI')}
                            className={`flex-1 py-2 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                              paymentType === 'TUNAI'
                                ? 'bg-white dark:bg-slate-700 text-slate-800 dark:text-white shadow-sm'
                                : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-350'
                            }`}
                          >
                            💵 Tunai / Cash
                          </button>
                        </div>
                      </div>

                      {/* Conditionally show Bank Name field if TRANSFER is chosen */}
                      {paymentType === 'TRANSFER' ? (
                        <div className="space-y-1">
                          <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Nama Bank Penerima <span className="text-red-500">*</span></label>
                          <input 
                            type="text" 
                            placeholder="Contoh: BCA, Mandiri, BNI, dll" 
                            value={payBank === 'TUNAI' ? 'TRANSFER' : payBank} 
                            onChange={e => setPayBank(e.target.value)}
                            className="w-full text-sm bg-white dark:bg-slate-850 border border-slate-200 dark:border-slate-700 rounded-xl px-3.5 py-2.5 text-slate-850 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/30" 
                          />
                        </div>
                      ) : (
                        <div className="space-y-1">
                          <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Metode Terpilih</label>
                          <div className="w-full text-sm bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3.5 py-2.5 text-slate-500 dark:text-slate-400 font-semibold select-none">
                            Tunai (Cash ke Admin / Teknisi)
                          </div>
                        </div>
                      )}

                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Tanggal Transaksi <span className="text-red-500">*</span></label>
                        <input 
                          type="date" 
                          value={payDate} 
                          onChange={e => setPayDate(e.target.value)}
                          className="w-full text-sm bg-white dark:bg-slate-850 border border-slate-200 dark:border-slate-700 rounded-xl px-3.5 py-2.5 text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/30" 
                        />
                      </div>

                      <div className="space-y-1 md:col-span-2">
                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Catatan / Bukti Bayar (Opsional)</label>
                        <textarea 
                          rows={2}
                          placeholder="Keterangan tambahan (misal: Transfer via ATM, nama pengirim, dll)" 
                          value={payNotes} 
                          onChange={e => setPayNotes(e.target.value)}
                          className="w-full text-sm bg-white dark:bg-slate-850 border border-slate-200 dark:border-slate-700 rounded-xl px-3.5 py-2 text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/30 resize-none" 
                        />
                      </div>
                    </div>
                  </div>

                  {/* Actions buttons */}
                  <div className="flex gap-2 justify-end pt-2 border-t border-emerald-100 dark:border-emerald-900/40">
                    <button onClick={() => setMode(null)} 
                      className="px-4 py-2 text-xs rounded-xl bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-250 dark:hover:bg-slate-700 transition-colors font-semibold">
                      Batal
                    </button>
                    <button onClick={() => payMut.mutate()} disabled={!payAmount || !payBank || !payDate || isPending}
                      className="px-5 py-2 text-xs rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold disabled:opacity-50 disabled:bg-emerald-600/60 shadow-lg shadow-emerald-500/10 transition-colors">
                      {isPending ? 'Mengonfirmasi...' : 'Konfirmasi & Kirim Kuitansi'}
                    </button>
                  </div>
                </div>
              )}

              {mode === 'activate' && (
                <div className="mt-4 p-4 bg-red-50 dark:bg-red-950/20 rounded-2xl space-y-4 border border-red-200 dark:border-red-900/30">
                  <p className="text-sm font-bold text-red-700 dark:text-red-400 flex items-center gap-1.5">
                    ⚙️ Pengaturan Aktivasi & Kredensial
                  </p>
                  
                  {/* PPPoE Credentials Section */}
                  <div className="bg-white dark:bg-slate-900/60 p-4 rounded-xl border border-slate-200/50 dark:border-slate-800 space-y-4">
                    <p className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5 border-b border-slate-100 dark:border-slate-800 pb-2">
                      🔑 Kredensial Akun Pelanggan (PPPoE)
                    </p>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                      {/* Nomor Pelanggan Preview */}
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block">Nomor Pelanggan (Preview)</label>
                        <div className="w-full text-sm font-mono font-bold bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-slate-600 dark:text-slate-400 flex items-center justify-between">
                          <span>{nextCustNum || 'Menghitung...'}</span>
                          <span className="text-[9px] bg-slate-200 dark:bg-slate-700 text-slate-500 dark:text-slate-400 px-1.5 py-0.5 rounded font-sans uppercase">Auto</span>
                        </div>
                      </div>

                      {/* Username PPPoE */}
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block">Username PPPoE <span className="text-red-500">*</span></label>
                        <input
                          type="text"
                          value={pppoeUser}
                          onChange={e => {
                            setPppoeUser(e.target.value)
                            setUserEdited(true)
                          }}
                          placeholder="Contoh: 20262001@ptnat.net"
                          className="w-full text-sm font-mono bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/40"
                        />
                      </div>

                      {/* Password Options */}
                      <div className="col-span-1 md:col-span-2 space-y-2">
                        <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block">Opsi Pembuatan Kata Sandi (Password)</label>
                        <div className="flex gap-4">
                          <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-slate-600 dark:text-slate-300">
                            <input
                              type="radio"
                              name="passwordOption"
                              checked={passwordOption === 'date'}
                              onChange={() => {
                                setPasswordOption('date')
                                setPassEdited(false)
                              }}
                              className="text-blue-600 focus:ring-blue-500/40"
                            />
                            Opsi A (Hari Pemasangan / Hari Aktif)
                          </label>
                          <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-slate-600 dark:text-slate-300">
                            <input
                              type="radio"
                              name="passwordOption"
                              checked={passwordOption === 'random'}
                              onChange={() => {
                                setPasswordOption('random')
                                setPassEdited(false)
                              }}
                              className="text-blue-600 focus:ring-blue-500/40"
                            />
                            Opsi B (Acak / Random)
                          </label>
                        </div>
                      </div>

                      {/* Sub-opsi Random */}
                      {passwordOption === 'random' && (
                        <div className="col-span-1 md:col-span-2 bg-slate-50 dark:bg-slate-800/40 p-3 rounded-xl border border-slate-200/40 dark:border-slate-700/40 space-y-2 animate-fade-in">
                          <label className="text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block">Tipe Karakter Acak</label>
                          <div className="flex gap-4">
                            <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-600 dark:text-slate-300">
                              <input
                                type="radio"
                                name="randomType"
                                checked={randomType === 'numeric'}
                                onChange={() => {
                                  setRandomType('numeric')
                                  setPassEdited(false)
                                }}
                                className="text-blue-600 focus:ring-blue-500/40"
                              />
                              Hanya Angka (8 Digit)
                            </label>
                            <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-600 dark:text-slate-300">
                              <input
                                type="radio"
                                name="randomType"
                                checked={randomType === 'alphanumeric'}
                                onChange={() => {
                                  setRandomType('alphanumeric')
                                  setPassEdited(false)
                                }}
                                className="text-blue-600 focus:ring-blue-500/40"
                              />
                              Alfanumerik (Huruf & Angka)
                            </label>
                          </div>
                        </div>
                      )}

                      {/* Password Input */}
                      <div className="col-span-1 md:col-span-2 space-y-1">
                        <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block">Kata Sandi PPPoE <span className="text-red-500">*</span></label>
                        <div className="relative flex items-center">
                          <input
                            type={showPassword ? 'text' : 'password'}
                            value={pppoePass}
                            onChange={e => {
                              setPppoePass(e.target.value)
                              setPassEdited(true)
                            }}
                            placeholder="Kata Sandi PPPoE"
                            className="w-full text-sm font-mono bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl pl-3 pr-24 py-2 text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/40"
                          />
                          <div className="absolute right-2 flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => setShowPassword(!showPassword)}
                              className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-white transition-colors"
                              title={showPassword ? 'Sembunyikan password' : 'Lihat password'}
                            >
                              {showPassword ? (
                                <svg className="w-4.5 h-4.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                                </svg>
                              ) : (
                                <svg className="w-4.5 h-4.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                </svg>
                              )}
                            </button>
                            
                            {passwordOption === 'random' && (
                              <button
                                type="button"
                                onClick={() => {
                                  setPppoePass(generateRandomPassword(randomType))
                                  setPassEdited(true)
                                }}
                                className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-white transition-colors border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800"
                                title="Acak Ulang"
                              >
                                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 1121.21 7.89M9 11l3 3L22 4" />
                                </svg>
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* OLT & Physical Deployment Section */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="col-span-2 space-y-1">
                      <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block">Port OLT Konfigurasi <span className="text-red-500">*</span></label>
                      <select value={oltPortId} onChange={e => setOltPortId(e.target.value)}
                        className="w-full text-sm bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/40">
                        <option value="">-- Pilih Port OLT --</option>
                        {oltPorts.map((p: any) => (
                          <option key={p.ID} value={p.ID}>{p.Name} — {p.AreaName} ({p.GponSlot}/{p.GponPort})</option>
                        ))}
                      </select>
                    </div>

                    <div className="col-span-2 space-y-1">
                      <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block">Serial Number ONT</label>
                      <input type="text" placeholder="Masukkan ONT Serial Number" value={ontSn} onChange={e => setOntSn(e.target.value)}
                        className="w-full text-sm font-mono bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/40" />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block">Latitude Akurat</label>
                      <input type="number" step="any" placeholder="Masukkan Latitude" value={lat} onChange={e => setLat(e.target.value)}
                        className="w-full text-sm bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/40" />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block">Longitude Akurat</label>
                      <input type="number" step="any" placeholder="Masukkan Longitude" value={lng} onChange={e => setLng(e.target.value)}
                        className="w-full text-sm bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/40" />
                    </div>

                    <div className="col-span-2 space-y-1">
                      <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block">Link Google Maps</label>
                      <input type="url" placeholder="Masukkan Link Google Maps" value={gmapsLink} onChange={e => setGmapsLink(e.target.value)}
                        className="w-full text-sm bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/40" />
                    </div>

                    <div className="col-span-2 space-y-1">
                      <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block">Informasi ODP</label>
                      <input type="text" placeholder="Masukkan Detail ODP & Port" value={odp} onChange={e => setOdp(e.target.value)}
                        className="w-full text-sm bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/40" />
                    </div>
                  </div>

                  <div className="flex gap-2 justify-end pt-2">
                    <button onClick={() => setMode(null)} className="px-3 py-2 text-xs rounded-xl bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-300 dark:hover:bg-slate-600 transition-colors">Batal</button>
                    <button onClick={() => activateMut.mutate()} disabled={!oltPortId || !pppoeUser || !pppoePass || isPending}
                      className="px-4 py-2 text-xs rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold disabled:opacity-50 transition-colors flex items-center gap-1.5">
                      <Play className="w-3.5 h-3.5" /> {isPending ? 'Memproses...' : 'Kirim Provisioning & Aktifkan'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
          </>
        )}
        </div>
      </div>

      {/* Interactive Premium KTP Document Viewer Modal */}
      {showKTPPreview && reg.KTPFilePath && (
        <div 
          className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-slate-950/90 backdrop-blur-md p-4 animate-fade-in"
          onClick={() => setShowKTPPreview(false)}
        >
          {/* Header Info */}
          <div className="w-full max-w-4xl flex items-center justify-between text-white mb-4 px-2" onClick={e => e.stopPropagation()}>
            <div>
              <h3 className="text-sm font-bold flex items-center gap-2">
                <span>Dokumen KTP</span>
                <span className="text-xs text-slate-400 font-normal">({reg.FullName} - NIK: {reg.NIK || 'Tidak tersedia'})</span>
              </h3>
              <p className="text-[10px] text-slate-400 mt-0.5">Format Gambar · Zoom: {Math.round(ktpZoom * 100)}% · Rotasi: {ktpRotate}°</p>
            </div>
            <button 
              type="button"
              onClick={() => setShowKTPPreview(false)}
              className="p-2 bg-slate-800 hover:bg-slate-750 text-slate-300 hover:text-white rounded-xl transition-all border border-slate-700/50"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Image Canvas Box */}
          <div 
            className="flex-1 w-full max-w-4xl bg-slate-900/40 border border-slate-800/80 rounded-3xl overflow-hidden flex items-center justify-center relative p-6 shadow-2xl"
            onClick={e => e.stopPropagation()}
          >
            <div className="overflow-auto max-w-full max-h-[65vh] flex items-center justify-center">
              <img
                src={getFileUrl(reg.KTPFilePath)}
                alt="KTP Zoomed"
                style={{
                  transform: `rotate(${ktpRotate}deg) scale(${ktpZoom})`,
                  transformOrigin: 'center center',
                }}
                className="max-h-[60vh] max-w-full object-contain shadow-2xl transition-transform duration-200 rounded-lg"
              />
            </div>
          </div>

          {/* Floating Action Bar */}
          <div 
            className="mt-4 bg-slate-900 border border-slate-800/80 rounded-2xl px-5 py-3 shadow-2xl flex items-center gap-4 text-white"
            onClick={e => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setKtpZoom(z => Math.max(0.5, z - 0.25))}
              className="p-2 hover:bg-slate-800 text-slate-300 hover:text-white rounded-lg transition-colors"
              title="Perkecil (Zoom Out)"
            >
              <ZoomOut className="w-4 h-4" />
            </button>
            <span className="text-xs font-mono w-12 text-center text-slate-400">{Math.round(ktpZoom * 100)}%</span>
            <button
              type="button"
              onClick={() => setKtpZoom(z => Math.min(3, z + 0.25))}
              className="p-2 hover:bg-slate-800 text-slate-300 hover:text-white rounded-lg transition-colors"
              title="Perbesar (Zoom In)"
            >
              <ZoomIn className="w-4 h-4" />
            </button>

            <div className="w-[1px] h-6 bg-slate-800" />

            <button
              type="button"
              onClick={() => setKtpRotate(r => (r - 90) % 360)}
              className="p-2 hover:bg-slate-800 text-slate-300 hover:text-white rounded-lg transition-colors"
              title="Putar Kiri 90°"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => setKtpRotate(r => (r + 90) % 360)}
              className="p-2 hover:bg-slate-800 text-slate-300 hover:text-white rounded-lg transition-colors"
              title="Putar Kanan 90°"
            >
              <RotateCw className="w-4 h-4" />
            </button>

            <button
              type="button"
              onClick={() => {
                setKtpZoom(1)
                setKtpRotate(0)
              }}
              className="px-2.5 py-1.5 hover:bg-slate-800 text-xs font-semibold text-slate-300 hover:text-white rounded-lg transition-colors"
            >
              Reset
            </button>

            <div className="w-[1px] h-6 bg-slate-800" />

            <a
              href={getFileUrl(reg.KTPFilePath)}
              download={`${reg.FullName.replace(/\s+/g, '_')}_KTP.jpg`}
              target="_blank"
              rel="noopener noreferrer"
              className="p-2 hover:bg-slate-800 text-slate-300 hover:text-white rounded-lg transition-colors flex items-center justify-center"
              title="Unduh File KTP"
            >
              <Download className="w-4 h-4" />
            </a>
          </div>
        </div>
      )}

      {/* Interactive Premium ONT Document Viewer Modal */}
      {showONTPreview && reg.ONTPhotoPath && (
        <div 
          className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-slate-950/90 backdrop-blur-md p-4 animate-fade-in"
          onClick={() => setShowONTPreview(false)}
        >
          {/* Header Info */}
          <div className="w-full max-w-4xl flex items-center justify-between text-white mb-4 px-2" onClick={e => e.stopPropagation()}>
            <div>
              <h3 className="text-sm font-bold flex items-center gap-2">
                <span>Foto Label / Fisik ONT</span>
                <span className="text-xs text-slate-400 font-normal">({reg.FullName} - SN: {reg.ONTSerialNumber || 'Tidak tersedia'})</span>
              </h3>
              <p className="text-[10px] text-slate-400 mt-0.5">Format Gambar · Zoom: {Math.round(ontZoom * 100)}% · Rotasi: {ontRotate}°</p>
            </div>
            <button 
              type="button"
              onClick={() => setShowONTPreview(false)}
              className="p-2 bg-slate-800 hover:bg-slate-750 text-slate-300 hover:text-white rounded-xl transition-all border border-slate-700/50"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Image Canvas Box */}
          <div 
            className="flex-1 w-full max-w-4xl bg-slate-900/40 border border-slate-800/80 rounded-3xl overflow-hidden flex items-center justify-center relative p-6 shadow-2xl"
            onClick={e => e.stopPropagation()}
          >
            <div className="overflow-auto max-w-full max-h-[65vh] flex items-center justify-center">
              <img
                src={getFileUrl(reg.ONTPhotoPath)}
                alt="ONT Zoomed"
                style={{
                  transform: `rotate(${ontRotate}deg) scale(${ontZoom})`,
                  transformOrigin: 'center center',
                }}
                className="max-h-[60vh] max-w-full object-contain shadow-2xl transition-transform duration-200 rounded-lg"
              />
            </div>
          </div>

          {/* Floating Action Bar */}
          <div 
            className="mt-4 bg-slate-900 border border-slate-800/80 rounded-2xl px-5 py-3 shadow-2xl flex items-center gap-4 text-white"
            onClick={e => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setOntZoom(z => Math.max(0.5, z - 0.25))}
              className="p-2 hover:bg-slate-800 text-slate-300 hover:text-white rounded-lg transition-colors"
              title="Perkecil (Zoom Out)"
            >
              <ZoomOut className="w-4 h-4" />
            </button>
            <span className="text-xs font-mono w-12 text-center text-slate-400">{Math.round(ontZoom * 100)}%</span>
            <button
              type="button"
              onClick={() => setOntZoom(z => Math.min(3, z + 0.25))}
              className="p-2 hover:bg-slate-800 text-slate-300 hover:text-white rounded-lg transition-colors"
              title="Perbesar (Zoom In)"
            >
              <ZoomIn className="w-4 h-4" />
            </button>

            <div className="w-[1px] h-6 bg-slate-800" />

            <button
              type="button"
              onClick={() => setOntRotate(r => (r - 90) % 360)}
              className="p-2 hover:bg-slate-800 text-slate-300 hover:text-white rounded-lg transition-colors"
              title="Putar Kiri 90°"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => setOntRotate(r => (r + 90) % 360)}
              className="p-2 hover:bg-slate-800 text-slate-300 hover:text-white rounded-lg transition-colors"
              title="Putar Kanan 90°"
            >
              <RotateCw className="w-4 h-4" />
            </button>

            <button
              type="button"
              onClick={() => {
                setOntZoom(1)
                setOntRotate(0)
              }}
              className="px-2.5 py-1.5 hover:bg-slate-800 text-xs font-semibold text-slate-300 hover:text-white rounded-lg transition-colors"
            >
              Reset
            </button>

            <div className="w-[1px] h-6 bg-slate-800" />

            <a
              href={getFileUrl(reg.ONTPhotoPath)}
              download={`${reg.FullName.replace(/\s+/g, '_')}_ONT.jpg`}
              target="_blank"
              rel="noopener noreferrer"
              className="p-2 hover:bg-slate-800 text-slate-300 hover:text-white rounded-lg transition-colors flex items-center justify-center"
              title="Unduh Foto ONT"
            >
              <Download className="w-4 h-4" />
            </a>
          </div>
        </div>
      )}
    </div>
  )
}
