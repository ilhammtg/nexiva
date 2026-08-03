import { useState, useEffect, useRef } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useSearchParams } from 'react-router-dom'
import {
  Wifi, User, MapPin, CheckCircle, ArrowRight, ArrowLeft,
  Upload, Copy, Check, FileText, Loader2, Sparkles, Inbox, Map,
  Locate, Info, Facebook, Instagram, Twitter, Youtube, Linkedin, Globe,
  X, ChevronDown, ChevronUp, Tv, Activity, Layers
} from 'lucide-react'
import { publicApi, type RegionalItem } from '../api/publicApi'
import { formatCurrency } from '@/lib/utils'
import { toast } from 'sonner'

const getStatusTimelineColor = (status: string) => {
  const s = status ? status.toLowerCase() : ''
  if (s.includes('pending') || s.includes('review')) {
    return {
      bg: 'bg-amber-50 dark:bg-amber-950/40',
      border: 'border-amber-500',
      dot: 'bg-amber-500',
      text: 'text-amber-600 dark:text-amber-400'
    }
  }
  if (s.includes('survey_scheduled') || s.includes('survei dijadwalkan')) {
    return {
      bg: 'bg-sky-50 dark:bg-sky-950/45',
      border: 'border-sky-500',
      dot: 'bg-sky-500',
      text: 'text-sky-600 dark:text-sky-400'
    }
  }
  if (s.includes('survey_done') || s.includes('survei selesai')) {
    return {
      bg: 'bg-indigo-50 dark:bg-indigo-950/45',
      border: 'border-indigo-500',
      dot: 'bg-indigo-500',
      text: 'text-indigo-600 dark:text-indigo-400'
    }
  }
  if (s.includes('waiting_payment') || s.includes('menunggu pembayaran')) {
    return {
      bg: 'bg-orange-50 dark:bg-orange-950/40',
      border: 'border-orange-500',
      dot: 'bg-orange-500',
      text: 'text-orange-600 dark:text-orange-400'
    }
  }
  if (s.includes('payment_confirmed') || s.includes('pembayaran dikonfirmasi')) {
    return {
      bg: 'bg-emerald-50 dark:bg-emerald-950/40',
      border: 'border-emerald-500',
      dot: 'bg-emerald-500',
      text: 'text-emerald-600 dark:text-emerald-400'
    }
  }
  if (s.includes('installation_scheduled') || s.includes('instalasi dijadwalkan')) {
    return {
      bg: 'bg-teal-50 dark:bg-teal-950/40',
      border: 'border-teal-500',
      dot: 'bg-teal-500',
      text: 'text-teal-600 dark:text-teal-400'
    }
  }
  if (s.includes('provisioning') || s.includes('proses provisioning')) {
    return {
      bg: 'bg-violet-50 dark:bg-violet-950/40',
      border: 'border-violet-500',
      dot: 'bg-violet-500',
      text: 'text-violet-600 dark:text-violet-400'
    }
  }
  if (s.includes('active') || s.includes('aktif')) {
    return {
      bg: 'bg-green-50 dark:bg-green-950/40',
      border: 'border-green-500',
      dot: 'bg-green-500',
      text: 'text-green-600 dark:text-green-400'
    }
  }
  if (s.includes('reject') || s.includes('ditolak') || s.includes('fail') || s.includes('gagal')) {
    return {
      bg: 'bg-rose-50 dark:bg-rose-950/40',
      border: 'border-rose-500',
      dot: 'bg-rose-500',
      text: 'text-rose-600 dark:text-rose-455'
    }
  }
  return {
    bg: 'bg-blue-50 dark:bg-blue-950/80',
    border: 'border-blue-650',
    dot: 'bg-blue-600',
    text: 'text-blue-600 dark:text-blue-400'
  }
}

// Map Tile Layers Configuration (matching ODP Map standard)
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

