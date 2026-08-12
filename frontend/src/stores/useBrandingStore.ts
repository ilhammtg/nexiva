import { create } from 'zustand'
import { publicApi } from '@/features/public/api/publicApi'

export interface BrandingConfig {
  locked_regions: string
  brand_name: string
  brand_logo_url: string
  brand_footer_tagline: string
  brand_footer_download_text: string
  brand_footer_links: string
  brand_footer_socials: string
  brand_footer_copyright: string
  website_hero_title: string
  website_hero_subtitle: string
  website_contact_phone: string
  website_contact_email: string
  website_address: string
  role_permissions?: string
  customer_number_prefix?: string
  pppoe_domain_suffix?: string
  invoice_company_name?: string
  invoice_company_address?: string
  invoice_company_phone?: string
  invoice_company_email?: string
  invoice_tax_rate?: string
  invoice_payment_instructions?: string
  wa_system_number?: string
  brand_primary_color?: string
  brand_secondary_color?: string
  brand_accent_color?: string
  brand_favicon_url?: string
}

interface BrandingStore {
  config: BrandingConfig | null
  isLoading: boolean
  hasLoaded: boolean
  fetchConfig: (force?: boolean) => Promise<BrandingConfig | null>
}

// Hex to raw HSL components helper (e.g. "221.2 83.2% 53.3%")
export function hexToHslString(hex: string): string {
  hex = hex.replace('#', '')
  if (hex.length === 3) {
    hex = hex.split('').map(c => c + c).join('')
  }
  if (hex.length !== 6) {
    return '221.2 83.2% 53.3%' // Default blue-600
  }

  const r = parseInt(hex.substring(0, 2), 16) / 255
  const g = parseInt(hex.substring(2, 4), 16) / 255
  const b = parseInt(hex.substring(4, 6), 16) / 255

  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  let h = 0
  let s = 0
  const l = (max + min) / 2

  if (max !== min) {
    const d = max - min
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
    switch (max) {
      case r: h = (g - b) / d + (g < b ? 6 : 0); break
      case g: h = (b - r) / d + 2; break
      case b: h = (r - g) / d + 4; break
    }
    h /= 6
  }

  return `${Math.round(h * 360)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`
}

export function applyThemeColors(config: BrandingConfig) {
  const root = document.documentElement
  const primary = config.brand_primary_color || '#2563eb'
  const secondary = config.brand_secondary_color || '#4f46e5'
  const accent = config.brand_accent_color || '#f59e0b'

  root.style.setProperty('--primary', hexToHslString(primary))
  root.style.setProperty('--ring', hexToHslString(primary))
  root.style.setProperty('--secondary', hexToHslString(secondary))
  root.style.setProperty('--accent', hexToHslString(accent))
}

export function applyMetadata(config: BrandingConfig) {
  // Update favicon
  const faviconUrl = config.brand_favicon_url || config.brand_logo_url
  if (faviconUrl) {
    let link = document.querySelector("link[rel~='icon']") as HTMLLinkElement
    if (!link) {
      link = document.createElement('link')
      link.rel = 'icon'
      document.getElementsByTagName('head')[0].appendChild(link)
    }
    link.href = faviconUrl
  }

  // Update browser document title on public/customer routes
  const isPublicPage = window.location.pathname === '/' || 
                       window.location.pathname === '/login' ||
                       window.location.pathname === '/register' ||
                       window.location.pathname === '/forgot-password' ||
                       window.location.pathname === '/reset-password' ||
                       window.location.pathname.startsWith('/invoice/') ||
                       window.location.pathname.startsWith('/receipt/');

  if (isPublicPage && config.brand_name) {
    document.title = `${config.brand_name} - Portal Pelanggan`
  }
}

export const useBrandingStore = create<BrandingStore>((set, get) => ({
  config: null,
  isLoading: false,
  hasLoaded: false,
  fetchConfig: async (force = false) => {
    if (get().hasLoaded && !force) {
      return get().config
    }
    set({ isLoading: true })
    try {
      const config = await publicApi.getPublicConfigs()
      set({ config, isLoading: false, hasLoaded: true })
      applyThemeColors(config)
      applyMetadata(config)
      return config
    } catch (err) {
      console.error('Failed to load branding settings:', err)
      set({ isLoading: false })
      return null
    }
  }
}))
