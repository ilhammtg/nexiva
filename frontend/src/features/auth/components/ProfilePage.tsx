import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { 
  User, Mail, Phone, Shield, Eye, EyeOff, Loader2, 
  Lock, CheckCircle, AlertCircle, Save, Key
} from 'lucide-react'
import { toast } from 'sonner'
import { authApi } from '../api/authApi'
import { useAuthStore } from '../store/useAuthStore'

interface ProfileData {
  ID: string
  FullName: string
  Email: string | null
  Phone: string
  Role: string
  IsActive: boolean
  LastLoginAt: string | null
  CreatedAt: string
  UpdatedAt: string
}

const ROLE_LABELS: Record<string, string> = {
  owner: 'Super Admin',
  cs_admin: 'CS Admin',
  technician: 'Teknisi',
}

const ROLE_COLORS: Record<string, string> = {
  owner: 'bg-purple-100 text-purple-700 dark:bg-purple-950/30 dark:text-purple-400',
  cs_admin: 'bg-blue-100 text-blue-700 dark:bg-blue-950/30 dark:text-blue-400',
  technician: 'bg-amber-100 text-amber-700 dark:bg-amber-950/30 dark:text-amber-400',
}

function PasswordInput({ 
  label, value, onChange, placeholder, hint
}: { 
  label: string; value: string; onChange: (v: string) => void; placeholder: string; hint?: string
}) {
  const [show, setShow] = useState(false)
  return (
    <div>
      <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">{label}</label>
      <div className="relative">
        <input
          type={show ? 'text' : 'password'}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="w-full px-4 py-2.5 pr-11 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200/80 dark:border-slate-800 text-slate-850 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
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
      {hint && <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-1">{hint}</p>}
    </div>
  )
}

export default function ProfilePage() {
  const qc = useQueryClient()
  const { user: storeUser, updateUser, logout } = useAuthStore()
  const [activeTab, setActiveTab] = useState<'profile' | 'password'>('profile')

  // Profile form state
  const [profileForm, setProfileForm] = useState({
    full_name: '',
    email: '',
    phone: '',
  })

  // Password form state
  const [pwdForm, setPwdForm] = useState({
    old_password: '',
    new_password: '',
    confirm_password: '',
  })
  const [pwdStrength, setPwdStrength] = useState(0)

  const { data: profile, isLoading } = useQuery<ProfileData>({
    queryKey: ['my-profile'],
    queryFn: authApi.getProfile,
  })

  // Populate form once profile loads
  useEffect(() => {
    if (profile) {
      setProfileForm({
        full_name: profile.FullName ?? '',
        email: profile.Email ?? '',
        phone: profile.Phone ?? '',
      })
    }
  }, [profile])

  const updateMut = useMutation({
    mutationFn: () => authApi.updateProfile({
      full_name: profileForm.full_name,
      email: profileForm.email || undefined,
      phone: profileForm.phone,
    }),
    onSuccess: (data: any) => {
      qc.invalidateQueries({ queryKey: ['my-profile'] })
      updateUser({ full_name: data.FullName, email: data.Email, phone: data.Phone })
      toast.success('Profil berhasil diperbarui')
    },
    onError: (e: any) => toast.error(e?.response?.data?.error?.message ?? 'Gagal memperbarui profil'),
  })

  const changePwdMut = useMutation({
    mutationFn: () => authApi.changePassword(pwdForm),
    onSuccess: () => {
      toast.success('Password berhasil diubah. Anda akan diarahkan ke halaman login...')
      setTimeout(() => logout(), 2000)
    },
    onError: (e: any) => {
      const msg = e?.response?.data?.error?.message ?? 'Gagal mengubah password'
      toast.error(msg)
    },
  })

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

  if (isLoading) {
    return (
      <div className="p-8 flex items-center justify-center min-h-64">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
      </div>
    )
  }

  return (
    <div className="p-4 sm:p-8 max-w-2xl mx-auto space-y-6">
      {/* Hero card */}
      <div className="bg-gradient-to-br from-blue-600 to-indigo-700 dark:from-blue-700 dark:to-indigo-900 rounded-2xl p-6 text-white shadow-lg shadow-blue-500/20 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-40 h-40 bg-white/5 rounded-full -translate-y-16 translate-x-10 pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/5 rounded-full translate-y-8 -translate-x-6 pointer-events-none" />
        <div className="relative flex items-center gap-5">
          <div className="w-16 h-16 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center flex-shrink-0 shadow-inner border border-white/20">
            <span className="text-white font-extrabold text-2xl uppercase">
              {(profile?.FullName ?? storeUser?.full_name ?? 'U').charAt(0)}
            </span>
          </div>
          <div className="min-w-0">
            <h2 className="text-xl font-bold leading-tight truncate">
              {profile?.FullName ?? storeUser?.full_name ?? '—'}
            </h2>
            <p className="text-blue-100 text-sm mt-0.5 truncate">
              {profile?.Email ?? storeUser?.email ?? 'Email belum diatur'}
            </p>
            <span className={`mt-2 inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-0.5 rounded-full ${
              ROLE_COLORS[profile?.Role ?? storeUser?.role ?? ''] ?? 'bg-white/20 text-white'
            }`}>
              <Shield className="w-3 h-3" />
              {ROLE_LABELS[profile?.Role ?? storeUser?.role ?? ''] ?? profile?.Role ?? storeUser?.role}
            </span>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200 dark:border-slate-800">
        <button
          onClick={() => setActiveTab('profile')}
          className={`px-5 py-3 text-sm font-semibold border-b-2 transition-all flex items-center gap-2 ${
            activeTab === 'profile'
              ? 'border-blue-600 text-blue-600 dark:border-blue-500 dark:text-blue-450'
              : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-300'
          }`}
        >
          <User className="w-4 h-4" /> Informasi Profil
        </button>
        <button
          onClick={() => setActiveTab('password')}
          className={`px-5 py-3 text-sm font-semibold border-b-2 transition-all flex items-center gap-2 ${
            activeTab === 'password'
              ? 'border-blue-600 text-blue-600 dark:border-blue-500 dark:text-blue-450'
              : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-300'
          }`}
        >
          <Key className="w-4 h-4" /> Ubah Password
        </button>
      </div>

      {/* ── Profile Tab ─────────────────────────────── */}
      {activeTab === 'profile' && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800/80 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800/80">
            <h3 className="font-semibold text-slate-800 dark:text-white">Detail Profil Saya</h3>
            <p className="text-xs text-slate-400 mt-0.5">Perbarui nama, email, dan nomor telepon akun Anda</p>
          </div>
          <div className="p-6 space-y-4">
            {/* Read-only role badge */}
            <div>
              <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">Peran (Role)</label>
              <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200/80 dark:border-slate-800">
                <Shield className="w-4 h-4 text-slate-400" />
                <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                  {ROLE_LABELS[profile?.Role ?? storeUser?.role ?? ''] ?? profile?.Role}
                </span>
                <span className="ml-auto text-[10px] text-slate-400 italic">Tidak dapat diubah</span>
              </div>
            </div>

            {/* Full Name */}
            <div>
              <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">
                Nama Lengkap <span className="text-red-500 normal-case font-medium">*</span>
              </label>
              <div className="relative">
                <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  value={profileForm.full_name}
                  onChange={(e) => setProfileForm((f) => ({ ...f, full_name: e.target.value }))}
                  placeholder="Masukkan nama lengkap"
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200/80 dark:border-slate-800 text-slate-850 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                />
              </div>
            </div>

            {/* Email */}
            <div>
              <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">Alamat Email</label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="email"
                  value={profileForm.email}
                  onChange={(e) => setProfileForm((f) => ({ ...f, email: e.target.value }))}
                  placeholder="contoh: nama@perusahaan.co.id"
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200/80 dark:border-slate-800 text-slate-850 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                />
              </div>
            </div>

            {/* Phone */}
            <div>
              <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">
                Nomor Telepon Seluler <span className="text-red-500 normal-case font-medium">*</span>
              </label>
              <div className="relative">
                <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  value={profileForm.phone}
                  onChange={(e) => setProfileForm((f) => ({ ...f, phone: e.target.value }))}
                  placeholder="contoh: 081234567890"
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200/80 dark:border-slate-800 text-slate-850 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                />
              </div>
            </div>
          </div>
          <div className="px-6 py-4 border-t border-slate-100 dark:border-slate-800/80 bg-slate-50 dark:bg-slate-950/30 flex justify-end">
            <button
              onClick={() => updateMut.mutate()}
              disabled={updateMut.isPending || !profileForm.full_name || !profileForm.phone}
              className="inline-flex items-center gap-2 px-5 py-2 rounded-xl bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 disabled:opacity-60 transition-all shadow-sm shadow-blue-500/15"
            >
              {updateMut.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              Simpan Perubahan
            </button>
          </div>
        </div>
      )}

      {/* ── Change Password Tab ──────────────────────── */}
      {activeTab === 'password' && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800/80 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800/80">
            <h3 className="font-semibold text-slate-800 dark:text-white flex items-center gap-2">
              <Lock className="w-4 h-4 text-amber-500" /> Ubah Kata Sandi
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">Setelah password diubah, sesi aktif Anda akan dihentikan dan perlu login ulang</p>
          </div>
          <div className="p-6 space-y-4">
            {/* Warning banner */}
            <div className="flex items-start gap-3 px-4 py-3 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800/40 rounded-xl">
              <AlertCircle className="w-4 h-4 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-amber-700 dark:text-amber-400 leading-relaxed">
                Demi keamanan, semua sesi aktif pada semua perangkat akan dinonaktifkan setelah password berhasil diubah.
              </p>
            </div>

            <PasswordInput
              label="Password Saat Ini"
              value={pwdForm.old_password}
              onChange={(v) => setPwdForm((f) => ({ ...f, old_password: v }))}
              placeholder="Masukkan password yang sedang aktif"
            />

            <PasswordInput
              label="Password Baru"
              value={pwdForm.new_password}
              onChange={(v) => { 
                setPwdForm((f) => ({ ...f, new_password: v }))
                checkStrength(v) 
              }}
              placeholder="Minimal 6 karakter"
              hint="Gunakan kombinasi huruf besar, angka, dan simbol untuk keamanan maksimal"
            />

            {/* Strength meter */}
            {pwdForm.new_password && (
              <div className="space-y-1.5">
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
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  Kekuatan: <span className="font-semibold">{strengthLabel}</span>
                </p>
              </div>
            )}

            <PasswordInput
              label="Konfirmasi Password Baru"
              value={pwdForm.confirm_password}
              onChange={(v) => setPwdForm((f) => ({ ...f, confirm_password: v }))}
              placeholder="Ulangi password baru"
            />

            {/* Match indicator */}
            {pwdForm.new_password && pwdForm.confirm_password && (
              <div className={`flex items-center gap-1.5 text-xs font-semibold ${
                pwdForm.new_password === pwdForm.confirm_password
                  ? 'text-emerald-600 dark:text-emerald-400'
                  : 'text-red-500 dark:text-red-400'
              }`}>
                {pwdForm.new_password === pwdForm.confirm_password
                  ? <><CheckCircle className="w-3.5 h-3.5" /> Password cocok</>
                  : <><AlertCircle className="w-3.5 h-3.5" /> Password tidak cocok</>
                }
              </div>
            )}
          </div>
          <div className="px-6 py-4 border-t border-slate-100 dark:border-slate-800/80 bg-slate-50 dark:bg-slate-950/30 flex justify-end">
            <button
              onClick={() => changePwdMut.mutate()}
              disabled={
                changePwdMut.isPending ||
                !pwdForm.old_password ||
                !pwdForm.new_password ||
                !pwdForm.confirm_password ||
                pwdForm.new_password !== pwdForm.confirm_password ||
                pwdForm.new_password.length < 6
              }
              className="inline-flex items-center gap-2 px-5 py-2 rounded-xl bg-amber-600 text-white text-sm font-semibold hover:bg-amber-700 disabled:opacity-60 transition-all shadow-sm shadow-amber-500/15"
            >
              {changePwdMut.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Key className="w-4 h-4" />}
              Ubah Password
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
