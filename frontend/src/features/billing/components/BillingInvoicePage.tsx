import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { billingApi } from '../api/billingApi'
import { publicApi } from '@/features/public/api/publicApi'
import { Printer, Landmark, AlertCircle, CheckCircle2, Clock, ShieldAlert, Send } from 'lucide-react'
import { Loader2 } from 'lucide-react'
import { formatCurrency, formatDate } from '@/lib/utils'

export default function BillingInvoicePage() {
  const { id } = useParams<{ id: string }>()
  const [printMode, setPrintMode] = useState(false)

  // Fetch public brand configs
  const { data: config } = useQuery({
    queryKey: ['public-configs'],
    queryFn: publicApi.getPublicConfigs,
    staleTime: 10 * 60 * 1000,
  })

  // Fetch public invoice details
  const { data: invoice, isLoading, error } = useQuery({
    queryKey: ['public-invoice', id],
    queryFn: () => billingApi.getPublicInvoice(id!),
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

  if (error || !invoice) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex flex-col items-center justify-center p-6">
        <div className="max-w-md w-full bg-white dark:bg-slate-800 p-8 rounded-3xl shadow-xl text-center border border-slate-100 dark:border-slate-700">
          <div className="w-16 h-16 bg-red-50 dark:bg-red-950/20 text-red-650 dark:text-red-400 rounded-2xl flex items-center justify-center mx-auto mb-6">
            <AlertCircle className="w-8 h-8" />
          </div>
          <h2 className="text-lg font-black text-slate-800 dark:text-white mb-2">Tagihan Tidak Ditemukan</h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed mb-6">
            Tagihan bulanan dengan ID tersebut tidak dapat ditemukan atau telah kedaluwarsa. Silakan periksa kembali tautan yang dikirimkan kepada Anda.
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
  const waSystemNumber = config?.wa_system_number || config?.website_contact_phone || ''

  // Math (PPN & Subtotal from Go Amount)
  const totalAmount = invoice.amount + invoice.tax_amount
  const amount = invoice.amount
  const taxAmount = invoice.tax_amount

  const formatPeriod = (dateStr: string) => {
    if (!dateStr) return '-'
    const d = new Date(dateStr)
    return d.toLocaleString('id-ID', { month: 'long', year: 'numeric' })
  }

  const printInvoice = () => {
    setPrintMode(true)
  }

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'paid':
        return 'Lunas'
      case 'overdue':
        return 'Isolir (Overdue)'
      default:
        return 'Belum Bayar'
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'paid':
        return (
          <span className="px-3 py-1 bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-450 rounded-full text-[9px] font-black tracking-wider uppercase flex items-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5" /> Lunas
          </span>
        )
      case 'overdue':
        return (
          <span className="px-3 py-1 bg-rose-50 dark:bg-rose-950/20 text-rose-600 dark:text-rose-400 rounded-full text-[9px] font-black tracking-wider uppercase flex items-center gap-1">
            <ShieldAlert className="w-3.5 h-3.5" /> Isolir / Overdue
          </span>
        )
      default:
        return (
          <span className="px-3 py-1 bg-amber-50 dark:bg-amber-950/20 text-amber-600 dark:text-amber-400 rounded-full text-[9px] font-black tracking-wider uppercase flex items-center gap-1">
            <Clock className="w-3.5 h-3.5" /> Belum Bayar
          </span>
        )
    }
  }

  // Pre-filled WhatsApp template message for payment confirmation
  const getWhatsAppLink = () => {
    const cleanPhone = waSystemNumber.replace(/[^0-9]/g, '')
    const targetPhone = cleanPhone.startsWith('0') ? '62' + cleanPhone.slice(1) : cleanPhone
    const text = `Halo Admin ${companyName},\n\nSaya ingin konfirmasi pembayaran tagihan bulanan:\n*Nomor Invoice:* ${invoice.invoice_number}\n*Nama Pelanggan:* ${invoice.customer_name}\n*Periode:* ${formatPeriod(invoice.period)}\n*Jumlah Transfer:* ${formatCurrency(totalAmount)}\n\nBerikut terlampir bukti transfer saya.`
    return `https://wa.me/${targetPhone}?text=${encodeURIComponent(text)}`
  }

  return (
    <div className="min-h-screen bg-slate-50/50 dark:bg-slate-900/50 py-10 px-4 sm:px-6 lg:px-8 print:bg-white print:p-0 print:m-0">
      <div className="max-w-4xl mx-auto space-y-6 print:space-y-0 print:max-w-full animate-in fade-in slide-in-from-bottom-6 duration-200">
        {/* Floating actions */}
        <div className="flex justify-between items-center bg-white dark:bg-slate-950 p-4 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800 print:hidden">
          <div className="flex items-center gap-2">
            <span className={`w-2.5 h-2.5 rounded-full animate-pulse ${
              invoice.status === 'paid' ? 'bg-emerald-500' : invoice.status === 'overdue' ? 'bg-rose-500' : 'bg-amber-500'
            }`} />
            <span className="text-xs font-bold text-slate-650 dark:text-slate-400">
              Status: {getStatusLabel(invoice.status)}
            </span>
          </div>
          <div className="flex items-center gap-2">
            {invoice.status !== 'paid' && waSystemNumber && (
              <a
                href={getWhatsAppLink()}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-extrabold transition-all shadow-sm"
              >
                <Send className="w-3.5 h-3.5" />
                Konfirmasi WA
              </a>
            )}
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
                <img src={config.brand_logo_url} alt="Logo" className="h-12 w-auto object-contain mb-2 dark:brightness-110" />
              ) : (
                <div className="h-10 w-10 bg-blue-600 rounded-xl flex items-center justify-center text-white font-black mb-2 shadow-sm">
                  {companyName.slice(3, 5).toUpperCase() || 'FO'}
                </div>
              )}
              <h1 className="text-lg font-black text-slate-800 dark:text-white uppercase tracking-tight leading-none">{companyName}</h1>
              <p className="text-[10px] text-slate-450 dark:text-slate-500 leading-relaxed max-w-sm">
                {companyAddress} <br />
                Telp: {companyPhone} | Email: {companyEmail}
              </p>
            </div>
            <div className="text-left md:text-right space-y-1">
              <div className="flex md:justify-end">
                {getStatusBadge(invoice.status)}
              </div>
              <h2 className="text-xl font-black text-slate-800 dark:text-white uppercase tracking-wider pt-2">Invoice Tagihan</h2>
              <p className="text-xs font-mono font-bold text-slate-450 dark:text-slate-555">#{invoice.invoice_number}</p>
            </div>
          </div>

          {/* Customer & Billing Meta */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-10 text-xs">
            <div className="space-y-3 bg-slate-50/50 dark:bg-slate-900/30 p-5 rounded-2xl border border-slate-100/60 dark:border-slate-900/50">
              <h3 className="font-extrabold text-blue-600 dark:text-blue-400 uppercase tracking-wider text-[10px]">Penerima Layanan (Tagihan Kepada)</h3>
              <div className="space-y-1 text-slate-700 dark:text-slate-300">
                <p><strong>Nama Pelanggan:</strong> {invoice.customer_name || '-'}</p>
                <p><strong>ID Pelanggan:</strong> {invoice.customer_number || '-'}</p>
                <p><strong>No. Telp:</strong> {invoice.phone || '-'}</p>
              </div>
            </div>

            <div className="space-y-3 bg-slate-50/50 dark:bg-slate-900/30 p-5 rounded-2xl border border-slate-100/60 dark:border-slate-900/50">
              <h3 className="font-extrabold text-blue-600 dark:text-blue-400 uppercase tracking-wider text-[10px]">Informasi Tagihan</h3>
              <div className="space-y-1 text-slate-700 dark:text-slate-300">
                <p><strong>Periode Layanan:</strong> {formatPeriod(invoice.period)}</p>
                <p><strong>Tanggal Terbit:</strong> {formatDate(invoice.created_at)}</p>
                <p><strong>Jatuh Tempo:</strong> <span className="font-bold text-rose-600 dark:text-rose-400">{formatDate(invoice.due_date)}</span></p>
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
                  <td className="py-4 px-4 font-semibold text-slate-800 dark:text-white">
                    Sewa Paket Internet Bulanan: {invoice.package_name || '-'} {invoice.package_speed ? `(${invoice.package_speed} Mbps)` : ''}
                    <span className="block text-[10px] text-slate-400 font-normal mt-0.5">
                      Periode berlangganan internet bulanan
                    </span>
                  </td>
                  <td className="py-4 px-4 text-center">1 Bulan</td>
                  <td className="py-4 px-4 text-right">{formatCurrency(amount)}</td>
                  <td className="py-4 px-4 text-right">{formatCurrency(amount)}</td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Totals */}
          <div className="flex justify-end mb-10">
            <div className="w-full sm:w-80 bg-slate-50/50 dark:bg-slate-900/20 p-5 rounded-2xl border border-slate-100 dark:border-slate-900 space-y-2.5 text-xs text-slate-650 dark:text-slate-350">
              <div className="flex justify-between">
                <span>Biaya Layanan (Subtotal)</span>
                <span className="font-bold text-slate-800 dark:text-white">{formatCurrency(amount)}</span>
              </div>
              <div className="flex justify-between">
                <span>PPN ({taxRate}%)</span>
                <span className="font-bold text-slate-800 dark:text-white">{formatCurrency(taxAmount)}</span>
              </div>
              <div className="flex justify-between text-sm pt-2 border-t border-slate-200/60 dark:border-slate-800 font-extrabold text-blue-600 dark:text-blue-400">
                <span>Total Pembayaran</span>
                <span>{formatCurrency(totalAmount)}</span>
              </div>
              <p className="text-[9px] text-slate-400 text-right italic pt-0.5">*Sudah termasuk PPN {taxRate}% sesuai ketentuan perpajakan.</p>
            </div>
          </div>

          {/* Payment Instructions */}
          {invoice.status !== 'paid' ? (
            <div className="bg-blue-50/40 dark:bg-slate-900/60 border border-blue-100/50 dark:border-slate-800 rounded-2xl p-6 space-y-4">
              <div className="flex items-center gap-2">
                <Landmark className="w-4 h-4 text-blue-600 dark:text-blue-450" />
                <h4 className="text-xs font-black text-slate-800 dark:text-white uppercase tracking-wider">Instruksi Cara Pembayaran</h4>
              </div>
              <pre className="text-xxs font-mono font-bold leading-relaxed whitespace-pre-wrap text-slate-700 dark:text-slate-350">
                {paymentInstructions}
              </pre>
              {waSystemNumber && (
                <div className="pt-4 border-t border-blue-100/50 dark:border-slate-800">
                  <p className="text-[10px] text-slate-500 dark:text-slate-400 mb-2">
                    Setelah melakukan pembayaran, kirimkan bukti transfer melalui tombol di bawah untuk verifikasi CS.
                  </p>
                  <a
                    href={getWhatsAppLink()}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-extrabold transition-all shadow-sm"
                  >
                    <Send className="w-3.5 h-3.5" />
                    Kirim Bukti Bayar via WhatsApp
                  </a>
                </div>
              )}
            </div>
          ) : (
            <div className="bg-emerald-50/20 dark:bg-emerald-950/10 border border-emerald-150 dark:border-emerald-900/20 rounded-2xl p-6 text-center space-y-2">
              <CheckCircle2 className="w-8 h-8 text-emerald-600 dark:text-emerald-450 mx-auto" />
              <h4 className="text-sm font-bold text-emerald-800 dark:text-emerald-400">Tagihan Sudah Dibayar</h4>
              <p className="text-xs text-gray-500 dark:text-zinc-400 max-w-md mx-auto">
                Terima kasih! Pembayaran untuk tagihan ini telah kami terima dan dikonfirmasi pada{' '}
                <span className="font-bold text-gray-800 dark:text-zinc-200">
                  {invoice.payment_confirmed_at ? formatDate(invoice.payment_confirmed_at) : formatDate(invoice.paid_at)}
                </span>
                {invoice.payment_bank && ` via transfer ${invoice.payment_bank}`}.
              </p>
            </div>
          )}

          {/* Footer Copyright */}
          <div className="mt-12 text-center text-[10px] text-slate-400 dark:text-slate-650 leading-relaxed border-t border-slate-100 dark:border-slate-900 pt-6">
            <p>Invoice ini dibuat secara otomatis oleh sistem tagihan {config?.brand_name || 'ISP Center'}.</p>
            <p className="mt-1">&copy; {new Date().getFullYear()} {companyName}. All Rights Reserved.</p>
          </div>
        </div>
      </div>
    </div>
  )
}
