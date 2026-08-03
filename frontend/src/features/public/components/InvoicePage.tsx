import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { publicApi } from '../api/publicApi'
import { Printer, Landmark, AlertCircle } from 'lucide-react'
import { Loader2 } from 'lucide-react'

export default function InvoicePage() {
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
        <Loader2 className="w-10 h-10 text-blue-600 animate-spin" />
        <p className="mt-4 text-sm font-bold text-slate-550 dark:text-slate-400">Memuat detail tagihan...</p>
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
          <h2 className="text-lg font-black text-slate-800 dark:text-white mb-2">Tagihan Tidak Ditemukan</h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed mb-6">
            Invoice dengan ID tersebut tidak dapat ditemukan atau telah kedaluwarsa. Silakan periksa kembali tautan yang dikirimkan.
          </p>
        </div>
      </div>
    )
  }

  const companyName = config?.invoice_company_name || config?.brand_name || 'PT Jaringan Sarana Nusantara'
  const companyAddress = config?.invoice_company_address || config?.website_address || 'Jl. Utama Raya No. 45, Jakarta Pusat'
  const companyPhone = config?.invoice_company_phone || config?.website_contact_phone || '(021) 555-1234'
  const companyEmail = config?.invoice_company_email || config?.website_contact_email || 'support@jsn.net.id'
  const taxRate = parseFloat(config?.invoice_tax_rate || '11')
  const paymentInstructions = config?.invoice_payment_instructions || 'Bank Mandiri VA: 88932 + HP\nBank BCA: 123-456-7890 (a.n. PT JSN)'

  // Math (Tax Inclusive / Sudah Termasuk PPN 11%)
  const baseRegFee = 0
  const instFee = registration.installation_fee !== null ? Number(registration.installation_fee) : 0
  const packPrice = Number(registration.package_price || 0)
  
  const total = baseRegFee + instFee + packPrice
  const subtotal = Math.round(total / (1 + taxRate / 100))
  const ppn = total - subtotal

  const printInvoice = () => {
    setPrintMode(true)
  }

  return (
    <div className="min-h-screen bg-slate-50/50 dark:bg-slate-900/50 py-10 px-4 sm:px-6 lg:px-8 print:bg-white print:p-0 print:m-0">
      <div className="max-w-4xl mx-auto space-y-6 print:space-y-0 print:max-w-full">
        {/* Floating actions */}
        <div className="flex justify-between items-center bg-white dark:bg-slate-950 p-4 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800 print:hidden">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-pulse" />
            <span className="text-xs font-bold text-slate-650 dark:text-slate-400">Tagihan Belum Dibayar</span>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={printInvoice}
              className="flex items-center gap-1.5 px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-900 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-extrabold transition-all border border-slate-200/50 dark:border-slate-700/50"
            >
              <Printer className="w-3.5 h-3.5" />
              Cetak / PDF
            </button>
          </div>
        </div>

        {/* Invoice Card */}
        <div className="bg-white dark:bg-slate-950 rounded-3xl border border-slate-100 dark:border-slate-900 shadow-md p-8 sm:p-12 print:shadow-none print:border-none print:p-0">
          {/* Header */}
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 border-b border-slate-100 dark:border-slate-900 pb-8 mb-8">
            <div className="space-y-2">
              {config?.brand_logo_url ? (
                <img src={config.brand_logo_url} alt="Logo" className="h-10 w-auto object-contain mb-2 dark:brightness-110" />
              ) : (
                <div className="h-10 w-10 bg-blue-600 rounded-xl flex items-center justify-center text-white font-black mb-2 shadow-sm">
                  FO
                </div>
              )}
              <h1 className="text-lg font-black text-slate-800 dark:text-white uppercase tracking-tight leading-none">{companyName}</h1>
              <p className="text-[10px] text-slate-450 dark:text-slate-500 leading-relaxed max-w-sm">
                {companyAddress} <br />
                Telp: {companyPhone} | Email: {companyEmail}
              </p>
            </div>
            <div className="text-left md:text-right space-y-1">
              <span className="px-3 py-1 bg-amber-50 dark:bg-amber-950/20 text-amber-600 dark:text-amber-400 rounded-full text-[9px] font-black tracking-wider uppercase">
                Menunggu Pembayaran
              </span>
              <h2 className="text-xl font-black text-slate-800 dark:text-white uppercase tracking-wider pt-2">Invoice</h2>
              <p className="text-xs font-mono font-bold text-slate-450 dark:text-slate-555">#{registration.reg_number}</p>
            </div>
          </div>

          {/* Customer & Billing Meta */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-10 text-xs">
            <div className="space-y-3 bg-slate-50/50 dark:bg-slate-900/30 p-5 rounded-2xl border border-slate-100/60 dark:border-slate-900/50">
              <h3 className="font-extrabold text-blue-600 dark:text-blue-400 uppercase tracking-wider text-[10px]">Data Pelanggan</h3>
              <div className="space-y-1 text-slate-700 dark:text-slate-300">
                <p><strong>Nama:</strong> {registration.full_name}</p>
                <p><strong>No. Telp:</strong> {registration.phone}</p>
                <p>
                  <strong>Alamat Pasang:</strong> {registration.address_detail}, RT {registration.rt} / RW {registration.rw}, Desa {registration.village}, Kec. {registration.district}, {registration.city}, {registration.province}
                </p>
              </div>
            </div>

            <div className="space-y-3 bg-slate-50/50 dark:bg-slate-900/30 p-5 rounded-2xl border border-slate-100/60 dark:border-slate-900/50">
              <h3 className="font-extrabold text-blue-600 dark:text-blue-400 uppercase tracking-wider text-[10px]">Detail Tagihan</h3>
              <div className="space-y-1 text-slate-700 dark:text-slate-300">
                <p><strong>ID Pelanggan:</strong> <em className="text-slate-400 text-[10px]">Aktif setelah verifikasi bayar</em></p>
                <p><strong>Tanggal Cetak:</strong> {new Date(registration.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
                <p>
                  <strong>Jatuh Tempo:</strong> {(() => {
                    const printDate = new Date(registration.created_at)
                    printDate.setDate(printDate.getDate() + 3)
                    return printDate.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })
                  })()}
                </p>
              </div>
            </div>
          </div>

          {/* Breakdown Table */}
          <div className="overflow-x-auto mb-8">
            <table className="w-full text-xs text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-100 dark:border-slate-800 text-slate-400 uppercase tracking-wider text-[10px]">
                  <th className="py-3 px-2 text-center w-12">No</th>
                  <th className="py-3 px-4">Deskripsi Layanan</th>
                  <th className="py-3 px-4 text-center w-20">Jumlah</th>
                  <th className="py-3 px-4 text-right w-36">Harga Satuan</th>
                  <th className="py-3 px-4 text-right w-36">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50 dark:divide-slate-900 text-slate-700 dark:text-slate-300 font-medium">
                <tr>
                  <td className="py-4 px-2 text-center text-slate-400">1</td>
                  <td className="py-4 px-4 font-semibold text-slate-800 dark:text-white">Biaya Registrasi & Administrasi Awal</td>
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
                    Paket Internet {registration.package_name} - {registration.package_speed} Mbps
                    <span className="block text-[10px] text-slate-400 font-normal mt-0.5">Bulan ke-1 (Masa berlangganan awal)</span>
                  </td>
                  <td className="py-4 px-4 text-center">1</td>
                  <td className="py-4 px-4 text-right">Rp {packPrice.toLocaleString('id-ID')}</td>
                  <td className="py-4 px-4 text-right">Rp {packPrice.toLocaleString('id-ID')}</td>
                </tr>
                <tr>
                  <td className="py-4 px-2 text-center text-slate-400">4</td>
                  <td className="py-4 px-4 font-semibold text-slate-800 dark:text-white">Sewa Perangkat ONT / Modem Wi-Fi</td>
                  <td className="py-4 px-4 text-center">1</td>
                  <td className="py-4 px-4 text-right">Rp 0</td>
                  <td className="py-4 px-4 text-right text-emerald-500 font-bold">FREE</td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Totals */}
          <div className="flex justify-end mb-10">
            <div className="w-full sm:w-80 bg-slate-50/50 dark:bg-slate-900/20 p-5 rounded-2xl border border-slate-100 dark:border-slate-900 space-y-2.5 text-xs text-slate-650 dark:text-slate-350">
              <div className="flex justify-between">
                <span>Subtotal (Sebelum PPN)</span>
                <span className="font-bold text-slate-800 dark:text-white">Rp {subtotal.toLocaleString('id-ID')}</span>
              </div>
              <div className="flex justify-between">
                <span>PPN ({taxRate}%)</span>
                <span className="font-bold text-slate-800 dark:text-white">Rp {ppn.toLocaleString('id-ID')}</span>
              </div>
              <div className="flex justify-between text-sm pt-2 border-t border-slate-200/60 dark:border-slate-800 font-extrabold text-blue-600 dark:text-blue-400">
                <span>Total Tagihan</span>
                <span>Rp {total.toLocaleString('id-ID')}</span>
              </div>
              <p className="text-[9px] text-slate-400 text-right italic pt-0.5">*Harga layanan sudah termasuk PPN {taxRate}%</p>
            </div>
          </div>

          {/* Payment Instructions */}
          <div className="bg-blue-50/40 dark:bg-slate-900/60 border border-blue-100/50 dark:border-slate-800 rounded-2xl p-6 space-y-4">
            <div className="flex items-center gap-2">
              <Landmark className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              <h4 className="text-xs font-black text-slate-800 dark:text-white uppercase tracking-wider">Instruksi Cara Pembayaran</h4>
            </div>
            <pre className="text-xxs font-mono font-bold leading-relaxed whitespace-pre-wrap text-slate-700 dark:text-slate-350">
              {paymentInstructions}
            </pre>
            <p className="text-[10px] text-slate-450 dark:text-slate-500 leading-normal italic pt-2 border-t border-slate-100 dark:border-slate-800">
              *Catatan: Harap simpan bukti pembayaran dan tunjukkan kepada petugas jika diperlukan. Layanan internet akan aktif secara otomatis setelah pembayaran terkonfirmasi.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
