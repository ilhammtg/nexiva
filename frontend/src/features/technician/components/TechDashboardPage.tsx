import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { MapPin, Phone, CheckCircle, Wrench, RefreshCw, ChevronDown, ChevronUp, Calendar, Info, ZoomIn, ZoomOut, RotateCw, RotateCcw, Download, X, Crosshair, Camera } from 'lucide-react'
import { StatusBadge, LoadingSpinner, EmptyState } from '@/components/ui'
import { formatDateTime } from '@/lib/utils'
import { techApi, csApi } from '@/features/cs/api/csApi'
import { publicApi } from '@/features/public/api/publicApi'
import type { Registration } from '@/features/owner/types'

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

export default function TechDashboardPage() {
  const qc = useQueryClient()
  const [activeTab, setActiveTab] = useState<'my-tasks' | 'available-tasks'>('my-tasks')
  const [expanded, setExpanded] = useState<string | null>(null)
  const [surveyForm, setSurveyForm] = useState<Record<string, any>>({})
  const [activateForm, setActivateForm] = useState<Record<string, any>>({})

  // KTP Viewer States
  const [ktpModalUrl, setKtpModalUrl] = useState<string | null>(null)
  const [zoom, setZoom] = useState(1)
  const [rotation, setRotation] = useState(0)

  // Geolocation lookup handler
  const handleGetCurrentLocation = (regId: string) => {
    if (!navigator.geolocation) {
      toast.error('Browser Anda tidak mendukung deteksi lokasi (Geolocation)')
      return
    }

    const toastId = toast.loading('Mengambil koordinat GPS...')

    // Attempt high accuracy GPS first
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const lat = position.coords.latitude
        const lng = position.coords.longitude
        
        setActivateForm(f => {
          const af = f[regId] ?? {}
          return {
            ...f,
            [regId]: {
              ...af,
              maps_lat: lat,
              maps_lng: lng,
              google_maps_link: `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`
            }
          }
        })
        toast.dismiss(toastId)
        toast.success('Koordinat GPS berhasil didapatkan!')
      },
      (error) => {
        console.warn('High accuracy GPS failed, trying fallback geolocation...', error)
        // Fallback to low accuracy cellular/wifi geolocation
        navigator.geolocation.getCurrentPosition(
          (position) => {
            const lat = position.coords.latitude
            const lng = position.coords.longitude
            
            setActivateForm(f => {
              const af = f[regId] ?? {}
              return {
                ...f,
                [regId]: {
                  ...af,
                  maps_lat: lat,
                  maps_lng: lng,
                  google_maps_link: `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`
                }
              }
            })
            toast.dismiss(toastId)
            toast.success('Koordinat GPS didapatkan (Akurasi Standar)!')
          },
          (fallbackError) => {
            toast.dismiss(toastId)
            console.error('All geolocation attempts failed:', fallbackError)
            if (window.location.protocol === 'http:' && !['localhost', '127.0.0.1'].includes(window.location.hostname)) {
              toast.error('GPS Diblokir: Koneksi HTTP tidak aman. Akses wajib menggunakan HTTPS atau Localhost.', { duration: 6000 })
            } else {
              toast.error('Gagal mendeteksi lokasi GPS. Izinkan akses lokasi di browser Anda.')
            }
          },
          { enableHighAccuracy: false, timeout: 10000, maximumAge: 30000 }
        )
      },
      { enableHighAccuracy: true, timeout: 6000, maximumAge: 0 }
    )
  }

  // Fetch packages for mapping details
  const { data: packages = [] } = useQuery({
    queryKey: ['packages'],
    queryFn: publicApi.getPackages,
  })

  // Fetch ODPs for dropdown selection
  const { data: odps = [] } = useQuery({
    queryKey: ['odps'],
    queryFn: csApi.getODPs,
  })

  // Fetch my assigned tasks
  const { data: myTasks = [] as Registration[], isLoading: isLoadingMy, refetch: refetchMy, isFetching: isFetchingMy } = useQuery<Registration[]>({
    queryKey: ['tech-schedule'],
    queryFn: () => techApi.getSchedule(),
    refetchInterval: 60000,
  })

  // Fetch available unassigned tasks (?type=available)
  const { data: availableTasks = [] as Registration[], isLoading: isLoadingAvail, refetch: refetchAvail, isFetching: isFetchingAvail } = useQuery<Registration[]>({
    queryKey: ['available-tasks'],
    queryFn: () => techApi.getSchedule({ type: 'available' }),
    refetchInterval: 60000,
  })

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ['tech-schedule'] })
    qc.invalidateQueries({ queryKey: ['available-tasks'] })
  }

  // Claim unassigned ticket
  const claimMut = useMutation({
    mutationFn: (id: string) => techApi.claimTicket(id),
    onSuccess: () => {
      toast.success('Tiket pemasangan berhasil diambil! Silakan cek di tab Jadwal Saya.')
      invalidate()
      setExpanded(null)
      setActiveTab('my-tasks')
    },
    onError: (e: any) => toast.error(e?.response?.data?.message ?? 'Gagal mengambil tiket'),
  })

  const surveyMut = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: any }) =>
      techApi.submitSurveyResult(id, payload),
    onSuccess: () => { toast.success('Hasil survei disimpan'); invalidate(); setExpanded(null) },
    onError: (e: any) => toast.error(e?.response?.data?.message ?? 'Gagal simpan survei'),
  })

  const activateMut = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: any }) =>
      techApi.activate(id, payload),
    onSuccess: () => { toast.success('Instalasi diselesaikan! Menunggu pembayaran pelanggan.'); invalidate(); setExpanded(null) },
    onError: (e: any) => toast.error(e?.response?.data?.message ?? 'Gagal menyimpan instalasi'),
  })

  const retryMut = useMutation({
    mutationFn: (id: string) => techApi.retryProvisioning(id),
    onSuccess: () => { toast.success('Retry provisioning dimulai'); invalidate() },
    onError: (e: any) => toast.error(e?.response?.data?.message ?? 'Gagal retry'),
  })

  const handleRefresh = () => {
    if (activeTab === 'my-tasks') {
      refetchMy()
    } else {
      refetchAvail()
    }
  }

  const tasksList = activeTab === 'my-tasks' ? myTasks : availableTasks
  const isLoading = activeTab === 'my-tasks' ? isLoadingMy : isLoadingAvail
  const isRefreshing = activeTab === 'my-tasks' ? isFetchingMy : isFetchingAvail

  const today = new Date().toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })

  return (
    <div className="p-4 sm:p-8 space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-[28px] font-bold text-slate-800 dark:text-white">Panel Teknisi</h1>
          <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">{today}</p>
        </div>
        <button onClick={handleRefresh} disabled={isRefreshing}
          className="flex items-center justify-center gap-2 px-4 py-2.5 sm:py-2 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:bg-blue-600/70 text-white text-sm font-medium transition-colors w-full sm:w-auto">
          <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} /> <span>{isRefreshing ? 'Refreshing...' : 'Refresh'}</span>
        </button>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200 dark:border-slate-800">
        <button
          onClick={() => { setActiveTab('my-tasks'); setExpanded(null) }}
          className={`flex-1 py-3 text-xs sm:text-sm font-bold border-b-2 transition-colors ${
            activeTab === 'my-tasks'
              ? 'border-blue-600 text-blue-600 dark:text-blue-400'
              : 'border-transparent text-slate-400 dark:text-slate-500 hover:text-slate-600'
          }`}
        >
          Jadwal Saya ({myTasks.length})
        </button>
        <button
          onClick={() => { setActiveTab('available-tasks'); setExpanded(null) }}
          className={`flex-1 py-3 text-xs sm:text-sm font-bold border-b-2 transition-colors ${
            activeTab === 'available-tasks'
              ? 'border-blue-600 text-blue-600 dark:text-blue-400'
              : 'border-transparent text-slate-400 dark:text-slate-500 hover:text-slate-600'
          }`}
        >
          Tiket Tersedia ({availableTasks.length})
        </button>
      </div>

      {/* Summary bar (Only for My Tasks) */}
      {activeTab === 'my-tasks' && (
        <div className="grid grid-cols-3 gap-2 sm:gap-4">
          {[
            { label: 'Survei', count: myTasks.filter((r: Registration) => ['survey_scheduled', 'survey_pending'].includes(r.Status)).length },
            { label: 'Instalasi', count: myTasks.filter((r: Registration) => ['installation_scheduled'].includes(r.Status)).length },
            { label: 'Retry Prov.', count: myTasks.filter((r: Registration) => r.Status === 'provisioning_failed').length },
          ].map(s => (
            <div key={s.label} className="bg-white dark:bg-slate-900 rounded-2xl p-2.5 sm:p-4 border border-slate-100 dark:border-slate-800 text-center shadow-sm">
              <p className="text-2xl sm:text-[26px] font-black text-slate-800 dark:text-white">{s.count}</p>
              <p className="text-[10px] sm:text-xs text-slate-400 dark:text-slate-500 mt-0.5 sm:mt-1">{s.label}</p>
            </div>
          ))}
        </div>
      )}

      {/* Task List */}
      {isLoading ? (
        <LoadingSpinner className="py-16" />
      ) : tasksList.length === 0 ? (
        <EmptyState
          message={activeTab === 'my-tasks' ? 'Tidak ada jadwal untuk Anda hari ini' : 'Tidak ada tiket pemasangan baru saat ini'}
        />
      ) : (
        <div className="space-y-3">
          {tasksList.map((reg: Registration) => {
            const isOpen = expanded === reg.ID
            const isSurvey = reg.Status === 'survey_scheduled' || reg.Status === 'survey_pending'
            const isInstall = reg.Status === 'installation_scheduled'
            const isProvFailed = reg.Status === 'provisioning_failed'
            const sf = surveyForm[reg.ID] ?? {}
            const af = activateForm[reg.ID] ?? {}
            const selectedPkg = packages?.find(p => p.ID === reg.PackageID)

            return (
              <div key={reg.ID}
                className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm overflow-hidden animate-fade-in">
                {/* Card Header */}
                <div className="p-4 sm:p-5 flex items-center gap-3 sm:gap-4 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors"
                  onClick={() => setExpanded(isOpen ? null : reg.ID)}>
                  <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl sm:rounded-2xl bg-gradient-to-br from-blue-100 to-indigo-100 dark:from-blue-900/30 dark:to-indigo-900/30 flex items-center justify-center flex-shrink-0">
                    <span className="text-blue-700 dark:text-blue-300 font-black text-xs sm:text-sm">{reg.FullName.charAt(0)}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
                      <p className="font-bold text-sm sm:text-base text-slate-800 dark:text-white leading-snug">{reg.FullName}</p>
                      <StatusBadge status={reg.Status} />
                    </div>
                    <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-4 mt-1.5 text-[11px] sm:text-xs text-slate-400 dark:text-slate-550">
                      <span className="flex items-center gap-1"><Phone className="w-3 h-3 text-slate-455" /> {reg.Phone}</span>
                      <span className="flex items-center gap-1"><MapPin className="w-3 h-3 text-slate-455" /> {reg.City}, {reg.District}</span>
                      {isSurvey && reg.SurveyScheduledAt && (
                        <span className="flex items-center gap-1 text-blue-500 dark:text-blue-400 font-medium">
                          <Calendar className="w-3 h-3" /> {formatDateTime(reg.SurveyScheduledAt)}
                        </span>
                      )}
                      {isInstall && reg.InstallationScheduledAt && (
                        <span className="flex items-center gap-1 text-purple-500 dark:text-purple-400 font-medium">
                          <Calendar className="w-3 h-3" /> {formatDateTime(reg.InstallationScheduledAt)}
                        </span>
                      )}
                    </div>
                  </div>
                  {isOpen ? <ChevronUp className="w-4 h-4 text-slate-400 flex-shrink-0" /> : <ChevronDown className="w-4 h-4 text-slate-400 flex-shrink-0" />}
                </div>

                {/* Expanded content */}
                {isOpen && (
                  <div className="px-4 sm:px-5 pb-4 sm:pb-5 border-t border-slate-100 dark:border-slate-800 pt-4 space-y-4">
                    {/* Details */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {/* Left: General Customer Info */}
                      <div className="bg-slate-50 dark:bg-slate-800/40 rounded-2xl p-4 space-y-2.5 border border-slate-100 dark:border-slate-800/60">
                        <p className="font-bold text-slate-800 dark:text-slate-200 border-b border-slate-200/80 dark:border-slate-800/85 pb-1.5 uppercase tracking-wider text-[10px]">
                          Detail Calon Pelanggan
                        </p>
                        <div className="grid grid-cols-3 gap-y-2 gap-x-2 text-xs text-slate-600 dark:text-slate-350">
                          <span className="font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider text-[9px] self-center">No. Registrasi:</span>
                          <span className="col-span-2 font-mono font-bold text-slate-900 dark:text-white select-all">
                            {reg.RegNumber}
                          </span>

                          {reg.CustomerNumber && (
                            <>
                              <span className="font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider text-[9px] self-center">No. Pelanggan:</span>
                              <span className="col-span-2 font-mono font-bold text-slate-900 dark:text-white select-all">
                                {reg.CustomerNumber}
                              </span>
                            </>
                          )}
                          
                          <span className="font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider text-[9px] self-center">NIK KTP:</span>
                          <span className="col-span-2 font-semibold text-slate-800 dark:text-slate-100">{reg.NIK || '-'}</span>

                          <span className="font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider text-[9px] self-center">Email:</span>
                          <span className="col-span-2 truncate font-semibold text-slate-800 dark:text-slate-100">{reg.Email || '-'}</span>
                          
                          <span className="font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider text-[9px] self-center">Foto KTP:</span>
                          <span className="col-span-2">
                            {reg.KTPFilePath ? (
                              <button
                                type="button"
                                onClick={() => setKtpModalUrl(getFileUrl(reg.KTPFilePath))}
                                className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-blue-50 hover:bg-blue-100 dark:bg-blue-950/20 text-blue-600 dark:text-blue-400 text-[10px] font-bold transition-all border border-blue-100 dark:border-blue-900/30"
                              >
                                Lihat Foto KTP 🔍
                              </button>
                            ) : (
                              <span className="text-slate-400 italic">Tidak ada foto KTP</span>
                            )}
                          </span>
                        </div>
                      </div>

                      {/* Right: Package & Cost Info */}
                      <div className="bg-slate-50 dark:bg-slate-800/40 rounded-2xl p-4 space-y-2.5 border border-slate-100 dark:border-slate-800/60">
                        <p className="font-bold text-slate-800 dark:text-slate-200 border-b border-slate-200/80 dark:border-slate-800/85 pb-1.5 uppercase tracking-wider text-[10px]">
                          Paket & Estimasi Biaya
                        </p>
                        <div className="grid grid-cols-3 gap-y-2 gap-x-2 text-xs text-slate-600 dark:text-slate-350">
                          <span className="font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider text-[9px] self-center">Paket:</span>
                          <span className="col-span-2 font-bold text-slate-900 dark:text-white">
                            {selectedPkg?.Name || 'Memuat...'}
                          </span>

                          <span className="font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider text-[9px] self-center">Kecepatan:</span>
                          <span className="col-span-2 font-bold text-slate-800 dark:text-slate-100">
                            {selectedPkg ? `⬇ ${selectedPkg.SpeedDownMbps} Mbps / ⬆ ${selectedPkg.SpeedUpMbps} Mbps` : '-'}
                          </span>

                          <span className="font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider text-[9px] self-center">Iuran Bulanan:</span>
                          <span className="col-span-2 font-bold text-blue-600 dark:text-blue-400">
                            {selectedPkg ? `Rp ${selectedPkg.PriceMonthly.toLocaleString('id-ID')}/bulan` : '-'}
                          </span>

                          <span className="font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider text-[9px] self-center">Biaya Pasang:</span>
                          <span className="col-span-2 font-bold text-slate-850 dark:text-slate-150">
                            {reg.InstallationFee !== null
                              ? `Rp ${reg.InstallationFee.toLocaleString('id-ID')}`
                              : selectedPkg
                              ? `Rp ${selectedPkg.PriceInstallation.toLocaleString('id-ID')}`
                              : '-'}
                          </span>
                        </div>
                      </div>

                      {/* Internal Notes from Admin/CS */}
                      {reg.InternalNotes && (
                        <div className="bg-amber-50/50 dark:bg-amber-950/15 border border-amber-200/30 dark:border-amber-900/30 rounded-2xl p-4 col-span-1 sm:col-span-2 space-y-1.5">
                          <p className="font-bold text-amber-800 dark:text-amber-400 uppercase tracking-wider text-[9px]">
                            Catatan Khusus dari Admin / CS
                          </p>
                          <p className="text-xs text-slate-750 dark:text-slate-350 leading-relaxed font-semibold">
                            {reg.InternalNotes}
                          </p>
                        </div>
                      )}

                      {/* Full Width Address */}
                      <div className="bg-slate-50 dark:bg-slate-800/40 rounded-2xl p-4 col-span-1 sm:col-span-2 space-y-1.5 border border-slate-100 dark:border-slate-800/60">
                        <p className="font-bold text-slate-800 dark:text-slate-200 border-b border-slate-200/80 dark:border-slate-800/85 pb-1.5 uppercase tracking-wider text-[10px]">
                          Alamat Lengkap Pelanggan
                        </p>
                        <p className="text-xs text-slate-800 dark:text-slate-250 font-semibold leading-relaxed">
                          {reg.AddressDetail}, RT {reg.RT || '-'}/RW {reg.RW || '-'}, {reg.Village}, {reg.District}, {reg.City}, Provinsi {reg.Province}
                        </p>
                      </div>

                      {/* Full Width Maps */}
                      <div className="bg-slate-50 dark:bg-slate-800/40 rounded-2xl p-4 col-span-1 sm:col-span-2 space-y-2 border border-slate-100 dark:border-slate-800/60">
                        <p className="font-bold text-slate-800 dark:text-slate-200 border-b border-slate-200/80 dark:border-slate-800/85 pb-1.5 uppercase tracking-wider text-[10px] block">
                          Peta & Koordinat Lokasi
                        </p>
                        <div className="mt-1">
                          <MapPreviewTabs 
                            lat={af.maps_lat !== undefined && af.maps_lat !== null && af.maps_lat !== "" ? Number(af.maps_lat) : reg.MapsLat} 
                            lng={af.maps_lng !== undefined && af.maps_lng !== null && af.maps_lng !== "" ? Number(af.maps_lng) : reg.MapsLng} 
                            gmapsLink={af.google_maps_link !== undefined && af.google_maps_link !== "" ? af.google_maps_link : reg.GoogleMapsLink} 
                          />
                        </div>
                      </div>
                      
                      {reg.ODPInfo && (
                        <div className="bg-slate-50 dark:bg-slate-800/40 rounded-2xl p-4 col-span-1 sm:col-span-2 space-y-1.5 border border-slate-100 dark:border-slate-800/60">
                          <p className="font-bold text-slate-800 dark:text-slate-200 border-b border-slate-200/80 dark:border-slate-800/85 pb-1.5 uppercase tracking-wider text-[10px]">
                            Informasi ODP Lapangan
                          </p>
                          <p className="text-xs font-mono font-bold text-slate-900 dark:text-white pt-0.5">
                            {reg.ODPInfo}
                          </p>
                        </div>
                      )}
                    </div>

                    {/* Claim Button (For available tasks tab) */}
                    {activeTab === 'available-tasks' && (
                      <button
                        onClick={() => claimMut.mutate(reg.ID)}
                        disabled={claimMut.isPending}
                        className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold disabled:opacity-50 transition-colors"
                      >
                        <Wrench className="w-4 h-4" />
                        {claimMut.isPending ? 'Mengambil tiket...' : 'Ambil Tiket Ini'}
                      </button>
                    )}

                    {/* Survey Form */}
                    {activeTab === 'my-tasks' && isSurvey && (
                      <div className="space-y-3">
                        <p className="text-xs font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wide">Input Hasil Survei</p>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 p-3 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-100 dark:border-slate-800/60">
                          <label className="flex items-center gap-2 cursor-pointer py-1">
                            <input type="radio" name={`feasible-${reg.ID}`}
                              checked={sf.status === 'feasible' || (sf.status === undefined && sf.is_feasible === true)}
                              onChange={() => setSurveyForm(f => ({ ...f, [reg.ID]: { ...sf, status: 'feasible', is_feasible: true } }))}
                              className="text-blue-600 focus:ring-blue-500" />
                            <span className="text-xs text-emerald-600 dark:text-emerald-400 font-bold">✓ Bisa Dipasang</span>
                          </label>
                          <label className="flex items-center gap-2 cursor-pointer py-1">
                            <input type="radio" name={`feasible-${reg.ID}`}
                              checked={sf.status === 'pending' || (sf.status === undefined && reg.Status === 'survey_pending')}
                              onChange={() => setSurveyForm(f => ({ ...f, [reg.ID]: { ...sf, status: 'pending', is_feasible: undefined } }))}
                              className="text-blue-600 focus:ring-blue-500" />
                            <span className="text-xs text-amber-600 dark:text-amber-400 font-bold">⏱ Pending (Ditunda)</span>
                          </label>
                          <label className="flex items-center gap-2 cursor-pointer py-1">
                            <input type="radio" name={`feasible-${reg.ID}`}
                              checked={sf.status === 'failed' || (sf.status === undefined && sf.is_feasible === false)}
                              onChange={() => setSurveyForm(f => ({ ...f, [reg.ID]: { ...sf, status: 'failed', is_feasible: false } }))}
                              className="text-blue-600 focus:ring-blue-500" />
                            <span className="text-xs text-rose-600 dark:text-rose-455 font-bold">✗ Tidak Bisa Dipasang</span>
                          </label>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          {(sf.status !== 'pending' && (sf.status !== undefined || reg.Status !== 'survey_pending')) && (
                            <input type="number" placeholder="Panjang estimasi kabel (meter)"
                               value={sf.cable_length_m ?? ''}
                               onChange={e => setSurveyForm(f => ({ ...f, [reg.ID]: { ...sf, cable_length_m: e.target.value } }))}
                               className="text-sm bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/40 col-span-2" />
                          )}
                          <textarea placeholder="Catatan hasil survei lapangan..." rows={2}
                            value={sf.notes ?? ''}
                            onChange={e => setSurveyForm(f => ({ ...f, [reg.ID]: { ...sf, notes: e.target.value } }))}
                            className="text-sm bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/40 col-span-2 resize-none" />
                        </div>
                        <button
                          onClick={() => {
                            const finalStatus = sf.status || (reg.Status === 'survey_pending' ? 'pending' : (sf.is_feasible === true ? 'feasible' : sf.is_feasible === false ? 'failed' : ''));
                            if (!finalStatus) {
                              toast.error('Pilih hasil survei terlebih dahulu')
                              return
                            }
                            surveyMut.mutate({
                              id: reg.ID,
                              payload: {
                                status: finalStatus,
                                is_feasible: finalStatus === 'feasible' ? true : finalStatus === 'failed' ? false : undefined,
                                notes: sf.notes || '',
                                cable_length_m: finalStatus === 'pending' ? 0 : Number(sf.cable_length_m || 0)
                              }
                            })
                          }}
                          disabled={surveyMut.isPending || (!sf.status && reg.Status !== 'survey_pending' && sf.is_feasible === undefined)}
                          className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold disabled:opacity-50 transition-colors">
                          <CheckCircle className="w-4 h-4" />
                          {surveyMut.isPending ? 'Menyimpan...' : 'Simpan Hasil Survei'}
                        </button>
                      </div>
                    )}

                    {/* Activation / Installation Form */}
                    {activeTab === 'my-tasks' && isInstall && (
                      <div className="space-y-3">
                        <p className="text-xs font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wide">Pemasangan & Data Akurat Lapangan</p>
                        
                        <div className="grid grid-cols-2 gap-3">
                          <div className="col-span-2 space-y-1">
                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Serial Number ONT</label>
                            <input type="text" placeholder="Masukkan ONT Serial Number"
                              value={af.ont_serial_number ?? ''}
                              onChange={e => setActivateForm(f => ({ ...f, [reg.ID]: { ...af, ont_serial_number: e.target.value } }))}
                              className="w-full text-sm font-mono bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/40" />
                          </div>

                          <div className="col-span-2 space-y-1">
                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Foto Label ONT (Belakang/Bawah Alat)</label>
                            <div className="flex items-center gap-3">
                              {af.ont_photo_preview ? (
                                <div className="relative w-16 h-16 rounded-xl overflow-hidden border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 group">
                                  <img src={af.ont_photo_preview} alt="Preview ONT" className="w-full h-full object-cover" />
                                  <button
                                    type="button"
                                    onClick={() => setActivateForm(f => ({ ...f, [reg.ID]: { ...af, ont_photo: undefined, ont_photo_preview: undefined } }))}
                                    className="absolute inset-0 bg-black/60 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity text-white text-xs font-bold"
                                  >
                                    Hapus
                                  </button>
                                </div>
                              ) : (
                                <label className="flex flex-col items-center justify-center w-16 h-16 rounded-xl border-2 border-dashed border-slate-350 dark:border-slate-700 hover:border-blue-500 hover:bg-blue-50/10 transition-all cursor-pointer">
                                  <Camera className="w-5 h-5 text-slate-400" />
                                  <span className="text-[8px] font-bold text-slate-400 mt-1">Ambil Foto</span>
                                  <input
                                    type="file"
                                    accept="image/*"
                                    capture="environment"
                                    onChange={e => {
                                      const file = e.target.files?.[0]
                                      if (file) {
                                        const previewUrl = URL.createObjectURL(file)
                                        setActivateForm(f => ({ ...f, [reg.ID]: { ...af, ont_photo: file, ont_photo_preview: previewUrl } }))
                                      }
                                    }}
                                    className="hidden"
                                  />
                                </label>
                              )}
                              <div className="flex-1 text-[10px] text-slate-500 dark:text-slate-400 leading-relaxed font-semibold">
                                <span className="font-bold text-slate-650 dark:text-slate-300">Rekomendasi Efisien:</span> Ambil foto stiker di belakang/bawah perangkat ONT guna meminimalkan kesalahan input SN secara manual.
                              </div>
                            </div>
                          </div>

                          <div className="col-span-2 space-y-1">
                             <div className="flex items-center justify-between">
                               <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Link Google Maps Akurat (Opsional)</label>
                               <button
                                 type="button"
                                 onClick={() => handleGetCurrentLocation(reg.ID)}
                                 className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-blue-50 hover:bg-blue-100 dark:bg-blue-950/20 text-blue-600 dark:text-blue-400 text-[10px] font-bold border border-blue-100 dark:border-blue-900/30 transition-colors"
                               >
                                 <Crosshair className="w-3.5 h-3.5" /> Ambil GPS HP
                               </button>
                             </div>
                             <input type="url" placeholder="Masukkan Link Share Lokasi Google Maps"
                               value={af.google_maps_link ?? reg.GoogleMapsLink ?? ''}
                               onChange={e => setActivateForm(f => ({ ...f, [reg.ID]: { ...af, google_maps_link: e.target.value } }))}
                               className="w-full text-sm bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3.5 py-2.5 text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/40" />
                           </div>

                           <div className="col-span-2 sm:col-span-1 space-y-1">
                             <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Latitude Rumah Akurat</label>
                             <input type="number" step="any" placeholder="Masukkan Latitude"
                               value={af.maps_lat ?? reg.MapsLat ?? ''}
                               onChange={e => setActivateForm(f => ({ ...f, [reg.ID]: { ...af, maps_lat: e.target.value ? Number(e.target.value) : null } }))}
                               className="w-full text-sm bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3.5 py-2.5 text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/40" />
                           </div>

                           <div className="col-span-2 sm:col-span-1 space-y-1">
                             <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Longitude Rumah Akurat</label>
                             <input type="number" step="any" placeholder="Masukkan Longitude"
                               value={af.maps_lng ?? reg.MapsLng ?? ''}
                               onChange={e => setActivateForm(f => ({ ...f, [reg.ID]: { ...af, maps_lng: e.target.value ? Number(e.target.value) : null } }))}
                               className="w-full text-sm bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3.5 py-2.5 text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/40" />
                           </div>

                           <div className="col-span-2 space-y-1">
                             <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Informasi ODP Lapangan</label>
                             <div className="relative">
                               <Info className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />


                               <select
                                 value={af.odp_info ?? reg.ODPInfo ?? ''}
                                 onChange={e => setActivateForm(f => ({ ...f, [reg.ID]: { ...af, odp_info: e.target.value } }))}
                                 className="pl-9 w-full text-sm bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3.5 py-2.5 text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/40"
                               >
                                 <option value="">-- Pilih ODP Terdaftar --</option>
                                 {odps.map((o: any) => (
                                   <option key={o.id || o.ID} value={o.code}>
                                     {o.code} - {o.name} ({o.used_ports}/{o.total_ports} Port)
                                   </option>
                                 ))}
                               </select>
                             </div>
                           </div>
                        </div>

                        <button
                          onClick={() => {
                            const formData = new FormData()
                            formData.append('ont_serial_number', af.ont_serial_number || '')
                            formData.append('olt_port_config_id', '')
                            formData.append('maps_lat', String(af.maps_lat !== undefined ? af.maps_lat : reg.MapsLat ?? ''))
                            formData.append('maps_lng', String(af.maps_lng !== undefined ? af.maps_lng : reg.MapsLng ?? ''))
                            formData.append('odp_info', af.odp_info !== undefined ? af.odp_info : reg.ODPInfo || '')
                            formData.append('google_maps_link', af.google_maps_link !== undefined ? af.google_maps_link : reg.GoogleMapsLink || '')
                            if (af.ont_photo) {
                              formData.append('ont_photo', af.ont_photo)
                            }
                            activateMut.mutate({
                              id: reg.ID,
                              payload: formData
                            })
                          }}
                          disabled={(!af.ont_serial_number && !reg.ONTSerialNumber) || activateMut.isPending}
                          className="w-full flex items-center justify-center gap-2 py-2.5 mt-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold disabled:opacity-50 transition-colors">
                          <Wrench className="w-4 h-4" />
                          {activateMut.isPending ? 'Menyimpan data...' : '✓ Selesaikan Pemasangan & Update Data'}
                        </button>
                      </div>
                    )}

                    {/* Retry provisioning */}
                    {activeTab === 'my-tasks' && isProvFailed && (
                      <div className="space-y-2">
                        <p className="text-xs text-red-500 dark:text-red-400 font-medium">Provisioning sebelumnya gagal.</p>
                        <button onClick={() => retryMut.mutate(reg.ID)} disabled={retryMut.isPending}
                          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-sm font-semibold disabled:opacity-50 transition-colors">
                          <RefreshCw className="w-4 h-4" />
                          {retryMut.isPending ? 'Mencoba ulang...' : 'Retry Provisioning'}
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Premium KTP Viewer Modal */}
      {ktpModalUrl && (
        <div className="fixed inset-0 z-[999] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl max-w-lg w-full overflow-hidden flex flex-col">
            {/* Header */}
            <div className="p-5 border-b border-slate-100 dark:border-slate-800/80 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-800 dark:text-white leading-tight">Viewer KTP Premium</h3>
                <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-1">Periksa kelayakan & keaslian dokumen</p>
              </div>
              <button
                onClick={() => {
                  setKtpModalUrl(null)
                  setZoom(1)
                  setRotation(0)
                }}
                className="p-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-650 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Viewer area */}
            <div className="flex-1 bg-slate-50 dark:bg-slate-950 p-6 flex items-center justify-center min-h-[300px] max-h-[400px] overflow-hidden relative animate-fade-in">
              <div
                className="transition-transform duration-200 ease-out"
                style={{
                  transform: `scale(${zoom}) rotate(${rotation}deg)`,
                }}
              >
                <img
                  src={ktpModalUrl}
                  alt="KTP Dokumen"
                  className="max-h-[280px] max-w-full rounded-lg object-contain shadow-md"
                />
              </div>
            </div>

            {/* Controls */}
            <div className="p-5 bg-slate-50/50 dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between gap-3">
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setZoom((z) => Math.max(0.5, z - 0.25))}
                  className="p-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-650 hover:bg-slate-50 dark:hover:bg-slate-700/80 transition-colors"
                  title="Zoom Out"
                >
                  <ZoomOut className="w-4 h-4 text-slate-750 dark:text-slate-200" />
                </button>
                <button
                  onClick={() => setZoom((z) => Math.min(3, z + 0.25))}
                  className="p-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-650 hover:bg-slate-50 dark:hover:bg-slate-700/80 transition-colors"
                  title="Zoom In"
                >
                  <ZoomIn className="w-4 h-4 text-slate-750 dark:text-slate-200" />
                </button>
                <button
                  onClick={() => setRotation((r) => r - 90)}
                  className="p-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-650 hover:bg-slate-50 dark:hover:bg-slate-700/80 transition-colors"
                  title="Putar Kiri"
                >
                  <RotateCcw className="w-4 h-4 text-slate-750 dark:text-slate-200" />
                </button>
                <button
                  onClick={() => setRotation((r) => r + 90)}
                  className="p-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-650 hover:bg-slate-50 dark:hover:bg-slate-700/80 transition-colors"
                  title="Putar Kanan"
                >
                  <RotateCw className="w-4 h-4 text-slate-750 dark:text-slate-200" />
                </button>
              </div>

              <a
                href={ktpModalUrl}
                download="KTP-Pelanggan.jpg"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-sm transition-colors"
              >
                <Download className="w-3.5 h-3.5" /> Unduh Dokumen
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
