import { useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useQuery } from '@tanstack/react-query'
import { X, Printer, ThermometerSnowflake, FileText } from 'lucide-react'
import { publicApi } from '@/features/public/api/publicApi'
import type { Invoice } from '../types'

interface ReceiptModalProps {
  invoice: Invoice
  onClose: () => void
}

type PrintStyle = 'thermal' | 'standard'

export default function ReceiptModal({ invoice, onClose }: ReceiptModalProps) {
  const [printStyle, setPrintStyle] = useState<PrintStyle>('thermal')
  const printRef = useRef<HTMLDivElement>(null)

  const { data: configs } = useQuery({
    queryKey: ['public-configs'],
    queryFn: publicApi.getPublicConfigs,
    staleTime: 5 * 60 * 1000,
  })

  const companyName = configs?.invoice_company_name || configs?.brand_name || 'ISP Center'
  const companyAddress = configs?.invoice_company_address || configs?.website_address || ''
  const companyPhone = configs?.invoice_company_phone || configs?.website_contact_phone || ''
  const logoUrl = configs?.brand_logo_url || ''

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(amount)

  const formatDate = (dateStr?: string | null) => {
    if (!dateStr) return '-'
    return new Date(dateStr).toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' })
  }

  const formatPeriod = (dateStr: string) => {
    if (!dateStr) return '-'
    return new Date(dateStr).toLocaleString('id-ID', { month: 'long', year: 'numeric' })
  }

  const subtotal = invoice.amount
  const tax = invoice.tax_amount
  const total = subtotal + tax

  const handlePrint = () => {
    const styleContent = printStyle === 'thermal' ? `
      @page { size: 80mm auto; margin: 4mm; }
      body * { visibility: hidden; }
      #print-receipt, #print-receipt * { visibility: visible; }
      #print-receipt {
        position: fixed; inset: 0; margin: 0 auto;
        width: 72mm; font-family: 'Courier New', Courier, monospace;
        font-size: 11px; line-height: 1.45; color: #000;
        background: white;
      }
    ` : `
      @page { size: A5; margin: 10mm; }
      body * { visibility: hidden; }
      #print-receipt, #print-receipt * { visibility: visible; }
      #print-receipt {
        position: fixed; inset: 0; margin: auto;
        width: 138mm; font-family: Arial, sans-serif;
        font-size: 12px; line-height: 1.6; color: #111;
        background: white;
      }
    `
    const printWindow = window.open('', '_blank', 'width=600,height=700')
    if (!printWindow || !printRef.current) return
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="UTF-8" />
          <title>Struk Pembayaran - ${invoice.invoice_number}</title>
          <style>${styleContent}</style>
        </head>
        <body>
          <div id="print-receipt">
            ${printRef.current.innerHTML}
          </div>
          <script>window.onload = () => { window.print(); window.close(); }<\/script>
        </body>
      </html>
    `)
    printWindow.document.close()
  }

  const statusLabel = invoice.status === 'paid' ? 'LUNAS' : invoice.status === 'overdue' ? 'OVERDUE' : 'BELUM BAYAR'
  const statusColor = invoice.status === 'paid' ? '#16a34a' : invoice.status === 'overdue' ? '#dc2626' : '#d97706'

  return createPortal(
    <div className="fixed inset-0 z-[9999] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl border border-gray-200 dark:border-zinc-800 w-full max-w-2xl flex flex-col max-h-[92vh] overflow-hidden">
        
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-gray-150 dark:border-zinc-800 flex items-center justify-between bg-gray-50/50 dark:bg-zinc-950/40 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center shadow-sm">
              <Printer className="w-4 h-4 text-white" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-gray-900 dark:text-zinc-100">Cetak Struk Pembayaran</h3>
              <p className="text-[10px] text-gray-400 dark:text-zinc-500 mt-0.5">{invoice.invoice_number}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-zinc-800 text-gray-400 hover:text-gray-700 dark:hover:text-zinc-200 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Print Style Selector */}
        <div className="px-6 py-3 border-b border-gray-150 dark:border-zinc-800 shrink-0">
          <p className="text-[10px] font-bold text-gray-400 dark:text-zinc-500 uppercase tracking-wider mb-2">Pilih Gaya Cetak</p>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPrintStyle('thermal')}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border text-xs font-bold transition-all flex-1 justify-center ${
                printStyle === 'thermal'
                  ? 'bg-slate-900 dark:bg-slate-800 text-white border-slate-900 shadow-md'
                  : 'bg-white dark:bg-zinc-900 border-gray-200 dark:border-zinc-700 text-gray-600 dark:text-zinc-400 hover:bg-gray-50 dark:hover:bg-zinc-800'
              }`}
            >
              <ThermometerSnowflake className="w-4 h-4" />
              Thermal Printer
              <span className={`ml-1 text-[9px] px-1.5 py-0.5 rounded-full ${
                printStyle === 'thermal' ? 'bg-white/20 text-white' : 'bg-gray-100 dark:bg-zinc-800 text-gray-500'
              }`}>58/80mm</span>
            </button>
            <button
              onClick={() => setPrintStyle('standard')}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border text-xs font-bold transition-all flex-1 justify-center ${
                printStyle === 'standard'
                  ? 'bg-blue-600 text-white border-blue-600 shadow-md'
                  : 'bg-white dark:bg-zinc-900 border-gray-200 dark:border-zinc-700 text-gray-600 dark:text-zinc-400 hover:bg-gray-50 dark:hover:bg-zinc-800'
              }`}
            >
              <FileText className="w-4 h-4" />
              Standar (A5)
              <span className={`ml-1 text-[9px] px-1.5 py-0.5 rounded-full ${
                printStyle === 'standard' ? 'bg-white/20 text-white' : 'bg-gray-100 dark:bg-zinc-800 text-gray-500'
              }`}>A5 / Kertas Biasa</span>
            </button>
          </div>
        </div>

        {/* Receipt Preview */}
        <div className="flex-1 overflow-y-auto px-6 py-4 bg-gray-100 dark:bg-zinc-950">
          <div className="flex justify-center">
            {printStyle === 'thermal' ? (
              /* ─── THERMAL PREVIEW ─── */
              <div
                ref={printRef}
                className="bg-white shadow-md"
                style={{
                  width: '72mm',
                  minHeight: '120mm',
                  fontFamily: "'Courier New', Courier, monospace",
                  fontSize: '11px',
                  lineHeight: '1.45',
                  color: '#000',
                  padding: '8px 6px',
                }}
              >
                {/* Header */}
                <div style={{ textAlign: 'center', borderBottom: '1px dashed #000', paddingBottom: '6px', marginBottom: '6px' }}>
                  {logoUrl && (
                    <img src={logoUrl} alt="Logo" style={{ width: '32px', height: '32px', objectFit: 'contain', margin: '0 auto 4px' }} />
                  )}
                  <div style={{ fontWeight: 'bold', fontSize: '13px', textTransform: 'uppercase' }}>{companyName}</div>
                  {companyAddress && <div style={{ fontSize: '9px' }}>{companyAddress}</div>}
                  {companyPhone && <div style={{ fontSize: '9px' }}>Telp: {companyPhone}</div>}
                </div>

                {/* Title */}
                <div style={{ textAlign: 'center', fontWeight: 'bold', fontSize: '12px', marginBottom: '4px' }}>
                  STRUK PEMBAYARAN
                </div>
                <div style={{ textAlign: 'center', borderBottom: '1px dashed #000', paddingBottom: '5px', marginBottom: '5px', fontSize: '9px' }}>
                  {formatDate(invoice.paid_at || invoice.payment_confirmed_at || invoice.updated_at)}
                </div>

                {/* Customer */}
                <div style={{ marginBottom: '5px' }}>
                  <Row label="Pelanggan" value={invoice.customer_name || '-'} />
                  <Row label="No. Reg" value={invoice.customer_number || '-'} />
                  <Row label="No. Invoice" value={invoice.invoice_number} />
                  <Row label="Periode" value={formatPeriod(invoice.period)} />
                </div>

                {/* Divider */}
                <div style={{ borderTop: '1px dashed #000', margin: '5px 0' }} />

                {/* Items */}
                <div style={{ marginBottom: '5px' }}>
                  <div style={{ fontWeight: 'bold', marginBottom: '3px' }}>RINCIAN TAGIHAN</div>
                  {invoice.package_name && (
                    <Row label={`Layanan ${invoice.package_name}`} value={formatCurrency(subtotal)} />
                  )}
                  {!invoice.package_name && (
                    <Row label="Biaya Langganan" value={formatCurrency(subtotal)} />
                  )}
                  {tax > 0 && <Row label="PPN (11%)" value={formatCurrency(tax)} />}
                </div>

                {/* Total */}
                <div style={{ borderTop: '1px solid #000', paddingTop: '4px', marginBottom: '5px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 'bold', fontSize: '13px' }}>
                    <span>TOTAL</span>
                    <span>{formatCurrency(total)}</span>
                  </div>
                </div>

                {/* Payment Method */}
                <div style={{ marginBottom: '5px' }}>
                  <Row label="Metode Bayar" value={invoice.payment_bank || '-'} />
                  <Row label="Status" value={statusLabel} valueStyle={{ color: statusColor, fontWeight: 'bold' }} />
                </div>

                {/* Footer */}
                <div style={{ borderTop: '1px dashed #000', paddingTop: '5px', textAlign: 'center', fontSize: '9px', marginTop: '4px' }}>
                  <div>Terima kasih atas pembayaran Anda!</div>
                  <div>Simpan struk ini sebagai bukti pembayaran</div>
                  <div style={{ marginTop: '3px', fontWeight: 'bold' }}>* * * * * * * * * * * * * *</div>
                </div>
              </div>
            ) : (
              /* ─── STANDARD / A5 PREVIEW ─── */
              <div
                ref={printRef}
                className="bg-white shadow-lg"
                style={{
                  width: '138mm',
                  minHeight: '180mm',
                  fontFamily: 'Arial, sans-serif',
                  fontSize: '12px',
                  lineHeight: '1.6',
                  color: '#111',
                  padding: '12mm 10mm',
                }}
              >
                {/* Header */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '2px solid #1d4ed8', paddingBottom: '10px', marginBottom: '12px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    {logoUrl && (
                      <img src={logoUrl} alt="Logo" style={{ width: '40px', height: '40px', objectFit: 'contain' }} />
                    )}
                    <div>
                      <div style={{ fontWeight: 'bold', fontSize: '15px', color: '#1d4ed8' }}>{companyName}</div>
                      {companyAddress && <div style={{ fontSize: '10px', color: '#555' }}>{companyAddress}</div>}
                      {companyPhone && <div style={{ fontSize: '10px', color: '#555' }}>Telp: {companyPhone}</div>}
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontWeight: 'bold', fontSize: '14px', textTransform: 'uppercase', color: '#111' }}>Struk Pembayaran</div>
                    <div style={{ fontSize: '10px', color: '#555', fontFamily: 'monospace' }}>{invoice.invoice_number}</div>
                    <div style={{ marginTop: '4px', display: 'inline-block', padding: '2px 8px', borderRadius: '20px', fontSize: '10px', fontWeight: 'bold', background: invoice.status === 'paid' ? '#dcfce7' : '#fef3c7', color: statusColor, border: `1px solid ${statusColor}` }}>
                      {statusLabel}
                    </div>
                  </div>
                </div>

                {/* Two column info */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '14px' }}>
                  <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '6px', padding: '8px 10px' }}>
                    <div style={{ fontSize: '9px', fontWeight: 'bold', textTransform: 'uppercase', color: '#64748b', letterSpacing: '0.05em', marginBottom: '5px' }}>Data Pelanggan</div>
                    <div style={{ fontWeight: 'bold', fontSize: '12px' }}>{invoice.customer_name || '-'}</div>
                    <div style={{ fontSize: '10px', color: '#555' }}>No. Reg: {invoice.customer_number || '-'}</div>
                    {invoice.phone && <div style={{ fontSize: '10px', color: '#555' }}>Telp: {invoice.phone}</div>}
                  </div>
                  <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '6px', padding: '8px 10px' }}>
                    <div style={{ fontSize: '9px', fontWeight: 'bold', textTransform: 'uppercase', color: '#64748b', letterSpacing: '0.05em', marginBottom: '5px' }}>Info Tagihan</div>
                    <div style={{ fontSize: '10px', color: '#555' }}>Periode: <b>{formatPeriod(invoice.period)}</b></div>
                    <div style={{ fontSize: '10px', color: '#555' }}>Jatuh Tempo: {formatDate(invoice.due_date)}</div>
                    <div style={{ fontSize: '10px', color: '#555' }}>Dibayar: {formatDate(invoice.paid_at)}</div>
                  </div>
                </div>

                {/* Items Table */}
                <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '12px', fontSize: '11px' }}>
                  <thead>
                    <tr style={{ background: '#1d4ed8', color: 'white' }}>
                      <th style={{ padding: '6px 8px', textAlign: 'left' }}>Keterangan</th>
                      <th style={{ padding: '6px 8px', textAlign: 'right' }}>Jumlah</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                      <td style={{ padding: '6px 8px' }}>
                        Biaya Langganan Bulanan
                        {invoice.package_name && (
                          <span style={{ fontSize: '10px', color: '#555', display: 'block' }}>{invoice.package_name}{invoice.package_speed ? ` - ${invoice.package_speed} Mbps` : ''}</span>
                        )}
                      </td>
                      <td style={{ padding: '6px 8px', textAlign: 'right', fontFamily: 'monospace' }}>{formatCurrency(subtotal)}</td>
                    </tr>
                    {tax > 0 && (
                      <tr style={{ borderBottom: '1px solid #e2e8f0', color: '#555' }}>
                        <td style={{ padding: '6px 8px' }}>PPN (11%)</td>
                        <td style={{ padding: '6px 8px', textAlign: 'right', fontFamily: 'monospace' }}>{formatCurrency(tax)}</td>
                      </tr>
                    )}
                  </tbody>
                  <tfoot>
                    <tr style={{ background: '#f1f5f9' }}>
                      <td style={{ padding: '8px', fontWeight: 'bold', fontSize: '13px' }}>TOTAL</td>
                      <td style={{ padding: '8px', textAlign: 'right', fontWeight: 'bold', fontSize: '13px', fontFamily: 'monospace', color: '#1d4ed8' }}>{formatCurrency(total)}</td>
                    </tr>
                  </tfoot>
                </table>

                {/* Payment Method */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 10px', background: invoice.status === 'paid' ? '#f0fdf4' : '#fffbeb', border: `1px solid ${invoice.status === 'paid' ? '#bbf7d0' : '#fde68a'}`, borderRadius: '6px', marginBottom: '16px' }}>
                  <span style={{ fontSize: '10px', color: '#555' }}>Metode Pembayaran:</span>
                  <span style={{ fontWeight: 'bold', fontSize: '11px', color: '#111' }}>{invoice.payment_bank || '-'}</span>
                  {invoice.payment_confirmed_at && (
                    <span style={{ fontSize: '10px', color: '#555', marginLeft: 'auto' }}>
                      Dikonfirmasi: {formatDate(invoice.payment_confirmed_at)}
                    </span>
                  )}
                </div>

                {/* Footer */}
                <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: '8px', textAlign: 'center', fontSize: '10px', color: '#888' }}>
                  <div>Dokumen ini merupakan bukti pembayaran yang sah. Simpan dengan baik.</div>
                  <div style={{ marginTop: '2px' }}>Dicetak pada: {new Date().toLocaleString('id-ID')}</div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Action Footer */}
        <div className="px-6 py-4 border-t border-gray-150 dark:border-zinc-800 flex items-center justify-between gap-3 shrink-0 bg-gray-50/50 dark:bg-zinc-950/40">
          <p className="text-[10px] text-gray-400 dark:text-zinc-500">
            Preview di atas adalah tampilan struk yang akan dicetak
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-lg text-xs font-semibold text-gray-600 dark:text-zinc-400 hover:bg-gray-100 dark:hover:bg-zinc-800 transition-colors"
            >
              Tutup
            </button>
            <button
              onClick={handlePrint}
              className="px-5 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow-sm transition-all flex items-center gap-2"
            >
              <Printer className="w-3.5 h-3.5" />
              Cetak Struk
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  )
}

// ─── Tiny helper for thermal rows ───
function Row({
  label,
  value,
  valueStyle,
}: {
  label: string
  value: string
  valueStyle?: React.CSSProperties
}) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', lineHeight: '1.4' }}>
      <span style={{ color: '#444' }}>{label}</span>
      <span style={{ fontWeight: '600', textAlign: 'right', maxWidth: '55%', ...valueStyle }}>{value}</span>
    </div>
  )
}
