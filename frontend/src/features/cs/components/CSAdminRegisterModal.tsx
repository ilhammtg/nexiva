import { useState, useEffect, useRef } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { X, Upload, CheckCircle2, MapPin, Locate, Map, User, Phone, Mail, CreditCard, Shield, ArrowRight, ArrowLeft, Check, Sparkles, AlertCircle } from 'lucide-react'
import { toast } from 'sonner'
import { publicApi } from '@/features/public/api/publicApi'
import { csApi } from '../api/csApi'
import { LoadingSpinner } from '@/components/ui'

const TILE_LAYERS = {
  google_hybrid: {
    name: 'Satelit Hybrid',
    url: 'https://mt1.google.com/vt/lyrs=y&x={x}&y={y}&z={z}',
    attribution: '&copy; <a href="https://maps.google.com">Google Maps Satellite</a>',
  },
  google_street: {
    name: 'Google Street',
    url: 'https://mt1.google.com/vt/lyrs=m&x={x}&y={y}&z={z}',
    attribution: '&copy; <a href="https://maps.google.com">Google Maps</a>',
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

interface CSAdminRegisterModalProps {
  onClose: () => void
  onSuccess?: () => void
}

export default function CSAdminRegisterModal({ onClose, onSuccess }: CSAdminRegisterModalProps) {
  const qc = useQueryClient()
  const [activeStep, setActiveStep] = useState<1 | 2 | 3>(1)
  const [formData, setFormData] = useState({
    full_name: '',
    nik: '',
    phone: '',
    email: '',
    province: 'Aceh',
    city: 'Bireuen',
    district: '',
    village: '',
    rt: '',
    rw: '',
    address_detail: '',
    package_id: '',
    maps_lat: '',
    maps_lng: '',
    google_maps_link: '',
  })
  const [ktpFile, setKtpFile] = useState<File | null>(null)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [mapLayer, setMapLayer] = useState<'google_hybrid' | 'google_street' | 'carto_dark' | 'osm'>('google_hybrid')
  
  const mapRef = useRef<any>(null)
  const markerRef = useRef<any>(null)
  const tileLayerRef = useRef<any>(null)

  // Fetch packages
  const { data: packages = [], isLoading: isLoadingPkgs } = useQuery({
    queryKey: ['packages'],
    queryFn: publicApi.getPackages,
  })

  // Selected package details
  const selectedPkg = packages.find(p => p.ID === formData.package_id)

  // Sync Map Tile Layer when changed
  useEffect(() => {
    if (tileLayerRef.current && (window as any).L) {
      const config = TILE_LAYERS[mapLayer]
      tileLayerRef.current.setUrl(config.url)
    }
  }, [mapLayer])

  // Initialize Leaflet Map instance on step 2
  useEffect(() => {
    if (activeStep !== 2) return

    let isMounted = true
    const initMap = () => {
      if (!isMounted) return
      const L = (window as any).L
      if (!L) return

      const container = L.DomUtil.get('cs-admin-map')
      if (container) {
        (container as any)._leaflet_id = null
      }

      const initialLat = formData.maps_lat ? Number(formData.maps_lat) : 5.2014
      const initialLng = formData.maps_lng ? Number(formData.maps_lng) : 96.7011

      const initialConfig = TILE_LAYERS[mapLayer]
      const tileLayer = L.tileLayer(initialConfig.url, {
        maxZoom: 20,
        attribution: initialConfig.attribution,
      })

      const mapInstance = L.map('cs-admin-map', {
        center: [initialLat, initialLng],
        zoom: formData.maps_lat ? 16 : 13,
        layers: [tileLayer]
      })
      mapRef.current = mapInstance
      tileLayerRef.current = tileLayer

      const customPinIcon = L.divIcon({
        className: 'custom-map-pin',
        html: `
          <div class="relative flex items-center justify-center">
            <span class="absolute w-8 h-8 rounded-full bg-blue-500/40 animate-ping"></span>
            <div class="w-8 h-8 rounded-full bg-gradient-to-tr from-blue-600 to-indigo-600 border-2 border-white shadow-xl flex items-center justify-center text-white">
              <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>
            </div>
          </div>
        `,
        iconSize: [32, 32],
        iconAnchor: [16, 32],
      })

      const marker = L.marker([initialLat, initialLng], {
        icon: customPinIcon,
        draggable: true,
      }).addTo(mapInstance)
      markerRef.current = marker

      marker.on('dragend', (e: any) => {
        const pos = e.target.getLatLng()
        setFormData(f => ({
          ...f,
          maps_lat: String(pos.lat),
          maps_lng: String(pos.lng),
          google_maps_link: `https://www.google.com/maps/search/?api=1&query=${pos.lat},${pos.lng}`
        }))
      })

      mapInstance.on('click', (e: any) => {
        const { lat, lng } = e.latlng
        marker.setLatLng([lat, lng])
        setFormData(f => ({
          ...f,
          maps_lat: String(lat),
          maps_lng: String(lng),
          google_maps_link: `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`
        }))
      })
    }

    if (!document.getElementById('leaflet-css')) {
      const link = document.createElement('link')
      link.id = 'leaflet-css'
      link.rel = 'stylesheet'
      link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css'
      document.head.appendChild(link)
    }

    if (!document.getElementById('leaflet-js')) {
      const script = document.createElement('script')
      script.id = 'leaflet-js'
      script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js'
      script.onload = () => {
        if (isMounted) initMap()
      }
      document.head.appendChild(script)
    } else {
      const timer = setTimeout(() => {
        initMap()
      }, 150)
      return () => clearTimeout(timer)
    }

    return () => {
      isMounted = false
      if (mapRef.current) {
        mapRef.current.remove()
        mapRef.current = null
      }
    }
  }, [activeStep])

  const handleLocateUser = () => {
    if (!navigator.geolocation) {
      toast.error('Browser tidak mendukung Geolocation')
      return
    }

    const toastId = toast.loading('Mengambil koordinat GPS...')
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = pos.coords.latitude
        const lng = pos.coords.longitude
        setFormData(f => ({
          ...f,
          maps_lat: String(lat),
          maps_lng: String(lng),
          google_maps_link: `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`
        }))
        if (mapRef.current && markerRef.current) {
          mapRef.current.setView([lat, lng], 17)
          markerRef.current.setLatLng([lat, lng])
        }
        toast.dismiss(toastId)
        toast.success('Lokasi GPS didapatkan!')
      },
      (err) => {
        toast.dismiss(toastId)
        toast.error('Gagal mengambil lokasi GPS: ' + err.message)
      },
      { enableHighAccuracy: true, timeout: 8000 }
    )
  }

  const handleGoogleMapsLinkChange = (val: string) => {
    setFormData(f => ({ ...f, google_maps_link: val }))
    const parsed = parseGoogleMapsUrl(val)
    if (parsed) {
      setFormData(f => ({
        ...f,
        maps_lat: String(parsed.lat),
        maps_lng: String(parsed.lng)
      }))
      if (mapRef.current && markerRef.current) {
        mapRef.current.setView([parsed.lat, parsed.lng], 17)
        markerRef.current.setLatLng([parsed.lat, parsed.lng])
      }
      toast.success(`Koordinat terdeteksi dari link: ${parsed.lat.toFixed(5)}, ${parsed.lng.toFixed(5)}`)
    }
  }

  // Submit Mutation
  const registerMut = useMutation({
    mutationFn: (data: FormData) => csApi.createRegistration(data),
    onSuccess: () => {
      toast.success('Pendaftaran pelanggan baru berhasil disimpan!')
      qc.invalidateQueries({ queryKey: ['cs-registrations'] })
      qc.invalidateQueries({ queryKey: ['registrations'] })
      qc.invalidateQueries({ queryKey: ['active-customers'] })
      if (onSuccess) onSuccess()
      onClose()
    },
    onError: (err: any) => {
      const respErrs = err?.response?.data?.errors
      if (respErrs) {
        setErrors(respErrs)
        toast.error('Mohon periksa kembali isian formulir Anda')
      } else {
        toast.error(err?.response?.data?.message ?? 'Gagal membuat pendaftaran')
      }
    },
  })

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0]
      if (file.size > 5 * 1024 * 1024) {
        toast.error('Ukuran file maksimal 5MB')
        return
      }
      setKtpFile(file)
    }
  }

  const validateStep1 = () => {
    const errs: Record<string, string> = {}
    if (!formData.full_name.trim()) errs.full_name = 'Nama lengkap wajib diisi'
    if (!formData.phone.trim()) errs.phone = 'Nomor WhatsApp wajib diisi'
    if (!formData.package_id) errs.package_id = 'Pilih salah satu paket internet'
    setErrors(errs)
    return Object.keys(errs).length === 0
  }

  const validateStep2 = () => {
    const errs: Record<string, string> = {}
    if (!formData.province.trim()) errs.province = 'Provinsi wajib diisi'
    if (!formData.city.trim()) errs.city = 'Kabupaten/Kota wajib diisi'
    if (!formData.district.trim()) errs.district = 'Kecamatan wajib diisi'
    if (!formData.village.trim()) errs.village = 'Desa/Kelurahan wajib diisi'
    if (!formData.address_detail.trim()) errs.address_detail = 'Alamat detail wajib diisi'
    setErrors(errs)
    return Object.keys(errs).length === 0
  }

  const handleNext = () => {
    if (activeStep === 1) {
      if (validateStep1()) setActiveStep(2)
      else toast.error('Mohon lengkapi isian data diri & paket wajib')
    } else if (activeStep === 2) {
      if (validateStep2()) setActiveStep(3)
      else toast.error('Mohon lengkapi alamat pemasangan wajib')
    }
  }

  const handleSubmit = () => {
    if (!validateStep1() || !validateStep2()) {
      toast.error('Mohon periksa data wajib yang belum lengkap')
      return
    }

    const submitData = new FormData()
    Object.entries(formData).forEach(([key, val]) => {
      if (val) submitData.append(key, val)
    })
    if (ktpFile) {
      submitData.append('ktp_file', ktpFile)
    }

    registerMut.mutate(submitData)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-950/70 backdrop-blur-md animate-fade-in overflow-y-auto">
      <div className="bg-white dark:bg-slate-900 rounded-3xl w-full max-w-4xl max-h-[92vh] flex flex-col shadow-2xl border border-slate-200/80 dark:border-slate-800 animate-scale-up overflow-hidden">
        
        {/* Top Header */}
        <div className="px-6 py-4 bg-gradient-to-r from-slate-900 via-slate-850 to-blue-950 text-white flex items-center justify-between border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center text-white font-bold shadow-lg shadow-blue-500/25">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-extrabold tracking-tight">Registrasi Pelanggan Baru</h2>
                <span className="px-2.5 py-0.5 rounded-full bg-blue-500/20 text-blue-300 border border-blue-400/30 text-[10px] font-bold uppercase tracking-wider">
                  Admin / Walk-In
                </span>
              </div>
              <p className="text-xs text-slate-300 font-medium">Input pendaftaran jaringan internet pelanggan secara terpadu</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white transition-all border border-slate-700"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Wizard Stepper Navigation */}
        <div className="px-6 py-3 bg-slate-50 dark:bg-slate-850 border-b border-slate-200/60 dark:border-slate-800 flex items-center justify-between gap-2 overflow-x-auto shrink-0">
          {[
            { step: 1, label: 'Data Diri & Paket', icon: User },
            { step: 2, label: 'Alamat & Peta ODP', icon: MapPin },
            { step: 3, label: 'Review & Konfirmasi', icon: CheckCircle2 },
          ].map(({ step, label, icon: Icon }) => {
            const isActive = activeStep === step
            const isDone = activeStep > step
            return (
              <button
                key={step}
                type="button"
                onClick={() => {
                  if (step < activeStep) setActiveStep(step as any)
                  else if (step === 2 && validateStep1()) setActiveStep(2)
                  else if (step === 3 && validateStep1() && validateStep2()) setActiveStep(3)
                }}
                className={`flex items-center gap-2.5 px-4 py-2 rounded-xl text-xs font-bold transition-all border shrink-0 ${
                  isActive
                    ? 'bg-blue-600 text-white border-blue-600 shadow-md shadow-blue-500/20 scale-[1.02]'
                    : isDone
                    ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/20'
                    : 'bg-white dark:bg-slate-800 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-700 hover:text-slate-800 dark:hover:text-white'
                }`}
              >
                <div className={`w-5 h-5 rounded-lg flex items-center justify-center text-[11px] font-black ${
                  isActive ? 'bg-white text-blue-600' : isDone ? 'bg-emerald-500 text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
                }`}>
                  {isDone ? '✓' : step}
                </div>
                <span>{label}</span>
              </button>
            )
          })}
        </div>

        {/* Modal Body / Steps */}
        <div className="flex-1 overflow-y-auto p-6 text-slate-800 dark:text-slate-100 space-y-6">

          {/* ================= STEP 1: Data Diri & Paket ================= */}
          {activeStep === 1 && (
            <div className="space-y-6 animate-fade-in">
              {/* Section 1: Customer Info */}
              <div className="space-y-4">
                <h3 className="text-xs font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest flex items-center gap-2">
                  <User className="w-4 h-4 text-blue-500" /> Informasi Data Diri Pelanggan
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block">
                      Nama Lengkap Pelanggan <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <User className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input
                        type="text"
                        value={formData.full_name}
                        onChange={e => setFormData({ ...formData, full_name: e.target.value })}
                        placeholder="Contoh: Nanda Riansyah"
                        className="w-full pl-10 pr-4 py-2.5 text-sm bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/40 text-slate-900 dark:text-white font-medium"
                      />
                    </div>
                    {errors.full_name && <p className="text-[11px] text-red-500 font-semibold">{errors.full_name}</p>}
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block">
                      Nomor NIK KTP
                    </label>
                    <div className="relative">
                      <Shield className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input
                        type="text"
                        value={formData.nik}
                        onChange={e => setFormData({ ...formData, nik: e.target.value })}
                        placeholder="16 Digit NIK KTP"
                        className="w-full pl-10 pr-4 py-2.5 text-sm bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/40 text-slate-900 dark:text-white font-medium"
                      />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block">
                      No. WhatsApp / Telepon <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <Phone className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input
                        type="text"
                        value={formData.phone}
                        onChange={e => setFormData({ ...formData, phone: e.target.value })}
                        placeholder="08xxxxxxxxxx"
                        className="w-full pl-10 pr-4 py-2.5 text-sm bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/40 text-slate-900 dark:text-white font-medium"
                      />
                    </div>
                    {errors.phone && <p className="text-[11px] text-red-500 font-semibold">{errors.phone}</p>}
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block">
                      Alamat Email (Opsional)
                    </label>
                    <div className="relative">
                      <Mail className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input
                        type="email"
                        value={formData.email}
                        onChange={e => setFormData({ ...formData, email: e.target.value })}
                        placeholder="pelanggan@email.com"
                        className="w-full pl-10 pr-4 py-2.5 text-sm bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/40 text-slate-900 dark:text-white font-medium"
                      />
                    </div>
                  </div>
                </div>

                {/* File KTP */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block">Upload Berkas Foto KTP</label>
                  <div className="border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-2xl p-4 bg-slate-50/50 dark:bg-slate-800/40 hover:bg-blue-50/50 dark:hover:bg-slate-800 transition-all text-center relative cursor-pointer group">
                    <input
                      type="file"
                      accept="image/*,application/pdf"
                      onChange={handleFileChange}
                      className="absolute inset-0 opacity-0 cursor-pointer"
                    />
                    <Upload className="w-6 h-6 text-slate-400 group-hover:text-blue-600 transition-colors mx-auto mb-1.5" />
                    <p className="text-xs font-bold text-slate-700 dark:text-slate-200">
                      {ktpFile ? `📁 ${ktpFile.name}` : 'Klik untuk unggah foto KTP'}
                    </p>
                    <p className="text-[10px] text-slate-400 mt-0.5">Maksimal file 5MB (Format JPG, PNG, atau PDF)</p>
                  </div>
                </div>
              </div>

              {/* Section 2: Package Card Selector */}
              <div className="space-y-4 pt-2 border-t border-slate-200/60 dark:border-slate-800">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest flex items-center gap-2">
                    <CreditCard className="w-4 h-4 text-blue-500" /> Pilih Paket Internet Broadband
                  </h3>
                  {errors.package_id && <span className="text-xs text-red-500 font-bold">Wajib pilih paket!</span>}
                </div>

                {isLoadingPkgs ? (
                  <LoadingSpinner className="py-8" />
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {packages.map((pkg) => {
                      const isSelected = formData.package_id === pkg.ID
                      return (
                        <div
                          key={pkg.ID}
                          onClick={() => setFormData({ ...formData, package_id: pkg.ID })}
                          className={`p-4 rounded-2xl border-2 transition-all cursor-pointer relative flex flex-col justify-between ${
                            isSelected
                              ? 'bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950/40 dark:to-indigo-950/30 border-blue-600 shadow-md shadow-blue-500/10 scale-[1.02]'
                              : 'bg-white dark:bg-slate-800/40 border-slate-200/80 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
                          }`}
                        >
                          {isSelected && (
                            <div className="absolute top-3 right-3 w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center text-xs font-bold">
                              ✓
                            </div>
                          )}
                          <div>
                            <span className="px-2 py-0.5 rounded-md bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300 text-[10px] font-extrabold uppercase">
                              {pkg.SpeedDownMbps} Mbps Speed
                            </span>
                            <h4 className="font-extrabold text-sm text-slate-900 dark:text-white mt-2">{pkg.Name}</h4>
                            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 line-clamp-2">{pkg.Description || 'Paket internet unlimited tanpa kuota FUP.'}</p>
                          </div>
                          <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800/80">
                            <p className="text-[10px] text-slate-400 font-medium">Biaya Bulanan</p>
                            <p className="text-sm font-extrabold text-blue-600 dark:text-blue-400">
                              Rp {pkg.PriceMonthly.toLocaleString('id-ID')} <span className="text-[10px] text-slate-400 font-normal">/bulan</span>
                            </p>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ================= STEP 2: Alamat & Peta ODP ================= */}
          {activeStep === 2 && (
            <div className="space-y-6 animate-fade-in">
              <div className="space-y-4">
                <h3 className="text-xs font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-blue-500" /> Detail Alamat Pemasangan
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block">Provinsi <span className="text-red-500">*</span></label>
                    <input
                      type="text"
                      value={formData.province}
                      onChange={e => setFormData({ ...formData, province: e.target.value })}
                      className="w-full px-3.5 py-2.5 text-sm bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/40 text-slate-900 dark:text-white font-medium"
                    />
                    {errors.province && <p className="text-[11px] text-red-500 font-semibold">{errors.province}</p>}
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block">Kabupaten / Kota <span className="text-red-500">*</span></label>
                    <input
                      type="text"
                      value={formData.city}
                      onChange={e => setFormData({ ...formData, city: e.target.value })}
                      className="w-full px-3.5 py-2.5 text-sm bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/40 text-slate-900 dark:text-white font-medium"
                    />
                    {errors.city && <p className="text-[11px] text-red-500 font-semibold">{errors.city}</p>}
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block">Kecamatan <span className="text-red-500">*</span></label>
                    <input
                      type="text"
                      value={formData.district}
                      onChange={e => setFormData({ ...formData, district: e.target.value })}
                      placeholder="Contoh: Peusangan"
                      className="w-full px-3.5 py-2.5 text-sm bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/40 text-slate-900 dark:text-white font-medium"
                    />
                    {errors.district && <p className="text-[11px] text-red-500 font-semibold">{errors.district}</p>}
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block">Desa / Kelurahan <span className="text-red-500">*</span></label>
                    <input
                      type="text"
                      value={formData.village}
                      onChange={e => setFormData({ ...formData, village: e.target.value })}
                      placeholder="Contoh: Ulee Jalan"
                      className="w-full px-3.5 py-2.5 text-sm bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/40 text-slate-900 dark:text-white font-medium"
                    />
                    {errors.village && <p className="text-[11px] text-red-500 font-semibold">{errors.village}</p>}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block">RT</label>
                    <input
                      type="text"
                      value={formData.rt}
                      onChange={e => setFormData({ ...formData, rt: e.target.value })}
                      placeholder="01"
                      className="w-full px-3.5 py-2.5 text-sm bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/40 text-slate-900 dark:text-white font-medium"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block">RW</label>
                    <input
                      type="text"
                      value={formData.rw}
                      onChange={e => setFormData({ ...formData, rw: e.target.value })}
                      placeholder="02"
                      className="w-full px-3.5 py-2.5 text-sm bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/40 text-slate-900 dark:text-white font-medium"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block">Detail Alamat Lengkap & Patokan <span className="text-red-500">*</span></label>
                  <textarea
                    rows={2}
                    value={formData.address_detail}
                    onChange={e => setFormData({ ...formData, address_detail: e.target.value })}
                    placeholder="Jl. Syiah Kuala No. 12, Samping Masjid Jami..."
                    className="w-full px-3.5 py-2.5 text-sm bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/40 text-slate-900 dark:text-white font-medium resize-none"
                  />
                  {errors.address_detail && <p className="text-[11px] text-red-500 font-semibold">{errors.address_detail}</p>}
                </div>
              </div>

              {/* Map Container */}
              <div className="space-y-3 pt-2 border-t border-slate-200/60 dark:border-slate-800">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div>
                    <h3 className="text-xs font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest flex items-center gap-2">
                      <Map className="w-4 h-4 text-blue-500" /> Pin Lokasi Rumah Pelanggan
                    </h3>
                    <p className="text-[11px] text-slate-400 mt-0.5">Klik pada peta untuk menaruh titik koordinat pemasangan</p>
                  </div>
                  <button
                    type="button"
                    onClick={handleLocateUser}
                    className="px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold inline-flex items-center gap-1.5 transition-all shadow-md shadow-blue-500/20"
                  >
                    <Locate className="w-3.5 h-3.5" /> Gunakan GPS Saya
                  </button>
                </div>

                {/* Layer Selector */}
                <div className="flex items-center justify-between bg-slate-100 dark:bg-slate-800 p-1 rounded-xl text-xs flex-wrap gap-1">
                  <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 px-2">Layer Peta:</span>
                  <div className="flex items-center gap-1 flex-wrap">
                    {(['google_hybrid', 'google_street', 'carto_dark', 'osm'] as const).map((layerKey) => (
                      <button
                        type="button"
                        key={layerKey}
                        onClick={() => setMapLayer(layerKey)}
                        className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                          mapLayer === layerKey
                            ? 'bg-blue-600 text-white shadow-sm'
                            : 'text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                        }`}
                      >
                        {TILE_LAYERS[layerKey].name}
                      </button>
                    ))}
                  </div>
                </div>

                <div
                  id="cs-admin-map"
                  className="w-full h-56 rounded-2xl border-2 border-slate-200 dark:border-slate-700 overflow-hidden shadow-inner z-10"
                />

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Latitude</label>
                    <input
                      type="text"
                      value={formData.maps_lat}
                      onChange={e => setFormData({ ...formData, maps_lat: e.target.value })}
                      placeholder="Latitude"
                      className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl font-mono text-slate-900 dark:text-white"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Longitude</label>
                    <input
                      type="text"
                      value={formData.maps_lng}
                      onChange={e => setFormData({ ...formData, maps_lng: e.target.value })}
                      placeholder="Longitude"
                      className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl font-mono text-slate-900 dark:text-white"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Link Google Maps (Auto-Detect)</label>
                  <input
                    type="text"
                    value={formData.google_maps_link}
                    onChange={e => handleGoogleMapsLinkChange(e.target.value)}
                    placeholder="Paste link Google Maps di sini..."
                    className="w-full px-3.5 py-2 text-xs bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white"
                  />
                </div>
              </div>
            </div>
          )}

          {/* ================= STEP 3: Review & Submit ================= */}
          {activeStep === 3 && (
            <div className="space-y-6 animate-fade-in">
              <div className="bg-gradient-to-r from-blue-500/10 via-indigo-500/10 to-teal-500/10 border border-blue-200 dark:border-blue-800/60 rounded-2xl p-4 flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center font-bold shrink-0">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-sm font-extrabold text-slate-900 dark:text-white">Konfirmasi Data Registrasi</h4>
                  <p className="text-xs text-slate-600 dark:text-slate-300">Silakan tinjau seluruh informasi pelanggan sebelum mendaftarkan ke sistem.</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Customer Summary Card */}
                <div className="bg-slate-50 dark:bg-slate-800/40 p-4 rounded-2xl border border-slate-200/60 dark:border-slate-800 space-y-3">
                  <h4 className="text-xs font-black text-slate-400 uppercase tracking-wider border-b border-slate-200 dark:border-slate-800 pb-2">Data Diri</h4>
                  <div className="space-y-2 text-xs">
                    <p><strong className="text-slate-400">Nama:</strong> <span className="font-bold text-slate-900 dark:text-white">{formData.full_name}</span></p>
                    <p><strong className="text-slate-400">WhatsApp:</strong> <span className="font-semibold text-slate-900 dark:text-white">{formData.phone}</span></p>
                    <p><strong className="text-slate-400">NIK:</strong> <span className="font-mono text-slate-900 dark:text-white">{formData.nik || '-'}</span></p>
                    <p><strong className="text-slate-400">Email:</strong> <span className="text-slate-900 dark:text-white">{formData.email || '-'}</span></p>
                  </div>
                </div>

                {/* Address Summary Card */}
                <div className="bg-slate-50 dark:bg-slate-800/40 p-4 rounded-2xl border border-slate-200/60 dark:border-slate-800 space-y-3">
                  <h4 className="text-xs font-black text-slate-400 uppercase tracking-wider border-b border-slate-200 dark:border-slate-800 pb-2">Alamat & Koordinat</h4>
                  <div className="space-y-2 text-xs">
                    <p className="text-slate-800 dark:text-slate-200">
                      {formData.address_detail}, RT {formData.rt || '0'}/RW {formData.rw || '0'}, {formData.village}, {formData.district}, {formData.city}, {formData.province}
                    </p>
                    <p className="font-mono text-[11px] text-blue-600 dark:text-blue-400">
                      📍 Lat: {formData.maps_lat || '-'}, Lng: {formData.maps_lng || '-'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Selected Package Highlight */}
              {selectedPkg && (
                <div className="bg-white dark:bg-slate-850 p-4 rounded-2xl border-2 border-blue-500/40 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                  <div>
                    <span className="text-[10px] font-extrabold text-blue-600 dark:text-blue-400 uppercase tracking-widest">Paket Layanan Dipilih</span>
                    <h4 className="text-base font-extrabold text-slate-900 dark:text-white mt-0.5">{selectedPkg.Name}</h4>
                    <p className="text-xs text-slate-500 dark:text-slate-400">Kecepatan broadband {selectedPkg.SpeedDownMbps} Mbps Unlimited</p>
                  </div>
                  <div className="text-left sm:text-right shrink-0">
                    <p className="text-[10px] text-slate-400">Biaya Layanan Bulanan</p>
                    <p className="text-lg font-black text-blue-600 dark:text-blue-400">Rp {selectedPkg.PriceMonthly.toLocaleString('id-ID')}</p>
                  </div>
                </div>
              )}
            </div>
          )}

        </div>

        {/* Modal Footer Controls */}
        <div className="px-6 py-4 bg-slate-50 dark:bg-slate-850 border-t border-slate-200/80 dark:border-slate-800 flex items-center justify-between gap-3 shrink-0">
          <div>
            {activeStep > 1 && (
              <button
                type="button"
                onClick={() => setActiveStep((activeStep - 1) as any)}
                className="px-4 py-2.5 rounded-xl bg-white hover:bg-slate-100 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold text-xs border border-slate-200 dark:border-slate-700 inline-flex items-center gap-1.5 transition-all"
              >
                <ArrowLeft className="w-4 h-4" /> Kembali
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400 text-xs font-bold transition-all"
            >
              Batal
            </button>

            {activeStep < 3 ? (
              <button
                type="button"
                onClick={handleNext}
                className="px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs inline-flex items-center gap-1.5 transition-all shadow-md shadow-blue-500/20"
              >
                <span>Lanjut</span> <ArrowRight className="w-4 h-4" />
              </button>
            ) : (
              <button
                type="button"
                onClick={handleSubmit}
                disabled={registerMut.isPending}
                className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs inline-flex items-center gap-1.5 transition-all shadow-md shadow-emerald-500/20 disabled:opacity-50"
              >
                {registerMut.isPending ? (
                  <>
                    <LoadingSpinner className="w-4 h-4" />
                    <span>Mendaftarkan...</span>
                  </>
                ) : (
                  <>
                    <Check className="w-4 h-4" />
                    <span>Daftarkan Pelanggan Baru</span>
                  </>
                )}
              </button>
            )}
          </div>
        </div>

      </div>
    </div>
  )
}
