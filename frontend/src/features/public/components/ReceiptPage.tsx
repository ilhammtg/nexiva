import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { publicApi } from '../api/publicApi'
import { Printer, CheckCircle2, ShieldCheck, Calendar, Wallet } from 'lucide-react'
import { Loader2, AlertCircle } from 'lucide-react'

export default function ReceiptPage() {
  const { id } = useParams<{ id: string }>()
  const [printMode, setPrintMode] = useState(false)

  const { data: config } = useQuery({
    queryKey: ['public-configs'],
    queryFn: publicApi.getPublicConfigs,
    staleTime: 10 * 60 * 1000,
  })

  const { data: registration, isLoading, error } = useQuery({
    queryKey: ['public-registration', id],
    queryFn: () => publicApi.getPublicRegistration(id!),
    enabled: !!id,
    retry: 1,
  })

  useEffect(() => {
    if (printMode) {
      window.print()
      setPrintMode(false)
    }
  }, [printMode])

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex flex-col items-center justify-center p-6">
        <Loader2 className="w-10 h-10 text-emerald-600 animate-spin" />
        <p className="mt-4 text-sm font-bold text-slate-550 dark:text-slate-400">Memuat bukti pembayaran...</p>
      </div>
    )
  }

  if (error || !registration) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex flex-col items-center justify-center p-6">
        <div className="max-w-md w-full bg-white dark:bg-slate-800 p-8 rounded-3xl shadow-xl text-center border border-slate-100 dark:border-slate-700">
          <div className="w-16 h-16 bg-red-50 dark:bg-red-950/20 text-red-650 dark:text-red-400 rounded-2xl flex items-center justify-center mx-auto mb-6">
            <AlertCircle className="w-8 h-8" />
          </div>
          <h2 className="text-lg font-black text-slate-800 dark:text-white mb-2">Bukti Pembayaran Tidak Ditemukan</h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed mb-6">
            Tanda terima dengan ID tersebut tidak dapat ditemukan. Silakan periksa kembali tautan yang dikirimkan.
          </p>
        </div>
      </div>
    )
  }

  // Ensure status is payment_confirmed or active
  const isPaid = registration.status === 'payment_confirmed' || registration.status === 'active' || registration.status === 'activated' || registration.status === 'provisioning' || registration.status === 'provisioning_failed'

  const companyName = config?.invoice_company_name || config?.brand_name || 'PT Jaringan Sarana Nusantara'
  const companyAddress = config?.invoice_company_address || config?.website_address || 'Jl. Utama Raya No. 45, Jakarta Pusat'
  const companyPhone = config?.invoice_company_phone || config?.website_contact_phone || '(021) 555-1234'
  const companyEmail = config?.invoice_company_email || config?.website_contact_email || 'support@jsn.net.id'
  const taxRate = parseFloat(config?.invoice_tax_rate || '11')

  // Math (Tax Inclusive / Sudah Termasuk PPN 11%)
  const instFee = registration.installation_fee !== null ? Number(registration.installation_fee) : 0
  const packPrice = Number(registration.package_price || 0)
  
  const total = instFee + packPrice
  const subtotal = Math.round(total / (1 + taxRate / 100))
  const ppn = total - subtotal

  const printReceipt = () => {
    setPrintMode(true)
  }

  return (
    <div className="min-h-screen bg-slate-50/50 dark:bg-slate-900/50 py-10 px-4 sm:px-6 lg:px-8 print:bg-white print:p-0 print:m-0">
      <div className="max-w-4xl mx-auto space-y-6 print:space-y-0 print:max-w-full">
        {/* Floating actions */}
        <div className="flex justify-between items-center bg-white dark:bg-slate-950 p-4 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800 print:hidden">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-xs font-bold text-slate-650 dark:text-slate-400">Pembayaran Terverifikasi</span>
          </div>
          <button
            onClick={printReceipt}
            className="flex items-center gap-1.5 px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-900 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-extrabold transition-all border border-slate-200/50 dark:border-slate-700/50"
          >
            <Printer className="w-3.5 h-3.5" />
            Cetak Kuitansi
          </button>
        </div>

        {/* Receipt Card */}
        <div className="relative bg-white dark:bg-slate-950 rounded-3xl border border-slate-100 dark:border-slate-900 shadow-md p-8 sm:p-12 overflow-hidden print:shadow-none print:border-none print:p-0">
          
          {/* Elegant Paid Watermark badge for UI */}
          {isPaid && (
            <div className="absolute top-10 right-10 md:top-12 md:right-16 transform rotate-12 opacity-80 border-4 border-emerald-500/80 rounded-2xl px-6 py-2 flex items-center justify-center flex-col select-none print:opacity-100">
              <span className="text-emerald-500 font-black text-lg tracking-widest uppercase">LUNAS</span>
              <span className="text-emerald-500 font-extrabold text-[8px] tracking-wide mt-0.5">PAID</span>
            </div>
          )}

          {/* Header */}
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 border-b border-slate-100 dark:border-slate-900 pb-8 mb-8">
            <div className="space-y-2">
              {config?.brand_logo_url ? (
                <img src={config.brand_logo_url} alt="Logo" className="h-10 w-auto object-contain mb-2 dark:brightness-110" />
              ) : (
                <div className="h-10 w-10 bg-emerald-600 rounded-xl flex items-center justify-center text-white font-black mb-2 shadow-sm">
                  FO
                </div>
              )}
              <h1 className="text-lg font-black text-slate-800 dark:text-white uppercase tracking-tight leading-none">{companyName}</h1>
              <p className="text-[10px] text-slate-450 dark:text-slate-555 leading-relaxed max-w-sm">
                {companyAddress} <br />
                Telp: {companyPhone} | Email: {companyEmail}
              </p>
            </div>
            <div className="text-left md:text-right space-y-1">
              <h2 className="text-xl font-black text-slate-800 dark:text-white uppercase tracking-wider pt-2">Kuitansi Pembayaran</h2>
              <p className="text-xs font-mono font-bold text-slate-450 dark:text-slate-555">INV: #{registration.reg_number}</p>
            </div>
          </div>

          {/* Receipt Status Banner (Only if unpaid in db, but accessed receipt link somehow) */}
          {!isPaid && (
            <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200/50 dark:border-amber-800/40 rounded-2xl p-4 flex items-center gap-3 text-xs text-amber-700 dark:text-amber-400 mb-8 print:hidden">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>Sistem belum memverifikasi pelunasan invoice ini. Tanda terima ini bersifat draf sementara.</span>
            </div>
          )}

          {/* Verification Details Box */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
            <div className="bg-emerald-50/30 dark:bg-slate-900/30 border border-slate-100 dark:border-slate-900 rounded-2xl p-4 flex items-center gap-3.5">
              <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-450 flex items-center justify-center flex-shrink-0">
                <CheckCircle2 className="w-5 h-5" />
              </div>
              <div className="text-xs">
                <p className="text-slate-400 dark:text-slate-500 font-medium">Status Tagihan</p>
                <p className="font-extrabold text-emerald-600 dark:text-emerald-450 uppercase">{isPaid ? 'Lunas / Terverifikasi' : 'Proses Verifikasi'}</p>
              </div>
            </div>

            <div className="bg-emerald-50/30 dark:bg-slate-900/30 border border-slate-100 dark:border-slate-900 rounded-2xl p-4 flex items-center gap-3.5">
              <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-450 flex items-center justify-center flex-shrink-0">
                <Calendar className="w-5 h-5" />
              </div>
              <div className="text-xs">
                <p className="text-slate-400 dark:text-slate-500 font-medium">Tanggal Bayar</p>
                <p className="font-extrabold text-slate-800 dark:text-white">
                  {registration.payment_date 
                    ? new Date(registration.payment_date).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })
                    : new Date(registration.payment_confirmed_at || Date.now()).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })
                  }
                </p>
              </div>
            </div>

            <div className="bg-emerald-50/30 dark:bg-slate-900/30 border border-slate-100 dark:border-slate-900 rounded-2xl p-4 flex items-center gap-3.5">
              <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-450 flex items-center justify-center flex-shrink-0">
                <Wallet className="w-5 h-5" />
              </div>
              <div className="text-xs">
                <p className="text-slate-400 dark:text-slate-500 font-medium">Metode / Bank</p>
                <p className="font-extrabold text-slate-800 dark:text-white uppercase">{registration.payment_bank || 'TUNAI KE TEKNISI'}</p>
              </div>
            </div>
          </div>

          {/* Customer info */}
          <div className="bg-slate-50/40 dark:bg-slate-900/20 p-6 rounded-2xl border border-slate-100/60 dark:border-slate-900/50 mb-8 text-xs">
            <h3 className="font-extrabold text-slate-450 dark:text-slate-500 uppercase tracking-wider text-[10px] mb-3">Tanda Terima Untuk</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-slate-700 dark:text-slate-350">
              <p><strong>Nama Lengkap:</strong> {registration.full_name}</p>
              <p><strong>Nomor WhatsApp:</strong> {registration.phone}</p>
              <p className="md:col-span-2">
                <strong>Alamat Lengkap:</strong> {registration.address_detail}, RT {registration.rt} / RW {registration.rw}, Desa {registration.village}, Kec. {registration.district}, {registration.city}, {registration.province}
              </p>
            </div>
          </div>

          {/* Paid details table */}
          <div className="overflow-x-auto mb-8">
            <table className="w-full text-xs text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-100 dark:border-slate-800 text-slate-400 uppercase tracking-wider text-[10px]">
                  <th className="py-3 px-2 text-center w-12">No</th>
                  <th className="py-3 px-4">Deskripsi Pembayaran</th>
                  <th className="py-3 px-4 text-center w-20">Jumlah</th>
                  <th className="py-3 px-4 text-right w-36">Harga Satuan</th>
                  <th className="py-3 px-4 text-right w-36">Subtotal</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50 dark:divide-slate-900 text-slate-700 dark:text-slate-300 font-medium">
                <tr>
                  <td className="py-4 px-2 text-center text-slate-400">1</td>
                  <td className="py-4 px-4 font-semibold text-slate-800 dark:text-white">Biaya Registrasi & Administrasi Awal (Free)</td>
                  <td className="py-4 px-4 text-center">1</td>
                  <td className="py-4 px-4 text-right">Rp 0</td>
                  <td className="py-4 px-4 text-right">Rp 0</td>
                </tr>
                <tr>
                  <td className="py-4 px-2 text-center text-slate-400">2</td>
                  <td className="py-4 px-4 font-semibold text-slate-800 dark:text-white">Biaya Instalasi & Penarikan Kabel FO</td>
                  <td className="py-4 px-4 text-center">1</td>
                  <td className="py-4 px-4 text-right">Rp {instFee.toLocaleString('id-ID')}</td>
                  <td className="py-4 px-4 text-right">Rp {instFee.toLocaleString('id-ID')}</td>
                </tr>
                <tr>
                  <td className="py-4 px-2 text-center text-slate-400">3</td>
                  <td className="py-4 px-4 font-semibold text-slate-800 dark:text-white">
                    Paket Internet {registration.package_name} - {registration.package_speed} Mbps (Bulan ke-1)
                  </td>
                  <td className="py-4 px-4 text-center">1</td>
                  <td className="py-4 px-4 text-right">Rp {packPrice.toLocaleString('id-ID')}</td>
                  <td className="py-4 px-4 text-right">Rp {packPrice.toLocaleString('id-ID')}</td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Totals */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6 pt-4 border-t border-slate-100 dark:border-slate-900">
            <div className="flex items-center gap-2 text-xxs text-slate-450 dark:text-slate-500 max-w-sm">
              <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-500 flex-shrink-0" />
              <span>Sistem memvalidasi transaksi ini aman dan resmi. Hak cipta dilindungi undang-undang.</span>
            </div>
            
            <div className="w-full sm:w-80 bg-emerald-50/10 dark:bg-slate-900/20 p-5 rounded-2xl border border-emerald-100/30 dark:border-slate-900 space-y-2.5 text-xs text-slate-650 dark:text-slate-350">
              <div className="flex justify-between">
                <span>Subtotal (Sebelum PPN)</span>
                <span className="font-bold text-slate-800 dark:text-white">Rp {subtotal.toLocaleString('id-ID')}</span>
              </div>
              <div className="flex justify-between">
                <span>PPN ({taxRate}%)</span>
                <span className="font-bold text-slate-800 dark:text-white">Rp {ppn.toLocaleString('id-ID')}</span>
              </div>
              <div className="flex justify-between text-sm pt-2 border-t border-emerald-250/20 dark:border-slate-850 font-black text-emerald-600 dark:text-emerald-450">
                <span>Jumlah Lunas</span>
                <span>Rp {total.toLocaleString('id-ID')}</span>
              </div>
              <p className="text-[9px] text-slate-400 text-right italic pt-0.5">*Harga layanan sudah termasuk PPN {taxRate}%</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
