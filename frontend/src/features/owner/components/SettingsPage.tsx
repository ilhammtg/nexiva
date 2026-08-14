import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import {
  Save, Loader2, AlertCircle, RefreshCw,
  Globe, Shield, Clock, Bell, PhoneCall, Paintbrush, Upload,
  Sparkles, MapPin, FileText, Eye, EyeOff, Mail, Info, Undo2, CreditCard, CalendarClock, Wallet
} from 'lucide-react'
import { ownerApi } from '../api/ownerApi'
import { toast } from 'sonner'

export type TabType = 'branding' | 'registration' | 'provisioning' | 'notification' | 'invoice'

interface SettingsPageProps {
  activeSection?: TabType
}

function PasswordInput({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder?: string }) {
  const [show, setShow] = useState(false)
  return (
    <div className="relative">
      <input
        type={show ? 'text' : 'password'}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full pl-4 pr-10 py-2.5 rounded-xl bg-slate-50/50 dark:bg-slate-900/50 border border-slate-200/80 dark:border-slate-800 text-slate-800 dark:text-white focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-600/10 text-xs font-semibold"
      />
      <button
        type="button"
        onClick={() => setShow(!show)}
        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
      >
        {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
      </button>
    </div>
  )
}

export default function SettingsPage({ activeSection = 'registration' }: SettingsPageProps) {
  const queryClient = useQueryClient()
  const [editingValues, setEditingValues] = useState<Record<string, string>>({})
  const [uploadingLogo, setUploadingLogo] = useState(false)
  const [subTab, setSubTab] = useState<'channel' | 'smtp' | 'whatsapp' | 'templates'>('channel')
  const [isSavingAll, setIsSavingAll] = useState(false)

  const activeTab = activeSection

  const handleChange = (key: string, val: string) => {
    setEditingValues((prev) => ({
      ...prev,
      [key]: val,
    }))
  }

  // Query configurations
  const { data: configs, isLoading, isFetching, error, refetch } = useQuery({
    queryKey: ['system-configs'],
    queryFn: ownerApi.getConfigs,
  })

  // Get active value helper
  const getActiveConfigValue = (key: string, fallback: string = '') => {
    return editingValues[key] !== undefined
      ? editingValues[key]
      : (configs?.find((c) => c.Key === key)?.Value || fallback)
  }

  const formatStr = getActiveConfigValue('cust_number_format', 'YEAR,SERIAL');
  const formatArray = formatStr.split(',').map(s => s.trim()).filter(Boolean);
  
  const moveComp = (index: number, direction: 'up' | 'down') => {
    const nextArr = [...formatArray];
    const targetIdx = direction === 'up' ? index - 1 : index + 1;
    if (targetIdx < 0 || targetIdx >= nextArr.length) return;
    const temp = nextArr[index];
    nextArr[index] = nextArr[targetIdx];
    nextArr[targetIdx] = temp;
    handleChange('cust_number_format', nextArr.join(','));
  };

  const removeComp = (compName: string) => {
    if (compName === 'SERIAL') {
      toast.error('Komponen SERIAL wajib ada dan tidak dapat dihapus');
      return;
    }
    const nextArr = formatArray.filter(c => c !== compName);
    handleChange('cust_number_format', nextArr.join(','));
  };

  const addComp = (compName: string) => {
    if (formatArray.includes(compName)) return;
    const nextArr = [...formatArray, compName];
    handleChange('cust_number_format', nextArr.join(','));
  };

  const getPreviewCustomerNumber = () => {
    const sepVal = getActiveConfigValue('cust_number_separator', 'none');
    const separator = sepVal === 'none' ? '' : sepVal;
    const startStr = getActiveConfigValue('cust_number_start', '1');
    const startVal = parseInt(startStr, 10) || 1;
    
    const now = new Date();
    const yy = String(now.getFullYear()).substring(2);
    const yyyy = String(now.getFullYear());
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    const area = '000';
    const padWidth = Math.max(4, startStr.length);
    const serial = String(startVal).padStart(padWidth, '0');
    
    return formatArray.map(comp => {
      if (comp === 'YEAR') return yy;
      if (comp === 'YEAR4') return yyyy;
      if (comp === 'MONTH') return mm;
      if (comp === 'AREA') return area;
      if (comp === 'SERIAL') return serial;
      if (comp === 'SUFFIX') return '01';
      return '';
    }).filter(Boolean).join(separator);
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const ext = file.name.substring(file.name.lastIndexOf('.')).toLowerCase()
    if (!['.png', '.jpg', '.jpeg', '.svg'].includes(ext)) {
      toast.error('Format logo harus PNG, JPG, JPEG, atau SVG')
      return
    }
    if (file.size > 2 * 1024 * 1024) {
      toast.error('Ukuran logo maksimal 2MB')
      return
    }

    try {
      setUploadingLogo(true)
      const relativeUrl = await ownerApi.uploadLogo(file)
      handleChange('brand_logo_url', relativeUrl)
      toast.success('Logo berhasil diunggah. Klik "Simpan Perubahan" di bagian bawah untuk menyimpan.')
    } catch (err: any) {
      console.error('Upload logo error:', err)
      const errMsg = err.response?.data?.error?.message || err.response?.data?.message || err.message || 'Gagal mengunggah logo ke server'
      toast.error(`Gagal mengunggah logo: ${errMsg}`)
    } finally {
      setUploadingLogo(false)
    }
  }



  const currentProvider = getActiveConfigValue('email_provider', 'smtp')

  const emailKeys = ['email_provider']
  if (currentProvider === 'smtp') {
    emailKeys.push('smtp_host', 'smtp_port', 'smtp_user', 'smtp_password', 'smtp_from', 'smtp_from_name')
  } else if (currentProvider === 'mailtrap') {
    emailKeys.push('mailtrap_api_token', 'smtp_from', 'smtp_from_name')
  } else if (currentProvider === 'sendgrid') {
    emailKeys.push('sendgrid_api_key', 'smtp_from', 'smtp_from_name')
  }

  const subTabKeys: Record<'channel' | 'smtp' | 'whatsapp' | 'templates', string[]> = {
    channel: ['verification_method', 'notif_enabled'],
    smtp: emailKeys,
    whatsapp: ['wa_provider', 'wa_api_key', 'wa_api_url', 'notif_webhook_url'],
    templates: [
      'notif_tmpl_new_registration',
      'notif_tmpl_survey_scheduled',
      'notif_tmpl_payment_confirmed',
      'notif_tmpl_activation_success',
      'notif_tmpl_provisioning_failed'
    ]
  }

  const configGroups: Record<TabType, string[]> = {
    branding: [
      'brand_name',
      'brand_logo_url',
      'brand_favicon_url',
      'brand_primary_color',
      'brand_secondary_color',
      'brand_accent_color',
      'website_hero_title',
      'website_hero_subtitle',
      'website_contact_phone',
      'website_contact_email',
      'website_address',
      'brand_footer_tagline',
      'brand_footer_download_text',
      'brand_footer_copyright',
      'brand_footer_links',
      'brand_footer_socials'
    ],
    registration: [
      'locked_regions',
      'reg_number_prefix',
      'pppoe_username_prefix',
      'customer_number_prefix',
      'pppoe_domain_suffix',
      'cust_number_format',
      'cust_number_start',
      'cust_number_reset',
      'cust_number_separator'
    ],
    provisioning: [
      'provisioning_timeout_sec',
      'provisioning_max_retry'
    ],
    notification: [
      ...subTabKeys.channel,
      ...subTabKeys.smtp,
      ...subTabKeys.whatsapp,
      ...subTabKeys.templates
    ],
    invoice: [
      'invoice_company_name',
      'invoice_company_address',
      'invoice_company_phone',
      'invoice_company_email',
      'invoice_tax_rate',
      'invoice_payment_instructions',
      'wa_system_number',
      'billing_scheme',
      'billing_due_day',
      'billing_grace_period_days',
      'billing_reminder_days_before',
      'billing_prepaid_period_days',
    ]
  }

  const activeKeys = activeTab === 'notification'
    ? subTabKeys[subTab]
    : configGroups[activeTab]

  const isTabDirty = activeKeys.some((key) => {
    const original = configs?.find((c) => c.Key === key)?.Value || ''
    const current = editingValues[key]
    return current !== undefined && current !== original
  })

  const handleReset = () => {
    setEditingValues((prev) => {
      const next = { ...prev }
      activeKeys.forEach((key) => {
        delete next[key]
      })
      return next
    })
    toast.info('Perubahan dibatalkan')
  }

  const handleSaveAll = async () => {
    const dirtyUpdates = activeKeys
      .filter((key) => {
        const original = configs?.find((c) => c.Key === key)?.Value || ''
        const current = editingValues[key]
        return current !== undefined && current !== original
      })
      .map((key) => ({
        key,
        value: editingValues[key]
      }))

    if (dirtyUpdates.length === 0) return

    setIsSavingAll(true)
    try {
      await Promise.all(
        dirtyUpdates.map((update) => ownerApi.updateConfig(update.key, update.value))
      )
      await queryClient.invalidateQueries({ queryKey: ['system-configs'] })
      setEditingValues((prev) => {
        const next = { ...prev }
        dirtyUpdates.forEach((u) => {
          delete next[u.key]
        })
        return next
      })
      toast.success('Semua pengaturan berhasil disimpan')
    } catch (err: any) {
      console.error(err)
      const msg = err.response?.data?.error?.message || 'Gagal menyimpan beberapa pengaturan'
      toast.error(msg)
    } finally {
      setIsSavingAll(false)
    }
  }

  const appendPlaceholder = (key: string, placeholder: string) => {
    const currentVal = getActiveConfigValue(key)
    handleChange(key, currentVal + placeholder)
  }

  const getTabTitle = (tab: TabType) => {
    switch (tab) {
      case 'branding':
        return {
          title: 'Kustomisasi Website & Branding',
          subtitle: 'Kustomisasi nama brand, logo, deskripsi hero, info kontak bantuan, alamat kantor, dan tautan footer website.'
        }
      case 'registration':
        return {
          title: 'Pengaturan Alur Registrasi',
          subtitle: 'Konfigurasi pembatasan wilayah registrasi online dan awalan penomoran kode registrasi / PPPoE.'
        }
      case 'provisioning':
        return {
          title: 'Pengaturan Provisioning OLT',
          subtitle: 'Konfigurasi batas waktu (timeout) dan maksimum percobaan ulang komunikasi ke perangkat OLT & Mikrotik.'
        }
      case 'notification':
        return {
          title: 'Pengaturan Notifikasi & Verifikasi',
          subtitle: 'Atur saluran pengiriman OTP, kredensial server email (SMTP/API), WhatsApp gateway, dan kustomisasi template pesan.'
        }
      case 'invoice':
        return {
          title: 'Kustomisasi Billing & Invoice',
          subtitle: 'Kustomisasi profil tagihan, metode pembayaran, tarif pajak (PPN), dan WhatsApp pengirim tagihan resmi.'
        }
    }
  }

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-3">
        <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
        <p className="text-xs text-slate-400 font-semibold uppercase tracking-wider">Memuat pengaturan sistem...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] text-center p-6 space-y-4">
        <AlertCircle className="w-12 h-12 text-red-500 opacity-80" />
        <div>
          <h3 className="text-md font-bold text-slate-800 dark:text-white">Gagal Memuat Pengaturan</h3>
          <p className="text-xs text-slate-400 mt-1">Silakan coba beberapa saat lagi atau hubungi administrator.</p>
        </div>
        <button
          onClick={() => refetch()}
          disabled={isFetching}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-900 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-semibold transition-all disabled:opacity-50"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isFetching ? 'animate-spin' : ''}`} />
          Coba Lagi
        </button>
      </div>
    )
  }

  const pageMeta = getTabTitle(activeTab)

  return (
    <div className="p-6 md:p-8 space-y-6 pb-24 relative">
      {/* Header */}
      <div>
        <h2 className="text-lg font-black text-slate-800 dark:text-white leading-none">
          {pageMeta.title}
        </h2>
        <p className="text-xs text-slate-400 dark:text-slate-500 mt-1.5 leading-normal">
          {pageMeta.subtitle}
        </p>
      </div>

      {/* Sub-navigation for notification section */}
      {activeTab === 'notification' && (
        <div className="space-y-3">
          <div className="flex flex-wrap gap-1.5 pb-2 border-b border-slate-100 dark:border-slate-800/80">
            {[
              { id: 'channel', label: 'Saluran Verifikasi & Alert', icon: Shield },
              { id: 'smtp', label: 'Email Service', icon: Globe },
              { id: 'whatsapp', label: 'WhatsApp Gateway', icon: PhoneCall },
              { id: 'templates', label: 'Template Pesan WhatsApp', icon: FileText }
            ].map((tab) => {
              const Icon = tab.icon
              const isActive = subTab === tab.id
              return (
                <button
                  key={tab.id}
                  onClick={() => setSubTab(tab.id as any)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-2xl text-xs font-extrabold transition-all duration-200 ${
                    isActive
                      ? 'bg-blue-600 text-white shadow-sm shadow-blue-500/10'
                      : 'bg-slate-50 hover:bg-slate-100 dark:bg-slate-900/50 dark:hover:bg-slate-900 text-slate-655 dark:text-slate-400'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  {tab.label}
                </button>
              )
            })}
          </div>

          <div className="p-3 bg-slate-50/50 dark:bg-slate-900/30 rounded-2xl border border-slate-100/50 dark:border-slate-800/50 flex items-start gap-2.5">
            <Info className="w-4 h-4 text-blue-500 flex-shrink-0 mt-0.5" />
            <p className="text-xxs text-slate-450 dark:text-slate-400 font-semibold leading-relaxed">
              {subTab === 'channel' && 'Atur bagaimana sistem mengirim kode verifikasi, password reset link, dan notifikasi alert otomatis kepada staf dan pelanggan.'}
              {subTab === 'smtp' && 'Konfigurasi detail server SMTP, Mailtrap, atau SendGrid yang digunakan sistem untuk mengirimkan email resmi platform seperti reset password.'}
              {subTab === 'whatsapp' && 'Konfigurasi token API dan endpoint provider WhatsApp (Fonnte, RuangWA, Starsender, dll) untuk pengiriman pesan otomatis.'}
              {subTab === 'templates' && 'Kustomisasi template isi pesan WhatsApp yang dikirimkan secara otomatis pada tiap alur pendaftaran.'}
            </p>
          </div>
        </div>
      )}

      {/* Form Content Panel */}
      <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800/80 rounded-3xl p-6 shadow-sm">
        {activeTab === 'registration' && (
          <div className="space-y-8 divide-y divide-slate-100 dark:divide-slate-800/80">
            {/* Section 1: Batas Kunci Wilayah */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 py-4">
              <div className="space-y-1.5">
                <div className="flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-orange-500" />
                  <h3 className="text-xs font-bold text-slate-800 dark:text-white uppercase tracking-wider">Batas Kunci Wilayah</h3>
                </div>
                <p className="text-xxs text-slate-450 dark:text-slate-500 leading-normal max-w-xs">
                  Membatasi pendaftaran pelanggan online secara mandiri hanya pada kabupaten atau kota tertentu.
                </p>
              </div>
              <div className="lg:col-span-2 space-y-4">
                <div className="space-y-2">
                  <input
                    type="text"
                    value={getActiveConfigValue('locked_regions')}
                    onChange={(e) => handleChange('locked_regions', e.target.value)}
                    placeholder="Contoh: Bireuen, Aceh Utara, Banda Aceh"
                    className="w-full px-4 py-2.5 rounded-xl bg-slate-50/50 dark:bg-slate-900/50 border border-slate-200/80 dark:border-slate-800 text-slate-800 dark:text-white focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-600/10 text-xs font-semibold"
                  />
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {getActiveConfigValue('locked_regions')
                      .split(',')
                      .map(x => x.trim())
                      .filter(Boolean)
                      .map((region, idx) => (
                        <span key={idx} className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold bg-orange-50 dark:bg-orange-950/20 text-orange-600 dark:text-orange-400 border border-orange-200/40">
                          {region}
                        </span>
                      ))}
                    {getActiveConfigValue('locked_regions').trim() === '' && (
                      <span className="text-[10px] text-slate-450 dark:text-slate-500 italic">
                        * Tidak ada batasan wilayah (semua wilayah diperbolehkan mendaftar)
                      </span>
                    )}
                  </div>
                  <p className="text-[10px] text-slate-400 dark:text-slate-550 leading-normal italic">
                    * Pisahkan dengan koma. Pendaftaran online hanya diperbolehkan jika nama kota/kabupaten mengandung salah satu kata kunci di atas.
                  </p>
                </div>
              </div>
            </div>

            {/* Section 2: Format Penomoran & Akun */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 py-6">
              <div className="space-y-1.5">
                <div className="flex items-center gap-2">
                  <Shield className="w-4 h-4 text-blue-500" />
                  <h3 className="text-xs font-bold text-slate-800 dark:text-white uppercase tracking-wider">Format Penomoran</h3>
                </div>
                <p className="text-xxs text-slate-450 dark:text-slate-500 leading-normal max-w-xs">
                  Atur awalan/prefix penamaan otomatis untuk nomor registrasi formulir dan akun PPPoE pelanggan.
                </p>
              </div>
              <div className="lg:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[11px] font-extrabold text-slate-700 dark:text-slate-300 block">Prefix Nomor Registrasi</label>
                  <div className="relative">
                    <input
                      type="text"
                      value={getActiveConfigValue('reg_number_prefix')}
                      onChange={(e) => handleChange('reg_number_prefix', e.target.value)}
                      className="w-full pl-4 pr-20 py-2.5 rounded-xl bg-slate-50/50 dark:bg-slate-900/50 border border-slate-200/80 dark:border-slate-800 text-slate-800 dark:text-white focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-600/10 text-xs font-semibold font-mono"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[9px] font-mono font-extrabold text-slate-450 dark:text-slate-500 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded">
                      {getActiveConfigValue('reg_number_prefix')}202607120001
                    </span>
                  </div>
                  <p className="text-[10px] text-slate-400 dark:text-slate-550 italic">
                    Contoh: <code>REG-JSN-</code> menghasilkan <code>REG-JSN-202607120001</code>
                  </p>
                </div>

                <div className="space-y-2">
                  <label className="text-[11px] font-extrabold text-slate-700 dark:text-slate-300 block">Prefix Username PPPoE</label>
                  <div className="relative">
                    <input
                      type="text"
                      value={getActiveConfigValue('pppoe_username_prefix')}
                      onChange={(e) => handleChange('pppoe_username_prefix', e.target.value)}
                      className="w-full pl-4 pr-20 py-2.5 rounded-xl bg-slate-50/50 dark:bg-slate-900/50 border border-slate-200/80 dark:border-slate-800 text-slate-800 dark:text-white focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-600/10 text-xs font-semibold font-mono"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[9px] font-mono font-extrabold text-slate-450 dark:text-slate-500 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded">
                      {(() => {
                        const prefix = getActiveConfigValue('pppoe_username_prefix') || '';
                        const customerNum = getPreviewCustomerNumber();
                        const domain = getActiveConfigValue('pppoe_domain_suffix') || 'ptnat.net';
                        let base = customerNum;
                        if (prefix && !base.startsWith(prefix)) {
                          base = prefix + base;
                        }
                        return `${base}@${domain}`;
                      })()}
                    </span>
                  </div>
                  <p className="text-[10px] text-slate-400 dark:text-slate-550 italic">
                    Contoh: Jika prefix <code>ISP-</code> dan domain <code>ptnat.net</code>, menghasilkan <code>ISP-{getPreviewCustomerNumber()}@ptnat.net</code>
                  </p>
                </div>

                {/* Advanced Customer ID Builder */}
                <div className="col-span-1 md:col-span-2 bg-slate-50 dark:bg-zinc-800/40 p-5 rounded-2xl border border-slate-200/60 dark:border-zinc-700/50 space-y-4">
                  <div className="flex items-center justify-between border-b border-slate-200/50 dark:border-zinc-700/50 pb-3">
                    <div>
                      <h4 className="text-xs font-bold text-slate-800 dark:text-zinc-200 uppercase tracking-wide">⚙️ Format ID Pelanggan Kustom</h4>
                      <p className="text-[10px] text-slate-450 dark:text-zinc-550 leading-relaxed mt-0.5">Konfigurasi struktur kode ID pelanggan otomatis untuk server provisioning.</p>
                    </div>
                    {/* Live Preview badge */}
                    <div className="flex flex-col items-end">
                      <span className="text-[9px] font-extrabold text-slate-400 dark:text-zinc-500 uppercase tracking-wider">Preview ID Baru</span>
                      <span className="text-xs font-mono font-bold bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 border border-blue-200/40 dark:border-blue-900/30 px-3 py-1 rounded-lg mt-0.5">
                        {getPreviewCustomerNumber()}
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Component builder */}
                    <div className="space-y-2.5">
                      <label className="text-[11px] font-extrabold text-slate-700 dark:text-slate-350 block">Urutan Komponen Format</label>
                      <div className="space-y-1.5 bg-white dark:bg-zinc-900/60 p-3 rounded-xl border border-slate-200/40 dark:border-zinc-800">
                        {formatArray.map((comp, idx) => (
                          <div key={comp} className="flex items-center justify-between bg-slate-50 dark:bg-zinc-800/80 px-2.5 py-1.5 rounded-lg border border-slate-200/30 dark:border-zinc-700/30">
                            <div className="flex items-center gap-2">
                              <span className="text-[9px] bg-slate-200 dark:bg-zinc-700 text-slate-650 dark:text-zinc-300 font-bold px-1.5 py-0.5 rounded font-mono">
                                {comp}
                              </span>
                              <span className="text-[10px] text-slate-450 dark:text-zinc-400">
                                {comp === 'YEAR' && 'Tahun (2 digit)'}
                                {comp === 'YEAR4' && 'Tahun (4 digit)'}
                                {comp === 'MONTH' && 'Bulan (2 digit)'}
                                {comp === 'AREA' && 'Kode Wilayah / Router (Numeric 3 digit)'}
                                {comp === 'SERIAL' && 'Nomor Urut'}
                                {comp === 'SUFFIX' && 'Kode Unik / Jenis Layanan'}
                              </span>
                            </div>
                            <div className="flex items-center gap-1">
                              <button
                                type="button"
                                disabled={idx === 0}
                                onClick={() => moveComp(idx, 'up')}
                                className="p-0.5 rounded text-slate-400 hover:text-slate-600 dark:hover:text-white disabled:opacity-30"
                              >
                                ▲
                              </button>
                              <button
                                type="button"
                                disabled={idx === formatArray.length - 1}
                                onClick={() => moveComp(idx, 'down')}
                                className="p-0.5 rounded text-slate-400 hover:text-slate-600 dark:hover:text-white disabled:opacity-30"
                              >
                                ▼
                              </button>
                              {comp !== 'SERIAL' && (
                                <button
                                  type="button"
                                  onClick={() => removeComp(comp)}
                                  className="p-0.5 rounded text-red-400 hover:text-red-650 dark:hover:text-red-400 ml-1"
                                >
                                  ✕
                                </button>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>

                      {/* Add available components */}
                      {['YEAR', 'YEAR4', 'MONTH', 'AREA', 'SERIAL', 'SUFFIX'].filter(c => !formatArray.includes(c)).length > 0 && (
                        <div className="flex flex-wrap gap-1.5 items-center">
                          <span className="text-[10px] text-slate-450 dark:text-zinc-400">Tambah Komponen:</span>
                          {['YEAR', 'YEAR4', 'MONTH', 'AREA', 'SERIAL', 'SUFFIX'].filter(c => !formatArray.includes(c)).map(comp => (
                            <button
                              key={comp}
                              type="button"
                              onClick={() => addComp(comp)}
                              className="text-[10px] font-bold bg-slate-100 hover:bg-slate-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-slate-650 dark:text-zinc-300 px-2 py-0.5 rounded border border-slate-200/50 dark:border-zinc-700/50 transition-colors"
                            >
                              + {comp}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>

                    <div className="space-y-4">
                      {/* Start Number */}
                      <div className="space-y-1.5">
                        <label className="text-[11px] font-extrabold text-slate-700 dark:text-slate-355 block">Nomor Urut Pertama (Start Number)</label>
                        <input
                          type="number"
                          value={getActiveConfigValue('cust_number_start', '1')}
                          onChange={(e) => handleChange('cust_number_start', e.target.value)}
                          className="w-full px-3 py-2 rounded-xl bg-white dark:bg-zinc-900/60 border border-slate-200 dark:border-zinc-850 text-slate-800 dark:text-white focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600/10 text-xs font-semibold"
                          min="1"
                        />
                        <p className="text-[9px] text-slate-400 dark:text-zinc-550 leading-relaxed italic">
                          Tentukan nilai awal penomoran pelanggan (misal: 1000 atau 5000).
                        </p>
                      </div>

                      {/* Reset Trigger */}
                      <div className="space-y-1.5">
                        <label className="text-[11px] font-extrabold text-slate-700 dark:text-slate-355 block">Pemicu Atur Ulang (Reset Trigger)</label>
                        <select
                          value={getActiveConfigValue('cust_number_reset', 'NEVER')}
                          onChange={(e) => handleChange('cust_number_reset', e.target.value)}
                          className="w-full px-3 py-2 rounded-xl bg-white dark:bg-zinc-900/60 border border-slate-200 dark:border-zinc-850 text-slate-800 dark:text-white focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600/10 text-xs font-semibold"
                        >
                          <option value="NEVER">Tidak Pernah Reset (Akumulasi terus-menerus)</option>
                          <option value="YEARLY">Ganti Tahun (Kembali ke awal setiap tahun)</option>
                          <option value="MONTHLY">Ganti Bulan (Kembali ke awal setiap bulan)</option>
                        </select>
                      </div>

                      {/* Separator */}
                      <div className="space-y-1.5">
                        <label className="text-[11px] font-extrabold text-slate-700 dark:text-slate-355 block">Karakter Pemisah (Separator)</label>
                        <select
                          value={getActiveConfigValue('cust_number_separator', 'none')}
                          onChange={(e) => handleChange('cust_number_separator', e.target.value)}
                          className="w-full px-3 py-2 rounded-xl bg-white dark:bg-zinc-900/60 border border-slate-200 dark:border-zinc-850 text-slate-800 dark:text-white focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600/10 text-xs font-semibold"
                        >
                          <option value="none">Tanpa Pemisah (none)</option>
                          <option value="-">Strip (-)</option>
                          <option value=".">Titik (.)</option>
                        </select>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[11px] font-extrabold text-slate-700 dark:text-slate-300 block">Suffix Domain PPPoE</label>
                  <div className="relative">
                    <input
                      type="text"
                      value={getActiveConfigValue('pppoe_domain_suffix')}
                      onChange={(e) => handleChange('pppoe_domain_suffix', e.target.value)}
                      className="w-full pl-4 pr-20 py-2.5 rounded-xl bg-slate-50/50 dark:bg-slate-900/50 border border-slate-200/80 dark:border-slate-800 text-slate-800 dark:text-white focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-600/10 text-xs font-semibold font-mono"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[9px] font-mono font-extrabold text-slate-450 dark:text-slate-500 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded">
                      @{getActiveConfigValue('pppoe_domain_suffix')}
                    </span>
                  </div>
                  <p className="text-[10px] text-slate-400 dark:text-slate-550 italic">
                    Contoh: <code>ptnat.net</code> menghasilkan <code>20260001@ptnat.net</code>
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'provisioning' && (
          <div className="space-y-8 divide-y divide-slate-100 dark:divide-slate-800/80 animate-fade-in">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 py-4">
              <div className="space-y-1.5">
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-indigo-500" />
                  <h3 className="text-xs font-bold text-slate-800 dark:text-white uppercase tracking-wider">Timeout & Retries</h3>
                </div>
                <p className="text-xxs text-slate-450 dark:text-slate-500 leading-normal max-w-xs">
                  Konfigurasi durasi tunggu respon perangkat OLT/Mikrotik dan batas maksimal percobaan ulang jika terjadi kendala jaringan sementara.
                </p>
              </div>
              <div className="lg:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[11px] font-extrabold text-slate-700 dark:text-slate-300 block">Timeout Provisioning (Detik)</label>
                  <div className="relative">
                    <input
                      type="number"
                      value={getActiveConfigValue('provisioning_timeout_sec')}
                      onChange={(e) => handleChange('provisioning_timeout_sec', e.target.value)}
                      className="w-full pl-4 pr-16 py-2.5 rounded-xl bg-slate-50/50 dark:bg-slate-900/50 border border-slate-200/80 dark:border-slate-800 text-slate-800 dark:text-white focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-600/10 text-xs font-semibold"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-extrabold text-slate-450">
                      detik
                    </span>
                  </div>
                  <p className="text-[10px] text-slate-400 dark:text-slate-550 leading-normal italic">
                    * Batas waktu instruksi provisioning ke OLT sebelum dianggap timeout.
                  </p>
                </div>

                <div className="space-y-2">
                  <label className="text-[11px] font-extrabold text-slate-700 dark:text-slate-300 block">Maksimum Percobaan Ulang (Retry)</label>
                  <input
                    type="number"
                    value={getActiveConfigValue('provisioning_max_retry')}
                    onChange={(e) => handleChange('provisioning_max_retry', e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl bg-slate-50/50 dark:bg-slate-900/50 border border-slate-200/80 dark:border-slate-800 text-slate-800 dark:text-white focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-600/10 text-xs font-semibold"
                  />
                  <p className="text-[10px] text-slate-400 dark:text-slate-550 leading-normal italic">
                    * Pengulangan otomatis jika provisioning mengalami error koneksi sementara.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'notification' && (
          <div className="animate-fade-in">
            {subTab === 'channel' && (
              <div className="space-y-8 divide-y divide-slate-100 dark:divide-slate-800/80">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 py-4">
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2">
                      <Shield className="w-4 h-4 text-blue-500" />
                      <h3 className="text-xs font-bold text-slate-800 dark:text-white uppercase tracking-wider">Metode Verifikasi</h3>
                    </div>
                    <p className="text-xxs text-slate-450 dark:text-slate-500 leading-normal max-w-xs">
                      Tentukan media pengiriman kode OTP, verifikasi akun, dan tautan reset kata sandi kepada pengguna.
                    </p>
                  </div>
                  <div className="lg:col-span-2 grid grid-cols-1 md:grid-cols-3 gap-4">
                    {[
                      { id: 'email', title: 'Hanya Email', desc: 'Verifikasi dikirimkan ke alamat email terdaftar.', icon: Mail },
                      { id: 'whatsapp', title: 'Hanya WhatsApp', desc: 'Verifikasi dikirimkan ke nomor WhatsApp terdaftar.', icon: PhoneCall },
                      { id: 'both', title: 'Email & WhatsApp', desc: 'Verifikasi dikirimkan ke kedua saluran sekaligus.', icon: Sparkles }
                    ].map((opt) => {
                      const OptIcon = opt.icon
                      const isSelected = getActiveConfigValue('verification_method') === opt.id
                      return (
                        <button
                          type="button"
                          key={opt.id}
                          onClick={() => handleChange('verification_method', opt.id)}
                          className={`p-4 rounded-2xl border text-left flex flex-col justify-between h-32 transition-all duration-200 ${
                            isSelected
                              ? 'border-blue-600 bg-blue-50/20 dark:bg-blue-950/10 ring-2 ring-blue-600/10'
                              : 'border-slate-200/70 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 bg-white dark:bg-slate-900/30'
                          }`}
                        >
                          <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${isSelected ? 'bg-blue-600 text-white' : 'bg-slate-100 dark:bg-slate-950 text-slate-500'}`}>
                            <OptIcon className="w-4 h-4" />
                          </div>
                          <div>
                            <h4 className={`text-xs font-extrabold ${isSelected ? 'text-blue-650 dark:text-blue-400' : 'text-slate-750 dark:text-slate-300'}`}>{opt.title}</h4>
                            <p className="text-[10px] text-slate-450 dark:text-slate-500 mt-1 leading-snug">{opt.desc}</p>
                          </div>
                        </button>
                      )
                    })}
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 py-6">
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2">
                      <Bell className="w-4 h-4 text-purple-500" />
                      <h3 className="text-xs font-bold text-slate-800 dark:text-white uppercase tracking-wider">Status Notifikasi Alert</h3>
                    </div>
                    <p className="text-xxs text-slate-450 dark:text-slate-550 leading-normal max-w-xs">
                      Aktifkan atau nonaktifkan pengiriman notifikasi otomatis untuk setiap perubahan status pendaftaran.
                    </p>
                  </div>
                  <div className="lg:col-span-2">
                    <div className="flex flex-col md:flex-row gap-4">
                      {[
                        { id: 'true', label: 'Aktifkan', desc: 'Notifikasi alur registrasi otomatis dikirim.' },
                        { id: 'false', label: 'Silenced (Nonaktif)', desc: 'Matikan seluruh notifikasi otomatis sementara.' }
                      ].map((opt) => {
                        const isSelected = getActiveConfigValue('notif_enabled') === opt.id
                        return (
                          <button
                            type="button"
                            key={opt.id}
                            onClick={() => handleChange('notif_enabled', opt.id)}
                            className={`flex-1 p-4 rounded-2xl border text-left transition-all duration-200 ${
                              isSelected
                                ? 'border-blue-600 bg-blue-50/20 dark:bg-blue-950/10 ring-2 ring-blue-600/10'
                                : 'border-slate-200/70 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 bg-white dark:bg-slate-900/30'
                            }`}
                          >
                            <span className={`text-xs font-extrabold block ${isSelected ? 'text-blue-600 dark:text-blue-400' : 'text-slate-700 dark:text-slate-300'}`}>{opt.label}</span>
                            <span className="text-[10px] text-slate-450 dark:text-slate-550 mt-0.5 block leading-normal">{opt.desc}</span>
                          </button>
                        )
                      })}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {subTab === 'smtp' && (
              <div className="space-y-8 divide-y divide-slate-100 dark:divide-slate-800/80">
                {/* Driver Selection */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 py-4">
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2">
                      <Mail className="w-4 h-4 text-indigo-500" />
                      <h3 className="text-xs font-bold text-slate-800 dark:text-white uppercase tracking-wider">Driver Email</h3>
                    </div>
                    <p className="text-xxs text-slate-450 dark:text-slate-500 leading-normal max-w-xs">
                      Pilih driver pengiriman email. Anda dapat menggunakan SMTP kustom, Mailtrap (Dev), atau SendGrid (Prod).
                    </p>
                  </div>
                  <div className="lg:col-span-2 grid grid-cols-1 md:grid-cols-3 gap-4">
                    {[
                      { id: 'smtp', title: 'Standard SMTP', desc: 'Gunakan server SMTP kustom Anda (Gmail, Outlook, dll).' },
                      { id: 'mailtrap', title: 'Mailtrap API', desc: 'Driver developer-friendly menggunakan HTTP API Mailtrap.' },
                      { id: 'sendgrid', title: 'SendGrid API', desc: 'Driver pengiriman performa tinggi dengan SendGrid API.' }
                    ].map((opt) => {
                      const isSelected = getActiveConfigValue('email_provider') === opt.id
                      return (
                        <button
                          type="button"
                          key={opt.id}
                          onClick={() => handleChange('email_provider', opt.id)}
                          className={`p-4 rounded-2xl border text-left flex flex-col justify-between h-32 transition-all duration-200 ${
                            isSelected
                              ? 'border-blue-600 bg-blue-50/20 dark:bg-blue-950/10 ring-2 ring-blue-600/10'
                              : 'border-slate-200/70 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 bg-white dark:bg-slate-900/30'
                          }`}
                        >
                          <span className={`text-[9px] font-black px-2 py-0.5 rounded uppercase self-start ${isSelected ? 'bg-blue-600 text-white' : 'bg-slate-100 dark:bg-slate-950 text-slate-500'}`}>
                            {opt.id}
                          </span>
                          <div className="mt-2">
                            <h4 className={`text-xs font-extrabold ${isSelected ? 'text-blue-650 dark:text-blue-400' : 'text-slate-750 dark:text-slate-200'}`}>{opt.title}</h4>
                            <p className="text-[10px] text-slate-450 dark:text-slate-500 mt-1 leading-snug">{opt.desc}</p>
                          </div>
                        </button>
                      )
                    })}
                  </div>
                </div>

                {/* Driver-specific Form Fields */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 py-6">
                  <div className="space-y-1.5">
                    <h3 className="text-xs font-bold text-slate-800 dark:text-white uppercase tracking-wider">Kredensial & Pengirim</h3>
                    <p className="text-xxs text-slate-450 dark:text-slate-500 leading-normal max-w-xs">
                      Lengkapi kredensial autentikasi API/SMTP dan alamat pengirim email default.
                    </p>
                  </div>
                  <div className="lg:col-span-2 space-y-4">
                    {/* SMTP Fields */}
                    {getActiveConfigValue('email_provider') === 'smtp' && (
                      <>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <div className="md:col-span-2 space-y-1.5">
                            <label className="text-[11px] font-bold text-slate-750 dark:text-slate-350">Server Host SMTP</label>
                            <input
                              type="text"
                              value={getActiveConfigValue('smtp_host')}
                              onChange={(e) => handleChange('smtp_host', e.target.value)}
                              placeholder="Contoh: smtp.gmail.com"
                              className="w-full px-4 py-2.5 rounded-xl bg-slate-50/50 dark:bg-slate-900/50 border border-slate-200/80 dark:border-slate-800 text-slate-800 dark:text-white focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-600/10 text-xs font-semibold"
                            />
                          </div>
                          <div className="space-y-1.5">
                            <label className="text-[11px] font-bold text-slate-755 dark:text-slate-350">Port SMTP</label>
                            <input
                              type="text"
                              value={getActiveConfigValue('smtp_port')}
                              onChange={(e) => handleChange('smtp_port', e.target.value)}
                              placeholder="587"
                              className="w-full px-4 py-2.5 rounded-xl bg-slate-50/50 dark:bg-slate-900/50 border border-slate-200/80 dark:border-slate-800 text-slate-800 dark:text-white focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-600/10 text-xs font-semibold"
                            />
                          </div>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="space-y-1.5">
                            <label className="text-[11px] font-bold text-slate-755 dark:text-slate-350">Username SMTP</label>
                            <input
                              type="text"
                              value={getActiveConfigValue('smtp_user')}
                              onChange={(e) => handleChange('smtp_user', e.target.value)}
                              placeholder="email@domain.com"
                              className="w-full px-4 py-2.5 rounded-xl bg-slate-50/50 dark:bg-slate-900/50 border border-slate-200/80 dark:border-slate-800 text-slate-800 dark:text-white focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-600/10 text-xs font-semibold"
                            />
                          </div>
                          <div className="space-y-1.5">
                            <label className="text-[11px] font-bold text-slate-755 dark:text-slate-350">Password / App Password</label>
                            <PasswordInput
                              value={getActiveConfigValue('smtp_password')}
                              onChange={(v) => handleChange('smtp_password', v)}
                              placeholder="••••••••••••"
                            />
                          </div>
                        </div>
                      </>
                    )}

                    {/* Mailtrap API Fields */}
                    {getActiveConfigValue('email_provider') === 'mailtrap' && (
                      <div className="space-y-1.5">
                        <label className="text-[11px] font-bold text-slate-755 dark:text-slate-350">Mailtrap API Token</label>
                        <PasswordInput
                          value={getActiveConfigValue('mailtrap_api_token')}
                          onChange={(v) => handleChange('mailtrap_api_token', v)}
                          placeholder="Masukkan Mailtrap API Token"
                        />
                      </div>
                    )}

                    {/* SendGrid API Fields */}
                    {getActiveConfigValue('email_provider') === 'sendgrid' && (
                      <div className="space-y-1.5">
                        <label className="text-[11px] font-bold text-slate-755 dark:text-slate-350">SendGrid API Key</label>
                        <PasswordInput
                          value={getActiveConfigValue('sendgrid_api_key')}
                          onChange={(v) => handleChange('sendgrid_api_key', v)}
                          placeholder="SG.xxxxxxxxxxxxx"
                        />
                      </div>
                    )}

                    {/* Common Sender Info Fields */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <label className="text-[11px] font-bold text-slate-755 dark:text-slate-350">Email Pengirim (From)</label>
                        <input
                          type="email"
                          value={getActiveConfigValue('smtp_from')}
                          onChange={(e) => handleChange('smtp_from', e.target.value)}
                          placeholder="noreply@perusahaan.com"
                          className="w-full px-4 py-2.5 rounded-xl bg-slate-50/50 dark:bg-slate-900/50 border border-slate-200/80 dark:border-slate-800 text-slate-800 dark:text-white focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-600/10 text-xs font-semibold"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[11px] font-bold text-slate-755 dark:text-slate-350">Nama Pengirim Email</label>
                        <input
                          type="text"
                          value={getActiveConfigValue('smtp_from_name')}
                          onChange={(e) => handleChange('smtp_from_name', e.target.value)}
                          placeholder="PT Jearinganku Sarana Nusantara"
                          className="w-full px-4 py-2.5 rounded-xl bg-slate-50/50 dark:bg-slate-900/50 border border-slate-200/80 dark:border-slate-800 text-slate-800 dark:text-white focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-600/10 text-xs font-semibold"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {subTab === 'whatsapp' && (
              <div className="space-y-8 divide-y divide-slate-100 dark:divide-slate-800/80">
                {/* Provider selection */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 py-4">
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2">
                      <PhoneCall className="w-4 h-4 text-emerald-500" />
                      <h3 className="text-xs font-bold text-slate-800 dark:text-white uppercase tracking-wider">Provider WhatsApp</h3>
                    </div>
                    <p className="text-xxs text-slate-450 dark:text-slate-550 leading-normal max-w-xs">
                      Pilih provider WhatsApp Gateway yang ingin digunakan.
                    </p>
                  </div>
                  <div className="lg:col-span-2 grid grid-cols-1 md:grid-cols-4 gap-4">
                    {[
                      { id: 'fonnte', title: 'Fonnte', url: 'https://api.fonnte.com/send' },
                      { id: 'ruangwa', title: 'RuangWA', url: 'https://api.ruangwa.com/send' },
                      { id: 'starsender', title: 'Starsender', url: 'https://api.starsender.online/send' },
                      { id: 'other', title: 'Webhook Lain', url: '' }
                    ].map((opt) => {
                      const isSelected = getActiveConfigValue('wa_provider') === opt.id
                      return (
                        <button
                          type="button"
                          key={opt.id}
                          onClick={() => {
                            handleChange('wa_provider', opt.id)
                            if (opt.url) {
                              handleChange('wa_api_url', opt.url)
                            }
                          }}
                          className={`p-4 rounded-2xl border text-center flex flex-col justify-center items-center h-24 transition-all duration-200 ${
                            isSelected
                              ? 'border-blue-600 bg-blue-50/20 dark:bg-blue-950/10 ring-2 ring-blue-600/10 font-bold'
                              : 'border-slate-200/70 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 bg-white dark:bg-slate-900/30'
                          }`}
                        >
                          <span className={`text-xs ${isSelected ? 'text-blue-650 dark:text-blue-400' : 'text-slate-750 dark:text-slate-200'}`}>{opt.title}</span>
                        </button>
                      )
                    })}
                  </div>
                </div>

                {/* URL Endpoint & API Key */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 py-6">
                  <div className="space-y-1.5">
                    <h3 className="text-xs font-bold text-slate-800 dark:text-white uppercase tracking-wider">Konfigurasi Gateway</h3>
                    <p className="text-xxs text-slate-455 dark:text-slate-500 leading-normal max-w-xs">
                      Masukkan URL Endpoint API provider WhatsApp Gateway dan token akses API Key Anda.
                    </p>
                  </div>
                  <div className="lg:col-span-2 space-y-4">
                    <div className="space-y-1.5">
                      <label className="text-[11px] font-bold text-slate-755 dark:text-slate-350">URL API Endpoint</label>
                      <input
                        type="text"
                        value={getActiveConfigValue('wa_api_url')}
                        onChange={(e) => handleChange('wa_api_url', e.target.value)}
                        placeholder="Contoh: https://api.fonnte.com/send"
                        className="w-full px-4 py-2.5 rounded-xl bg-slate-50/50 dark:bg-slate-900/50 border border-slate-200/80 dark:border-slate-800 text-slate-800 dark:text-white focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-600/10 text-xs font-semibold"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[11px] font-bold text-slate-755 dark:text-slate-350">API Key / Token WhatsApp</label>
                      <PasswordInput
                        value={getActiveConfigValue('wa_api_key')}
                        onChange={(v) => handleChange('wa_api_key', v)}
                        placeholder="Masukkan API Token gateway"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[11px] font-bold text-slate-755 dark:text-slate-350">Webhook URL (Legacy)</label>
                      <input
                        type="text"
                        value={getActiveConfigValue('notif_webhook_url')}
                        onChange={(e) => handleChange('notif_webhook_url', e.target.value)}
                        placeholder="Contoh: https://hook.perusahaan.com/wa"
                        className="w-full px-4 py-2.5 rounded-xl bg-slate-50/50 dark:bg-slate-900/50 border border-slate-200/80 dark:border-slate-800 text-slate-800 dark:text-white focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-600/10 text-xs font-semibold"
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {subTab === 'templates' && (
              <div className="space-y-8 divide-y divide-slate-100 dark:divide-slate-800/80">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 py-4">
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2">
                      <FileText className="w-4 h-4 text-indigo-500" />
                      <h3 className="text-xs font-bold text-slate-800 dark:text-white uppercase tracking-wider">Format WhatsApp Alert</h3>
                    </div>
                    <p className="text-xxs text-slate-450 dark:text-slate-500 leading-normal max-w-xs">
                      Kustomisasi template konten teks notifikasi WhatsApp yang dikirim otomatis pada setiap transisi alur registrasi pelanggan.
                    </p>
                  </div>
                  <div className="lg:col-span-2 space-y-6">
                    {[
                      { key: 'notif_tmpl_new_registration', label: '1. Pendaftaran Baru Berhasil', tags: ['{{FullName}}', '{{Phone}}', '{{RegNumber}}'] },
                      { key: 'notif_tmpl_survey_scheduled', label: '2. Jadwal Survei Ditentukan', tags: ['{{FullName}}', '{{Phone}}', '{{RegNumber}}'] },
                      { key: 'notif_tmpl_payment_confirmed', label: '3. Pembayaran Biaya Instalasi Dikonfirmasi', tags: ['{{FullName}}', '{{Phone}}', '{{RegNumber}}'] },
                      { key: 'notif_tmpl_activation_success', label: '4. Akun PPPoE Aktif & Internet Menyala', tags: ['{{FullName}}', '{{Phone}}', '{{RegNumber}}', '{{PPPoEUsername}}'] },
                      { key: 'notif_tmpl_provisioning_failed', label: '5. Alert Gagal Provisioning (Staf)', tags: ['{{FullName}}', '{{Phone}}', '{{RegNumber}}', '{{Error}}'] }
                    ].map((tmpl) => (
                      <div key={tmpl.key} className="space-y-2">
                        <label className="text-[11px] font-extrabold text-slate-755 dark:text-slate-350 block">
                          {tmpl.label}
                        </label>
                        <textarea
                          value={getActiveConfigValue(tmpl.key)}
                          onChange={(e) => handleChange(tmpl.key, e.target.value)}
                          rows={4}
                          className="w-full px-4 py-2.5 rounded-xl bg-slate-50/50 dark:bg-slate-900/50 border border-slate-200/80 dark:border-slate-800 text-slate-800 dark:text-white focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-600/10 text-xs font-semibold font-mono leading-relaxed"
                        />
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span className="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase mr-1">Klik tag untuk menyisipkan:</span>
                          {tmpl.tags.map((tag) => (
                            <button
                              type="button"
                              key={tag}
                              onClick={() => appendPlaceholder(tmpl.key, tag)}
                              className="px-2 py-0.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 border border-slate-200/50 dark:border-slate-700/50 text-[9px] font-mono font-bold text-slate-600 dark:text-slate-350 rounded transition-colors"
                            >
                              {tag}
                            </button>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'branding' && (
          <div className="space-y-8 divide-y divide-slate-100 dark:divide-slate-800/80 animate-fade-in">
            {/* Section 1: Identitas Brand & Logo */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 py-4">
              <div className="space-y-1.5">
                <div className="flex items-center gap-2">
                  <Paintbrush className="w-4 h-4 text-amber-500" />
                  <h3 className="text-xs font-bold text-slate-800 dark:text-white uppercase tracking-wider">Identitas Brand & Logo</h3>
                </div>
                <p className="text-xxs text-slate-450 dark:text-slate-555 leading-normal max-w-xs">
                  Konfigurasi nama layanan dan logo resmi perusahaan yang akan ditampilkan di web pendaftaran dan template email.
                </p>
              </div>
              <div className="lg:col-span-2 space-y-4">
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-slate-755 dark:text-slate-350 block">Nama Brand Layanan</label>
                  <input
                    type="text"
                    value={getActiveConfigValue('brand_name')}
                    onChange={(e) => handleChange('brand_name', e.target.value)}
                    placeholder="Contoh: PT Jeringanku Sarana Nusantara"
                    className="w-full px-4 py-2.5 rounded-xl bg-slate-50/50 dark:bg-slate-900/50 border border-slate-200/80 dark:border-slate-800 text-slate-800 dark:text-white focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-600/10 text-xs font-semibold"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-slate-755 dark:text-slate-350 block">Logo Brand</label>
                  <div className="flex gap-4 items-center">
                    {/* Logo Canvas Preview */}
                    <div className="h-16 w-32 bg-slate-50/50 dark:bg-slate-950 border border-slate-200/60 dark:border-slate-800 rounded-xl p-2 flex items-center justify-center overflow-hidden flex-shrink-0 shadow-inner">
                      {getActiveConfigValue('brand_logo_url') ? (
                        <img
                          src={getActiveConfigValue('brand_logo_url')}
                          alt="Brand Logo"
                          className="h-full w-auto object-contain"
                        />
                      ) : (
                        <span className="text-[10px] text-slate-400 font-bold italic">No Logo</span>
                      )}
                    </div>

                    <div className="flex-1 space-y-2">
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={getActiveConfigValue('brand_logo_url')}
                          onChange={(e) => handleChange('brand_logo_url', e.target.value)}
                          placeholder="Masukkan URL logo atau unggah file di kanan"
                          className="flex-1 px-4 py-2.5 rounded-xl bg-slate-50/50 dark:bg-slate-900/50 border border-slate-200/80 dark:border-slate-800 text-slate-800 dark:text-white focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-600/10 text-xs font-semibold"
                        />
                        <label className="flex items-center justify-center gap-1.5 px-4 py-2.5 bg-blue-50 hover:bg-blue-100 dark:bg-blue-950/20 text-blue-600 rounded-xl cursor-pointer text-xs font-extrabold transition-all border border-blue-200/40 select-none">
                          {uploadingLogo ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <Upload className="w-3.5 h-3.5" />
                          )}
                          <span>Unggah</span>
                          <input
                            type="file"
                            accept=".png,.jpg,.jpeg,.svg"
                            onChange={handleLogoUpload}
                            className="hidden"
                            disabled={uploadingLogo}
                          />
                        </label>
                      </div>
                      <p className="text-[9px] text-slate-450 dark:text-slate-555 leading-normal">
                        Ukuran maksimal 2MB. Format file: PNG, JPG, JPEG, atau SVG. Gunakan logo transparan.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="space-y-1.5 pt-2">
                  <label className="text-[11px] font-bold text-slate-755 dark:text-slate-350 block">Favicon Brand (URL)</label>
                  <input
                    type="text"
                    value={getActiveConfigValue('brand_favicon_url')}
                    onChange={(e) => handleChange('brand_favicon_url', e.target.value)}
                    placeholder="Contoh: /favicon.ico atau URL eksternal"
                    className="w-full px-4 py-2.5 rounded-xl bg-slate-50/50 dark:bg-slate-900/50 border border-slate-200/80 dark:border-slate-800 text-slate-800 dark:text-white focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-600/10 text-xs font-semibold"
                  />
                </div>

                <div className="pt-2">
                  <span className="text-[11px] font-bold text-slate-755 dark:text-slate-350 block mb-2">Skema Warna Brand & Tema</span>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-[10px] text-slate-500 dark:text-slate-400 block font-semibold">Warna Primer</label>
                      <div className="flex gap-2">
                        <input
                          type="color"
                          value={getActiveConfigValue('brand_primary_color', '#2563eb')}
                          onChange={(e) => handleChange('brand_primary_color', e.target.value)}
                          className="w-9 h-9 rounded-lg cursor-pointer bg-transparent border border-slate-200 dark:border-slate-800 p-0.5 flex-shrink-0"
                        />
                        <input
                          type="text"
                          value={getActiveConfigValue('brand_primary_color', '#2563eb')}
                          onChange={(e) => handleChange('brand_primary_color', e.target.value)}
                          placeholder="#2563eb"
                          className="flex-1 px-3 py-2 rounded-xl bg-slate-50/50 dark:bg-slate-900/50 border border-slate-200/80 dark:border-slate-800 text-slate-800 dark:text-white text-xs font-mono uppercase"
                        />
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[10px] text-slate-500 dark:text-slate-400 block font-semibold">Warna Sekunder</label>
                      <div className="flex gap-2">
                        <input
                          type="color"
                          value={getActiveConfigValue('brand_secondary_color', '#4f46e5')}
                          onChange={(e) => handleChange('brand_secondary_color', e.target.value)}
                          className="w-9 h-9 rounded-lg cursor-pointer bg-transparent border border-slate-200 dark:border-slate-800 p-0.5 flex-shrink-0"
                        />
                        <input
                          type="text"
                          value={getActiveConfigValue('brand_secondary_color', '#4f46e5')}
                          onChange={(e) => handleChange('brand_secondary_color', e.target.value)}
                          placeholder="#4f46e5"
                          className="flex-1 px-3 py-2 rounded-xl bg-slate-50/50 dark:bg-slate-900/50 border border-slate-200/80 dark:border-slate-800 text-slate-800 dark:text-white text-xs font-mono uppercase"
                        />
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[10px] text-slate-500 dark:text-slate-400 block font-semibold">Warna Aksen</label>
                      <div className="flex gap-2">
                        <input
                          type="color"
                          value={getActiveConfigValue('brand_accent_color', '#f59e0b')}
                          onChange={(e) => handleChange('brand_accent_color', e.target.value)}
                          className="w-9 h-9 rounded-lg cursor-pointer bg-transparent border border-slate-200 dark:border-slate-800 p-0.5 flex-shrink-0"
                        />
                        <input
                          type="text"
                          value={getActiveConfigValue('brand_accent_color', '#f59e0b')}
                          onChange={(e) => handleChange('brand_accent_color', e.target.value)}
                          placeholder="#f59e0b"
                          className="flex-1 px-3 py-2 rounded-xl bg-slate-50/50 dark:bg-slate-900/50 border border-slate-200/80 dark:border-slate-800 text-slate-800 dark:text-white text-xs font-mono uppercase"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Section 2: Halaman Utama (Hero) */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 py-6">
              <div className="space-y-1.5">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-indigo-500" />
                  <h3 className="text-xs font-bold text-slate-800 dark:text-white uppercase tracking-wider">Hero Section</h3>
                </div>
                <p className="text-xxs text-slate-455 dark:text-slate-500 leading-normal max-w-xs">
                  Sesuaikan judul utama dan deskripsi penawaran pada bagian atas halaman depan website pendaftaran.
                </p>
              </div>
              <div className="lg:col-span-2 space-y-4">
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-slate-755 dark:text-slate-350 block">Judul Utama (Hero Title)</label>
                  <input
                    type="text"
                    value={getActiveConfigValue('website_hero_title')}
                    onChange={(e) => handleChange('website_hero_title', e.target.value)}
                    placeholder="Contoh: Pasang Internet Cepat Tanpa Batas!"
                    className="w-full px-4 py-2.5 rounded-xl bg-slate-50/50 dark:bg-slate-900/50 border border-slate-200/80 dark:border-slate-800 text-slate-800 dark:text-white focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-600/10 text-xs font-semibold"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-slate-755 dark:text-slate-350 block">Sub-judul / Deskripsi Hero</label>
                  <textarea
                    value={getActiveConfigValue('website_hero_subtitle')}
                    onChange={(e) => handleChange('website_hero_subtitle', e.target.value)}
                    rows={3}
                    placeholder="Masukkan deskripsi singkat penawaran layanan..."
                    className="w-full px-4 py-2.5 rounded-xl bg-slate-50/50 dark:bg-slate-900/50 border border-slate-200/80 dark:border-slate-800 text-slate-800 dark:text-white focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-600/10 text-xs font-semibold leading-relaxed"
                  />
                </div>
              </div>
            </div>

            {/* Section 3: Informasi Kontak & Alamat */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 py-6">
              <div className="space-y-1.5">
                <div className="flex items-center gap-2">
                  <Globe className="w-4 h-4 text-emerald-500" />
                  <h3 className="text-xs font-bold text-slate-800 dark:text-white uppercase tracking-wider">Kontak & Alamat</h3>
                </div>
                <p className="text-xxs text-slate-455 dark:text-slate-555 leading-normal max-w-xs">
                  Detail kontak resmi yang akan diletakkan pada halaman kontak dan footer agar pelanggan dapat menghubungi tim bantuan.
                </p>
              </div>
              <div className="lg:col-span-2 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-bold text-slate-755 dark:text-slate-350 block">WhatsApp Layanan Bantuan</label>
                    <input
                      type="text"
                      value={getActiveConfigValue('website_contact_phone')}
                      onChange={(e) => handleChange('website_contact_phone', e.target.value)}
                      placeholder="Contoh: 08123456789"
                      className="w-full px-4 py-2.5 rounded-xl bg-slate-50/50 dark:bg-slate-900/50 border border-slate-200/80 dark:border-slate-800 text-slate-800 dark:text-white focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-600/10 text-xs font-semibold"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[11px] font-bold text-slate-755 dark:text-slate-350 block">Email Dukungan Pelanggan</label>
                    <input
                      type="email"
                      value={getActiveConfigValue('website_contact_email')}
                      onChange={(e) => handleChange('website_contact_email', e.target.value)}
                      placeholder="support@perusahaan.com"
                      className="w-full px-4 py-2.5 rounded-xl bg-slate-50/50 dark:bg-slate-900/50 border border-slate-200/80 dark:border-slate-800 text-slate-800 dark:text-white focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-600/10 text-xs font-semibold"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-slate-755 dark:text-slate-350 block">Alamat Kantor/Operasional</label>
                  <textarea
                    value={getActiveConfigValue('website_address')}
                    onChange={(e) => handleChange('website_address', e.target.value)}
                    rows={2}
                    placeholder="Jl. Raya Utama No. 123, Jakarta..."
                    className="w-full px-4 py-2.5 rounded-xl bg-slate-50/50 dark:bg-slate-900/50 border border-slate-200/80 dark:border-slate-800 text-slate-800 dark:text-white focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-600/10 text-xs font-semibold leading-relaxed"
                  />
                </div>
              </div>
            </div>

            {/* Section 4: Footer & Legalitas */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 py-6">
              <div className="space-y-1.5">
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4 text-teal-500" />
                  <h3 className="text-xs font-bold text-slate-800 dark:text-white uppercase tracking-wider">Footer & Legalitas</h3>
                </div>
                <p className="text-xxs text-slate-455 dark:text-slate-555 leading-normal max-w-xs">
                  Konfigurasi informasi copyright, tagline footer, tautan legal, dan link download aplikasi mobile.
                </p>
              </div>
              <div className="lg:col-span-2 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-bold text-slate-755 dark:text-slate-350 block">Tagline Kiri Footer</label>
                    <input
                      type="text"
                      value={getActiveConfigValue('brand_footer_tagline')}
                      onChange={(e) => handleChange('brand_footer_tagline', e.target.value)}
                      className="w-full px-4 py-2.5 rounded-xl bg-slate-50/50 dark:bg-slate-900/50 border border-slate-200/80 dark:border-slate-800 text-slate-800 dark:text-white focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-600/10 text-xs font-semibold"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[11px] font-bold text-slate-755 dark:text-slate-350 block">Teks Unduh Aplikasi</label>
                    <input
                      type="text"
                      value={getActiveConfigValue('brand_footer_download_text')}
                      onChange={(e) => handleChange('brand_footer_download_text', e.target.value)}
                      className="w-full px-4 py-2.5 rounded-xl bg-slate-50/50 dark:bg-slate-900/50 border border-slate-200/80 dark:border-slate-800 text-slate-800 dark:text-white focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-600/10 text-xs font-semibold"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-slate-755 dark:text-slate-350 block">Teks Copyright Hak Cipta</label>
                  <input
                    type="text"
                    value={getActiveConfigValue('brand_footer_copyright')}
                    onChange={(e) => handleChange('brand_footer_copyright', e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl bg-slate-50/50 dark:bg-slate-900/50 border border-slate-200/80 dark:border-slate-800 text-slate-800 dark:text-white focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-600/10 text-xs font-semibold"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-bold text-slate-755 dark:text-slate-350 block">Tautan Menu Footer (JSON Array)</label>
                    <textarea
                      value={getActiveConfigValue('brand_footer_links')}
                      onChange={(e) => handleChange('brand_footer_links', e.target.value)}
                      rows={4}
                      className="w-full px-4 py-2.5 rounded-xl bg-slate-50/50 dark:bg-slate-900/50 border border-slate-200/80 dark:border-slate-800 text-slate-800 dark:text-white focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-600/10 text-xs font-mono font-semibold"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[11px] font-bold text-slate-755 dark:text-slate-350 block">Tautan Media Sosial (JSON Array)</label>
                    <textarea
                      value={getActiveConfigValue('brand_footer_socials')}
                      onChange={(e) => handleChange('brand_footer_socials', e.target.value)}
                      rows={4}
                      className="w-full px-4 py-2.5 rounded-xl bg-slate-50/50 dark:bg-slate-900/50 border border-slate-200/80 dark:border-slate-800 text-slate-800 dark:text-white focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-600/10 text-xs font-mono font-semibold"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'invoice' && (
          <div className="space-y-8 divide-y divide-slate-100 dark:divide-slate-800/80 animate-fade-in">
            {/* Section 1: Profil Perusahaan Tagihan */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 py-4">
              <div className="space-y-1.5">
                <div className="flex items-center gap-2">
                  <Globe className="w-4 h-4 text-blue-500" />
                  <h3 className="text-xs font-bold text-slate-800 dark:text-white uppercase tracking-wider">Profil Perusahaan</h3>
                </div>
                <p className="text-xxs text-slate-450 dark:text-slate-555 leading-normal max-w-xs">
                  Detail identitas resmi perusahaan yang akan tertera pada lembar invoice dan kuitansi pembayaran pelanggan.
                </p>
              </div>
              <div className="lg:col-span-2 space-y-4">
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-slate-755 dark:text-slate-350 block">Nama Perusahaan Resmi</label>
                  <input
                    type="text"
                    value={getActiveConfigValue('invoice_company_name')}
                    onChange={(e) => handleChange('invoice_company_name', e.target.value)}
                    placeholder="Contoh: PT Jaringan Sarana Nusantara"
                    className="w-full px-4 py-2.5 rounded-xl bg-slate-50/50 dark:bg-slate-900/50 border border-slate-200/80 dark:border-slate-800 text-slate-800 dark:text-white focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-600/10 text-xs font-semibold"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-bold text-slate-755 dark:text-slate-350 block">No. Telepon Kontak</label>
                    <input
                      type="text"
                      value={getActiveConfigValue('invoice_company_phone')}
                      onChange={(e) => handleChange('invoice_company_phone', e.target.value)}
                      placeholder="Contoh: (021) 555-1234"
                      className="w-full px-4 py-2.5 rounded-xl bg-slate-50/50 dark:bg-slate-900/50 border border-slate-200/80 dark:border-slate-800 text-slate-800 dark:text-white focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-600/10 text-xs font-semibold"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[11px] font-bold text-slate-755 dark:text-slate-350 block">Email Kontak Billing</label>
                    <input
                      type="email"
                      value={getActiveConfigValue('invoice_company_email')}
                      onChange={(e) => handleChange('invoice_company_email', e.target.value)}
                      placeholder="Contoh: support@jsn.net.id"
                      className="w-full px-4 py-2.5 rounded-xl bg-slate-50/50 dark:bg-slate-900/50 border border-slate-200/80 dark:border-slate-800 text-slate-800 dark:text-white focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-600/10 text-xs font-semibold"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-slate-755 dark:text-slate-350 block">Alamat Perusahaan Lengkap</label>
                  <textarea
                    value={getActiveConfigValue('invoice_company_address')}
                    onChange={(e) => handleChange('invoice_company_address', e.target.value)}
                    rows={2}
                    placeholder="Jl. Utama Raya No. 45, Jakarta Pusat..."
                    className="w-full px-4 py-2.5 rounded-xl bg-slate-50/50 dark:bg-slate-900/50 border border-slate-200/80 dark:border-slate-800 text-slate-800 dark:text-white focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-600/10 text-xs font-semibold leading-relaxed"
                  />
                </div>
              </div>
            </div>

            {/* Section 2: Pajak & WhatsApp Pengirim */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 py-6">
              <div className="space-y-1.5">
                <div className="flex items-center gap-2">
                  <Shield className="w-4 h-4 text-emerald-500" />
                  <h3 className="text-xs font-bold text-slate-800 dark:text-white uppercase tracking-wider">Pajak & Sistem</h3>
                </div>
                <p className="text-xxs text-slate-455 dark:text-slate-555 leading-normal max-w-xs">
                  Konfigurasi tarif pajak resmi dan nomor pengirim WhatsApp sistem untuk dispatch otomatis.
                </p>
              </div>
              <div className="lg:col-span-2 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-bold text-slate-755 dark:text-slate-350 block">Tarif PPN (%)</label>
                    <input
                      type="number"
                      value={getActiveConfigValue('invoice_tax_rate')}
                      onChange={(e) => handleChange('invoice_tax_rate', e.target.value)}
                      placeholder="Contoh: 11"
                      className="w-full px-4 py-2.5 rounded-xl bg-slate-50/50 dark:bg-slate-900/50 border border-slate-200/80 dark:border-slate-800 text-slate-800 dark:text-white focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-600/10 text-xs font-semibold"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[11px] font-bold text-slate-755 dark:text-slate-350 block">No. WhatsApp Sistem</label>
                    <input
                      type="text"
                      value={getActiveConfigValue('wa_system_number')}
                      onChange={(e) => handleChange('wa_system_number', e.target.value)}
                      placeholder="Contoh: 085167720007"
                      className="w-full px-4 py-2.5 rounded-xl bg-slate-50/50 dark:bg-slate-900/50 border border-slate-200/80 dark:border-slate-800 text-slate-800 dark:text-white focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-600/10 text-xs font-semibold"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Section 3: Cara Pembayaran */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 py-6">
              <div className="space-y-1.5">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-amber-500" />
                  <h3 className="text-xs font-bold text-slate-800 dark:text-white uppercase tracking-wider">Instruksi Pembayaran</h3>
                </div>
                <p className="text-xxs text-slate-455 dark:text-slate-500 leading-normal max-w-xs">
                  Petunjuk atau instruksi cara transfer bank / e-wallet yang akan ditampilkan pada lembar invoice pelanggan.
                </p>
              </div>
              <div className="lg:col-span-2 space-y-4">
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-slate-755 dark:text-slate-350 block">Metode Pembayaran (Teks/Instruksi)</label>
                  <textarea
                    value={getActiveConfigValue('invoice_payment_instructions')}
                    onChange={(e) => handleChange('invoice_payment_instructions', e.target.value)}
                    rows={4}
                    placeholder="Masukkan rincian nomor rekening bank..."
                    className="w-full px-4 py-2.5 rounded-xl bg-slate-50/50 dark:bg-slate-900/50 border border-slate-200/80 dark:border-slate-800 text-slate-800 dark:text-white focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-600/10 text-xs font-semibold leading-relaxed font-mono"
                  />
                </div>
              </div>
          </div>

          {/* ── Billing Scheme Section ── */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 py-6">
            <div className="space-y-1.5">
              <div className="flex items-center gap-2">
                <CreditCard className="w-4 h-4 text-violet-500" />
                <h3 className="text-xs font-bold text-slate-800 dark:text-white uppercase tracking-wider">Skema Billing</h3>
              </div>
              <p className="text-xxs text-slate-450 dark:text-slate-500 leading-normal max-w-xs">
                Pilih metode penagihan yang berlaku untuk seluruh pelanggan aktif. Perubahan ini bersifat universal.
              </p>
            </div>
            <div className="lg:col-span-2 space-y-5">
              {/* Toggle Postpaid / Prepaid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {[
                  {
                    id: 'postpaid',
                    label: 'Pascabayar',
                    sublabel: 'Pakai dulu, bayar nanti',
                    desc: 'Invoice dikirim tiap tanggal tertentu. Lewat jatuh tempo + toleransi → isolir otomatis.',
                    icon: CalendarClock,
                    color: 'blue',
                  },
                  {
                    id: 'prepaid',
                    label: 'Prabayar',
                    sublabel: 'Bayar dulu, baru pakai',
                    desc: 'Pelanggan membeli masa aktif N hari. Mendekati expired → reminder WA. Expired → putus.',
                    icon: Wallet,
                    color: 'violet',
                  },
                ].map((opt) => {
                  const Icon = opt.icon
                  const isSelected = getActiveConfigValue('billing_scheme', 'postpaid') === opt.id
                  const ring = opt.color === 'violet' ? 'border-violet-500 bg-violet-50/20 dark:bg-violet-950/10 ring-2 ring-violet-500/10' : 'border-blue-600 bg-blue-50/20 dark:bg-blue-950/10 ring-2 ring-blue-600/10'
                  const iconBg = opt.color === 'violet' ? 'bg-violet-600 text-white' : 'bg-blue-600 text-white'
                  const titleColor = opt.color === 'violet' ? 'text-violet-600 dark:text-violet-400' : 'text-blue-600 dark:text-blue-400'
                  return (
                    <button
                      type="button"
                      key={opt.id}
                      onClick={() => handleChange('billing_scheme', opt.id)}
                      className={`p-4 rounded-2xl border text-left flex flex-col gap-2.5 transition-all duration-200 ${
                        isSelected
                          ? ring
                          : 'border-slate-200/70 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 bg-white dark:bg-slate-900/30'
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
                          isSelected ? iconBg : 'bg-slate-100 dark:bg-slate-950 text-slate-400'
                        }`}>
                          <Icon className="w-4 h-4" />
                        </div>
                        <div>
                          <div className={`text-xs font-black ${isSelected ? titleColor : 'text-slate-700 dark:text-slate-300'}`}>{opt.label}</div>
                          <div className="text-[10px] text-slate-400 dark:text-slate-500">{opt.sublabel}</div>
                        </div>
                      </div>
                      <p className="text-[10px] text-slate-500 dark:text-slate-400 leading-snug">{opt.desc}</p>
                    </button>
                  )
                })}
              </div>

              {/* Conditional settings */}
              <div className="bg-slate-50/70 dark:bg-slate-900/30 rounded-2xl border border-slate-100 dark:border-slate-800/60 p-5 space-y-4">
                <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                  Konfigurasi {getActiveConfigValue('billing_scheme', 'postpaid') === 'prepaid' ? 'Prabayar' : 'Pascabayar'}
                </p>

                {getActiveConfigValue('billing_scheme', 'postpaid') === 'postpaid' && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-[11px] font-extrabold text-slate-700 dark:text-slate-300 block">Tanggal Penagihan per Bulan</label>
                      <div className="relative">
                        <input
                          type="number"
                          min="1" max="28"
                          value={getActiveConfigValue('billing_due_day', '5')}
                          onChange={(e) => handleChange('billing_due_day', e.target.value)}
                          className="w-full pl-4 pr-16 py-2.5 rounded-xl bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-white focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-600/10 text-xs font-semibold"
                        />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-bold text-slate-400">setiap bulan</span>
                      </div>
                      <p className="text-[10px] text-slate-400 italic">Invoice dibuat pada tanggal ini tiap bulan (1–28).</p>
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[11px] font-extrabold text-slate-700 dark:text-slate-300 block">Toleransi Grace Period (Hari)</label>
                      <div className="relative">
                        <input
                          type="number"
                          min="0" max="30"
                          value={getActiveConfigValue('billing_grace_period_days', '7')}
                          onChange={(e) => handleChange('billing_grace_period_days', e.target.value)}
                          className="w-full pl-4 pr-10 py-2.5 rounded-xl bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-white focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-600/10 text-xs font-semibold"
                        />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-bold text-slate-400">hari</span>
                      </div>
                      <p className="text-[10px] text-slate-400 italic">Pelanggan diisolir jika belum bayar setelah jatuh tempo + toleransi ini.</p>
                    </div>
                  </div>
                )}

                {getActiveConfigValue('billing_scheme', 'postpaid') === 'prepaid' && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-[11px] font-extrabold text-slate-700 dark:text-slate-300 block">Durasi Masa Aktif per Pembayaran</label>
                      <div className="relative">
                        <input
                          type="number"
                          min="1"
                          value={getActiveConfigValue('billing_prepaid_period_days', '30')}
                          onChange={(e) => handleChange('billing_prepaid_period_days', e.target.value)}
                          className="w-full pl-4 pr-10 py-2.5 rounded-xl bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-white focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-600/10 text-xs font-semibold"
                        />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-bold text-slate-400">hari</span>
                      </div>
                      <p className="text-[10px] text-slate-400 italic">Jumlah hari masa aktif yang ditambahkan setiap kali pelanggan melakukan pembayaran.</p>
                    </div>
                  </div>
                )}

                {/* Shared: reminder days */}
                <div className="space-y-1.5">
                  <label className="text-[11px] font-extrabold text-slate-700 dark:text-slate-300 block">
                    {getActiveConfigValue('billing_scheme', 'postpaid') === 'prepaid'
                      ? 'Reminder WA Sebelum Expired (Hari)'
                      : 'Reminder WA Sebelum Jatuh Tempo (Hari)'}
                  </label>
                  <div className="relative" style={{ maxWidth: '200px' }}>
                    <input
                      type="number"
                      min="1" max="14"
                      value={getActiveConfigValue('billing_reminder_days_before', '3')}
                      onChange={(e) => handleChange('billing_reminder_days_before', e.target.value)}
                      className="w-full pl-4 pr-10 py-2.5 rounded-xl bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-white focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-600/10 text-xs font-semibold"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-bold text-slate-400">hari</span>
                  </div>
                  <p className="text-[10px] text-slate-400 italic">Sistem mengirim WA pengingat H-N sebelum jatuh tempo atau masa aktif berakhir.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>

      {/* Floating Unsaved Changes Notification Banner */}
      {isTabDirty && (
        <div className="fixed bottom-6 right-6 left-6 md:left-[18rem] bg-slate-950 dark:bg-white text-white dark:text-slate-900 py-3.5 px-6 rounded-2xl shadow-xl flex flex-col sm:flex-row items-center justify-between gap-3 z-50 animate-slide-up border border-slate-800 dark:border-slate-100 backdrop-blur-md">
          <div className="flex items-center gap-2.5">
            <div className="w-2 h-2 rounded-full bg-amber-500 animate-pulse flex-shrink-0" />
            <span className="text-[11px] font-extrabold tracking-wide uppercase">Ada perubahan pengaturan yang belum disimpan!</span>
          </div>
          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            <button
              onClick={handleReset}
              disabled={isSavingAll}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-extrabold hover:bg-slate-900 dark:hover:bg-slate-100 text-slate-300 dark:text-slate-600 transition-all border border-slate-800 dark:border-slate-200"
            >
              <Undo2 className="w-3.5 h-3.5" />
              Batalkan
            </button>
            <button
              onClick={handleSaveAll}
              disabled={isSavingAll}
              className="flex items-center gap-1.5 px-5 py-2 rounded-xl text-xs font-black bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-500/20 transition-all"
            >
              {isSavingAll ? (
                <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Menyimpan...</>
              ) : (
                <><Save className="w-3.5 h-3.5" /> Simpan Semua</>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
