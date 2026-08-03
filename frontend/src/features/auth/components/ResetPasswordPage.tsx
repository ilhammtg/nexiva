import { useState, useEffect } from 'react'
import { Link, useSearchParams, useNavigate } from 'react-router-dom'
import { Eye, EyeOff, Wifi, Loader2, ArrowLeft, CheckCircle, AlertTriangle, Key } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { authApi } from '../api/authApi'
import { publicApi } from '@/features/public/api/publicApi'

function PasswordInput({
  label, value, onChange, placeholder, hint,
}: {
  label: string; value: string; onChange: (v: string) => void; placeholder: string; hint?: string
}) {
  const [show, setShow] = useState(false)
  return (
    <div className="space-y-1.5">
      <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
        {label}
      </label>
      <div className="relative">
        <Key className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <input
          type={show ? 'text' : 'password'}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="w-full pl-10 pr-11 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200/80 dark:border-slate-800/80 text-slate-800 dark:text-white placeholder-slate-400 dark:placeholder-slate-600 focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-600/10 transition-all text-sm font-medium"
        />
        <button
          type="button"
          onClick={() => setShow(!show)}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
          title={show ? 'Sembunyikan' : 'Tampilkan'}
        >
          {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
        </button>
      </div>
      {hint && <p className="text-[11px] text-slate-400 mt-0.5">{hint}</p>}
    </div>
  )
}

export default function ResetPasswordPage() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const token = searchParams.get('token') ?? ''

  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [pwdStrength, setPwdStrength] = useState(0)

  const { data: publicConfigs } = useQuery({
    queryKey: ['public-configs'],
    queryFn: publicApi.getPublicConfigs,
  })
  const brandName = publicConfigs?.brand_name || 'ISP Platform'
  const brandLogoUrl = publicConfigs?.brand_logo_url || ''

  const checkStrength = (pwd: string) => {
    let score = 0
    if (pwd.length >= 6) score++
    if (pwd.length >= 10) score++
    if (/[A-Z]/.test(pwd)) score++
    if (/[0-9]/.test(pwd)) score++
    if (/[^A-Za-z0-9]/.test(pwd)) score++
    setPwdStrength(score)
  }

  const strengthLabel = ['', 'Sangat Lemah', 'Lemah', 'Cukup', 'Kuat', 'Sangat Kuat'][pwdStrength]
  const strengthColor = ['', 'bg-red-500', 'bg-orange-400', 'bg-yellow-400', 'bg-blue-500', 'bg-emerald-500'][pwdStrength]

  // Auto-redirect to login after success
  useEffect(() => {
    if (success) {
      const timer = setTimeout(() => navigate('/login'), 3500)
      return () => clearTimeout(timer)
    }
  }, [success, navigate])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!token) { setError('Token tidak valid. Gunakan tautan yang dikirim ke email Anda.'); return }
    if (newPassword.length < 6) { setError('Password minimal 6 karakter'); return }
    if (newPassword !== confirmPassword) { setError('Konfirmasi password tidak cocok'); return }

    setLoading(true)
    try {
      await authApi.resetPassword({ token, new_password: newPassword, confirm_password: confirmPassword })
      setSuccess(true)
    } catch (e: any) {
      const msg = e?.response?.data?.error?.message ?? ''
      if (msg || e?.response?.status === 404) {
        setError('Tautan reset password tidak valid atau sudah kedaluwarsa. Silakan ajukan permintaan baru.')
      } else {
        setError('Terjadi kesalahan. Coba lagi beberapa saat.')
      }
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
          <p className="mt-1.5 text-xs text-slate-400 dark:text-slate-500">Portal Manajemen & Administrasi</p>
        </div>
      </div>

      <div className="mt-2 sm:mx-auto sm:w-full sm:max-w-[440px] px-4">
        <div className="bg-white dark:bg-slate-900 py-8 px-6 sm:px-10 border border-slate-200/60 dark:border-slate-800/80 rounded-2xl shadow-xl dark:shadow-black/20">
          {!token ? (
            /* Invalid token state */
            <div className="text-center space-y-4">
              <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-red-50 dark:bg-red-950/30 border border-red-200/50 dark:border-red-800/40 mx-auto">
                <AlertTriangle className="w-7 h-7 text-red-500" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-800 dark:text-white">Tautan Tidak Valid</h3>
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-2">
                  Tautan reset password tidak valid atau sudah kedaluwarsa. Silakan ajukan permintaan baru.
                </p>
              </div>
              <Link
                to="/forgot-password"
                className="inline-flex items-center gap-1.5 text-sm font-semibold text-blue-600 dark:text-blue-400 hover:text-blue-700 transition-colors"
              >
                Ajukan Ulang Reset Password
              </Link>
            </div>
          ) : success ? (
            /* Success state */
            <div className="text-center space-y-4">
              <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200/50 dark:border-emerald-800/40 mx-auto">
                <CheckCircle className="w-7 h-7 text-emerald-500" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-800 dark:text-white">Password Berhasil Direset!</h3>
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-2">
                  Kata sandi Anda telah berhasil diperbarui. Anda akan diarahkan ke halaman login secara otomatis...
                </p>
              </div>
              <Link
                to="/login"
                className="inline-flex items-center gap-1.5 text-sm font-semibold text-blue-600 dark:text-blue-400 hover:text-blue-700 transition-colors"
              >
                <ArrowLeft className="w-4 h-4" /> Login Sekarang
              </Link>
            </div>
          ) : (
            /* Reset form */
            <>
              <div className="mb-6">
                <h3 className="text-lg font-bold text-slate-800 dark:text-white">Buat Kata Sandi Baru</h3>
                <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5 leading-relaxed">
                  Masukkan kata sandi baru untuk akun Anda. Pastikan minimal 6 karakter.
                </p>
              </div>

              {error && (
                <div className="mb-4 flex items-start gap-2.5 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/40 rounded-xl px-4 py-3">
                  <AlertTriangle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
                  <p className="text-xs text-red-600 dark:text-red-400 font-medium">{error}</p>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                <PasswordInput
                  label="Kata Sandi Baru"
                  value={newPassword}
                  onChange={(v) => { setNewPassword(v); checkStrength(v); setError('') }}
                  placeholder="Minimal 6 karakter"
                  hint="Gunakan kombinasi huruf besar, angka, dan simbol"
                />

                {/* Strength meter */}
                {newPassword && (
                  <div className="space-y-1">
                    <div className="flex gap-1">
                      {Array.from({ length: 5 }, (_, i) => (
                        <div
                          key={i}
                          className={`h-1 flex-1 rounded-full transition-all duration-300 ${
                            i < pwdStrength ? strengthColor : 'bg-slate-200 dark:bg-slate-800'
                          }`}
                        />
                      ))}
                    </div>
                    <p className="text-[11px] text-slate-400">
                      Kekuatan: <span className="font-semibold">{strengthLabel}</span>
                    </p>
                  </div>
                )}

                <PasswordInput
                  label="Konfirmasi Kata Sandi Baru"
                  value={confirmPassword}
                  onChange={(v) => { setConfirmPassword(v); setError('') }}
                  placeholder="Ulangi kata sandi baru"
                />

                {/* Match indicator */}
                {newPassword && confirmPassword && (
                  <p className={`text-xs font-semibold flex items-center gap-1.5 ${
                    newPassword === confirmPassword
                      ? 'text-emerald-600 dark:text-emerald-400'
                      : 'text-red-500 dark:text-red-400'
                  }`}>
                    {newPassword === confirmPassword ? '✓ Password cocok' : '✗ Password tidak cocok'}
                  </p>
                )}

                <button
                  type="submit"
                  disabled={
                    loading ||
                    newPassword.length < 6 ||
                    newPassword !== confirmPassword
                  }
                  className="w-full py-2.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 text-white font-bold text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2 mt-2"
                >
                  {loading ? (
                    <><Loader2 className="w-4 h-4 animate-spin" /> Menyimpan...</>
                  ) : (
                    <>Simpan Kata Sandi Baru</>
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
