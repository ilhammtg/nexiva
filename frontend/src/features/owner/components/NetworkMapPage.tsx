import React, { useState, useMemo, useEffect, useRef } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { csApi } from '@/features/cs/api/csApi'
import { ownerApi } from '@/features/owner/api/ownerApi'
import type { ODP, Registration } from '@/features/owner/types'
import {
  MapPin,
  Plus,
  Search,
  X,
  Edit2,
  Trash2,
  Building2,
  Compass,
  Cable,
  ExternalLink,
  Link as LinkIcon,
  Locate,
  Layers,
  Eye,
  EyeOff,
  Calendar,
  Clock,
  ShieldAlert,
  Server
} from 'lucide-react'
import { toast } from 'sonner'
import { formatDateTime } from '@/lib/utils'

declare global {
  interface Window {
    L: any
  }
}

// Bireuen, Aceh Town Center Coordinates
const BIREUEN_CENTER: [number, number] = [5.2015, 96.7015]

// Helper to parse Google Maps URL or "lat, lng" text
function parseGoogleMapsUrl(input: string): { lat: number; lng: number } | null {
  if (!input || !input.trim()) return null
  const trimmed = input.trim()

  const match = trimmed.match(/(-?\d+[\.,]\d+)\s*,\s*(-?\d+[\.,]\d+)/)
  if (match) {
    const lat = parseFloat(match[1].replace(',', '.'))
    const lng = parseFloat(match[2].replace(',', '.'))
    if (!isNaN(lat) && !isNaN(lng)) return { lat, lng }
  }

  return null
}