export default function RegisterPage() {

  const [step, setStep] = useState(() => {
    const saved = sessionStorage.getItem('reg_step')
    return saved ? Number(saved) : 1
  })
  
  // Scroll to top of viewport on step transitions to prevent mobile footer scroll jump
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' as any })
  }, [step])

  const [copied, setCopied] = useState(false)
  const [successData, setSuccessData] = useState<{ regNumber: string; status: string } | null>(null)
  const [detailedPkg, setDetailedPkg] = useState<any | null>(null)
  const [showAccordion, setShowAccordion] = useState(true)

  // Form State
  const [selectedPackageId, setSelectedPackageId] = useState(() => sessionStorage.getItem('reg_selectedPackageId') || '')
  const [fullName, setFullName] = useState(() => sessionStorage.getItem('reg_fullName') || '')
  const [nik, setNik] = useState(() => sessionStorage.getItem('reg_nik') || '')
  const [phone, setPhone] = useState(() => sessionStorage.getItem('reg_phone') || '')
  const [email, setEmail] = useState(() => sessionStorage.getItem('reg_email') || '')
  const [ktpFile, setKtpFile] = useState<File | null>(null)

  // Address State
  const [province, setProvince] = useState(() => sessionStorage.getItem('reg_province') || '')
  const [city, setCity] = useState(() => sessionStorage.getItem('reg_city') || '')
  const [district, setDistrict] = useState(() => sessionStorage.getItem('reg_district') || '')
  const [village, setVillage] = useState(() => sessionStorage.getItem('reg_village') || '')
  const [rt, setRt] = useState(() => sessionStorage.getItem('reg_rt') || '')
  const [rw, setRw] = useState(() => sessionStorage.getItem('reg_rw') || '')
  const [addressDetail, setAddressDetail] = useState(() => sessionStorage.getItem('reg_addressDetail') || '')
  const [googleMapsLink, setGoogleMapsLink] = useState(() => sessionStorage.getItem('reg_googleMapsLink') || '')

  // Validation Errors State
  const [errors, setErrors] = useState<{ [key: string]: string }>({})
  const [searchParams] = useSearchParams()
  const [ontSerialNumber, setOntSerialNumber] = useState('')
  const [oltPortConfigId, setOltPortConfigId] = useState('')

  useEffect(() => {
    const ontSerial = searchParams.get('ont_serial_number') || searchParams.get('ONTSerialNumber') || ''
    const oltPortConfig = searchParams.get('olt_port_config_id') || searchParams.get('OLTPortConfigID') || ''
    if (ontSerial) setOntSerialNumber(ontSerial)
    if (oltPortConfig) setOltPortConfigId(oltPortConfig)
  }, [searchParams])

  // Field Validation Helper
  const validateField = (name: string, value: any): string => {
    switch (name) {
      case 'fullName': {
        const val = (value || '').trim()
        if (!val) return 'Nama lengkap wajib diisi'
        if (val.length < 3) return 'Nama lengkap minimal 3 karakter'
        if (!/^[a-zA-Z\s'.,\-]+$/.test(val)) return 'Nama hanya boleh berisi huruf, spasi, atau tanda baca standar'
        return ''
      }
      case 'nik': {
        const val = (value || '').trim()
        if (!val) return 'NIK wajib diisi'
        if (!/^\d{16}$/.test(val)) return 'NIK harus terdiri dari 16 digit angka'
        return ''
      }
      case 'phone': {
        const val = (value || '').trim()
        if (!val) return 'Nomor WhatsApp wajib diisi'
        if (!/^(08|628|\+628)[0-9]{8,12}$/.test(val)) {
          return 'Nomor WhatsApp tidak valid (contoh: 08123456789)'
        }
        return ''
      }
      case 'email': {
        const val = (value || '').trim()
        if (!val) return 'Email wajib diisi'
        if (!/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(val)) {
          return 'Format email tidak valid'
        }
        return ''
      }
      case 'ktpFile': {
        if (!value) return 'Berkas KTP wajib diunggah'
        return ''
      }
      case 'rt': {
        const val = (value || '').trim()
        if (val && !/^\d{1,3}$/.test(val)) return 'RT harus berupa angka (maks. 3 digit)'
        return ''
      }
      case 'rw': {
        const val = (value || '').trim()
        if (val && !/^\d{1,3}$/.test(val)) return 'RW harus berupa angka (maks. 3 digit)'
        return ''
      }
      case 'addressDetail': {
        const val = (value || '').trim()
        if (!val) return 'Detail alamat wajib diisi'
        if (val.length < 10) return 'Detail alamat minimal 10 karakter'
        return ''
      }
      default:
        return ''
    }
  }

  // Change Handler with validation check
  const handleInputChange = (field: string, val: any, setter: (v: any) => void) => {
    setter(val)
    const err = validateField(field, val)
    setErrors(prev => ({ ...prev, [field]: err }))
  }

  // Customer Status Inquiry States
  const [showStatusModal, setShowStatusModal] = useState(false)
  const [statusPhone, setStatusPhone] = useState('')
  const [statusRegNum, setStatusRegNum] = useState('')
  const [statusLoading, setStatusLoading] = useState(false)
  const [statusResult, setStatusResult] = useState<any>(null)

  // Fetch Registration Status
  const handleCheckStatus = async (e?: React.FormEvent) => {
    if (e) e.preventDefault()

    // Validate fields locally
    const phoneVal = statusPhone.trim()
    if (!phoneVal) {
      toast.error('Nomor WhatsApp wajib diisi')
      return
    }
    if (!/^(08|628|\+628)[0-9]{8,12}$/.test(phoneVal)) {
      toast.error('Nomor WhatsApp tidak valid (contoh: 08123456789)')
      return
    }
    if (!statusRegNum.trim()) {
      toast.error('Nomor Registrasi wajib diisi')
      return
    }

    try {
      setStatusLoading(true)
      setStatusResult(null)
      const res = await publicApi.checkStatus(statusPhone.trim(), statusRegNum.trim())
      if (res.data) {
        setStatusResult(res.data)
        toast.success('Status pendaftaran ditemukan')
      } else {
        toast.error('Data pendaftaran tidak ditemukan')
      }
    } catch (err: any) {
      const msg = err.response?.data?.error?.message || 'Data pendaftaran tidak ditemukan'
      toast.error(msg)
    } finally {
      setStatusLoading(false)
    }
  }

  // Regional Dropdown States
  const [provinces, setProvinces] = useState<RegionalItem[]>([])
  const [cities, setCities] = useState<RegionalItem[]>([])
  const [districts, setDistricts] = useState<RegionalItem[]>([])
  const [villages, setVillages] = useState<RegionalItem[]>([])

  const [selectedProvinceId, setSelectedProvinceId] = useState(() => sessionStorage.getItem('reg_selectedProvinceId') || '')
  const [selectedCityId, setSelectedCityId] = useState(() => sessionStorage.getItem('reg_selectedCityId') || '')
  const [selectedDistrictId, setSelectedDistrictId] = useState(() => sessionStorage.getItem('reg_selectedDistrictId') || '')
  const [selectedVillageId, setSelectedVillageId] = useState(() => sessionStorage.getItem('reg_selectedVillageId') || '')

  const [loadingProvinces, setLoadingProvinces] = useState(false)
  const [loadingCities, setLoadingCities] = useState(false)
  const [loadingDistricts, setLoadingDistricts] = useState(false)
  const [loadingVillages, setLoadingVillages] = useState(false)

  const [lockedRegionsStr, setLockedRegionsStr] = useState('')

  // Dynamic Brand & Footer Config States
  const [brandName, setBrandName] = useState('PT JSN')
  const [brandLogoUrl, setBrandLogoUrl] = useState('')
  const [brandFooterTagline, setBrandFooterTagline] = useState('Temukan Kemudahan Dalam Genggaman')
  const [brandFooterLinks, setBrandFooterLinks] = useState<{ label: string; url: string }[]>([])
  const [brandFooterSocials, setBrandFooterSocials] = useState<{ platform: string; url: string }[]>([])
  const [brandFooterCopyright, setBrandFooterCopyright] = useState('Copyright 2026 PT JSN All Right Reserved.')
  const [websiteHeroTitle, setWebsiteHeroTitle] = useState('Internet Cepat, Tanpa Batas, Untuk Keluarga Anda')
  const [websiteHeroSubtitle, setWebsiteHeroSubtitle] = useState('Nikmati koneksi internet fiber optic super cepat, stabil, dan unlimited untuk aktivitas streaming, belajar, bekerja, dan gaming tanpa hambatan.')
  const [websiteContactPhone, setWebsiteContactPhone] = useState('081234567890')
  const [websiteContactEmail, setWebsiteContactEmail] = useState('support@ispcenter.net')
  const [websiteAddress, setWebsiteAddress] = useState('Jl. Raya Utama No. 88, Banda Aceh, Indonesia')

  // Package Filter States
  const [filterPrice, setFilterPrice] = useState<string>('all')
  const [filterSpeed, setFilterSpeed] = useState<number[]>([])

  // Locked Provinces config - Lock only to 'aceh' for now (expandable later)
  const ALLOWED_PROVINCES = ['aceh']

  const filteredProvinces = provinces.filter(p =>
    ALLOWED_PROVINCES.includes(p.name.toLowerCase())
  )

  // Auto-select province if only one is allowed
  useEffect(() => {
    if (filteredProvinces.length === 1 && !selectedProvinceId) {
      const singleProv = filteredProvinces[0]
      setSelectedProvinceId(singleProv.id)
      setProvince(singleProv.name)
    }
  }, [provinces, filteredProvinces, selectedProvinceId])

  // Map Coordinates
  const [mapsLat, setMapsLat] = useState<number | null>(() => {
    const saved = sessionStorage.getItem('reg_mapsLat')
    return saved ? Number(saved) : null
  })
  const [mapsLng, setMapsLng] = useState<number | null>(() => {
    const saved = sessionStorage.getItem('reg_mapsLng')
    return saved ? Number(saved) : null
  })

  // Clear Registration Session Storage on success
  const clearSessionStorage = () => {
    const keys = [
      'reg_step', 'reg_selectedPackageId', 'reg_fullName', 'reg_nik', 'reg_phone', 'reg_email',
      'reg_province', 'reg_city', 'reg_district', 'reg_village', 'reg_rt', 'reg_rw',
      'reg_addressDetail', 'reg_googleMapsLink', 'reg_selectedProvinceId', 'reg_selectedCityId',
      'reg_selectedDistrictId', 'reg_selectedVillageId', 'reg_mapsLat', 'reg_mapsLng'
    ]
    keys.forEach(k => {
      try {
        sessionStorage.removeItem(k)
      } catch (e) {
        console.error(e)
      }
    })
  }

  // Synchronize state with sessionStorage
  useEffect(() => {
    try {
      sessionStorage.setItem('reg_step', String(step))
      sessionStorage.setItem('reg_selectedPackageId', selectedPackageId)
      sessionStorage.setItem('reg_fullName', fullName)
      sessionStorage.setItem('reg_nik', nik)
      sessionStorage.setItem('reg_phone', phone)
      sessionStorage.setItem('reg_email', email)
      sessionStorage.setItem('reg_province', province)
      sessionStorage.setItem('reg_city', city)
      sessionStorage.setItem('reg_district', district)
      sessionStorage.setItem('reg_village', village)
      sessionStorage.setItem('reg_rt', rt)
      sessionStorage.setItem('reg_rw', rw)
      sessionStorage.setItem('reg_addressDetail', addressDetail)
      sessionStorage.setItem('reg_googleMapsLink', googleMapsLink)
      sessionStorage.setItem('reg_selectedProvinceId', selectedProvinceId)
      sessionStorage.setItem('reg_selectedCityId', selectedCityId)
      sessionStorage.setItem('reg_selectedDistrictId', selectedDistrictId)
      sessionStorage.setItem('reg_selectedVillageId', selectedVillageId)
      if (mapsLat !== null) {
        sessionStorage.setItem('reg_mapsLat', String(mapsLat))
      } else {
        sessionStorage.removeItem('reg_mapsLat')
      }
      if (mapsLng !== null) {
        sessionStorage.setItem('reg_mapsLng', String(mapsLng))
      } else {
        sessionStorage.removeItem('reg_mapsLng')
      }
    } catch (e) {
      console.error('Failed to sync registration state to sessionStorage:', e)
    }
  }, [
    step, selectedPackageId, fullName, nik, phone, email,
    province, city, district, village, rt, rw, addressDetail,
    googleMapsLink, selectedProvinceId, selectedCityId,
    selectedDistrictId, selectedVillageId, mapsLat, mapsLng
  ])

  // Prevent accidental back/refresh warnings
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      // Warn only if they have filled out some info and are not on step 1 (or have text)
      if (step > 1 || fullName || phone || nik) {
        e.preventDefault()
        e.returnValue = 'Data pendaftaran Anda yang belum terkirim akan hilang jika Anda memuat ulang halaman ini.'
        return e.returnValue
      }
    }
    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => window.removeEventListener('beforeunload', handleBeforeUnload)
  }, [step, fullName, phone, nik])

  // Submit Loading State
  const [submitting, setSubmitting] = useState(false)

  // Map and Marker Refs
  const mapRef = useRef<any>(null)
  const markerRef = useRef<any>(null)
  const tileLayerRef = useRef<any>(null)
  const [mapLayer, setMapLayer] = useState<'google_street' | 'google_hybrid' | 'carto_dark' | 'osm'>('google_hybrid')

  // Sync Map Tile Layer when changed
  useEffect(() => {
    if (tileLayerRef.current && (window as any).L) {
      const config = TILE_LAYERS[mapLayer]
      tileLayerRef.current.setUrl(config.url)
    }
  }, [mapLayer])

  // Handle Google Maps Link Input change & Auto-Parse
  const handleGoogleMapsLinkChange = (val: string) => {
    setGoogleMapsLink(val)
    const parsed = parseGoogleMapsUrl(val)
    if (parsed) {
      setMapsLat(parsed.lat)
      setMapsLng(parsed.lng)
      if (mapRef.current && markerRef.current) {
        mapRef.current.setView([parsed.lat, parsed.lng], 17)
        markerRef.current.setLatLng([parsed.lat, parsed.lng])
      }
      toast.success(`Koordinat terdeteksi dari link: ${parsed.lat.toFixed(5)}, ${parsed.lng.toFixed(5)}`)
    }
  }

  // Geolocation Locate Handler
  const handleLocateUser = () => {
    if (!navigator.geolocation) {
      toast.error('Geolocation tidak didukung oleh browser Anda')
      return
    }

    const toastId = toast.loading('Mendeteksi lokasi GPS Anda...')

    // Attempt high accuracy GPS first
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const lat = position.coords.latitude
        const lng = position.coords.longitude
        setMapsLat(lat)
        setMapsLng(lng)

        if (mapRef.current && markerRef.current) {
          mapRef.current.setView([lat, lng], 16)
          markerRef.current.setLatLng([lat, lng])
        }

        toast.success('Lokasi berhasil dideteksi', { id: toastId })
      },
      (error) => {
        console.warn('High accuracy GPS failed, trying fallback geolocation...', error)
        // Fallback to low accuracy cellular/wifi geolocation
        navigator.geolocation.getCurrentPosition(
          (position) => {
            const lat = position.coords.latitude
            const lng = position.coords.longitude
            setMapsLat(lat)
            setMapsLng(lng)

            if (mapRef.current && markerRef.current) {
              mapRef.current.setView([lat, lng], 16)
              markerRef.current.setLatLng([lat, lng])
            }

            toast.success('Lokasi berhasil dideteksi (Akurasi Standar)', { id: toastId })
          },
          (fallbackError) => {
            console.error('All geolocation attempts failed:', fallbackError)
            if (window.location.protocol === 'http:' && !['localhost', '127.0.0.1'].includes(window.location.hostname)) {
              toast.error('GPS Diblokir: Koneksi HTTP tidak aman. Akses wajib menggunakan HTTPS atau Localhost.', { id: toastId, duration: 6000 })
            } else {
              toast.error('Gagal mendeteksi lokasi GPS: ' + fallbackError.message, { id: toastId })
            }
          },
          { enableHighAccuracy: false, timeout: 10000, maximumAge: 30000 }
        )
      },
      { enableHighAccuracy: true, timeout: 6000, maximumAge: 0 }
    )
  }

  // Query Active Packages
  const { data: packages, isLoading: pkgsLoading } = useQuery({
    queryKey: ['public-packages'],
    queryFn: publicApi.getPackages,
  })

  // Selected Package Info
  const selectedPackage = packages?.find(p => p.ID === selectedPackageId)

  // Filter packages based on selected filters
  const filteredPackages = packages?.filter(pkg => {
    // 1. Price Filter
    if (filterPrice !== 'all') {
      const price = pkg.PriceMonthly
      if (filterPrice === '100-300') {
        if (price < 100000 || price >= 300000) return false
      } else if (filterPrice === '300-500') {
        if (price < 300000 || price >= 500000) return false
      } else if (filterPrice === '500-1000') {
        if (price < 500000 || price > 1000000) return false
      } else if (filterPrice === 'above-1000') {
        if (price <= 1000000) return false
      }
    }

    // 2. Speed Filter
    if (filterSpeed.length > 0) {
      const speed = pkg.SpeedDownMbps
      const match = filterSpeed.some(fs => {
        if (fs === 100) return speed >= 100
        return speed === fs
      })
      if (!match) return false
    }

    return true
  }) ?? []

  // Load Provinces and Config on mount
  useEffect(() => {
    const init = async () => {
      // 1. Load Branding Config
      try {
        const configData = await publicApi.getPublicConfigs()
        if (configData) {
          setLockedRegionsStr(configData.locked_regions || '')
          setBrandName(configData.brand_name || 'PT JSN')
          setBrandLogoUrl(configData.brand_logo_url || '')
          setBrandFooterTagline(configData.brand_footer_tagline || 'Temukan Kemudahan Dalam Genggaman')
          setBrandFooterCopyright(configData.brand_footer_copyright || 'Copyright 2026 PT JSN All Right Reserved.')
          setWebsiteHeroTitle(configData.website_hero_title || 'Internet Cepat, Tanpa Batas, Untuk Keluarga Anda')
          setWebsiteHeroSubtitle(configData.website_hero_subtitle || 'Nikmati koneksi internet fiber optic super cepat, stabil, dan unlimited untuk aktivitas streaming, belajar, bekerja, dan gaming tanpa hambatan.')
          setWebsiteContactPhone(configData.website_contact_phone || '081234567890')
          setWebsiteContactEmail(configData.website_contact_email || 'support@ispcenter.net')
          setWebsiteAddress(configData.website_address || 'Jl. Raya Utama No. 88, Banda Aceh, Indonesia')

          try {
            if (configData.brand_footer_links) {
              setBrandFooterLinks(JSON.parse(configData.brand_footer_links))
            }
          } catch (e) {
            console.error('Error parsing brand footer links:', e)
          }

          try {
            if (configData.brand_footer_socials) {
              setBrandFooterSocials(JSON.parse(configData.brand_footer_socials))
            }
          } catch (e) {
            console.error('Error parsing brand footer socials:', e)
          }
        }
      } catch (err) {
        console.error('Failed to load branding configurations:', err)
      }

      // 2. Load Regional Provinces
      try {
        setLoadingProvinces(true)
        const provList = await publicApi.getProvinces()
        setProvinces(provList)
      } catch (err) {
        console.error('Failed to load initial regional data:', err)
        toast.error('Gagal memuat konfigurasi wilayah')
      } finally {
        setLoadingProvinces(false)
      }
    }
    init()
  }, [])

  // Load Cities when province changes
  useEffect(() => {
    if (!selectedProvinceId) {
      setCities([])
      setSelectedCityId('')
      setCity('')
      return
    }

    const loadCities = async () => {
      try {
        setLoadingCities(true)
        const cityList = await publicApi.getCities(selectedProvinceId)
        setCities(cityList)
        setSelectedCityId('')
        setCity('')
      } catch (err) {
        console.error(err)
        toast.error('Gagal memuat daftar kabupaten/kota')
      } finally {
        setLoadingCities(false)
      }
    }
    loadCities()
  }, [selectedProvinceId])

  // Load Districts when city changes
  useEffect(() => {
    if (!selectedCityId) {
      setDistricts([])
      setSelectedDistrictId('')
      setDistrict('')
      return
    }

    const loadDistricts = async () => {
      try {
        setLoadingDistricts(true)
        const districtList = await publicApi.getDistricts(selectedCityId)
        setDistricts(districtList)
        setSelectedDistrictId('')
        setDistrict('')
      } catch (err) {
        console.error(err)
        toast.error('Gagal memuat daftar kecamatan')
      } finally {
        setLoadingDistricts(false)
      }
    }
    loadDistricts()
  }, [selectedCityId])

  // Load Villages when district changes
  useEffect(() => {
    if (!selectedDistrictId) {
      setVillages([])
      setSelectedVillageId('')
      setVillage('')
      return
    }

    const loadVillages = async () => {
      try {
        setLoadingVillages(true)
        const villageList = await publicApi.getVillages(selectedDistrictId)
        setVillages(villageList)
        setSelectedVillageId('')
        setVillage('')
      } catch (err) {
        console.error(err)
        toast.error('Gagal memuat daftar kelurahan/desa')
      } finally {
        setLoadingVillages(false)
      }
    }
    loadVillages()
  }, [selectedDistrictId])

  // Map Filter: Locked Regions Filtering
  const allowedKeywords = lockedRegionsStr
    ? lockedRegionsStr.split(',').map(c => c.trim().toLowerCase()).filter(Boolean)
    : []

  const filteredCities = allowedKeywords.length > 0
    ? cities.filter(c => allowedKeywords.some(keyword => c.name.toLowerCase().includes(keyword)))
    : cities

  // Initialize and mount Leaflet map when step === 3
  useEffect(() => {
    if (step !== 3) return

    let isMounted = true
    let mapInstance: any = null

    const initMap = () => {
      if (!isMounted) return
      const L = (window as any).L
      if (!L) return

      // Clean up previous map instance in DOM to prevent duplication errors
      const container = L.DomUtil.get('register-map')
      if (container) {
        (container as any)._leaflet_id = null
      }

      // Default: Center at Bireuen (-5.2014, 96.7011)
      const initialLat = mapsLat || 5.2014
      const initialLng = mapsLng || 96.7011

      // Set initial values if not set yet
      if (mapsLat === null || mapsLng === null) {
        setMapsLat(initialLat)
        setMapsLng(initialLng)
      }

      // Define Map Layers
      const initialConfig = TILE_LAYERS[mapLayer]
      const tileLayer = L.tileLayer(initialConfig.url, {
        maxZoom: 20,
        attribution: initialConfig.attribution,
      })

      // Create map instance
      mapInstance = L.map('register-map', {
        center: [initialLat, initialLng],
        zoom: mapsLat !== null ? 16 : 12,
        layers: [tileLayer]
      })
      mapRef.current = mapInstance
      tileLayerRef.current = tileLayer

      // Fix Leaflet marker icon paths dynamically
      const DefaultIcon = L.icon({
        iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
        shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
        iconSize: [25, 41],
        iconAnchor: [12, 41],
        popupAnchor: [1, -34],
      })

      const marker = L.marker([initialLat, initialLng], {
        icon: DefaultIcon,
        draggable: true,
      }).addTo(mapInstance)
      markerRef.current = marker

      marker.on('dragend', (e: any) => {
        const pos = e.target.getLatLng()
        setMapsLat(pos.lat)
        setMapsLng(pos.lng)
      })

      mapInstance.on('click', (e: any) => {
        const { lat, lng } = e.latlng
        marker.setLatLng([lat, lng])
        setMapsLat(lat)
        setMapsLng(lng)
      })

      // Auto Geolocation on initial map mount if coordinate was not explicitly set
      if (mapsLat === null || mapsLng === null) {
        if (navigator.geolocation) {
          navigator.geolocation.getCurrentPosition(
            (position) => {
              const lat = position.coords.latitude
              const lng = position.coords.longitude
              if (isMounted) {
                setMapsLat(lat)
                setMapsLng(lng)
                if (mapInstance) {
                  mapInstance.setView([lat, lng], 16)
                }
                if (marker) {
                  marker.setLatLng([lat, lng])
                }
              }
            },
            (err) => {
              console.warn('Auto high accuracy GPS location failed, attempting fallback...', err.message)
              if (navigator.geolocation) {
                navigator.geolocation.getCurrentPosition(
                  (position) => {
                    const lat = position.coords.latitude
                    const lng = position.coords.longitude
                    if (isMounted) {
                      setMapsLat(lat)
                      setMapsLng(lng)
                      if (mapInstance) {
                        mapInstance.setView([lat, lng], 16)
                      }
                      if (marker) {
                        marker.setLatLng([lat, lng])
                      }
                    }
                  },
                  (fallbackErr) => {
                    console.warn('Auto fallback geolocation failed:', fallbackErr.message)
                  },
                  { enableHighAccuracy: false, timeout: 10000, maximumAge: 30000 }
                )
              }
            },
            { enableHighAccuracy: true, timeout: 6000, maximumAge: 0 }
          )
        }
      }
    }

    // Load Leaflet CSS
    if (!document.getElementById('leaflet-css')) {
      const link = document.createElement('link')
      link.id = 'leaflet-css'
      link.rel = 'stylesheet'
      link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css'
      document.head.appendChild(link)
    }

    // Load Leaflet JS
    if (!document.getElementById('leaflet-js')) {
      const script = document.createElement('script')
      script.id = 'leaflet-js'
      script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js'
      script.onload = () => {
        if (isMounted) initMap()
      }
      document.head.appendChild(script)
    } else {
      // Delay slightly to ensure DOM elements are fully rendered
      const timer = setTimeout(() => {
        initMap()
      }, 150)
      return () => clearTimeout(timer)
    }

    return () => {
      isMounted = false
      if (mapInstance) {
        mapInstance.remove()
      }
    }
  }, [step])

  // Validate Step Inputs
  const isStepValid = () => {
    if (step === 1) return selectedPackageId !== ''
    if (step === 2) {
      return (
        validateField('fullName', fullName) === '' &&
        validateField('nik', nik) === '' &&
        validateField('phone', phone) === '' &&
        validateField('email', email) === '' &&
        ktpFile !== null
      )
    }
    if (step === 3) {
      return (
        province.trim() !== '' &&
        city.trim() !== '' &&
        district.trim() !== '' &&
        village.trim() !== '' &&
        validateField('addressDetail', addressDetail) === '' &&
        validateField('rt', rt) === '' &&
        validateField('rw', rw) === '' &&
        ((mapsLat !== null && mapsLng !== null) || googleMapsLink.trim() !== '')
      )
    }
    return true
  }

  // Handle KTP File Selection
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0]
      const ext = file.name.substring(file.name.lastIndexOf('.')).toLowerCase()
      if (!['.jpg', '.jpeg', '.png', '.pdf'].includes(ext)) {
        const errStr = 'Format KTP harus JPG, PNG, atau PDF'
        toast.error(errStr)
        setErrors(prev => ({ ...prev, ktpFile: errStr }))
        return
      }
      if (file.size > 5 * 1024 * 1024) {
        const errStr = 'Ukuran KTP maksimal 5MB'
        toast.error(errStr)
        setErrors(prev => ({ ...prev, ktpFile: errStr }))
        return
      }
      setKtpFile(file)
      setErrors(prev => ({ ...prev, ktpFile: '' }))
      toast.success('KTP berhasil diunggah')
    }
  }

  // Handle Form Submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (submitting) return

    setSubmitting(true)
    const formData = new FormData()
    formData.append('full_name', fullName.trim())
    formData.append('nik', nik.trim())
    formData.append('phone', phone.trim())
    formData.append('email', email.trim())
    formData.append('province', province.trim())
    formData.append('city', city.trim())
    formData.append('district', district.trim())
    formData.append('village', village.trim())
    formData.append('rt', rt.trim())
    formData.append('rw', rw.trim())
    formData.append('address_detail', addressDetail.trim())
    formData.append('package_id', selectedPackageId)

    if (mapsLat !== null) formData.append('maps_lat', mapsLat.toString())
    if (mapsLng !== null) formData.append('maps_lng', mapsLng.toString())
    formData.append('google_maps_link', googleMapsLink.trim())

    if (ktpFile) {
      formData.append('ktp_file', ktpFile)
    }

    if (ontSerialNumber) {
      formData.append('ont_serial_number', ontSerialNumber.trim())
    }
    if (oltPortConfigId) {
      formData.append('olt_port_config_id', oltPortConfigId.trim())
    }

    try {
      const res = await publicApi.submitRegistration(formData)
      setSuccessData({
        regNumber: res.data?.RegNumber || 'REG-PENDING',
        status: res.data?.Status || 'pending_review',
      })
      toast.success('Pendaftaran Berhasil Dikirim!')
      clearSessionStorage()
      setStep(5)
    } catch (err: any) {
      const msg = err.response?.data?.message || err.response?.data?.error?.message || err.response?.data?.error || 'Gagal mengirim pendaftaran. Silakan periksa formulir Anda.'
      toast.error(msg)
    } finally {
      setSubmitting(false)
    }
  }

  const copyRegNumber = () => {
    if (!successData) return
    navigator.clipboard.writeText(successData.regNumber)
    setCopied(true)
    toast.success('Nomor registrasi disalin')
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col justify-between transition-colors duration-200">

      {/* 1. Header Bar */}
      <header className="bg-white dark:bg-slate-900 border-b border-slate-100 dark:border-slate-800/80 px-6 py-4 sticky top-0 z-30 transition-colors">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            {brandLogoUrl ? (
              <img src={brandLogoUrl} alt={brandName} className="h-14 w-auto object-contain" />
            ) : (
              <div className="w-14 h-14 rounded-xl bg-blue-600 flex items-center justify-center shadow-sm">
                <Wifi className="w-7 h-7 text-white" />
              </div>
            )}
            <div>
              <h1 className="text-lg sm:text-xl font-black text-slate-800 dark:text-white leading-none">
                {brandName}
              </h1>
              <p className="text-[11px] text-orange-500 font-extrabold uppercase mt-0.5 tracking-wider">
                Registrasi Pelanggan Baru
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => {
                setStatusPhone('')
                setStatusRegNum('')
                setStatusResult(null)
                setShowStatusModal(true)
              }}
              className="text-xs font-bold text-blue-600 border border-blue-600 px-4 py-2 hover:bg-blue-50 dark:hover:bg-blue-950/20 rounded-xl transition-all shadow-sm flex items-center gap-1.5"
            >
              <FileText className="w-3.5 h-3.5" />
              Cek Status Pendaftaran
            </button>


          </div>
        </div>
      </header>

      {/* 2. Main Wizard Wrapper */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-8 flex flex-col justify-center">

        {step === 1 && (
          <div className="text-center max-w-3xl mx-auto mb-10 mt-4 space-y-4 animate-fade-in">
            <h2 className="text-[35px] sm:text-[48px] font-black text-slate-800 dark:text-white leading-tight tracking-tight">
              {websiteHeroTitle}
            </h2>
            <p className="text-base sm:text-lg text-slate-500 dark:text-slate-400 leading-relaxed font-medium">
              {websiteHeroSubtitle}
            </p>
            <div className="flex justify-center gap-4 pt-2">
              <a
                href={`https://wa.me/${websiteContactPhone}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl text-[18px] font-bold transition-all shadow-sm"
              >
                <span>Hubungi CS (WhatsApp)</span>
              </a>
              <a
                href={`mailto:${websiteContactEmail}`}
                className="inline-flex items-center gap-2 px-6 py-3 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-2xl text-[18px] font-bold transition-all"
              >
                <span>Kirim Email</span>
              </a>
            </div>
          </div>
        )}

        {step < 5 && (
          <div className="space-y-8">
            {/* Step Indicators */}
            <div className="flex items-center justify-between max-w-lg mx-auto relative px-2">
              <div className="absolute top-1/2 left-0 right-0 h-0.5 bg-slate-200 dark:bg-slate-800 -translate-y-1/2 -z-10" />
              <div
                className="absolute top-1/2 left-0 h-0.5 bg-blue-600 -translate-y-1/2 -z-10 transition-all duration-350"
                style={{ width: `${((step - 1) / 3) * 100}%` }}
              />

              {[
                { s: 1, icon: <Wifi className="w-4 h-4" />, label: 'Pilih Paket' },
                { s: 2, icon: <User className="w-4 h-4" />, label: 'Data Diri' },
                { s: 3, icon: <MapPin className="w-4 h-4" />, label: 'Alamat' },
                { s: 4, icon: <CheckCircle className="w-4 h-4" />, label: 'Konfirmasi' },
              ].map((item) => (
                <div key={item.s} className="flex flex-col items-center">
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs border-2 transition-all duration-300 ${step >= item.s
                      ? 'bg-blue-600 border-blue-600 text-white shadow-sm'
                      : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-400 dark:text-slate-500'
                      }`}
                  >
                    {item.icon}
                  </div>
                  <span className={`text-[10px] font-bold mt-2 hidden sm:inline ${step >= item.s ? 'text-slate-800 dark:text-slate-200' : 'text-slate-400 dark:text-slate-500'
                    }`}>
                    {item.label}
                  </span>
                </div>
              ))}
            </div>

            {/* Stepped Content Container */}
            <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-3xl shadow-xl p-6 sm:p-8 border-t-4 border-t-blue-600 transition-colors">

              {/* STEP 1: PILIH PAKET INTERNET */}
              {step === 1 && (
                <div className="space-y-6">
                  <div className="border-b border-slate-100 dark:border-slate-800 pb-4">
                    <h3 className="text-2xl sm:text-[28px] font-bold text-slate-800 dark:text-white">Pilih Paket Internet Terbaik</h3>
                    <p className="text-base text-slate-500 dark:text-slate-400 mt-1">
                      Koneksi internet super cepat dan stabil untuk kebutuhan rumah Anda. Saring paket sesuai harga dan kecepatan.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
                    {/* Left Column: Filter Sidebar */}
                    <div className="lg:col-span-1 space-y-6">
                      <div className="bg-slate-50 dark:bg-slate-950 p-5 rounded-2xl border border-slate-200/60 dark:border-slate-800/80 space-y-5 sticky top-24">
                        <div className="flex items-center gap-2 pb-3 border-b border-slate-200 dark:border-slate-800">
                          <Sparkles className="w-4 h-4 text-blue-600" />
                          <h4 className="text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-305">Filter Paket</h4>
                        </div>

                        {/* Price Filter */}
                        <div className="space-y-3">
                          <h5 className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Kisaran Harga</h5>
                          <div className="space-y-2">
                            {[
                              { label: 'Semua Harga', value: 'all' },
                              { label: 'Rp100rb - Rp299rb', value: '100-300' },
                              { label: 'Rp300rb - Rp499rb', value: '300-500' },
                              { label: 'Rp500rb - Rp1jt', value: '500-1000' },
                              { label: 'Di atas Rp1.000.000', value: 'above-1000' },
                            ].map((opt) => (
                              <label key={opt.value} className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white">
                                <input
                                  type="radio"
                                  name="price_filter"
                                  checked={filterPrice === opt.value}
                                  onChange={() => setFilterPrice(opt.value)}
                                  className="w-4 h-4 text-blue-600 border-slate-300 focus:ring-blue-600"
                                />
                                <span>{opt.label}</span>
                              </label>
                            ))}
                          </div>
                        </div>

                        {/* Speed Filter */}
                        <div className="space-y-3 pt-2">
                          <h5 className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Kecepatan Internet</h5>
                          <div className="space-y-2">
                            {[
                              { label: '10 Mbps', value: 10 },
                              { label: '20 Mbps', value: 20 },
                              { label: '50 Mbps', value: 50 },
                              { label: '75 Mbps', value: 75 },
                              { label: '100 Mbps+', value: 100 },
                            ].map((opt) => {
                              const checked = filterSpeed.includes(opt.value)
                              return (
                                <label key={opt.value} className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white">
                                  <input
                                    type="checkbox"
                                    checked={checked}
                                    onChange={() => {
                                      if (checked) {
                                        setFilterSpeed(filterSpeed.filter(s => s !== opt.value))
                                      } else {
                                        setFilterSpeed([...filterSpeed, opt.value])
                                      }
                                    }}
                                    className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-600"
                                  />
                                  <span>{opt.label}</span>
                                </label>
                              )
                            })}
                          </div>
                        </div>

                        {filterPrice !== 'all' || filterSpeed.length > 0 ? (
                          <button
                            onClick={() => {
                              setFilterPrice('all')
                              setFilterSpeed([])
                            }}
                            className="w-full text-center text-xxs font-bold text-blue-600 hover:underline pt-2"
                          >
                            Reset Filter
                          </button>
                        ) : null}
                      </div>
                    </div>

                    {/* Right Column: Package Cards */}
                    <div className="lg:col-span-3 space-y-4">
                      {/* Alert Info Box */}
                      <div className="bg-blue-50/50 dark:bg-blue-950/10 border border-blue-100/50 dark:border-blue-950/25 rounded-2xl p-4 flex gap-3 items-start">
                        <Info className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                        <div className="text-xs text-blue-800 dark:text-blue-300 font-semibold leading-relaxed">
                          Ketersediaan jaringan dan promo paket khusus ini menyesuaikan wilayah pemasangan (Khusus Wilayah Aceh Bireuen). Harga bulanan sudah termasuk PPN dan biaya pasang.
                        </div>
                      </div>

                      {pkgsLoading ? (
                        <div className="flex flex-col items-center justify-center py-20 gap-3">
                          <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
                          <p className="text-xs text-slate-400 font-semibold uppercase tracking-wider">Memuat daftar paket...</p>
                        </div>
                      ) : filteredPackages.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-16 text-slate-400">
                          <Inbox className="w-12 h-12 mb-3 opacity-60 text-slate-300" />
                          <p className="text-sm font-semibold">Tidak ada paket aktif yang memenuhi kriteria filter.</p>
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          {filteredPackages.map((pkg) => (
                            <div
                              key={pkg.ID}
                              className={`border rounded-3xl p-6 transition-all duration-300 flex flex-col justify-between bg-white dark:bg-slate-900 shadow-sm relative overflow-hidden ${selectedPackageId === pkg.ID
                                ? 'border-orange-500 ring-2 ring-orange-500/10'
                                : 'border-slate-200/60 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 hover:shadow-md'
                                }`}
                            >
                              <div className="space-y-4">
                                <div className="flex items-center justify-between gap-2">
                                  <span className="inline-flex px-2.5 py-0.5 bg-orange-500/15 text-orange-600 text-[9px] font-black rounded-md uppercase tracking-wider">
                                    PROMO TERBATAS
                                  </span>
                                  {selectedPackageId === pkg.ID && (
                                    <span className="w-5 h-5 rounded-full bg-orange-500 text-white flex items-center justify-center shadow-sm">
                                      <Check className="w-3.5 h-3.5 stroke-[3]" />
                                    </span>
                                  )}
                                </div>

                                <div className="space-y-1">
                                  <h4 className="text-lg font-black text-slate-800 dark:text-white leading-tight">
                                    {pkg.Name}
                                  </h4>
                                  <div className="flex items-baseline gap-1 text-blue-600">
                                    <span className="text-3xl font-black">{pkg.SpeedDownMbps}</span>
                                    <span className="text-xs font-black uppercase">Mbps</span>
                                  </div>
                                </div>

                                <p className="text-xs text-slate-400 dark:text-slate-400 leading-normal line-clamp-3">
                                  {pkg.Description || 'Broadband internet super cepat, stabil, tanpa batas kuota (unlimited) menggunakan kabel serat optik murni.'}
                                </p>

                                {/* Device recommendation list */}
                                <div className="bg-slate-50 dark:bg-slate-950 p-3 rounded-xl flex items-center gap-2 border border-slate-100 dark:border-slate-800">
                                  <Wifi className="w-4 h-4 text-emerald-500" />
                                  <span className="text-[11px] font-bold text-slate-600 dark:text-slate-300">
                                    {pkg.DeviceRecommendation || 'Cocok untuk 1 - 3 perangkat terhubung'}
                                  </span>
                                </div>
                              </div>

                              <div className="mt-6 pt-4 border-t border-slate-100 dark:border-slate-800/60">
                                <div className="flex items-baseline justify-between gap-2">
                                  <div>
                                    <span className="text-[9px] text-slate-400 uppercase font-extrabold block">Mulai dari</span>
                                    <span className="text-2xl font-black text-slate-800 dark:text-white">
                                      {formatCurrency(pkg.PriceMonthly)}
                                    </span>
                                    <span className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase"> / Bulan</span>
                                  </div>
                                </div>

                                <button
                                  type="button"
                                  onClick={() => setDetailedPkg(pkg)}
                                  className="w-full mt-4 py-2.5 px-4 rounded-xl text-base font-bold bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition-colors text-center flex items-center justify-center gap-1.5"
                                >
                                  <Info className="w-4 h-4" />
                                  Lihat Detail Paket
                                </button>

                                <button
                                  type="button"
                                  onClick={() => {
                                    setSelectedPackageId(pkg.ID)
                                    setStep(2)
                                  }}
                                  className={`w-full mt-2 py-3 px-4 rounded-xl text-[18px] font-extrabold transition-all text-center flex items-center justify-center gap-1.5 ${selectedPackageId === pkg.ID
                                    ? 'bg-orange-500 hover:bg-orange-600 text-white shadow-sm'
                                    : 'bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-white'
                                    }`}
                                >
                                  Pilih Paket Ini
                                  <ArrowRight className="w-4 h-4" />
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* STEP 2: DATA DIRI PELANGGAN */}
              {step === 2 && (
                <div className="space-y-6">
                  <div className="border-b border-slate-100 dark:border-slate-800 pb-4">
                    <h3 className="text-2xl sm:text-[28px] font-bold text-slate-800 dark:text-white">Informasi Data Diri</h3>
                    <p className="text-base text-slate-500 dark:text-slate-400 mt-1">Lengkapi data pribadi Anda dengan data yang valid dan sesuai KTP asli</p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                    {/* Full Name */}
                    <div className="space-y-1.5">
                      <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                        Nama Lengkap Sesuai KTP <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={fullName}
                        onChange={(e) => handleInputChange('fullName', e.target.value, setFullName)}
                        placeholder="Masukkan Nama Lengkap"
                        className={`w-full px-4 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border ${errors.fullName ? 'border-red-500 focus:border-red-500' : 'border-slate-200/80 dark:border-slate-800 focus:border-blue-600'
                          } text-slate-800 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600/10 text-xs font-semibold`}
                      />
                      {errors.fullName && <p className="text-[10px] text-red-500 dark:text-red-400 font-bold">{errors.fullName}</p>}
                    </div>

                    {/* NIK */}
                    <div className="space-y-1.5">
                      <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                        Nomor NIK KTP <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        maxLength={16}
                        value={nik}
                        onChange={(e) => handleInputChange('nik', e.target.value, setNik)}
                        placeholder="Masukkan NIK KTP"
                        className={`w-full px-4 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border ${errors.nik ? 'border-red-500 focus:border-red-500' : 'border-slate-200/80 dark:border-slate-800 focus:border-blue-600'
                          } text-slate-800 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600/10 text-xs font-semibold`}
                      />
                      {errors.nik && (
                        <p className="text-[10px] text-red-500 dark:text-red-400 font-bold">{errors.nik}</p>
                      )}
                    </div>

                    {/* Phone (WhatsApp) */}
                    <div className="space-y-1.5">
                      <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                        Nomor WhatsApp Aktif <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="tel"
                        value={phone}
                        onChange={(e) => handleInputChange('phone', e.target.value, setPhone)}
                        placeholder="Masukkan Nomor WhatsApp / Telepon"
                        className={`w-full px-4 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border ${errors.phone ? 'border-red-500 focus:border-red-500' : 'border-slate-200/80 dark:border-slate-800 focus:border-blue-600'
                          } text-slate-800 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600/10 text-xs font-semibold`}
                      />
                      {errors.phone && (
                        <p className="text-[10px] text-red-500 dark:text-red-400 font-bold">{errors.phone}</p>
                      )}
                    </div>

                    {/* Email */}
                    <div className="space-y-1.5">
                      <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                        Alamat Email Aktif <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => handleInputChange('email', e.target.value, setEmail)}
                        placeholder="Masukkan Alamat Email"
                        className={`w-full px-4 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border ${errors.email ? 'border-red-500 focus:border-red-500' : 'border-slate-200/80 dark:border-slate-800 focus:border-blue-600'
                          } text-slate-800 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600/10 text-xs font-semibold`}
                      />
                      {errors.email && (
                        <p className="text-[10px] text-red-500 dark:text-red-400 font-bold">{errors.email}</p>
                      )}
                    </div>

                    {/* KTP Upload */}
                    <div className="sm:col-span-2 space-y-1.5">
                      <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                        Unggah Foto KTP Asli <span className="text-red-500">*</span>
                      </label>
                      <div className="relative">
                        <input
                          type="file"
                          accept="image/*,.pdf"
                          id="ktp-file-input"
                          onChange={handleFileChange}
                          className="hidden"
                        />
                        <label
                          htmlFor="ktp-file-input"
                          className={`w-full flex flex-col items-center justify-center px-4 py-8 rounded-2xl border-2 border-dashed transition-all cursor-pointer ${errors.ktpFile
                            ? 'border-red-400 bg-red-50/10 dark:bg-red-950/5'
                            : ktpFile
                              ? 'border-emerald-500 bg-emerald-50/5 dark:bg-emerald-950/5'
                              : 'border-slate-200 hover:border-slate-300 dark:border-slate-800 dark:hover:border-slate-700'
                            }`}
                        >
                          {ktpFile ? (
                            <div className="text-center space-y-2">
                              <CheckCircle className="w-8 h-8 text-emerald-500 mx-auto" />
                              <div className="text-xs font-bold text-slate-800 dark:text-white truncate max-w-xs">{ktpFile.name}</div>
                              <div className="text-[10px] text-slate-400">File berhasil terpilih. Klik untuk mengubah file.</div>
                            </div>
                          ) : (
                            <div className="text-center space-y-2">
                              <Upload className="w-8 h-8 text-slate-400 mx-auto" />
                              <div className="text-xs font-bold text-slate-700 dark:text-slate-300">Pilih Berkas KTP</div>
                              <div className="text-[10px] text-slate-400">Format Gambar (JPG/PNG) atau PDF, maks. 5MB</div>
                            </div>
                          )}
                        </label>
                      </div>
                      {errors.ktpFile && (
                        <p className="text-[10px] text-red-500 dark:text-red-400 font-bold">{errors.ktpFile}</p>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* STEP 3: ALAMAT PEMASANGAN */}
              {step === 3 && (
                <div className="space-y-6">
                  <div className="border-b border-slate-100 dark:border-slate-800 pb-4">
                    <h3 className="text-2xl sm:text-[28px] font-bold text-slate-800 dark:text-white">Alamat Lengkap Pemasangan</h3>
                    <p className="text-base text-slate-500 dark:text-slate-400 mt-1">
                      Ketersediaan layanan saat ini dikunci untuk Provinsi Aceh saja. Mohon pilih kecamatan dan desa dengan benar.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                    {/* Province Selection (Aceh locked) */}
                    <div className="space-y-1.5">
                      <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Provinsi</label>
                      <select
                        disabled
                        value={selectedProvinceId}
                        className="w-full px-4 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 text-slate-500 dark:text-slate-400 text-xs font-semibold cursor-not-allowed"
                      >
                        <option value={selectedProvinceId}>{province || 'Aceh'}</option>
                      </select>
                    </div>

                    {/* City Selection */}
                    <div className="space-y-1.5">
                      <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Kabupaten / Kota</label>
                      <select
                        value={selectedCityId}
                        onChange={(e) => {
                          const id = e.target.value
                          setSelectedCityId(id)
                          const item = filteredCities.find(c => c.id === id)
                          setCity(item ? item.name : '')
                        }}
                        disabled={loadingProvinces || loadingCities || filteredCities.length === 0}
                        className="w-full px-4 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200/80 dark:border-slate-800 text-slate-800 dark:text-white focus:outline-none focus:border-blue-600 text-xs font-semibold"
                      >
                        <option value="">-- Pilih Kota/Kabupaten --</option>
                        {filteredCities.map(item => (
                          <option key={item.id} value={item.id}>{item.name}</option>
                        ))}
                      </select>
                      {loadingCities && <p className="text-[10px] text-blue-500 animate-pulse">Memuat daftar kota...</p>}
                    </div>

                    {/* District Selection */}
                    <div className="space-y-1.5">
                      <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Kecamatan</label>
                      <select
                        value={selectedDistrictId}
                        onChange={(e) => {
                          const id = e.target.value
                          setSelectedDistrictId(id)
                          const item = districts.find(d => d.id === id)
                          setDistrict(item ? item.name : '')
                        }}
                        disabled={loadingCities || loadingDistricts || districts.length === 0}
                        className="w-full px-4 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200/80 dark:border-slate-800 text-slate-800 dark:text-white focus:outline-none focus:border-blue-600 text-xs font-semibold"
                      >
                        <option value="">-- Pilih Kecamatan --</option>
                        {districts.map(item => (
                          <option key={item.id} value={item.id}>{item.name}</option>
                        ))}
                      </select>
                      {loadingDistricts && <p className="text-[10px] text-blue-500 animate-pulse">Memuat daftar kecamatan...</p>}
                    </div>

                    {/* Village Selection */}
                    <div className="space-y-1.5">
                      <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Desa / Kelurahan</label>
                      <select
                        value={selectedVillageId}
                        onChange={(e) => {
                          const id = e.target.value
                          setSelectedVillageId(id)
                          const item = villages.find(v => v.id === id)
                          setVillage(item ? item.name : '')
                        }}
                        disabled={loadingDistricts || loadingVillages || villages.length === 0}
                        className="w-full px-4 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200/80 dark:border-slate-800 text-slate-800 dark:text-white focus:outline-none focus:border-blue-600 text-xs font-semibold"
                      >
                        <option value="">-- Pilih Desa --</option>
                        {villages.map(item => (
                          <option key={item.id} value={item.id}>{item.name}</option>
                        ))}
                      </select>
                      {loadingVillages && <p className="text-[10px] text-blue-500 animate-pulse">Memuat daftar desa...</p>}
                    </div>

                    {/* RT / RW */}
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">RT</label>
                        <input
                          type="text"
                          value={rt}
                          onChange={(e) => handleInputChange('rt', e.target.value, setRt)}
                          placeholder="RT"
                          className="w-full px-4 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200/80 dark:border-slate-800 text-slate-800 dark:text-white focus:outline-none focus:border-blue-600 text-xs font-semibold"
                        />
                        {errors.rt && <p className="text-[10px] text-red-500 font-semibold">{errors.rt}</p>}
                      </div>
                      <div className="space-y-1.5">
                        <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">RW</label>
                        <input
                          type="text"
                          value={rw}
                          onChange={(e) => handleInputChange('rw', e.target.value, setRw)}
                          placeholder="RW"
                          className="w-full px-4 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200/80 dark:border-slate-800 text-slate-800 dark:text-white focus:outline-none focus:border-blue-600 text-xs font-semibold"
                        />
                        {errors.rw && <p className="text-[10px] text-red-500 font-semibold">{errors.rw}</p>}
                      </div>
                    </div>

                    {/* Detail Address / Landmark */}
                    <div className="space-y-1.5">
                      <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Detail Jalan / Landmark Rumah</label>
                      <input
                        type="text"
                        value={addressDetail}
                        onChange={(e) => handleInputChange('addressDetail', e.target.value, setAddressDetail)}
                        placeholder="Masukkan Alamat Lengkap & Patokan"
                        className={`w-full px-4 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border ${errors.addressDetail ? 'border-red-500' : 'border-slate-200/80 dark:border-slate-800'
                          } text-slate-800 dark:text-white focus:outline-none focus:border-blue-600 text-xs font-semibold`}
                      />
                      {errors.addressDetail && <p className="text-[10px] text-red-500 font-semibold">{errors.addressDetail}</p>}
                    </div>

                    {/* Google Maps Link Input */}
                    <div className="sm:col-span-2 space-y-1.5 pt-1">
                      <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                        <Map className="w-4 h-4 text-blue-500" />
                        Link Google Maps Rumah Anda (Opsional)
                      </label>
                      <input
                        type="url"
                        value={googleMapsLink}
                        onChange={(e) => handleGoogleMapsLinkChange(e.target.value)}
                        placeholder="Masukkan Link Share Lokasi Google Maps (misal: https://maps.google.com/?q=5.201,96.701)"
                        className="w-full px-4 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200/80 dark:border-slate-800 text-slate-800 dark:text-white focus:outline-none focus:border-blue-600 text-xs font-semibold"
                      />
                      <p className="text-[9px] text-slate-400 font-medium">
                        Anda dapat menyalin link lokasi rumah dari aplikasi Google Maps, lalu menempelkannya di sini (koordinat akan otomatis terdeteksi).
                      </p>
                    </div>

                    {/* GPS Coordinates Peta */}
                    <div className="sm:col-span-2 space-y-3 pt-2">
                      <div className="flex items-center justify-between gap-2 flex-wrap pb-1">
                        <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                          <Map className="w-4 h-4 text-[#E41A26]" />
                          Tandai Lokasi Rumah Anda (Peta Realtime Satelit) <span className="text-red-500">*</span>
                        </label>
                        <div className="flex items-center gap-2 flex-wrap">
                          {/* Map Layer Switcher Pills */}
                          <div className="flex items-center bg-slate-100 dark:bg-slate-900 p-1 rounded-xl border border-slate-200 dark:border-slate-800 gap-1 text-[10px]">
                            {(['google_street', 'google_hybrid', 'carto_dark', 'osm'] as const).map((layerKey) => (
                              <button
                                type="button"
                                key={layerKey}
                                onClick={() => setMapLayer(layerKey)}
                                className={`px-2 py-1 rounded-lg font-medium transition-all ${
                                  mapLayer === layerKey
                                    ? 'bg-blue-600 text-white font-semibold shadow-xs'
                                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                                }`}
                              >
                                {TILE_LAYERS[layerKey].name}
                              </button>
                            ))}
                          </div>

                          <button
                            type="button"
                            onClick={handleLocateUser}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-50 hover:bg-red-100 dark:bg-red-950/20 text-[#E41A26] text-[10px] font-bold transition-all shadow-sm border border-red-100/50"
                          >
                            <Locate className="w-3.5 h-3.5" />
                            Gunakan GPS Saya
                          </button>
                          <span className="font-mono text-[#E41A26] text-[10px] font-extrabold bg-red-50/40 dark:bg-red-950/20 px-2 py-1 rounded-lg">
                            {mapsLat !== null && mapsLng !== null
                              ? `${mapsLat.toFixed(6)}, ${mapsLng.toFixed(6)}`
                              : 'Belum ditentukan'}
                          </span>
                        </div>
                      </div>

                      <div
                        id="register-map"
                        className="w-full h-[320px] md:h-[480px] rounded-3xl border border-slate-200/80 dark:border-slate-800 overflow-hidden z-10 shadow-lg"
                      ></div>

                      <p className="text-[10px] text-slate-400 dark:text-slate-500 leading-normal font-semibold flex items-start gap-1.5 mt-1.5">
                        <Info className="w-3.5 h-3.5 text-blue-600 dark:text-blue-500 flex-shrink-0 mt-0.5" />
                        <span>Gunakan tombol layer di kanan atas peta untuk beralih ke mode Google Hybrid (Satelit) agar mempermudah mencari atap rumah Anda. Geser pin merah tepat di atas atap rumah Anda.</span>
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* STEP 4: KONFIRMASI DATA */}
              {step === 4 && (
                <div className="space-y-6">
                  <div className="border-b border-slate-100 dark:border-slate-800 pb-4">
                    <h3 className="text-2xl sm:text-[28px] font-bold text-slate-800 dark:text-white">Tinjau Pendaftaran Anda</h3>
                    <p className="text-base text-slate-500 dark:text-slate-400 mt-1">Periksa kembali seluruh data pribadi dan koordinat peta sebelum mengirim pendaftaran</p>
                  </div>

                  <div className="space-y-4">
                    {/* Selected Package Details */}
                    {selectedPackage && (
                      <div className="bg-blue-50/50 dark:bg-blue-950/10 border border-blue-200/60 rounded-2xl p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-900/30 text-blue-600 flex items-center justify-center flex-shrink-0">
                            <Wifi className="w-5 h-5" />
                          </div>
                          <div>
                            <h4 className="text-sm font-black text-slate-800 dark:text-white">{selectedPackage.Name}</h4>
                            <p className="text-xxs text-slate-400 dark:text-slate-500 mt-0.5 uppercase tracking-wider font-extrabold">
                              Kecepatan: {selectedPackage.SpeedDownMbps} Mbps | Bulanan: {formatCurrency(selectedPackage.PriceMonthly)}
                            </p>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => setStep(1)}
                          className="text-xxs font-bold text-blue-600 hover:underline"
                        >
                          Ubah Paket
                        </button>
                      </div>
                    )}

                    {/* Customer Personal Details summary */}
                    <div className="border border-slate-200/60 dark:border-slate-800 rounded-2xl p-5 space-y-4">
                      <div className="flex justify-between items-center pb-2 border-b border-slate-100 dark:border-slate-800/60">
                        <h4 className="text-xs font-black text-slate-800 dark:text-white uppercase tracking-wider">Data Diri & Alamat</h4>
                        <button
                          type="button"
                          onClick={() => setStep(2)}
                          className="text-xxs font-bold text-blue-600 hover:underline"
                        >
                          Ubah
                        </button>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xxs font-semibold text-slate-600 dark:text-slate-400">
                        <div className="space-y-1">
                          <span className="text-slate-400 uppercase tracking-wider block font-bold">Nama Lengkap</span>
                          <span className="text-slate-800 dark:text-slate-200">{fullName}</span>
                        </div>
                        <div className="space-y-1">
                          <span className="text-slate-400 uppercase tracking-wider block font-bold">NIK KTP</span>
                          <span className="text-slate-800 dark:text-slate-200">{nik}</span>
                        </div>
                        <div className="space-y-1">
                          <span className="text-slate-400 uppercase tracking-wider block font-bold">No. WhatsApp</span>
                          <span className="text-slate-800 dark:text-slate-200">{phone}</span>
                        </div>
                        <div className="space-y-1">
                          <span className="text-slate-400 uppercase tracking-wider block font-bold">Email</span>
                          <span className="text-slate-800 dark:text-slate-200">{email}</span>
                        </div>
                        <div className="sm:col-span-2 space-y-1">
                          <span className="text-slate-400 uppercase tracking-wider block font-bold">Alamat Lengkap</span>
                          <span className="text-slate-800 dark:text-slate-200">
                            {village ? `${village}, ` : ''}
                            {district ? `Kec. ${district}, ` : ''}
                            {city ? `${city}, ` : ''}
                            {province || 'Aceh'}
                            {rt ? ` (RT. ${rt} / RW. ${rw})` : ''}
                          </span>
                        </div>
                        <div className="sm:col-span-2 space-y-1">
                          <span className="text-slate-400 uppercase tracking-wider block font-bold">Koordinat Maps</span>
                          <span className="text-slate-800 dark:text-slate-200 font-mono">
                            {mapsLat !== null && mapsLng !== null ? `${mapsLat}, ${mapsLng}` : 'Belum ditentukan'}
                          </span>
                        </div>
                        {googleMapsLink.trim() !== '' && (
                          <div className="sm:col-span-2 space-y-1">
                            <span className="text-slate-400 uppercase tracking-wider block font-bold">Link Google Maps</span>
                            <a
                              href={googleMapsLink}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-blue-600 dark:text-blue-450 hover:underline break-all"
                            >
                              {googleMapsLink}
                            </a>
                          </div>
                        )}
                        <div className="sm:col-span-2 space-y-1">
                          <span className="text-slate-400 uppercase tracking-wider block font-bold font-sans">Detail Lokasi & Landmark</span>
                          <span className="font-semibold text-slate-800 dark:text-slate-300 leading-relaxed block bg-slate-50 dark:bg-slate-950 p-2.5 rounded-lg border border-slate-100 dark:border-slate-800">
                            {addressDetail}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Terms & Conditions Check */}
                  <div className="pt-2 flex items-start gap-2.5">
                    <input
                      type="checkbox"
                      id="terms"
                      defaultChecked
                      className="mt-0.5 w-4 h-4 rounded text-blue-600 border-slate-300 focus:ring-blue-600"
                    />
                    <label htmlFor="terms" className="text-xxs text-slate-400 dark:text-slate-500 font-semibold leading-normal">
                      Saya menyatakan bahwa semua data yang saya masukkan adalah benar, akurat, dan lengkap. Saya bersedia dihubungi oleh petugas survei lokasi {brandName} untuk koordinasi kelayakan jaringan.
                    </label>
                  </div>
                </div>
              )}

              {/* Navigation Action Buttons (Footer of Form Card) */}
              <div className="flex items-center justify-between border-t border-slate-100 dark:border-slate-800/60 pt-6 mt-8">
                {step > 1 ? (
                  <button
                    type="button"
                    onClick={() => setStep(step - 1)}
                    className="flex items-center gap-2 py-3 px-5 rounded-xl border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 text-[18px] font-bold transition-all"
                  >
                    <ArrowLeft className="w-5 h-5" />
                    Sebelumnya
                  </button>
                ) : (
                  <div />
                )}

                {step < 4 ? (
                  <button
                    type="button"
                    onClick={() => setStep(step + 1)}
                    disabled={!isStepValid()}
                    className="flex items-center gap-2 py-3 px-6 rounded-xl bg-orange-500 hover:bg-orange-600 text-white text-[18px] font-bold shadow-sm disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                  >
                    Selanjutnya
                    <ArrowRight className="w-5 h-5" />
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={handleSubmit}
                    disabled={submitting}
                    className="flex items-center gap-2 py-3 px-7 rounded-xl bg-orange-500 hover:bg-orange-600 text-white text-[18px] font-extrabold shadow-sm disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                  >
                    {submitting ? (
                      <><Loader2 className="w-5 h-5 animate-spin" /> Mengirim...</>
                    ) : (
                      <>
                        Kirim Pendaftaran
                        <ArrowRight className="w-5 h-5" />
                      </>
                    )}
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* 3. SUCCESS STATE PANEL (Step 5) */}
        {step === 5 && successData && (
          <div className="max-w-md w-full mx-auto text-center space-y-6 animate-fade-in">
            <div className="w-20 h-20 mx-auto flex items-center justify-center bg-emerald-500/10 rounded-2xl border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 shadow-sm">
              <CheckCircle className="w-10 h-10" />
            </div>

            <div className="space-y-2">
              <h2 className="text-2xl font-black text-slate-800 dark:text-white tracking-tight">Pendaftaran Terkirim</h2>
              <p className="text-xs text-slate-400 dark:text-slate-500 max-w-sm mx-auto leading-relaxed font-semibold">
                Terima kasih telah mempercayai {brandName}. Pengajuan berlangganan internet Anda telah kami terima untuk diproses lebih lanjut.
              </p>
            </div>

            {/* Ticket Card Details */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800 rounded-2xl p-6 shadow-lg dark:shadow-black/30 text-left space-y-5 relative overflow-hidden border-t-2 border-t-blue-600">
              <div className="space-y-1">
                <span className="text-[10px] text-slate-400 dark:text-slate-500 uppercase font-extrabold tracking-wider leading-none">Nomor Registrasi Anda</span>
                <div className="flex items-center justify-between gap-3 pt-1">
                  <span className="text-lg font-black text-blue-700 dark:text-blue-450 tracking-wide font-mono">
                    {successData.regNumber}
                  </span>
                  <button
                    onClick={copyRegNumber}
                    className="p-2 hover:bg-slate-50 dark:hover:bg-slate-800 border border-slate-200/50 dark:border-slate-800 rounded-xl text-slate-500 dark:text-slate-400 transition-all shadow-sm"
                    title="Salin Nomor Registrasi"
                  >
                    {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>

              <div className="border-t border-slate-100 dark:border-slate-800/60 pt-4 flex items-center justify-between text-xs font-semibold text-slate-600 dark:text-slate-400">
                <span>Status Pengajuan:</span>
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-yellow-50 dark:bg-yellow-500/10 text-yellow-750 dark:text-yellow-450 border border-yellow-150/60 dark:border-yellow-950/20">
                  Menunggu Review
                </span>
              </div>

              <div className="bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 p-4 rounded-xl space-y-2.5">
                <p className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider flex items-center gap-1.5 leading-none">
                  <Sparkles className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" /> Tahapan Selanjutnya
                </p>
                <ol className="text-xxs text-slate-600 dark:text-slate-400 space-y-2 list-decimal list-inside font-semibold leading-relaxed">
                  <li>Petugas CS kami akan memverifikasi alamat pemasangan Anda (maks. 24 jam).</li>
                  <li>Tim teknisi akan melakukan survei lapangan untuk mengecek ketersediaan tiang ODP {brandName}.</li>
                  <li>Jika lokasi terjangkau, jadwal survei dan instalasi akan dikonfirmasi lewat WhatsApp.</li>
                </ol>
              </div>
            </div>

            <div className="pt-2 flex flex-col sm:flex-row gap-3 justify-center">
              <button
                type="button"
                onClick={() => {
                  setStatusPhone(phone)
                  setStatusRegNum(successData.regNumber)
                  setShowStatusModal(true)
                  // Trigger status check immediately
                  const reqWrapper = async () => {
                    try {
                      setStatusLoading(true)
                      setStatusResult(null)
                      const res = await publicApi.checkStatus(phone.trim(), successData.regNumber.trim())
                      if (res.data) {
                        setStatusResult(res.data)
                      }
                    } catch (err) {
                      console.error(err)
                    } finally {
                      setStatusLoading(false)
                    }
                  }
                  reqWrapper()
                }}
                className="inline-flex items-center justify-center py-2.5 px-6 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-sm transition-all gap-1.5"
              >
                <FileText className="w-4 h-4" />
                Cek Status Pengajuan Saya
              </button>
            </div>
          </div>
        )}
      </main>

      {/* 4.5 Package Details Modal */}
      {detailedPkg && (
        <div className="fixed inset-0 bg-slate-900/60 dark:bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto animate-fade-in">
          <div className="bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800 rounded-3xl w-full max-w-lg shadow-2xl relative overflow-hidden my-8" onClick={(e) => e.stopPropagation()}>
            {/* Header */}
            <div className="border-b border-slate-100 dark:border-slate-800 px-6 py-5 flex items-start justify-between bg-slate-50/50 dark:bg-slate-950/20">
              <div className="space-y-1">
                <span className="inline-flex px-2 py-0.5 bg-orange-500/15 text-orange-600 text-[9px] font-black rounded-md uppercase tracking-wider">
                  Detail Layanan Paket
                </span>
                <h3 className="text-lg font-black text-slate-800 dark:text-white leading-tight mt-1">{detailedPkg.Name}</h3>
              </div>
              <button
                onClick={() => setDetailedPkg(null)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-white transition-colors p-1.5 rounded-lg hover:bg-slate-200/40 dark:hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Content */}
            <div className="p-6 max-h-[70vh] overflow-y-auto space-y-6">
              {/* Speed and Price block */}
              <div className="flex items-center justify-between bg-blue-50/50 dark:bg-slate-950/40 p-4 rounded-2xl border border-blue-100/50 dark:border-slate-800">
                <div className="flex items-center gap-2.5">
                  <div className="w-10 h-10 rounded-xl bg-blue-500/10 dark:bg-blue-500/20 flex items-center justify-center text-blue-600 dark:text-blue-400">
                    <Wifi className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block">Kecepatan</span>
                    <span className="text-xl font-black text-slate-850 dark:text-white">{detailedPkg.SpeedDownMbps} Mbps</span>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block">Harga Bulanan</span>
                  <span className="text-xl font-black text-blue-600 dark:text-blue-400">{formatCurrency(detailedPkg.PriceMonthly)}</span>
                  <span className="text-[10px] text-slate-400">/bulan</span>
                </div>
              </div>

              {/* Specifications */}
              <div className="space-y-4">
                <h4 className="text-xs font-black text-slate-400 dark:text-slate-500 uppercase tracking-wider">Spesifikasi Layanan</h4>

                <div className="space-y-3">
                  {/* Perangkat Terhubung */}
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-lg bg-slate-50 dark:bg-slate-950 flex items-center justify-center text-slate-500 border border-slate-100 dark:border-slate-800">
                      <Layers className="w-4 h-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-baseline">
                        <span className="text-xs font-bold text-slate-700 dark:text-slate-350">Rekomendasi Perangkat</span>
                        <span className="text-xs font-black text-slate-800 dark:text-slate-100">{detailedPkg.DeviceRecommendation || 'Cocok untuk 1 - 3 perangkat'}</span>
                      </div>
                      <p className="text-[10px] text-slate-400 mt-0.5">Jumlah perangkat ideal terhubung bersamaan agar performa stabil</p>
                    </div>
                  </div>

                  {/* Biaya Pasang */}
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-lg bg-slate-50 dark:bg-slate-950 flex items-center justify-center text-slate-500 border border-slate-100 dark:border-slate-800">
                      <Activity className="w-4 h-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-baseline">
                        <span className="text-xs font-bold text-slate-700 dark:text-slate-350">Biaya Pasang (Instalasi)</span>
                        <span className="text-xs font-black text-slate-850 dark:text-slate-100">{formatCurrency(detailedPkg.PriceInstallation)}</span>
                      </div>
                      <p className="text-[10px] text-slate-400 mt-0.5">Biaya sekali bayar untuk penarikan kabel fiber optik & ONT Router</p>
                    </div>
                  </div>

                  {/* Fitur Teknis / VLAN */}
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-lg bg-slate-50 dark:bg-slate-950 flex items-center justify-center text-slate-500 border border-slate-100 dark:border-slate-800">
                      <Tv className="w-4 h-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-baseline">
                        <span className="text-xs font-bold text-slate-700 dark:text-slate-350">Koneksi Layanan</span>
                        <span className="text-xs font-black text-slate-800 dark:text-slate-100">100% Fiber Optic</span>
                      </div>
                      <p className="text-[10px] text-slate-400 mt-0.5">Jaringan stabil, latensi rendah, & VLAN ID {detailedPkg.VlanID || 100}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* General terms / Accordion */}
              <div className="border-t border-slate-100 dark:border-slate-800 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAccordion(!showAccordion)}
                  className="w-full flex items-center justify-between py-2 text-left font-bold text-slate-800 dark:text-slate-200 text-xs uppercase tracking-wider"
                >
                  <span>Petunjuk Umum</span>
                  {showAccordion ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
                </button>

                {showAccordion && (
                  <div className="mt-2 text-xs text-slate-500 dark:text-slate-400 space-y-2 pl-1 leading-relaxed">
                    {detailedPkg.Terms && detailedPkg.Terms.trim() ? (
                      detailedPkg.Terms.split('\n')
                        .map((term: string) => term.trim())
                        .filter(Boolean)
                        .map((term: string, index: number) => (
                          <div key={index} className="flex gap-2">
                            <span className="font-extrabold text-blue-600 dark:text-blue-500">{index + 1}.</span>
                            <span>{term}</span>
                          </div>
                        ))
                    ) : (
                      <>
                        <div className="flex gap-2">
                          <span className="font-extrabold text-blue-600 dark:text-blue-500">1.</span>
                          <span>Pembayaran tagihan bulanan dilakukan pascapasang setelah Wifi aktif dan terpasang dengan baik.</span>
                        </div>
                        <div className="flex gap-2">
                          <span className="font-extrabold text-blue-600 dark:text-blue-500">2.</span>
                          <span>Biaya instalasi dibayarkan satu kali setelah teknisi resmi menyelesaikan setup router & kabel di rumah.</span>
                        </div>
                        <div className="flex gap-2">
                          <span className="font-extrabold text-blue-600 dark:text-blue-500">3.</span>
                          <span>Layanan menggunakan koneksi serat optik murni tanpa kuota FUP (Full Unlimited 24 Jam).</span>
                        </div>
                      </>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Footer / Select button */}
            <div className="border-t border-slate-100 dark:border-slate-800/80 px-6 py-4 bg-slate-50/50 dark:bg-slate-950/20 flex justify-end">
              <button
                type="button"
                onClick={() => {
                  setSelectedPackageId(detailedPkg.ID)
                  setDetailedPkg(null)
                  setStep(2)
                }}
                className="w-full py-3 px-5 rounded-2xl bg-orange-500 hover:bg-orange-600 text-white font-extrabold text-xs shadow-md transition-all text-center flex items-center justify-center gap-1.5"
              >
                Pilih Paket Ini
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 5. Customer Status Inquiry Modal */}
      {showStatusModal && (
        <div className="fixed inset-0 bg-slate-900/60 dark:bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto animate-fade-in">
          <div className="bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800 rounded-3xl w-full max-w-xl shadow-2xl relative overflow-hidden my-8">
            {/* Header */}
            <div className="border-b border-slate-100 dark:border-slate-800 px-6 py-4 flex items-center justify-between bg-slate-50/50 dark:bg-slate-950/20">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-blue-600 dark:text-blue-500" />
                <h3 className="text-sm font-black text-slate-800 dark:text-white uppercase tracking-wider">Cek Status Pendaftaran</h3>
              </div>
              <button
                onClick={() => {
                  setShowStatusModal(false)
                  setStatusResult(null)
                }}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-white transition-colors p-1.5 rounded-lg hover:bg-slate-200/40 dark:hover:bg-slate-800"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Content */}
            <div className="p-6 max-h-[75vh] overflow-y-auto space-y-6">
              {/* Form Search */}
              <form onSubmit={handleCheckStatus} className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-end bg-slate-50 dark:bg-slate-950/60 p-4 rounded-2xl border border-slate-100 dark:border-slate-800/60">
                <div className="space-y-1.5">
                  <label className="block text-[10px] font-extrabold text-slate-550 dark:text-slate-400 uppercase tracking-wider">No. WhatsApp</label>
                  <input
                    type="tel"
                    value={statusPhone}
                    onChange={(e) => setStatusPhone(e.target.value)}
                    placeholder="Masukkan Nomor WhatsApp"
                    className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-white placeholder-slate-400 focus:outline-none focus:border-blue-600 text-xs font-semibold"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="block text-[10px] font-extrabold text-slate-550 dark:text-slate-400 uppercase tracking-wider">No. Registrasi</label>
                  <input
                    type="text"
                    value={statusRegNum}
                    onChange={(e) => setStatusRegNum(e.target.value)}
                    placeholder="Masukkan Nomor Registrasi"
                    className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-white placeholder-slate-400 focus:outline-none focus:border-blue-600 text-xs font-semibold font-mono"
                  />
                </div>
                <div className="sm:col-span-2 pt-2">
                  <button
                    type="submit"
                    disabled={statusLoading}
                    className="w-full flex items-center justify-center gap-1.5 py-2.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-all shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {statusLoading ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <CheckCircle className="w-3.5 h-3.5" />
                    )}
                    Cari Pendaftaran
                  </button>
                </div>
              </form>

              {/* Inquiry Result */}
              {statusResult && (
                <div className="space-y-6 animate-fade-in">
                  {/* Summary info card */}
                  <div className="border border-slate-200/60 dark:border-slate-800/80 rounded-2xl p-5 space-y-3.5 bg-slate-50/20 dark:bg-slate-900/10">
                    <div className="flex justify-between items-center gap-2 pb-2 border-b border-slate-100 dark:border-slate-800/60">
                      <div>
                        <p className="text-[10px] text-slate-400 dark:text-slate-500 uppercase font-extrabold">Nama Pelanggan</p>
                        <h4 className="text-sm font-black text-slate-800 dark:text-white leading-tight">{statusResult.full_name}</h4>
                      </div>
                      <div className="text-right flex flex-col items-end gap-1">
                        <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800/80 px-2 py-1 rounded-lg border border-slate-200/40 dark:border-slate-750/30">
                          <span className="text-[10px] text-slate-750 dark:text-slate-300 font-extrabold font-mono">{statusResult.reg_number}</span>
                          <button
                            type="button"
                            onClick={() => {
                              navigator.clipboard.writeText(statusResult.reg_number)
                              toast.success('Nomor registrasi disalin')
                            }}
                            className="text-slate-400 hover:text-slate-600 dark:hover:text-white transition-colors"
                            title="Salin Nomor Registrasi"
                          >
                            <Copy className="w-3 h-3" />
                          </button>
                        </div>
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[9px] font-bold bg-blue-50 dark:bg-blue-500/10 text-blue-700 dark:text-blue-400 border border-blue-200/60 dark:border-blue-950/20">
                          {statusResult.status_label || statusResult.status}
                        </span>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3 text-xxs font-semibold text-slate-550 dark:text-slate-400">
                      <div>
                        <span className="text-slate-400 dark:text-slate-550 font-bold block uppercase tracking-wider">Wilayah</span>
                        <span className="font-semibold text-slate-800 dark:text-slate-300">
                          {statusResult.village}, {statusResult.district}, {statusResult.city}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-400 dark:text-slate-550 font-bold block uppercase tracking-wider">Tanggal Daftar</span>
                        <span className="font-semibold text-slate-800 dark:text-slate-300">
                          {new Date(statusResult.created_at).toLocaleDateString('id-ID', {
                            day: 'numeric',
                            month: 'long',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Logs Timeline */}
                  <div className="space-y-4">
                    <h4 className="text-xs font-black text-slate-800 dark:text-white uppercase tracking-wider flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                      Riwayat Proses Pemasangan
                    </h4>

                    {(!statusResult.logs || statusResult.logs.length === 0) ? (
                      <p className="text-xxs text-slate-400 dark:text-slate-555 leading-relaxed font-semibold italic">Belum ada riwayat proses log pemasangan.</p>
                    ) : (
                      <div className="relative pl-6 space-y-5 border-l-2 border-slate-100 dark:border-slate-800 ml-3 pt-1">
                        {[...statusResult.logs].reverse().map((log: any, idx: number) => {
                          const colors = getStatusTimelineColor(log.status_to || log.label)
                          return (
                            <div key={idx} className="relative animate-fade-in">
                              {/* Dot indicator */}
                              <span className={`absolute -left-[30px] top-0.5 w-4 h-4 rounded-full ${colors.bg} border-2 ${colors.border} flex items-center justify-center shadow-sm`}>
                                <span className={`w-1.5 h-1.5 ${colors.dot} rounded-full`} />
                              </span>

                              <div className="space-y-1">
                                <div className="flex justify-between items-baseline gap-2 flex-wrap">
                                  <span className={`text-xs font-bold ${colors.text}`}>{log.label || log.status_to}</span>
                                  <span className="text-[10px] text-slate-400 dark:text-slate-500 font-semibold font-mono">
                                    {new Date(log.created_at).toLocaleDateString('id-ID', {
                                      day: 'numeric',
                                      month: 'short',
                                      hour: '2-digit',
                                      minute: '2-digit'
                                    })}
                                  </span>
                                </div>
                                {log.reason && (
                                  <p className="text-xxs text-slate-500 dark:text-slate-400 leading-relaxed font-medium bg-slate-50 dark:bg-slate-950 p-2 rounded-lg border border-slate-100 dark:border-slate-800/60">
                                    Keterangan: {log.reason}
                                  </p>
                                )}
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 4. Premium Dark Footer (IndiHome-style) */}
      <footer className="bg-blue-950 text-white border-t border-slate-800 pt-12 pb-6 px-6 transition-colors">
        <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-8 pb-8 border-b border-white/10">

          {/* Column 1: Brand Info */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              {brandLogoUrl ? (
                <img src={brandLogoUrl} alt={brandName} className="h-10 w-auto object-contain" />
              ) : (
                <div className="w-10 h-10 rounded-lg bg-orange-500 flex items-center justify-center">
                  <Wifi className="w-5 h-5 text-white" />
                </div>
              )}
              <span className="font-black text-lg tracking-tight">{brandName}</span>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed max-w-sm">
              {brandFooterTagline}
            </p>
            <div className="text-[11px] text-slate-400 space-y-1.5 pt-2">
              {websiteAddress && (
                <p className="leading-relaxed">
                  <span className="font-bold text-slate-300 block">Alamat Kantor:</span>
                  {websiteAddress}
                </p>
              )}
              {websiteContactPhone && (
                <p>
                  <span className="font-bold text-slate-300">WhatsApp:</span> {websiteContactPhone}
                </p>
              )}
              {websiteContactEmail && (
                <p>
                  <span className="font-bold text-slate-300">Email:</span> {websiteContactEmail}
                </p>
              )}
            </div>
            <div className="space-y-2 pt-2">
              <span className="text-[10px] text-slate-400 uppercase font-extrabold block">Download App Kami</span>
              <div className="flex items-center gap-2">
                <a href="#appstore" className="hover:opacity-85 transition-opacity">
                  <img src="https://upload.wikimedia.org/wikipedia/commons/3/3c/Download_on_the_App_Store_Badge.svg" alt="App Store" className="h-8" />
                </a>
                <a href="#googleplay" className="hover:opacity-85 transition-opacity">
                  <img src="https://upload.wikimedia.org/wikipedia/commons/7/78/Google_Play_Store_badge_EN.svg" alt="Google Play" className="h-8" />
                </a>
              </div>
            </div>
          </div>

          {/* Column 2: Quick Links */}
          <div className="space-y-3">
            <h4 className="text-xs font-black uppercase tracking-wider text-slate-400">Tautan Layanan</h4>
            <ul className="space-y-2.5 text-xs text-slate-300 font-semibold">
              {brandFooterLinks.length > 0 ? (
                brandFooterLinks.map((link, idx) => (
                  <li key={idx}>
                    <a href={link.url} className="hover:text-white transition-colors">{link.label}</a>
                  </li>
                ))
              ) : (
                <>
                  <li><a href="#about" className="hover:text-white transition-colors">Tentang Kami</a></li>
                  <li><a href="#help" className="hover:text-white transition-colors font-sans">Pusat Bantuan</a></li>
                  <li><a href="#faq" className="hover:text-white transition-colors font-sans">FAQ & Panduan</a></li>
                  <li><a href="#coverage" className="hover:text-white transition-colors font-sans">Cakupan Area</a></li>
                </>
              )}
            </ul>
          </div>

          {/* Column 3: Social Media Links */}
          <div className="space-y-3">
            <h4 className="text-xs font-black uppercase tracking-wider text-slate-400">Media Sosial Kami</h4>
            <div className="flex items-center gap-3">
              {brandFooterSocials.length > 0 ? (
                brandFooterSocials.map((soc, idx) => {
                  const platform = soc.platform.toLowerCase()
                  let icon = <Globe className="w-4 h-4" />
                  if (platform.includes('facebook') || platform === 'fb') {
                    icon = <Facebook className="w-4 h-4" />
                  } else if (platform.includes('instagram') || platform === 'ig') {
                    icon = <Instagram className="w-4 h-4" />
                  } else if (platform.includes('twitter') || platform.includes('x.com') || platform === 'tw') {
                    icon = <Twitter className="w-4 h-4" />
                  } else if (platform.includes('youtube') || platform === 'yt') {
                    icon = <Youtube className="w-4 h-4" />
                  } else if (platform.includes('linkedin')) {
                    icon = <Linkedin className="w-4 h-4" />
                  }

                  return (
                    <a
                      key={idx}
                      href={soc.url}
                      target="_blank"
                      rel="noreferrer"
                      className="w-8 h-8 rounded-full bg-white/10 hover:bg-orange-500 flex items-center justify-center text-white transition-all shadow-sm"
                      title={soc.platform}
                    >
                      {icon}
                    </a>
                  )
                })
              ) : (
                <>
                  <a href="https://facebook.com" target="_blank" rel="noreferrer" className="w-8 h-8 rounded-full bg-white/10 hover:bg-blue-650 flex items-center justify-center text-white transition-all shadow-sm" title="Facebook"><Facebook className="w-4 h-4" /></a>
                  <a href="https://instagram.com" target="_blank" rel="noreferrer" className="w-8 h-8 rounded-full bg-white/10 hover:bg-orange-500 flex items-center justify-center text-white transition-all shadow-sm" title="Instagram"><Instagram className="w-4 h-4" /></a>
                  <a href="https://twitter.com" target="_blank" rel="noreferrer" className="w-8 h-8 rounded-full bg-white/10 hover:bg-sky-500 flex items-center justify-center text-white transition-all shadow-sm" title="Twitter"><Twitter className="w-4 h-4" /></a>
                </>
              )}
            </div>
          </div>

          {/* Column 4: Red Brand Highlight Logo */}
          <div className="flex flex-col items-start md:items-end justify-between space-y-4">
            <div className="text-left md:text-right">
              <span className="text-[10px] text-slate-400 uppercase font-extrabold block">Bekerja Sama Dengan</span>
              <span className="text-sm font-black text-white">{brandName} Network</span>
            </div>
            <div className="h-10 w-24 bg-white/10 border border-white/10 rounded-xl flex items-center justify-center text-[10px] font-black uppercase tracking-wider">
              100% Fiber
            </div>
          </div>

        </div>

        {/* Bottom copyright row */}
        <div className="max-w-7xl mx-auto pt-6 flex flex-col md:flex-row items-center justify-between gap-4 text-[10px] text-slate-400 font-bold uppercase tracking-wider">
          <span>{brandFooterCopyright}</span>
          <div className="flex gap-4">
            <a href="#terms" className="hover:text-white transition-colors">Syarat & Ketentuan</a>
            <a href="#privacy" className="hover:text-white transition-colors">Kebijakan Privasi</a>
          </div>
        </div>
      </footer>
    </div>
  )
}

