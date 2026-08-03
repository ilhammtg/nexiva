import { api } from '@/lib/api'
import type { Package } from '@/features/owner/types'

export interface RegionalItem {
  id: string
  name: string
}

export const publicApi = {
  getPackages: async (): Promise<Package[]> => {
    // Public active-only packages list endpoint
    const res = await api.get('/packages')
    return res.data.data ?? []
  },
  submitRegistration: async (formData: FormData) => {
    // Multipart form submission for customer registration & KTP upload
    const res = await api.post('/registrations', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    })
    return res.data
  },
  checkStatus: async (phone: string, regNumber: string) => {
    const res = await api.get('/registrations/status', {
      params: { phone, reg_number: regNumber }
    })
    return res.data
  },
  getPublicConfigs: async (): Promise<{
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
  }> => {
    const res = await api.get('/public-configs')
    return res.data.data ?? {
      locked_regions: '',
      brand_name: 'PT JSN',
      brand_logo_url: '',
      brand_footer_tagline: '',
      brand_footer_download_text: '',
      brand_footer_links: '[]',
      brand_footer_socials: '[]',
      brand_footer_copyright: '',
      website_hero_title: '',
      website_hero_subtitle: '',
      website_contact_phone: '',
      website_contact_email: '',
      website_address: '',
      role_permissions: '',
    }
  },
  getPublicRegistration: async (id: string): Promise<any> => {
    const res = await api.get(`/registrations/public/${id}`)
    return res.data.data
  },
  getProvinces: async (): Promise<RegionalItem[]> => {
    const response = await fetch('https://www.emsifa.com/api-wilayah-indonesia/api/provinces.json')
    const json = await response.json()
    return json ?? []
  },
  getCities: async (provinceId: string): Promise<RegionalItem[]> => {
    const response = await fetch(`https://www.emsifa.com/api-wilayah-indonesia/api/regencies/${provinceId}.json`)
    const json = await response.json()
    return json ?? []
  },
  getDistricts: async (cityId: string): Promise<RegionalItem[]> => {
    const response = await fetch(`https://www.emsifa.com/api-wilayah-indonesia/api/districts/${cityId}.json`)
    const json = await response.json()
    return json ?? []
  },
  getVillages: async (districtId: string): Promise<RegionalItem[]> => {
    const response = await fetch(`https://www.emsifa.com/api-wilayah-indonesia/api/villages/${districtId}.json`)
    const json = await response.json()
    return json ?? []
  },
}

