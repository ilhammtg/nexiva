import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Eye, EyeOff, Wifi, Loader2, User, Lock, ArrowLeft, AlertCircle } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { authApi } from '../api/authApi'
import { useAuthStore } from '../store/useAuthStore'
import { publicApi } from '@/features/public/api/publicApi'

const schema = z.object({
  identifier: z.string().min(3, 'Nomor telepon atau email tidak valid'),
  password: z.string().min(6, 'Password minimal 6 karakter'),
  rememberMe: z.boolean().optional(),
})

type FormData = z.infer<typeof schema>

// ─── Cloudflare Turnstile placeholder ────────────────────────────────────────
function CloudflareWidget() {
  const [checked, setChecked] = useState(false)
  const [loading, setLoading] = useState(false)

  const handleCheck = () => {
    if (checked) return
    setLoading(true)
    setTimeout(() => {
      setLoading(false)
      setChecked(true)
    }, 1200)
  }

  return (
    <div
      className="flex items-center justify-between px-4 py-3.5 rounded-xl border border-slate-200 bg-slate-50/80 cursor-pointer select-none"
      onClick={handleCheck}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === 'Enter' && handleCheck()}
    >
      <div className="flex items-center gap-3">
        {/* Checkbox area */}
        <div
          className={`w-5 h-5 rounded flex items-center justify-center border-2 transition-all duration-200 ${checked
            ? 'bg-blue-600 border-blue-600'
            : 'bg-white border-slate-300 hover:border-blue-400'
            }`}
        >
          {loading ? (
            <svg className="animate-spin w-3 h-3 text-blue-500" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
            </svg>
          ) : checked ? (
            <svg className="w-3 h-3 text-white" viewBox="0 0 12 12" fill="none">
              <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          ) : null}
        </div>
        <span className={`text-sm ${checked ? 'text-slate-700' : 'text-slate-500'}`}>
          {checked ? 'Verifikasi berhasil' : 'Verifikasi Anda'}
        </span>
      </div>

      {/* Cloudflare branding */}
      <div className="flex flex-col items-end gap-0.5">
        <div className="flex items-center gap-1">
          {/* Cloudflare logo simplified */}
          <svg width="22" height="14" viewBox="0 0 120 74" fill="none">
            <path d="M97.5 47.5c.6-2 .9-4.1.9-6.3 0-14.4-11.7-26.1-26.1-26.1-8.5 0-16.1 4.1-20.9 10.4-2.4-1.7-5.3-2.7-8.5-2.7-8 0-14.5 6.5-14.5 14.5 0 .9.1 1.8.2 2.7C21.5 41.2 15 48.3 15 57c0 9.4 7.6 17 17 17h64.5C107 74 115 66 115 56.4c0-8.2-5.7-15.1-13.4-17-.6-.4-2.7-1.1-4.1 8.1z" fill="#F38020" />
            <path d="M97.5 47.5c.6-2 .9-4.1.9-6.3 0-14.4-11.7-26.1-26.1-26.1-8.5 0-16.1 4.1-20.9 10.4-2.4-1.7-5.3-2.7-8.5-2.7-8 0-14.5 6.5-14.5 14.5 0 .9.1 1.8.2 2.7" stroke="#F38020" strokeWidth="0" />
            <path d="M68.5 55l3.5-11.5H42l-2.5 8c-.3 1 .4 2 1.5 2H68.5z" fill="white" opacity="0.5" />
            <path d="M72 43.5l3-9.5H52l-2 6.5H72z" fill="white" opacity="0.3" />
          </svg>
          <span className="text-[11px] font-bold text-slate-500 tracking-wider">CLOUDFLARE</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-[9px] text-slate-400 hover:underline cursor-pointer">Privasi</span>
          <span className="text-[9px] text-slate-300">·</span>
          <span className="text-[9px] text-slate-400 hover:underline cursor-pointer">Persyaratan</span>
        </div>
      </div>
    </div>
  )
}