// Helper to safely parse numbers with comma or dot
function parseCoord(val: any): number {
  if (typeof val === 'number') return isNaN(val) ? 0 : val
  const str = String(val || '').replace(/,/g, '.').replace(/\s+/g, '')
  const num = parseFloat(str)
  return isNaN(num) ? 0 : num
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

const StreetMapPreview = () => (
  <svg className="w-full h-full object-cover" viewBox="0 0 60 45" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect width="60" height="45" fill="#E8ECE9" />
    <path d="M0 0C15 10 20 5 35 15C50 25 45 40 60 38V0H0Z" fill="#D2F1D2" />
    <path d="M-5 45C10 38 25 35 32 25C40 12 45 5 65 -5" stroke="#AADAFF" strokeWidth="5" strokeLinecap="round" />
    <line x1="30" y1="-5" x2="30" y2="50" stroke="#FFFFFF" strokeWidth="4" />
    <line x1="30" y1="-5" x2="30" y2="50" stroke="#FFDE9E" strokeWidth="2.5" />
    <line x1="-5" y1="20" x2="65" y2="20" stroke="#FFFFFF" strokeWidth="4" />
    <line x1="-5" y1="20" x2="65" y2="20" stroke="#FFDE9E" strokeWidth="2.5" />
    <circle cx="30" cy="20" r="3.5" fill="#EF4444" stroke="#FFFFFF" strokeWidth="1" />
  </svg>
)

const SatelliteMapPreview = () => (
  <svg className="w-full h-full object-cover" viewBox="0 0 60 45" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect width="60" height="45" fill="#132B14" />
    <path d="M10 5C25 15 35 8 50 18C62 26 55 42 65 40V0H10Z" fill="#0A1C0B" />
    <path d="M-5 45C10 38 25 35 32 25C40 12 45 5 65 -5" stroke="#003554" strokeWidth="5" strokeLinecap="round" />
    <line x1="30" y1="-5" x2="30" y2="50" stroke="#E5E7EB" strokeWidth="1" strokeOpacity="0.7" />
    <line x1="-5" y1="20" x2="65" y2="20" stroke="#E5E7EB" strokeWidth="1" strokeOpacity="0.7" />
    <circle cx="30" cy="20" r="3.5" fill="#EF4444" stroke="#FFFFFF" strokeWidth="1" />
  </svg>
)

const DarkMapPreview = () => (
  <svg className="w-full h-full object-cover" viewBox="0 0 60 45" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect width="60" height="45" fill="#18181B" />
    <path d="M-5 45C10 38 25 35 32 25C40 12 45 5 65 -5" stroke="#0C2340" strokeWidth="3" strokeLinecap="round" />
    <line x1="30" y1="-5" x2="30" y2="50" stroke="#27272A" strokeWidth="2.5" />
    <line x1="30" y1="-5" x2="30" y2="50" stroke="#3B82F6" strokeWidth="1" strokeOpacity="0.8" />
    <line x1="-5" y1="20" x2="65" y2="20" stroke="#27272A" strokeWidth="2.5" />
    <line x1="-5" y1="20" x2="65" y2="20" stroke="#3B82F6" strokeWidth="1" strokeOpacity="0.8" />
    <circle cx="30" cy="20" r="3.5" fill="#60A5FA" stroke="#1D4ED8" strokeWidth="1" />
  </svg>
)

const OSMMapPreview = () => (
  <svg className="w-full h-full object-cover" viewBox="0 0 60 45" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect width="60" height="45" fill="#F4F3F0" />
    <path d="M0 10C12 8 22 15 32 12C45 8 50 25 60 22V0H0Z" fill="#D8EBCE" />
    <path d="M-5 45C10 38 25 35 32 25C40 12 45 5 65 -5" stroke="#AADAFF" strokeWidth="4" strokeLinecap="round" />
    <line x1="30" y1="-5" x2="30" y2="50" stroke="#FFFFFF" strokeWidth="3" />
    <line x1="30" y1="-5" x2="30" y2="50" stroke="#FBD07C" strokeWidth="1.5" />
    <line x1="-5" y1="20" x2="65" y2="20" stroke="#FFFFFF" strokeWidth="3" />
    <line x1="-5" y1="20" x2="65" y2="20" stroke="#FBD07C" strokeWidth="1.5" />
    <circle cx="30" cy="20" r="3.5" fill="#EF4444" stroke="#FFFFFF" strokeWidth="1" />
  </svg>
)

// Map Tile Layers
const TILE_LAYERS = {
  google_street: {
    name: 'Google Street',
    url: 'https://mt1.google.com/vt/lyrs=m&x={x}&y={y}&z={z}',
    attribution: '&copy; <a href="https://maps.google.com">Google Maps</a>',
  },
  google_hybrid: {
    name: 'Satelit Hybrid',
    url: 'https://mt1.google.com/vt/lyrs=y&x={x}&y={y}&z={z}',
    attribution: '&copy; <a href="https://maps.google.com">Google Maps Satellite</a>',
  },
  carto_dark: {
    name: 'Dark Canvas',
    url: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
    attribution: '&copy; <a href="https://carto.com/">CARTO</a> Dark Canvas',
  },
  osm: {
    name: 'OpenStreetMap',
    url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
  },
}

export function NetworkMapPage() {
  const queryClient = useQueryClient()
  const mapContainerRef = useRef<HTMLDivElement>(null)
  const mapInstanceRef = useRef<any>(null)
  const tileLayerRef = useRef<any>(null)
  const odpLayerRef = useRef<any>(null)
  const customerLayerRef = useRef<any>(null)
  const cableLayerRef = useRef<any>(null)
  const userMarkerRef = useRef<any>(null)

  const [isLeafletLoaded, setIsLeafletLoaded] = useState(false)
  const [mapLayer, setMapLayer] = useState<'google_street' | 'google_hybrid' | 'carto_dark' | 'osm'>('google_street')
  const [showLayerMenu, setShowLayerMenu] = useState(false)
  const [showCableLines, setShowCableLines] = useState(true)
  const [showCustomers, setShowCustomers] = useState(true)
  const [showODPs, setShowODPs] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [isMapZoomActive, setIsMapZoomActive] = useState(false)
  const [userLocation, setUserLocation] = useState<[number, number] | null>(null)

  const [isAddMode, setIsAddMode] = useState(false)
  const [selectedODP, setSelectedODP] = useState<ODP | null>(null)
  const [selectedCustomer, setSelectedCustomer] = useState<Registration | null>(null)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [modalOpen, setModalOpen] = useState(false)
  const [showMapPassword, setShowMapPassword] = useState(false)

  const [gmapsInput, setGmapsInput] = useState('')

  const [formData, setFormData] = useState<{
    id?: string
    code: string
    name: string
    olt_port_config_id: string
    total_ports: number
    latitude: string | number
    longitude: string | number
    address_notes: string
  }>({
    code: '',
    name: '',
    olt_port_config_id: '',
    total_ports: 8,
    latitude: BIREUEN_CENTER[0],
    longitude: BIREUEN_CENTER[1],
    address_notes: '',
  })

  // Load Leaflet CDN script & CSS dynamically if missing
  useEffect(() => {
    if (!document.getElementById('leaflet-css-cdn')) {
      const link = document.createElement('link')
      link.id = 'leaflet-css-cdn'
      link.rel = 'stylesheet'
      link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css'
      document.head.appendChild(link)
    }

    if (window.L) {
      setIsLeafletLoaded(true)
      return
    }

    const script = document.createElement('script')
    script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js'
    script.async = true
    script.onload = () => {
      setIsLeafletLoaded(true)
    }
    document.body.appendChild(script)
  }, [])

  // Fetch ODPs
  const { data: odps = [] } = useQuery({
    queryKey: ['odps'],
    queryFn: csApi.getODPs,
  })

  // Fetch Registrations / Customers
  const { data: regResponse } = useQuery({
    queryKey: ['registrations-map'],
    queryFn: () => csApi.getRegistrations({ per_page: '300' }),
  })
  const registrations = regResponse?.data ?? []

  // Fetch OLT Ports
  const { data: oltPorts = [] } = useQuery({
    queryKey: ['olt-ports'],
    queryFn: ownerApi.getOLTPorts,
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

  // Mutations
  const createODPMut = useMutation({
    mutationFn: csApi.createODP,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['odps'] })
      toast.success('Titik ODP baru berhasil ditambahkan!')
      setModalOpen(false)
      setIsAddMode(false)
      setGmapsInput('')
    },
    onError: (err: any) => {
      const errMsg = err.response?.data?.error?.message || err.response?.data?.message || err.message || 'Gagal menambahkan ODP'
      toast.error(`Gagal Simpan: ${errMsg}`)
    },
  })

  const updateODPMut = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: Partial<ODP> }) => csApi.updateODP(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['odps'] })
      toast.success('Data ODP berhasil diperbarui!')
      setModalOpen(false)
      setSelectedODP(null)
      setGmapsInput('')
    },
    onError: (err: any) => {
      const errMsg = err.response?.data?.error?.message || err.response?.data?.message || err.message || 'Gagal memperbarui ODP'
      toast.error(`Gagal Update: ${errMsg}`)
    },
  })

  const deleteODPMut = useMutation({
    mutationFn: csApi.deleteODP,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['odps'] })
      toast.success('ODP berhasil dihapus')
      setSelectedODP(null)
      setDrawerOpen(false)
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Gagal menghapus ODP')
    },
  })

  // Default Center Priority: ODP > Customer > Bireuen Town Center
  const defaultCenter: [number, number] = useMemo(() => {
    const validODP = odps.find(
      (o) => o && typeof o.latitude === 'number' && !isNaN(o.latitude) && o.latitude !== 0
    )
    if (validODP) return [Number(validODP.latitude), Number(validODP.longitude)]

    const validReg = registrations.find(
      (r) => r && r.MapsLat && r.MapsLng && typeof r.MapsLat === 'number' && !isNaN(r.MapsLat) && r.MapsLat !== 0
    )
    if (validReg && validReg.MapsLat && validReg.MapsLng) return [Number(validReg.MapsLat), Number(validReg.MapsLng)]

    return BIREUEN_CENTER
  }, [odps, registrations])

  // Initialize Map
  useEffect(() => {
    if (!isLeafletLoaded || !mapContainerRef.current || mapInstanceRef.current) return

    const L = window.L
    const map = L.map(mapContainerRef.current, {
      center: defaultCenter,
      zoom: 14,
      zoomControl: false,
      scrollWheelZoom: false, // Disabled by default until clicked
    })

    L.control.zoom({ position: 'bottomright' }).addTo(map)

    const initialLayer = TILE_LAYERS[mapLayer]
    const tileLayer = L.tileLayer(initialLayer.url, {
      maxZoom: 20,
      attribution: initialLayer.attribution,
    }).addTo(map)

    tileLayerRef.current = tileLayer
    odpLayerRef.current = L.layerGroup().addTo(map)
    customerLayerRef.current = L.layerGroup().addTo(map)
    cableLayerRef.current = L.layerGroup().addTo(map)

    // Click to activate scroll zoom
    map.on('click', (e: any) => {
      map.scrollWheelZoom.enable()
      setIsMapZoomActive(true)

      const { lat, lng } = e.latlng
      if ((window as any).__IS_ADD_ODP_MODE) {
        (window as any).__TRIGGER_ADD_ODP(lat, lng)
      }
    })

    // Disable scroll zoom when mouse leaves map canvas
    const container = mapContainerRef.current
    const handleMouseLeave = () => {
      map.scrollWheelZoom.disable()
      setIsMapZoomActive(false)
    }
    container.addEventListener('mouseleave', handleMouseLeave)

    mapInstanceRef.current = map

    // ResizeObserver to invalidate map size automatically when container size changes
    const resizeObserver = new ResizeObserver(() => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.invalidateSize()
      }
    })
    resizeObserver.observe(container)

    setTimeout(() => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.invalidateSize()
      }
    }, 250)

    return () => {
      container.removeEventListener('mouseleave', handleMouseLeave)
      resizeObserver.disconnect()
      map.remove()
      mapInstanceRef.current = null
    }
  }, [isLeafletLoaded])

  // Render User Location Pulsing Dot Marker
  useEffect(() => {
    if (!mapInstanceRef.current || !window.L || !userLocation) return
    const L = window.L

    if (userMarkerRef.current) {
      mapInstanceRef.current.removeLayer(userMarkerRef.current)
    }

    const gpsIcon = L.divIcon({
      className: 'user-gps-marker',
      html: `
        <div class="relative flex items-center justify-center">
          <div class="w-6 h-6 bg-blue-500/30 rounded-full animate-ping absolute"></div>
          <div class="w-4 h-4 bg-blue-600 border-2 border-white rounded-full shadow-lg relative z-10"></div>
        </div>
      `,
      iconSize: [24, 24],
      iconAnchor: [12, 12],
    })

    const marker = L.marker(userLocation, { icon: gpsIcon }).addTo(mapInstanceRef.current)
    marker.bindPopup('<div class="text-xs font-bold text-slate-900">Posisi Perangkat Saat Ini</div>')
    userMarkerRef.current = marker
  }, [userLocation, isLeafletLoaded])

  // Auto-fit bounds if ODPs or Registrations are present
  useEffect(() => {
    if (!mapInstanceRef.current || !window.L) return
    const L = window.L
    const points: [number, number][] = []

    odps.forEach((o) => {
      if (o.latitude && o.longitude && o.latitude !== 0) points.push([o.latitude, o.longitude])
    })
    registrations.forEach((r) => {
      if (r.MapsLat && r.MapsLng && r.MapsLat !== 0) points.push([r.MapsLat, r.MapsLng])
    })

    if (points.length > 0) {
      const bounds = L.latLngBounds(points)
      mapInstanceRef.current.fitBounds(bounds, { padding: [60, 60], maxZoom: 16 })
    }
  }, [odps, registrations])

  // Locate User GPS Handler
  const handleLocateUser = () => {
    if (!('geolocation' in navigator)) {
      toast.error('Browser Anda tidak mendukung Geolocation GPS')
      return
    }
    toast.info('Mendeteksi lokasi perangkat...')
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords
        setUserLocation([latitude, longitude])
        if (mapInstanceRef.current) {
          mapInstanceRef.current.flyTo([latitude, longitude], 17, { duration: 1.5 })
        }
        toast.success('Berhasil terhubung ke lokasi perangkat Anda!')
      },
      () => {
        toast.error('Gagal mengambil lokasi. Mengalihkan ke pusat peta jaringan.')
        if (mapInstanceRef.current) {
          mapInstanceRef.current.flyTo(defaultCenter, 14, { duration: 1.2 })
        }
      },
      { enableHighAccuracy: true, timeout: 8000 }
    )
  }

  // Sync Add Mode Flag
  useEffect(() => {
    ;(window as any).__IS_ADD_ODP_MODE = isAddMode
    ;(window as any).__TRIGGER_ADD_ODP = (lat: number, lng: number) => {
      const nextIndex = odps.length + 1
      const generatedCode = `ODP-BLA-${String(nextIndex).padStart(2, '0')}`
      setFormData({
        code: generatedCode,
        name: generatedCode,
        olt_port_config_id: (oltPorts[0] as any)?.ID || (oltPorts[0] as any)?.id || '',
        total_ports: 8,
        latitude: lat,
        longitude: lng,
        address_notes: '',
      })
      setGmapsInput(`https://maps.google.com/?q=${lat},${lng}`)
      setSelectedODP(null)
      setModalOpen(true)
    }
  }, [isAddMode, odps, oltPorts])

  // Update Tile Layer
  useEffect(() => {
    if (!mapInstanceRef.current || !tileLayerRef.current || !window.L) return
    const config = TILE_LAYERS[mapLayer]
    tileLayerRef.current.setUrl(config.url)
  }, [mapLayer])

  // Render ODP Markers
  useEffect(() => {
    if (!mapInstanceRef.current || !odpLayerRef.current || !window.L) return
    const L = window.L
    const group = odpLayerRef.current
    group.clearLayers()

    if (!showODPs) return

    odps.forEach((odp) => {
      if (odp.latitude === 0 || odp.longitude === 0) return

      const percent = odp.total_ports > 0 ? (odp.used_ports / odp.total_ports) * 100 : 0
      let ringColor = '#6366f1' // Indigo default for general ODPs
      if (percent >= 100) {
        ringColor = '#ef4444' // Red when fully loaded
      } else if (percent >= 75) {
        ringColor = '#f97316' // Orange when close to full
      }

      const customIcon = L.divIcon({
        className: 'custom-odp-marker',
        html: `
          <div class="relative flex flex-col items-center cursor-pointer group" style="filter: drop-shadow(0 4px 10px ${ringColor}44)">
            <div class="px-2.5 py-1.5 rounded-xl bg-slate-950/90 text-white text-[11px] font-semibold border border-slate-700 flex items-center gap-1.5 whitespace-nowrap shadow-xl transition-all duration-200 group-hover:scale-105 group-hover:border-slate-500">
              <div class="w-2 h-2 rounded-full animate-pulse" style="background: ${ringColor}; box-shadow: 0 0 6px ${ringColor}"></div>
              <span class="tracking-wide text-slate-200 font-bold">${odp.code}</span>
              <span class="text-[9px] text-slate-400 bg-slate-800 px-1.5 py-0.5 rounded-md font-mono">${odp.used_ports}/${odp.total_ports}</span>
            </div>
            <div class="w-0.5 h-1.5 bg-slate-700"></div>
            <div class="relative flex items-center justify-center">
              <div style="width:24px;height:24px;border-radius:50%;background:${ringColor}15;border:1.5px solid ${ringColor}44;animation:ping 2s cubic-bezier(0,0,0.2,1) infinite;position:absolute"></div>
              <div class="w-3.5 h-3.5 bg-slate-900 border-2 border-white rounded-full flex items-center justify-center shadow-md z-10" style="border-color: ${ringColor}">
                <div class="w-1.5 h-1.5 rounded-full" style="background: ${ringColor}"></div>
              </div>
            </div>
          </div>
        `,
        iconSize: [100, 48],
        iconAnchor: [50, 42],
      })

      const marker = L.marker([odp.latitude, odp.longitude], { icon: customIcon })
      marker.on('click', () => {
        setSelectedODP(odp)
        setSelectedCustomer(null)
        setDrawerOpen(true)
      })
      group.addLayer(marker)
    })
  }, [odps, showODPs, isLeafletLoaded])

  // Filtered Customers & Search
  const filteredCustomers = useMemo(() => {
    const validWithCoords = registrations.filter((r) => r.MapsLat && r.MapsLng && r.MapsLat !== 0)
    if (!searchQuery) return validWithCoords
    const q = searchQuery.toLowerCase()
    return validWithCoords.filter(
      (r) =>
        r.FullName.toLowerCase().includes(q) ||
        r.RegNumber.toLowerCase().includes(q) ||
        (r.CustomerNumber && r.CustomerNumber.toLowerCase().includes(q))
    )
  }, [registrations, searchQuery])

  const filteredODPs = useMemo(() => {
    if (!searchQuery) return odps
    const q = searchQuery.toLowerCase()
    return odps.filter((o) => o.code.toLowerCase().includes(q) || o.name.toLowerCase().includes(q))
  }, [odps, searchQuery])

  // Render Customer Markers
  useEffect(() => {
    if (!mapInstanceRef.current || !customerLayerRef.current || !window.L) return
    const L = window.L
    const group = customerLayerRef.current
    group.clearLayers()

    if (!showCustomers) return

    filteredCustomers.forEach((cust) => {
      if (!cust.MapsLat || !cust.MapsLng) return

      const connInfo = (activeConns || []).find(
        (c: any) => (c.name || c.Name || '').toLowerCase() === (cust.PPPoEUsername || '').toLowerCase()
      )
      const isOnline = Boolean(cust.Status === 'active' && connInfo)

      let colorClass = 'bg-rose-500 border-rose-300' // Red for Offline / LOS / Isolir / Pending / Survey
      let dotGlowColor = '#ef4444'

      if (isOnline) {
        colorClass = 'bg-emerald-500 border-emerald-300' // Green / Hidup / Online
        dotGlowColor = '#10b981'
      }

      const pulseAnim = isOnline
        ? 'animation:ping 2s cubic-bezier(0,0,0.2,1) infinite;'
        : ''

      const customIcon = L.divIcon({
        className: 'custom-customer-marker',
        html: `
          <div class="relative flex flex-col items-center group cursor-pointer" style="filter:drop-shadow(0 2px 8px ${dotGlowColor}66)">
            <div class="w-7 h-7 rounded-full ${colorClass} border-2 text-white flex items-center justify-center shadow-lg transition-all duration-200 group-hover:scale-115" style="box-shadow:0 0 12px ${dotGlowColor}55">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
            </div>
            ${isOnline ? `<div style="position:absolute;top:-2px;left:-2px;width:32px;height:32px;border-radius:50%;border:2px solid ${dotGlowColor};opacity:0.6;${pulseAnim}"></div>` : ''}
          </div>
        `,
        iconSize: [32, 32],
        iconAnchor: [16, 16],
      })

      const marker = L.marker([cust.MapsLat, cust.MapsLng], { icon: customIcon })
      marker.on('click', () => {
        setSelectedCustomer(cust)
        setSelectedODP(null)
        setDrawerOpen(true)
      })
      group.addLayer(marker)
    })
  }, [filteredCustomers, showCustomers, isLeafletLoaded, activeConns])

  // Inject CSS animations for fiber lines (once)
  useEffect(() => {
    if (document.getElementById('fiber-line-styles')) return
    const style = document.createElement('style')
    style.id = 'fiber-line-styles'
    style.textContent = `
      @keyframes ping {
        75%, 100% { transform: scale(2); opacity: 0; }
      }
      @keyframes fiber-flow {
        0%   { stroke-dashoffset: 24; }
        100% { stroke-dashoffset: 0; }
      }
      @keyframes fiber-flow-slow {
        0%   { stroke-dashoffset: 32; }
        100% { stroke-dashoffset: 0; }
      }
      @keyframes fiber-pulse {
        0%, 100% { opacity: 0.9; }
        50%       { opacity: 0.45; }
      }
      @keyframes dot-travel {
        0%   { stroke-dashoffset: 1000; }
        100% { stroke-dashoffset: 0; }
      }
      .fiber-line-active {
        animation: fiber-flow 0.55s linear infinite, fiber-pulse 2s ease-in-out infinite;
      }
      .fiber-line-inactive {
        animation: fiber-flow-slow 1.2s linear infinite;
      }
      .fiber-line-offline {
        stroke-dasharray: 6, 6;
        animation: fiber-pulse 3.5s ease-in-out infinite;
      }
      .fiber-dot-active {
        animation: dot-travel 3.5s linear infinite;
      }
      .fiber-dot-inactive {
        animation: dot-travel 8s linear infinite;
      }
      .fiber-dot-offline {
        display: none;
      }
      /* Remove default Leaflet marker shadow/border */
      .custom-odp-marker, .custom-customer-marker {
        background: transparent !important;
        border: none !important;
      }
      .leaflet-div-icon {
        background: transparent !important;
        border: none !important;
      }
    `
    document.head.appendChild(style)
  }, [])

  // Render Animated Fiber/Cable Lines between ODP and Customer
  useEffect(() => {
    if (!mapInstanceRef.current || !cableLayerRef.current || !window.L) return
    const L = window.L
    const group = cableLayerRef.current
    group.clearLayers()

    if (!showCableLines) return

    registrations.forEach((reg) => {
      if (!reg.MapsLat || !reg.MapsLng) return

      // Match ODP by ODPInfo code, or by shared OLTPortConfigID as fallback
      let odp = odps.find((o) => {
        if (reg.ODPInfo) {
          const ri = reg.ODPInfo.trim().toLowerCase()
          const oc = o.code.trim().toLowerCase()
          return ri === oc || ri.startsWith(oc + '/') || ri.startsWith(oc + '-') || ri.startsWith(oc + ' ')
        }
        return false
      })
      if (!odp) {
        odp = odps.find((o) => reg.OLTPortConfigID && o.olt_port_config_id === reg.OLTPortConfigID)
      }
      if (!odp || odp.latitude === 0 || odp.longitude === 0) return

      const connInfo = (activeConns || []).find(
        (c: any) => (c.name || c.Name || '').toLowerCase() === (reg.PPPoEUsername || '').toLowerCase()
      )
      const isOnline = Boolean(reg.Status === 'active' && connInfo)

      let lineColor = '#ef4444'     // red default for non-online (LOS / offline / isolir)
      let glowColor = '#f87171'
      let dotColor  = '#fef2f2'
      let lineClass = 'fiber-line-offline'
      let dotClass  = 'fiber-dot-offline'

      if (isOnline) {
        lineColor = '#06b6d4'     // vibrant cyan for online (replaces green)
        glowColor = '#22d3ee'
        dotColor  = '#ecfeff'
        lineClass = 'fiber-line-active'
        dotClass  = 'fiber-dot-active'
      }

      // ── Main animated polyline (dashed flow) ─────────────────────────────
      const mainLine = L.polyline(
        [[odp.latitude, odp.longitude], [reg.MapsLat, reg.MapsLng]],
        {
          color: lineColor,
          weight: 2.5,
          opacity: 0.85,
          dashArray: '8, 6',
          className: lineClass,
        }
      )
      group.addLayer(mainLine)

      // ── Glow underlay (thicker, semi-transparent) ─────────────────────────
      const glowLine = L.polyline(
        [[odp.latitude, odp.longitude], [reg.MapsLat, reg.MapsLng]],
        {
          color: glowColor,
          weight: 7,
          opacity: 0.15,
          dashArray: undefined,
        }
      )
      // Insert glow below main line
      group.addLayer(glowLine)
      glowLine.bringToBack()

      // ── Traveling particle dot along the line ─────────────────────────────
      // Approximate path length in pixels for dasharray trick
      const pathLen = mapInstanceRef.current
        ? (() => {
            try {
              const p1 = mapInstanceRef.current.latLngToLayerPoint(L.latLng(odp.latitude, odp.longitude))
              const p2 = mapInstanceRef.current.latLngToLayerPoint(L.latLng(reg.MapsLat, reg.MapsLng))
              const dx = p2.x - p1.x; const dy = p2.y - p1.y
              return Math.sqrt(dx * dx + dy * dy)
            } catch { return 200 }
          })()
        : 200

      const dotLine = L.polyline(
        [[odp.latitude, odp.longitude], [reg.MapsLat, reg.MapsLng]],
        {
          color: dotColor,
          weight: 4,
          opacity: 1,
          dashArray: `4 ${Math.max(pathLen - 4, 10)}`,
          className: dotClass,
        }
      )
      group.addLayer(dotLine)

      // ── Click interaction: highlight by flying to midpoint ────────────────
      mainLine.on('click', () => {
        const midLat = (odp.latitude + (reg.MapsLat ?? 0)) / 2
        const midLng = (odp.longitude + (reg.MapsLng ?? 0)) / 2
        mapInstanceRef.current?.flyTo([midLat, midLng], 17, { duration: 0.8 })
        setSelectedCustomer(reg)
        setSelectedODP(null)
        setDrawerOpen(true)
      })
    })
  }, [registrations, odps, showCableLines, isLeafletLoaded, activeConns])

  // Fly To Helper
  const flyToLocation = (lat: number, lng: number) => {
    if (mapInstanceRef.current) {
      mapInstanceRef.current.flyTo([lat, lng], 18, { duration: 1.2 })
    }
  }

  const handleEditODP = (odp: ODP) => {
    setFormData({
      id: odp.id,
      code: odp.code,
      name: odp.name,
      olt_port_config_id: odp.olt_port_config_id || '',
      total_ports: odp.total_ports,
      latitude: odp.latitude,
      longitude: odp.longitude,
      address_notes: odp.address_notes || '',
    })
    setGmapsInput(`https://maps.google.com/?q=${odp.latitude},${odp.longitude}`)
    setSelectedODP(odp)
    setModalOpen(true)
  }

  // Handle Google Maps Link / Coords Paste Input
  const handleGmapsInputChange = (val: string) => {
    setGmapsInput(val)
    const parsed = parseGoogleMapsUrl(val)
    if (parsed) {
      setFormData((prev) => ({
        ...prev,
        latitude: parsed.lat,
        longitude: parsed.lng,
      }))
      toast.success(`Koordinat terdeteksi: ${parsed.lat.toFixed(5)}, ${parsed.lng.toFixed(5)}`)
    }
  }

  const handleSubmitForm = (e: React.FormEvent) => {
    e.preventDefault()

    const lat = parseCoord(formData.latitude)
    const lng = parseCoord(formData.longitude)

    if (lat === 0 || lng === 0) {
      toast.error('Koordinat Latitude & Longitude harus diisi dengan angka yang valid!')
      return
    }

    const payload = {
      code: formData.code.trim(),
      name: (formData.name || formData.code).trim(),
      olt_port_config_id: formData.olt_port_config_id && formData.olt_port_config_id.trim() !== '' ? formData.olt_port_config_id : null,
      total_ports: Number(formData.total_ports) || 8,
      latitude: lat,
      longitude: lng,
      address_notes: formData.address_notes.trim(),
    }

    if (formData.id) {
      updateODPMut.mutate({
        id: formData.id,
        payload,
      })
    } else {
      createODPMut.mutate(payload)
    }
  }

  // Connected Customers to selected ODP
  const connectedCustomersToSelectedODP = useMemo(() => {
    if (!selectedODP) return []
    return registrations.filter(
      (r) => {
        if (!r.ODPInfo) return false
        const ri = r.ODPInfo.trim().toLowerCase()
        const oc = selectedODP.code.trim().toLowerCase()
        const on = selectedODP.name.trim().toLowerCase()
        return ri === oc || ri === on || ri.startsWith(oc + '/') || ri.startsWith(oc + '-') || ri.startsWith(oc + ' ') || ri.startsWith(on + '/') || ri.startsWith(on + '-') || ri.startsWith(on + ' ')
      }
    )
  }, [selectedODP, registrations])

  return (
    <div className="flex flex-col h-full w-full bg-slate-50 dark:bg-zinc-950 text-slate-900 dark:text-zinc-100 overflow-hidden relative font-sans">
      {/* ── UNIFIED SLIM TOP BAR (LIGHT / DARK THEMED) ──────────────────────────── */}
      <div className="bg-white/95 dark:bg-zinc-900/95 backdrop-blur-md border-b border-slate-200 dark:border-zinc-800 p-3 md:px-4 md:py-2.5 z-20 flex flex-col md:flex-row md:items-center justify-between gap-3 shadow-sm transition-colors">
        {/* Title & Quick Stats */}
        <div className="flex items-center justify-between w-full md:w-auto gap-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-blue-50 dark:bg-blue-600/20 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-500/30 rounded-lg flex-shrink-0">
              <Compass className="w-4 h-4" />
            </div>
            <div>
              <h1 className="text-xs md:text-sm font-bold text-slate-900 dark:text-white leading-tight">
                Peta Sebaran Jaringan & ODP
              </h1>
              <div className="flex items-center gap-2 text-[10px] md:text-[11px] text-slate-500 dark:text-zinc-400 mt-0.5">
                <span>ODP: <strong className="text-amber-600 dark:text-amber-400">{odps.length}</strong></span>
                <span>•</span>
                <span>Mapped: <strong className="text-emerald-600 dark:text-emerald-400">{filteredCustomers.length}</strong></span>
              </div>
            </div>
          </div>

          {/* Add ODP Button (Mobile Only) */}
          <button
            onClick={() => setIsAddMode(!isAddMode)}
            className={`md:hidden px-2.5 py-1.5 rounded-lg text-[11px] font-bold flex items-center gap-1 border transition-all ${
              isAddMode
                ? 'bg-amber-500 hover:bg-amber-600 text-zinc-950 border-amber-400'
                : 'bg-blue-600 hover:bg-blue-700 text-white border-blue-500 shadow-xs'
            }`}
          >
            {isAddMode ? <X className="w-3 h-3" /> : <Plus className="w-3 h-3" />}
            {isAddMode ? 'Batal' : '+ ODP'}
          </button>
        </div>

        {/* Search & Controls Wrapper */}
        <div className="flex items-center gap-2 w-full md:w-auto">
          {/* Center Search Input */}
          <div className="relative flex-1 md:w-64 lg:w-80">
            <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400 dark:text-zinc-400" />
            <input
              type="text"
              placeholder="Cari ODP atau Pelanggan..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-100 dark:bg-zinc-950 border border-slate-300 dark:border-zinc-800 rounded-xl pl-8 pr-7 py-1.5 text-xs text-slate-900 dark:text-zinc-100 placeholder-slate-400 dark:placeholder-zinc-500 focus:outline-none focus:border-blue-500 transition-colors"
            />
            {searchQuery && (
              <button onClick={() => setSearchQuery('')} className="absolute right-2.5 top-2.5 text-slate-400 dark:text-zinc-500 hover:text-slate-600 dark:hover:text-zinc-300">
                <X className="w-3.5 h-3.5" />
              </button>
            )}

            {/* Search Dropdown Results */}
            {searchQuery && (
              <div className="absolute top-10 left-0 right-0 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-xl shadow-2xl z-50 max-h-64 overflow-y-auto p-1.5 space-y-1 text-xs">
                {filteredODPs.length > 0 && (
                  <div>
                    <div className="text-[10px] font-bold text-slate-400 dark:text-zinc-500 uppercase px-2 py-1">ODP ({filteredODPs.length})</div>
                    {filteredODPs.map((odp) => (
                      <div
                        key={odp.id}
                        onClick={() => {
                          setSelectedODP(odp)
                          setSelectedCustomer(null)
                          setDrawerOpen(true)
                          flyToLocation(odp.latitude, odp.longitude)
                          setSearchQuery('')
                        }}
                        className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-zinc-800 cursor-pointer flex items-center justify-between text-slate-800 dark:text-zinc-200"
                      >
                        <span className="font-semibold text-amber-600 dark:text-amber-400">{odp.code}</span>
                        <span className="text-[10px] text-slate-500 dark:text-zinc-400">{odp.used_ports}/{odp.total_ports} Port</span>
                      </div>
                    ))}
                  </div>
                )}

                {filteredCustomers.length > 0 && (
                  <div>
                    <div className="text-[10px] font-bold text-slate-400 dark:text-zinc-500 uppercase px-2 py-1 border-t border-slate-200 dark:border-zinc-800 pt-1 mt-1">Pelanggan ({filteredCustomers.length})</div>
                    {filteredCustomers.map((cust) => (
                      <div
                        key={cust.ID}
                        onClick={() => {
                          setSelectedCustomer(cust)
                          setSelectedODP(null)
                          setDrawerOpen(true)
                          if (cust.MapsLat && cust.MapsLng) flyToLocation(cust.MapsLat, cust.MapsLng)
                          setSearchQuery('')
                        }}
                        className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-zinc-800 cursor-pointer flex items-center justify-between text-slate-800 dark:text-zinc-200"
                      >
                        <span className="font-medium text-emerald-600 dark:text-emerald-400">{cust.FullName}</span>
                        <span className="text-[10px] text-slate-500 dark:text-zinc-500">{cust.CustomerNumber || cust.RegNumber}</span>
                      </div>
                    ))}
                  </div>
                )}

                {filteredODPs.length === 0 && filteredCustomers.length === 0 && (
                  <div className="p-3 text-center text-xs text-slate-400 dark:text-zinc-500">Tidak ada hasil ditemukan</div>
                )}
              </div>
            )}
          </div>

          {/* Quick Visibility Toggles */}
          <div className="flex items-center bg-slate-100 dark:bg-zinc-950 p-1 rounded-xl border border-slate-200 dark:border-zinc-800 gap-1 flex-shrink-0">
            <button
              onClick={() => setShowODPs(!showODPs)}
              className={`p-1.5 rounded-lg text-xs transition-colors flex items-center gap-1.5 ${
                showODPs ? 'bg-white dark:bg-zinc-800 text-amber-600 dark:text-amber-400 shadow-xs' : 'text-slate-400 dark:text-zinc-600 hover:text-slate-600 dark:hover:text-zinc-400'
              }`}
              title="Toggle Marker ODP"
            >
              <Building2 className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setShowCustomers(!showCustomers)}
              className={`p-1.5 rounded-lg text-xs transition-colors flex items-center gap-1.5 ${
                showCustomers ? 'bg-white dark:bg-zinc-800 text-emerald-600 dark:text-emerald-400 shadow-xs' : 'text-slate-400 dark:text-zinc-600 hover:text-slate-600 dark:hover:text-zinc-400'
              }`}
              title="Toggle Marker Pelanggan"
            >
              <MapPin className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setShowCableLines(!showCableLines)}
              className={`p-1.5 rounded-lg text-xs transition-colors flex items-center gap-1.5 ${
                showCableLines ? 'bg-white dark:bg-zinc-800 text-blue-600 dark:text-blue-400 shadow-xs' : 'text-slate-400 dark:text-zinc-600 hover:text-slate-600 dark:hover:text-zinc-400'
              }`}
              title="Toggle Garis Fiber Optik"
            >
              <Cable className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Add ODP Button (Desktop Only) */}
          <button
            onClick={() => setIsAddMode(!isAddMode)}
            className={`hidden md:flex px-3 py-1.5 rounded-xl text-xs font-semibold items-center gap-1.5 border transition-all flex-shrink-0 ${
              isAddMode
                ? 'bg-amber-500 hover:bg-amber-600 text-zinc-950 border-amber-400 animate-pulse'
                : 'bg-blue-600 hover:bg-blue-700 text-white border-blue-500 shadow-xs'
            }`}
          >
            {isAddMode ? <X className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
            {isAddMode ? 'Batal' : '+ Tambah ODP'}
          </button>
        </div>
      </div>

      {/* ── ACTIVE MODE FLOATING TOP TOAST ──────────────────────────── */}
      {isAddMode && (
        <div className="absolute top-16 left-1/2 -translate-x-1/2 z-30 bg-amber-500 text-zinc-950 border border-amber-400 font-bold px-4 py-2 rounded-full shadow-2xl text-xs flex items-center gap-2 animate-bounce">
          <MapPin className="w-4 h-4" />
          <span>Mode Tambah ODP Aktif — Klik titik lokasi di mana saja pada peta!</span>
          <button onClick={() => setIsAddMode(false)} className="ml-2 p-0.5 rounded-full hover:bg-amber-600 text-zinc-950">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* ── CLEAN CENTERED MAP SCROLL ZOOM OVERLAY HINT ──────────────────────────── */}
      {!isMapZoomActive && !isAddMode && (
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-20 bg-zinc-900/85 text-zinc-200 backdrop-blur-md border border-zinc-700/50 px-5 py-2.5 rounded-full text-xs font-medium shadow-2xl pointer-events-none transition-all duration-300 tracking-wide">
          Klik pada peta untuk mengaktifkan scroll zoom
        </div>
      )}

      {/* ── MAIN MAP CANVAS CONTAINER ──────────────────────────── */}
      <div className={`flex-1 w-full relative z-0 ${drawerOpen ? 'mobile-drawer-open' : ''}`}>
        <div ref={mapContainerRef} className="absolute inset-0 w-full h-full bg-slate-100 dark:bg-zinc-950" />

        {/* Floating Google Maps-like Layer Selector */}
        <div className={`absolute left-4 z-[1000] flex flex-col items-start transition-all duration-300 ${drawerOpen ? 'bottom-[47vh] md:bottom-5' : 'bottom-5'}`}>
          {showLayerMenu ? (
            <div className="bg-white/95 dark:bg-zinc-900/95 backdrop-blur-md p-3 rounded-2xl shadow-2xl border border-slate-200/80 dark:border-zinc-800/80 flex flex-col gap-2.5 transition-all animate-in fade-in slide-in-from-bottom-2 duration-200">
              <div className="flex items-center justify-between border-b border-slate-150 dark:border-zinc-850 pb-1.5 mb-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-zinc-500">Tampilan Peta</span>
                <button
                  onClick={() => setShowLayerMenu(false)}
                  className="p-0.5 rounded-full hover:bg-slate-100 dark:hover:bg-zinc-800 text-slate-400 hover:text-slate-600 dark:hover:text-zinc-300 cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
              <div className="flex gap-2">
                {(['google_street', 'google_hybrid', 'carto_dark', 'osm'] as const).map((layerKey) => {
                  const isActive = mapLayer === layerKey

                  return (
                    <button
                      key={layerKey}
                      onClick={() => setMapLayer(layerKey)}
                      className="flex flex-col items-center gap-1 group cursor-pointer focus:outline-none"
                    >
                      <div
                        className={`w-[60px] h-[45px] rounded-xl border-2 transition-all shadow-xs relative overflow-hidden flex items-center justify-center ${
                          isActive
                            ? 'border-blue-600 ring-2 ring-blue-600/25 scale-102 shadow-md'
                            : 'border-slate-200 dark:border-zinc-800 group-hover:border-slate-400 dark:group-hover:border-zinc-700 group-hover:scale-102'
                        }`}
                      >
                        {layerKey === 'google_street' && <StreetMapPreview />}
                        {layerKey === 'google_hybrid' && <SatelliteMapPreview />}
                        {layerKey === 'carto_dark' && <DarkMapPreview />}
                        {layerKey === 'osm' && <OSMMapPreview />}
                        
                        <div className="absolute inset-0 bg-black/10 group-hover:bg-black/0 transition-colors" />

                        <span className="absolute bottom-1 right-1 text-[9px] font-bold text-white bg-black/60 px-1 py-0.5 rounded-md backdrop-blur-xs scale-90">
                          {layerKey === 'google_street' ? 'Peta' : layerKey === 'google_hybrid' ? 'Satelit' : layerKey === 'carto_dark' ? 'Gelap' : 'OSM'}
                        </span>
                      </div>
                      <span className={`text-[10px] font-medium tracking-wide ${isActive ? 'text-blue-600 dark:text-blue-400 font-bold' : 'text-slate-600 dark:text-zinc-400'}`}>
                        {TILE_LAYERS[layerKey].name.split(' ')[0]}
                      </span>
                    </button>
                  )
                })}
              </div>
            </div>
          ) : (
            <button
              onClick={() => setShowLayerMenu(true)}
              className="w-10 h-10 rounded-full bg-white dark:bg-zinc-900 shadow-lg border border-slate-200 dark:border-zinc-800 flex items-center justify-center text-slate-700 dark:text-zinc-200 hover:bg-slate-50 dark:hover:bg-zinc-800 hover:scale-105 active:scale-95 transition-all cursor-pointer"
              title="Pilih Tampilan Peta"
            >
              <Layers className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Floating Google Maps-like GPS Button */}
        <button
          onClick={handleLocateUser}
          className={`absolute right-3.5 z-[1000] w-10 h-10 rounded-full bg-white dark:bg-zinc-900 shadow-lg border border-slate-200 dark:border-zinc-800 flex items-center justify-center text-slate-700 dark:text-zinc-200 hover:bg-slate-50 dark:hover:bg-zinc-800 hover:scale-105 active:scale-95 transition-all cursor-pointer transition-all duration-300 ${
            drawerOpen ? 'bottom-[56vh] md:bottom-28' : 'bottom-28'
          }`}
          title="Pusatkan Peta ke Lokasi Perangkat Saya"
        >
          <Locate className="w-5 h-5" />
        </button>
      </div>

      {/* ── RIGHT SLIDE-OVER INSPECTOR DRAWER ──────────────────────────── */}
      {drawerOpen && (selectedODP || selectedCustomer) && (
        <div className="absolute z-30 transition-all duration-300 md:top-16 md:right-4 md:bottom-4 md:w-80 md:rounded-2xl bottom-0 left-0 right-0 w-full h-[45vh] md:h-auto rounded-t-3xl rounded-b-none bg-white/95 dark:bg-zinc-900/95 backdrop-blur-md border-t md:border border-slate-200 dark:border-zinc-800 shadow-2xl flex flex-col overflow-hidden text-slate-900 dark:text-zinc-100 animate-in slide-in-from-bottom md:slide-in-from-right duration-200">
          <div className="p-4 border-b border-slate-200 dark:border-zinc-800 flex items-center justify-between bg-slate-50 dark:bg-zinc-950">
            <div className="flex items-center gap-2">
              {selectedODP ? <Building2 className="w-4 h-4 text-amber-500" /> : <MapPin className="w-4 h-4 text-emerald-500" />}
              <h3 className="font-bold text-slate-900 dark:text-white text-xs uppercase tracking-wider">
                {selectedODP ? 'Detail Titik ODP' : 'Detail Pelanggan'}
              </h3>
            </div>
            <button onClick={() => setDrawerOpen(false)} className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-zinc-800 text-slate-400 dark:text-zinc-400">
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="p-4 overflow-y-auto flex-1 space-y-4 text-xs">
            {/* ODP Inspector Details */}
            {selectedODP && (
              <>
                <div className="p-3 bg-slate-50 dark:bg-zinc-950 rounded-xl border border-slate-200 dark:border-zinc-800/80 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-900 dark:text-white text-sm">{selectedODP.code}</span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-500/20 text-amber-600 dark:text-amber-400">
                      {selectedODP.used_ports} / {selectedODP.total_ports} Port
                    </span>
                  </div>
                  <p className="text-slate-500 dark:text-zinc-400 text-xs">{selectedODP.name}</p>

                  <div className="w-full bg-slate-200 dark:bg-zinc-800 rounded-full h-1.5 overflow-hidden mt-2">
                    <div
                      className={`h-1.5 rounded-full ${
                        selectedODP.used_ports >= selectedODP.total_ports
                          ? 'bg-rose-500'
                          : selectedODP.used_ports >= selectedODP.total_ports * 0.75
                          ? 'bg-amber-500'
                          : 'bg-emerald-500'
                      }`}
                      style={{ width: `${Math.min(100, (selectedODP.used_ports / selectedODP.total_ports) * 100)}%` }}
                    />
                  </div>
                </div>

                <div className="space-y-2 text-slate-700 dark:text-zinc-300">
                  <div className="flex justify-between py-1 border-b border-slate-200 dark:border-zinc-800">
                    <span className="text-slate-400 dark:text-zinc-500">Koordinat:</span>
                    <span className="font-mono text-slate-900 dark:text-zinc-200">{selectedODP.latitude.toFixed(5)}, {selectedODP.longitude.toFixed(5)}</span>
                  </div>

                  {/* Google Maps Link Button */}
                  <div className="py-1 border-b border-slate-200 dark:border-zinc-800">
                    <a
                      href={`https://maps.google.com/?q=${selectedODP.latitude},${selectedODP.longitude}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 text-blue-600 dark:text-blue-400 font-medium hover:underline text-[11px]"
                    >
                      <ExternalLink className="w-3.5 h-3.5" /> Buka di Google Maps
                    </a>
                  </div>

                  {selectedODP.address_notes && (
                    <div className="py-1 border-b border-slate-200 dark:border-zinc-800">
                      <span className="text-slate-400 dark:text-zinc-500 block mb-0.5">Catatan Lokasi:</span>
                      <p className="text-slate-700 dark:text-zinc-300 italic">{selectedODP.address_notes}</p>
                    </div>
                  )}
                </div>

                {/* Connected Customers */}
                <div>
                  <h4 className="font-bold text-slate-400 dark:text-zinc-400 text-[11px] uppercase tracking-wider mb-2">
                    Pelanggan Terhubung ({connectedCustomersToSelectedODP.length})
                  </h4>
                  <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                    {connectedCustomersToSelectedODP.length === 0 ? (
                      <p className="text-slate-400 dark:text-zinc-500 italic text-[11px]">Belum ada pelanggan terdaftar di ODP ini</p>
                    ) : (
                      connectedCustomersToSelectedODP.map((c) => (
                        <div key={c.ID} className="p-2 rounded-lg bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 flex items-center justify-between">
                          <div>
                            <p className="font-bold text-slate-800 dark:text-zinc-200">{c.FullName}</p>
                            <p className="text-[10px] text-slate-400 dark:text-zinc-500">{c.CustomerNumber || c.RegNumber}</p>
                          </div>
                          <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400">{c.Status}</span>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-200 dark:border-zinc-800 flex gap-2">
                  <button
                    onClick={() => handleEditODP(selectedODP)}
                    className="flex-1 py-2 rounded-xl bg-blue-50 dark:bg-blue-600/20 hover:bg-blue-100 dark:hover:bg-blue-600/30 text-blue-600 dark:text-blue-400 font-semibold flex items-center justify-center gap-1.5 border border-blue-200 dark:border-blue-500/30"
                  >
                    <Edit2 className="w-3.5 h-3.5" /> Edit ODP
                  </button>
                  <button
                    onClick={() => {
                      if (confirm(`Hapus ODP ${selectedODP.code}?`)) deleteODPMut.mutate(selectedODP.id)
                    }}
                    disabled={deleteODPMut.isPending}
                    className="py-2 px-3 rounded-xl bg-rose-50 dark:bg-rose-600/20 hover:bg-rose-100 dark:hover:bg-rose-600/30 text-rose-600 dark:text-rose-400 font-semibold border border-rose-200 dark:border-rose-500/30 disabled:opacity-50 transition-all"
                  >
                    {deleteODPMut.isPending ? 'Menghapus...' : <Trash2 className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </>
            )}

            {/* Customer Inspector Details */}
            {selectedCustomer && (() => {
              const connInfo = (activeConns || []).find(
                (c: any) => (c.name || c.Name || '').toLowerCase() === (selectedCustomer.PPPoEUsername || '').toLowerCase()
              )
              const liveIP = connInfo ? (connInfo.address || connInfo.Address || '-') : '-'
              const liveUptime = connInfo ? (connInfo.uptime || connInfo.Uptime || '-') : '-'
              
              const isIsolir = selectedCustomer.Status === 'isolir'
              const isOnline = Boolean(selectedCustomer.Status === 'active' && connInfo)
              const isOffline = Boolean(selectedCustomer.Status === 'active' && !connInfo)
              
              return (
                <>
                  <div className="p-3 bg-slate-50 dark:bg-zinc-950 rounded-xl border border-slate-200 dark:border-zinc-800 space-y-1">
                    <div className="flex items-center gap-1.5">
                      {isIsolir ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/20 text-amber-600 dark:text-amber-400">
                          <ShieldAlert className="w-3 h-3" /> Isolir (Offline)
                        </span>
                      ) : isOnline ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-600 dark:text-emerald-400">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" /> Online
                        </span>
                      ) : isOffline ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-rose-500/20 text-rose-600 dark:text-rose-450">
                          <span className="w-1.5 h-1.5 rounded-full bg-rose-500" /> Offline / LOS
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-slate-500/20 text-slate-600 dark:text-slate-400">
                          {selectedCustomer.Status}
                        </span>
                      )}
                    </div>
                    <h4 className="font-bold text-slate-900 dark:text-white text-sm mt-1">{selectedCustomer.FullName}</h4>
                    <p className="text-slate-500 dark:text-zinc-400 text-xs">ID: {selectedCustomer.CustomerNumber || selectedCustomer.RegNumber}</p>
                  </div>

                  <div className="space-y-2 text-slate-700 dark:text-zinc-300">
                    <div className="flex justify-between py-1 border-b border-slate-200 dark:border-zinc-800">
                      <span className="text-slate-400 dark:text-zinc-500">No Telepon:</span>
                      <span className="font-medium text-slate-800 dark:text-zinc-200">{selectedCustomer.Phone}</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-slate-200 dark:border-zinc-800">
                      <span className="text-slate-400 dark:text-zinc-500">Terhubung ODP:</span>
                      <span className="font-bold text-blue-600 dark:text-blue-400">{selectedCustomer.ODPInfo || 'Belum Terhubung'}</span>
                    </div>
                    {selectedCustomer.PPPoEUsername && (
                      <>
                        <div className="flex justify-between py-1 border-b border-slate-200 dark:border-zinc-800">
                          <span className="text-slate-400 dark:text-zinc-500">User PPPoE:</span>
                          <span className="font-mono text-slate-800 dark:text-zinc-200">{selectedCustomer.PPPoEUsername}</span>
                        </div>
                        {selectedCustomer.PPPoEPassword && (
                          <div className="flex justify-between py-1 border-b border-slate-200 dark:border-zinc-800 items-center">
                            <span className="text-slate-400 dark:text-zinc-500 flex items-center gap-1">Password PPPoE:</span>
                            <div className="flex items-center gap-1.5 font-mono text-slate-800 dark:text-zinc-200">
                              <span>{showMapPassword ? selectedCustomer.PPPoEPassword : '••••••••'}</span>
                              <button
                                type="button"
                                onClick={() => setShowMapPassword(!showMapPassword)}
                                className="text-slate-400 hover:text-slate-600 dark:hover:text-white"
                              >
                                {showMapPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                              </button>
                            </div>
                          </div>
                        )}
                        <div className="flex justify-between py-1 border-b border-slate-200 dark:border-zinc-800">
                          <span className="text-slate-400 dark:text-zinc-500 flex items-center gap-1">
                            <Server className="w-3.5 h-3.5 text-slate-400" /> IP Address:
                          </span>
                          <span className="font-mono text-slate-800 dark:text-zinc-200">{liveIP}</span>
                        </div>
                        {isOnline && (
                          <div className="flex justify-between py-1 border-b border-slate-200 dark:border-zinc-800">
                            <span className="text-slate-400 dark:text-zinc-500 flex items-center gap-1">
                              <Clock className="w-3.5 h-3.5 text-slate-400" /> Uptime:
                            </span>
                            <span className="font-mono text-slate-800 dark:text-zinc-200">{liveUptime}</span>
                          </div>
                        )}
                      </>
                    )}
                    <div className="flex justify-between py-1 border-b border-slate-200 dark:border-zinc-800">
                      <span className="text-slate-400 dark:text-zinc-500 flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5 text-slate-400" /> Registrasi:
                      </span>
                      <span className="font-medium text-slate-800 dark:text-zinc-200">
                        {formatDateTime(selectedCustomer.CreatedAt)}
                      </span>
                    </div>
                    {selectedCustomer.ActivatedAt && (
                      <>
                        <div className="flex justify-between py-1 border-b border-slate-200 dark:border-zinc-800">
                          <span className="text-slate-400 dark:text-zinc-500 flex items-center gap-1">
                            <Calendar className="w-3.5 h-3.5 text-slate-400" /> Aktivasi:
                          </span>
                          <span className="font-medium text-slate-800 dark:text-zinc-200">
                            {formatDateTime(selectedCustomer.ActivatedAt)}
                          </span>
                        </div>
                        <div className="flex justify-between py-1 border-b border-slate-200 dark:border-zinc-800">
                          <span className="text-slate-400 dark:text-zinc-500 flex items-center gap-1">
                            <Clock className="w-3.5 h-3.5 text-slate-400" /> Masa Aktif:
                          </span>
                          <span className="font-medium text-slate-800 dark:text-zinc-200">
                            {getMasaAktif(selectedCustomer.ActivatedAt)}
                          </span>
                        </div>
                      </>
                    )}
                    <div className="py-1 border-b border-slate-200 dark:border-zinc-800">
                      <span className="text-slate-400 dark:text-zinc-500 block mb-0.5">Alamat Pasang:</span>
                      <p className="text-slate-700 dark:text-zinc-300">{selectedCustomer.AddressDetail}, {selectedCustomer.Village}</p>
                    </div>
                    {selectedCustomer.GoogleMapsLink && (
                      <div className="py-1 border-b border-slate-200 dark:border-zinc-800">
                        <a
                          href={selectedCustomer.GoogleMapsLink}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 text-blue-600 dark:text-blue-400 font-medium hover:underline text-[11px]"
                        >
                          <ExternalLink className="w-3.5 h-3.5" /> Buka Link Google Maps
                        </a>
                      </div>
                    )}
                  </div>
                </>
              )
            })()}
          </div>
        </div>
      )}

      {/* ── ODP ADD/EDIT MODAL ──────────────────────────── */}
      {modalOpen && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto text-slate-900 dark:text-zinc-100">
            <div className="px-6 py-4 border-b border-slate-200 dark:border-zinc-800 flex items-center justify-between bg-slate-50 dark:bg-zinc-950">
              <h3 className="font-bold text-slate-900 dark:text-white text-sm flex items-center gap-2">
                <Building2 className="w-4 h-4 text-amber-500" />
                {formData.id ? 'Ubah Data ODP' : 'Tambah Titik ODP Baru'}
              </h3>
              <button onClick={() => setModalOpen(false)} className="p-1 rounded-lg hover:bg-slate-200 dark:hover:bg-zinc-800 text-slate-400 dark:text-zinc-400">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSubmitForm} className="p-6 space-y-4">
              {/* Google Maps Link or Coords Input */}
              <div>
                <label className="text-xs font-semibold text-slate-700 dark:text-zinc-300 flex items-center gap-1 mb-1">
                  <LinkIcon className="w-3.5 h-3.5 text-blue-500" /> Link Google Maps / Format Koordinat
                </label>
                <input
                  type="text"
                  value={gmapsInput}
                  onChange={(e) => handleGmapsInputChange(e.target.value)}
                  placeholder="Paste link e.g. https://maps.google.com/?q=5.201,96.701"
                  className="w-full bg-slate-100 dark:bg-zinc-950 border border-slate-300 dark:border-zinc-800 rounded-xl px-3.5 py-2 text-xs text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-zinc-500 focus:outline-none focus:border-blue-500"
                />
                <p className="text-[10px] text-slate-400 dark:text-zinc-500 mt-1">
                  💡 Tempel link Google Maps atau angka koordinat untuk otomatis mengisi Latitude & Longitude.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-700 dark:text-zinc-300 block mb-1">Kode ODP *</label>
                  <input
                    type="text"
                    required
                    value={formData.code}
                    onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                    placeholder="Contoh: ODP-BLA-01"
                    className="w-full bg-slate-100 dark:bg-zinc-950 border border-slate-300 dark:border-zinc-800 rounded-xl px-3.5 py-2 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-700 dark:text-zinc-300 block mb-1">Nama / Label ODP</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Contoh: ODP Tiang Depan Masjid"
                    className="w-full bg-slate-100 dark:bg-zinc-950 border border-slate-300 dark:border-zinc-800 rounded-xl px-3.5 py-2 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-700 dark:text-zinc-300 block mb-1">Kapasitas Port</label>
                  <select
                    value={formData.total_ports}
                    onChange={(e) => setFormData({ ...formData, total_ports: Number(e.target.value) })}
                    className="w-full bg-slate-100 dark:bg-zinc-950 border border-slate-300 dark:border-zinc-800 rounded-xl px-3.5 py-2 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-blue-500"
                  >
                    <option value={4}>4 Port</option>
                    <option value={8}>8 Port</option>
                    <option value={16}>16 Port</option>
                    <option value={24}>24 Port</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-700 dark:text-zinc-300 block mb-1">Port OLT Terhubung</label>
                  <select
                    value={formData.olt_port_config_id}
                    onChange={(e) => setFormData({ ...formData, olt_port_config_id: e.target.value })}
                    className="w-full bg-slate-100 dark:bg-zinc-950 border border-slate-300 dark:border-zinc-800 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-blue-500"
                  >
                    <option value="">-- Tanpa Port OLT (Stand-Alone) --</option>
                    {oltPorts.map((port: any) => {
                      const portId = port.ID || port.id || ''
                      const portName = port.Name || port.name || 'Port OLT'
                      const oltHost = port.OLTHost || port.olt_host || ''
                      return (
                        <option key={portId} value={portId}>
                          {portName} {oltHost ? `(${oltHost})` : ''}
                        </option>
                      )
                    })}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-700 dark:text-zinc-300 block mb-1">Latitude *</label>
                  <input
                    type="text"
                    required
                    value={formData.latitude}
                    onChange={(e) => setFormData({ ...formData, latitude: e.target.value })}
                    placeholder="e.g. 5.19643"
                    className="w-full bg-slate-100 dark:bg-zinc-950 border border-slate-300 dark:border-zinc-800 rounded-xl px-3.5 py-2 text-xs text-slate-900 dark:text-white font-mono focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-700 dark:text-zinc-300 block mb-1">Longitude *</label>
                  <input
                    type="text"
                    required
                    value={formData.longitude}
                    onChange={(e) => setFormData({ ...formData, longitude: e.target.value })}
                    placeholder="e.g. 96.79168"
                    className="w-full bg-slate-100 dark:bg-zinc-950 border border-slate-300 dark:border-zinc-800 rounded-xl px-3.5 py-2 text-xs text-slate-900 dark:text-white font-mono focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 dark:text-zinc-300 block mb-1">Catatan Lokasi / Alamat</label>
                <textarea
                  rows={2}
                  value={formData.address_notes}
                  onChange={(e) => setFormData({ ...formData, address_notes: e.target.value })}
                  placeholder="Contoh: Tiang PLN warna biru samping Gang 2"
                  className="w-full bg-slate-100 dark:bg-zinc-950 border border-slate-300 dark:border-zinc-800 rounded-xl px-3.5 py-2 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-blue-500"
                ></textarea>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-200 dark:border-zinc-800">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-500 dark:text-zinc-400 hover:bg-slate-100 dark:hover:bg-zinc-800"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={createODPMut.isPending || updateODPMut.isPending}
                  className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-lg transition-all disabled:opacity-50"
                >
                  {createODPMut.isPending || updateODPMut.isPending ? 'Menyimpan...' : 'Simpan Titik ODP'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
