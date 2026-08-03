import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Mail, Wifi, Loader2, ArrowLeft, CheckCircle } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { authApi } from '../api/authApi'
import { publicApi } from '@/features/public/api/publicApi'

export default function ForgotPasswordPage() {
  const [identifier, setIdentifier] = useState('')
  const [submitted, setSubmitted] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const { data: publicConfigs } = useQuery({
    queryKey: ['public-configs'],
    queryFn: publicApi.getPublicConfigs,
  })
  const brandName = publicConfigs?.brand_name || 'ISP Platform'
  const brandLogoUrl = publicConfigs?.brand_logo_url || ''

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const val = identifier.trim()
    if (!val) { setError('Masukkan email atau nomor WhatsApp terdaftar'); return }

    const isEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val)
    const isPhone = /^[0-9+]{8,15}$/.test(val)
    
    if (!isEmail && !isPhone) {
      setError('Masukkan format email atau nomor WhatsApp yang valid')
      return
    }

    setError('')
    setLoading(true)
    try {
      await authApi.forgotPassword(val)
      setSubmitted(true)
    } catch (err: any) {
      const details = err.response?.data?.error?.details
      const errMsg = details?.email || err.response?.data?.error?.message || err.response?.data?.message || err.message || 'Terjadi kesalahan'
      setError(errMsg)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md flex flex-col items-center">
        {/* Brand */}
        <div className="mb-6 flex flex-col items-center">
          {brandLogoUrl ? (
            <div className="h-14 bg-white dark:bg-slate-900 px-3 py-1 rounded-xl shadow-sm border border-slate-200/50 dark:border-slate-800/50 overflow-hidden flex items-center justify-center max-w-[180px] mb-3">
              <img src={brandLogoUrl} alt={brandName} className="h-full w-auto object-contain" />
            </div>
          ) : (
            <div className="w-14 h-14 flex items-center justify-center bg-blue-600 rounded-xl shadow-sm mb-3">
              <Wifi className="w-7 h-7 text-white" />
            </div>
          )}
          <h2 className="text-2xl font-black tracking-tight text-slate-800 dark:text-white">{brandName}</h2>
          <p className="mt-1.5 text-xs text-slate-400 dark:text-slate-500 max-w-xs text-center">
            Portal Manajemen & Administrasi Terintegrasi
          </p>
        </div>
      </div>

      <div className="mt-2 sm:mx-auto sm:w-full sm:max-w-[440px] px-4">
        <div className="bg-white dark:bg-slate-900 py-8 px-6 sm:px-10 border border-slate-200/60 dark:border-slate-800/80 rounded-2xl shadow-xl dark:shadow-black/20">
          {submitted ? (
            /* Success state */
            <div className="text-center space-y-4">
              <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200/50 dark:border-emerald-800/40 mx-auto">
                <CheckCircle className="w-7 h-7 text-emerald-500" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-800 dark:text-white">Instruksi Terkirim!</h3>
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-2 leading-relaxed">
                  Jika akun dengan <span className="font-semibold text-slate-700 dark:text-slate-300">{identifier}</span> terdaftar di sistem kami, Anda akan segera menerima instruksi reset password via email atau nomor WhatsApp.
                </p>
              </div>
              <div className="pt-2">
                <Link
                  to="/login"
                  className="inline-flex items-center gap-1.5 text-sm font-semibold text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 transition-colors"
                >
                  <ArrowLeft className="w-4 h-4" /> Kembali ke halaman login
                </Link>
              </div>
            </div>
          ) : (
            /* Request form */
            <>
              <div className="mb-6">
                <h3 className="text-lg font-bold text-slate-800 dark:text-white">Lupa Kata Sandi?</h3>
                <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5 leading-relaxed">
                  Masukkan email atau nomor WhatsApp terdaftar. Kami akan mengirimkan tautan untuk membuat kata sandi baru.
                </p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                    Email / WhatsApp
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                      type="text"
                      value={identifier}
                      onChange={(e) => { setIdentifier(e.target.value); setError('') }}
                      placeholder="Masukkan alamat email atau nomor WhatsApp"
                      className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200/80 dark:border-slate-800/80 text-slate-800 dark:text-white placeholder-slate-400 dark:placeholder-slate-600 focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-600/10 transition-all text-sm font-medium"
                    />
                  </div>
                  {error && (
                    <p className="text-red-500 dark:text-red-400 text-xs font-bold mt-1">{error}</p>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-2.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 text-white font-bold text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <><Loader2 className="w-4 h-4 animate-spin" /> Mengirim instruksi...</>
                  ) : (
                    <>Kirim Instruksi Reset Password</>
                  )}
                </button>
              </form>

              <div className="mt-5 text-center">
                <Link
                  to="/login"
                  className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 transition-colors font-medium"
                >
                  <ArrowLeft className="w-3.5 h-3.5" /> Kembali ke Login
                </Link>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