// ─── Main Login Page ──────────────────────────────────────────────────────────
export default function LoginPage() {
  const navigate = useNavigate()
  const login = useAuthStore((s) => s.login)
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')

  const { data: publicConfigs } = useQuery({
    queryKey: ['public-configs'],
    queryFn: publicApi.getPublicConfigs,
  })

  const brandName = publicConfigs?.brand_name || 'ISP'
  const brandSubtitle = publicConfigs?.brand_footer_tagline || 'Connecting You'
  const brandLogoUrl = publicConfigs?.brand_logo_url || ''

  const {
    register,
    handleSubmit,
    resetField,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({ resolver: zodResolver(schema) })

  const onSubmit = async (data: FormData) => {
    setError('')
    try {
      const res = await authApi.login(data.identifier, data.password)
      login(res.user as any, res.access_token, res.refresh_token)
      const role = res.user.role
      if (role === 'owner') navigate('/dashboard')
      else if (role === 'cs_admin') navigate('/cs')
      else if (role === 'technician') navigate('/technician')
      else navigate('/')
    } catch (e: any) {
      const errRes = e?.response?.data?.error
      const code = errRes?.code
      const msg = errRes?.message || 'Login gagal. Periksa kembali kredensial Anda.'
      if (code === 'INVALID_PASSWORD') {
        resetField('password')
        setError(msg)
      } else if (code === 'USER_NOT_FOUND') {
        reset({ identifier: '', password: '' })
        setError(msg)
      } else {
        setError(msg)
      }
    }
  }

  return (
    <div className="relative min-h-screen w-full flex flex-col items-center justify-center overflow-hidden px-4 py-8">

      {/* ── Background: photo + layered overlays ────────────────────────── */}
      {/* Layer 1: photo */}
      <div
        className="absolute inset-0 bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: 'url(/login-bg.jpeg)' }}
      />
      {/* Layer 2: desaturate slightly */}
      <div className="absolute inset-0" style={{ background: 'rgba(240,245,255,0.82)' }} />
      {/* Layer 3: very soft blue-white vignette center-out */}
      <div
        className="absolute inset-0"
        style={{ background: 'radial-gradient(ellipse at center, rgba(255,255,255,0.15) 0%, rgba(219,234,254,0.25) 100%)' }}
      />


      {/* ── Login Card ──────────────────────────────────────────────────────── */}
      <div className="relative z-10 w-full max-w-[440px]">
        <div className="bg-white rounded-2xl shadow-xl shadow-slate-200/60 border border-slate-100 px-8 py-9 sm:px-10">

          {/* Brand */}
          <div className="flex flex-col items-center mb-7">
            {brandLogoUrl ? (
              <div className="h-14 mb-4 flex items-center justify-center">
                <img src={brandLogoUrl} alt={brandName} className="h-full w-auto object-contain" />
              </div>
            ) : (
              <div className="flex items-center gap-2.5 mb-4">
                <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center shadow-md shadow-blue-200">
                  <Wifi className="w-5 h-5 text-white" />
                </div>
                <div>
                  <span className="text-2xl font-extrabold text-blue-700 tracking-tight leading-none">{brandName}</span>
                  <p className="text-[10px] uppercase tracking-[0.2em] text-slate-400 font-medium mt-0.5">{brandSubtitle}</p>
                </div>
              </div>
            )}

            <h1 className="text-[22px] font-bold text-slate-800 text-center leading-snug">
              Selamat datang kembali!
            </h1>
            <p className="mt-1.5 text-sm text-slate-400 text-center">
              Silakan masuk untuk melanjutkan
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">

            {/* Identifier */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                Email atau Username
              </label>
              <div className="relative">
                <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-350 pointer-events-none" />
                <input
                  {...register('identifier')}
                  type="text"
                  placeholder="Masukkan email atau username"
                  autoComplete="username"
                  className={`w-full pl-10 pr-4 py-3 rounded-xl border text-sm text-slate-800 placeholder-slate-300 outline-none transition-all
                    bg-slate-50 focus:bg-white focus:ring-2 focus:ring-blue-500/15 focus:border-blue-500
                    ${errors.identifier ? 'border-red-300' : 'border-slate-200'}`}
                />
              </div>
              {errors.identifier && (
                <p className="text-red-500 text-xs mt-1.5 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3 shrink-0" />
                  {errors.identifier.message}
                </p>
              )}
            </div>

            {/* Password */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-350 pointer-events-none" />
                <input
                  {...register('password')}
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Masukkan password"
                  autoComplete="current-password"
                  className={`w-full pl-10 pr-11 py-3 rounded-xl border text-sm text-slate-800 placeholder-slate-300 outline-none transition-all
                    bg-slate-50 focus:bg-white focus:ring-2 focus:ring-blue-500/15 focus:border-blue-500
                    ${errors.password ? 'border-red-300' : 'border-slate-200'}`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  tabIndex={-1}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-350 hover:text-slate-500 transition-colors"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {errors.password && (
                <p className="text-red-500 text-xs mt-1.5 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3 shrink-0" />
                  {errors.password.message}
                </p>
              )}
            </div>

            {/* Cloudflare Turnstile widget */}
            <CloudflareWidget />

            {/* Remember me + Forgot password */}
            <div className="flex items-center justify-between pt-0.5">
              <label className="flex items-center gap-2 cursor-pointer group">
                <input
                  {...register('rememberMe')}
                  type="checkbox"
                  className="w-4 h-4 rounded border-slate-300 text-blue-600 accent-blue-600 cursor-pointer"
                />
                <span className="text-sm text-slate-500 group-hover:text-slate-700 transition-colors">
                  Ingat saya
                </span>
              </label>
              <button
                type="button"
                onClick={() => navigate('/forgot-password')}
                className="text-sm text-blue-600 hover:text-blue-700 font-medium transition-colors"
              >
                Lupa password?
              </button>
            </div>

            {/* Error */}
            {error && (
              <div className="flex items-start gap-2.5 px-4 py-3 rounded-xl bg-red-50 border border-red-100 text-red-600 text-sm leading-snug">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-3.5 rounded-xl bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-semibold text-[15px] transition-all shadow-md shadow-blue-200 disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Mengotentikasi...
                </>
              ) : (
                'Masuk'
              )}
            </button>

            {/* Divider */}
            <div className="relative flex items-center gap-3 py-1">
              <div className="flex-1 h-px bg-slate-100" />
              <span className="text-xs text-slate-350">atau</span>
              <div className="flex-1 h-px bg-slate-100" />
            </div>

            {/* Back to home */}
            <button
              type="button"
              onClick={() => navigate('/')}
              className="w-full flex items-center justify-center gap-1.5 text-sm text-blue-600 hover:text-blue-700 font-medium transition-colors py-1"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              Kembali ke beranda
            </button>
          </form>
        </div>

        {/* Footer below card */}
        <div className="mt-6 text-center space-y-2">
          <p className="text-xs text-slate-500/80">
            © {new Date().getFullYear()} {brandName}. All rights reserved.
          </p>
          <div className="flex items-center justify-center gap-3 text-xs text-slate-500/70">
            <button className="hover:text-slate-700 transition-colors">Kebijakan Privasi</button>
            <span className="text-slate-400/50">|</span>
            <button className="hover:text-slate-700 transition-colors">Syarat &amp; Ketentuan</button>
          </div>
        </div>
      </div>
    </div>
  )
}
