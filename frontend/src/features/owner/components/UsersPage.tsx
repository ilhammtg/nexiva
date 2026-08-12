import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { 
  Plus, Loader2, UserCheck, UserX, Shield, Key, Edit,
  Lock, ShieldCheck, Check, Info, Mail
} from 'lucide-react'
import { ownerApi } from '../api/ownerApi'
import { LoadingSpinner, EmptyState } from '@/components/ui'
import { formatDateTime } from '@/lib/utils'
import { toast } from 'sonner'

const ROLE_LABELS: Record<string, string> = {
  owner: 'Super Admin',
  cs_admin: 'CS Admin',
  technician: 'Teknisi',
  customer: 'Pelanggan'
}

const ROLE_COLORS: Record<string, string> = {
  owner: 'bg-purple-100 text-purple-700 dark:bg-purple-950/20 dark:text-purple-400',
  cs_admin: 'bg-blue-100 text-blue-700 dark:bg-blue-950/20 dark:text-blue-400',
  technician: 'bg-amber-100 text-amber-700 dark:bg-amber-950/20 dark:text-amber-400',
  customer: 'bg-zinc-100 text-zinc-750 dark:bg-zinc-800/60 dark:text-zinc-400',
}

// Default permissions structure
const DEFAULT_PERMISSIONS: Record<string, Record<string, boolean>> = {
  cs_admin: {
    dashboard: true,
    registrations: true,
    customers: true,
    activity_log: true,
    packages: false,
    olt_ports: false,
    mikrotik: false,
    users: false,
    settings: false,
  },
  technician: {
    dashboard: true,
    registrations: false,
    customers: false,
    activity_log: false,
    packages: false,
    olt_ports: false,
    mikrotik: false,
    users: false,
    settings: false,
  }
}

interface UserModalProps {
  user?: any
  onClose: () => void
}

function UserModal({ user, onClose }: UserModalProps) {
  const qc = useQueryClient()
  const isEdit = !!user

  const [form, setForm] = useState({ 
    full_name: user?.FullName || '', 
    email: user?.Email || '', 
    phone: user?.Phone || '', 
    password: '', 
    role: user?.Role || 'cs_admin' 
  })

  const mut = useMutation({
    mutationFn: () => isEdit 
      ? ownerApi.updateUser(user.ID, {
          full_name: form.full_name,
          email: form.email,
          phone: form.phone,
          role: form.role
        })
      : ownerApi.createUser(form),
    onSuccess: () => { 
      qc.invalidateQueries({ queryKey: ['system-users'] })
      toast.success(isEdit ? 'Profil pengguna berhasil diperbarui' : 'Pengguna berhasil dibuat')
      onClose() 
    },
    onError: (e: any) => toast.error(e?.response?.data?.error?.message ?? `Gagal ${isEdit ? 'memperbarui' : 'membuat'} pengguna`),
  })

  return (
    <div className="fixed inset-0 bg-black/45 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-805 rounded-lg shadow-xl w-full max-w-md overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-150 dark:border-zinc-850 flex items-center justify-between bg-gray-50/50 dark:bg-zinc-955/40">
          <h3 className="font-semibold text-gray-900 dark:text-zinc-100">{isEdit ? 'Ubah Profil Pengguna' : 'Tambah Pengguna Baru'}</h3>
          <button onClick={onClose} className="p-2 rounded-md hover:bg-gray-100 dark:hover:bg-zinc-800 text-gray-450">✕</button>
        </div>
        <div className="p-6 space-y-4">
          <div>
            <label className="block text-[10px] font-bold text-gray-500 dark:text-zinc-400 uppercase tracking-wider mb-1.5">Nama Lengkap</label>
            <input
              type="text"
              value={form.full_name}
              onChange={(e) => setForm((f) => ({ ...f, full_name: e.target.value }))}
              placeholder="Masukkan nama lengkap"
              className="w-full px-3 py-2 rounded-md bg-white dark:bg-zinc-950 border border-gray-255 dark:border-zinc-800 text-gray-900 dark:text-zinc-100 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all placeholder-gray-400"
            />
          </div>
          <div>
            <label className="block text-[10px] font-bold text-gray-500 dark:text-zinc-400 uppercase tracking-wider mb-1.5">Alamat Email</label>
            <input
              type="email"
              value={form.email}
              onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
              placeholder="contoh: nama.karyawan@perusahaan.co.id"
              className="w-full px-3 py-2 rounded-md bg-white dark:bg-zinc-950 border border-gray-255 dark:border-zinc-800 text-gray-900 dark:text-zinc-100 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all placeholder-gray-400"
            />
          </div>
          <div>
            <label className="block text-[10px] font-bold text-gray-500 dark:text-zinc-400 uppercase tracking-wider mb-1.5">Nomor Telepon Seluler</label>
            <input
              type="text"
              value={form.phone}
              onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
              placeholder="contoh: 081234567890"
              className="w-full px-3 py-2 rounded-md bg-white dark:bg-zinc-950 border border-gray-255 dark:border-zinc-800 text-gray-900 dark:text-zinc-100 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all placeholder-gray-400"
            />
          </div>
          {!isEdit && (
            <div>
              <label className="block text-[10px] font-bold text-gray-500 dark:text-zinc-400 uppercase tracking-wider mb-1.5">Kata Sandi (Password)</label>
              <input
                type="password"
                value={form.password}
                onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
                placeholder="Masukkan kata sandi minimal 6 karakter"
                className="w-full px-3 py-2 rounded-md bg-white dark:bg-zinc-950 border border-gray-255 dark:border-zinc-800 text-gray-900 dark:text-zinc-100 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all placeholder-gray-400"
              />
            </div>
          )}
          <div>
            <label className="block text-[10px] font-bold text-gray-500 dark:text-zinc-400 uppercase tracking-wider mb-1.5">Peran (Role)</label>
            <select
              value={form.role}
              onChange={(e) => setForm((f) => ({ ...f, role: e.target.value }))}
              disabled={isEdit && user?.Role === 'owner'}
              className="w-full px-3 py-2 rounded-md bg-white dark:bg-zinc-950 border border-gray-255 dark:border-zinc-800 text-gray-900 dark:text-zinc-100 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all disabled:opacity-60 font-semibold"
            >
              <option value="cs_admin">CS Admin</option>
              <option value="technician">Teknisi</option>
              <option value="owner">Super Admin</option>
            </select>
          </div>
          <div className="pt-3 border-t border-gray-150 dark:border-zinc-800">
            <div className="flex items-center justify-between opacity-70">
              <div>
                <p className="text-xs font-semibold text-gray-900 dark:text-zinc-100">Autentikasi Dua Faktor (2FA)</p>
                <p className="text-[10px] text-gray-500 dark:text-zinc-400">Dinonaktifkan sementara oleh kebijakan Super Admin</p>
              </div>
              <div className="w-8 h-5 rounded-full p-0.5 bg-gray-200 dark:bg-zinc-800 flex items-center justify-start cursor-not-allowed">
                <div className="w-3.5 h-3.5 rounded-full bg-white" />
              </div>
            </div>
          </div>
        </div>
        <div className="px-6 py-4 border-t border-gray-150 dark:border-zinc-850 flex gap-2 justify-end bg-gray-50/50 dark:bg-zinc-955/40">
          <button onClick={onClose} className="px-3 py-1.5 rounded-md text-xs font-semibold text-gray-650 dark:text-zinc-400 hover:bg-gray-100 dark:hover:bg-zinc-800 transition-all">Batal</button>
          <button
            onClick={() => mut.mutate()}
            disabled={mut.isPending}
            className="px-4 py-1.5 rounded-md bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold disabled:opacity-60 flex items-center gap-2 transition-all"
          >
            {mut.isPending && <Loader2 className="w-4 h-4 animate-spin" />} {isEdit ? 'Simpan Perubahan' : 'Buat Akun'}
          </button>
        </div>
      </div>
    </div>
  )
}

interface ResetModalProps {
  user: { ID: string; FullName: string }
  onClose: () => void
}

function ResetPasswordModal({ user, onClose }: ResetModalProps) {
  const [newPassword, setNewPassword] = useState('')
  const mut = useMutation({
    mutationFn: () => ownerApi.resetPassword(user.ID, { password: newPassword }),
    onSuccess: () => {
      toast.success(`Password untuk ${user.FullName} berhasil diperbarui`)
      onClose()
    },
    onError: (e: any) => toast.error(e?.response?.data?.error?.message ?? 'Gagal memperbarui password'),
  })

  return (
    <div className="fixed inset-0 bg-black/45 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-805 rounded-lg shadow-xl w-full max-w-md overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-150 dark:border-zinc-850 flex items-center justify-between bg-gray-50/50 dark:bg-zinc-955/40">
          <h3 className="font-semibold text-gray-900 dark:text-zinc-100 flex items-center gap-2">
            <Key className="w-4 h-4 text-amber-500" /> Reset Password
          </h3>
          <button onClick={onClose} className="p-2 rounded-md hover:bg-gray-100 dark:hover:bg-zinc-800 text-gray-450">✕</button>
        </div>
        <div className="p-6 space-y-4">
          <p className="text-xs text-gray-500 dark:text-zinc-400">
            Anda sedang mengatur ulang password untuk akun <strong>{user.FullName}</strong>.
          </p>
          <div>
            <label className="block text-[10px] font-bold text-gray-500 dark:text-zinc-400 uppercase tracking-wider mb-1.5">Kata Sandi Baru</label>
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="Masukkan kata sandi baru minimal 6 karakter"
              className="w-full px-3 py-2 rounded-md bg-white dark:bg-zinc-955 border border-gray-255 dark:border-zinc-800 text-gray-900 dark:text-zinc-100 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all placeholder-gray-400"
            />
          </div>
        </div>
        <div className="px-6 py-4 border-t border-gray-150 dark:border-zinc-850 flex gap-2 justify-end bg-gray-50/50 dark:bg-zinc-955/40">
          <button onClick={onClose} className="px-3 py-1.5 rounded-md text-xs font-semibold text-gray-650 dark:text-zinc-400 hover:bg-gray-100 dark:hover:bg-zinc-800 transition-all">Batal</button>
          <button
            onClick={() => mut.mutate()}
            disabled={mut.isPending || !newPassword}
            className="px-4 py-1.5 rounded-md bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold disabled:opacity-60 flex items-center gap-2 transition-all"
          >
            {mut.isPending && <Loader2 className="w-4 h-4 animate-spin" />} Update Password
          </button>
        </div>
      </div>
    </div>
  )
}

export default function UsersPage() {
  const qc = useQueryClient()
  const [activeTab, setActiveTab] = useState<'users' | 'rbac'>('users')
  const [showModal, setShowModal] = useState(false)
  const [editTarget, setEditTarget] = useState<any | null>(null)
  const [roleFilter, setRoleFilter] = useState('all')
  const [resetTarget, setResetTarget] = useState<{ ID: string; FullName: string } | null>(null)

  // RBAC Config State
  const [rbacRole, setRbacRole] = useState<'cs_admin' | 'technician'>('cs_admin')
  const [permissions, setPermissions] = useState<any>(null)

  const { data: users, isLoading: isLoadingUsers } = useQuery({
    queryKey: ['system-users'],
    queryFn: ownerApi.getUsers,
  })

  const { data: appConfigs, isLoading: isLoadingConfigs } = useQuery({
    queryKey: ['system-configs'],
    queryFn: ownerApi.getConfigs,
  })

  // Parse permissions config
  useEffect(() => {
    if (appConfigs) {
      const configItem = appConfigs.find(c => c.Key === 'role_permissions')
      if (configItem && configItem.Value) {
        try {
          setPermissions(JSON.parse(configItem.Value))
        } catch (e) {
          setPermissions(DEFAULT_PERMISSIONS)
        }
      } else {
        setPermissions(DEFAULT_PERMISSIONS)
      }
    }
  }, [appConfigs])

  // Mutations
  const toggleStatusMut = useMutation({
    mutationFn: (userId: string) => ownerApi.toggleUser(userId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['system-users'] })
      toast.success('Status pengguna berhasil diubah')
    },
    onError: (e: any) => toast.error(e?.response?.data?.error?.message ?? 'Gagal mengubah status'),
  })

  const saveRbacMut = useMutation({
    mutationFn: (newPerms: any) => ownerApi.updateConfig('role_permissions', JSON.stringify(newPerms)),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['system-configs'] })
      qc.invalidateQueries({ queryKey: ['public-configs'] })
      toast.success('Pengaturan hak akses berhasil disimpan')
    },
    onError: (e: any) => toast.error(e?.response?.data?.error?.message ?? 'Gagal menyimpan hak akses'),
  })

  const handlePermissionToggle = (role: 'cs_admin' | 'technician', key: string) => {
    if (!permissions) return
    const updated = {
      ...permissions,
      [role]: {
        ...permissions[role],
        [key]: !permissions[role]?.[key]
      }
    }
    setPermissions(updated)
  }

  const filtered = (users ?? []).filter((u) => roleFilter === 'all' || u.Role === roleFilter)

  return (
    <div className="p-4 sm:p-6 md:p-8 space-y-6">
      {/* Tab Navigation header */}
      <div className="flex border-b border-gray-200 dark:border-zinc-805">
        <button
          onClick={() => setActiveTab('users')}
          className={`px-5 py-3 text-sm font-semibold border-b-2 transition-all flex items-center gap-2 ${
            activeTab === 'users'
              ? 'border-blue-600 text-blue-600 dark:border-blue-500 dark:text-blue-400'
              : 'border-transparent text-gray-500 hover:text-gray-800 dark:hover:text-zinc-300'
          }`}
        >
          <Shield className="w-4 h-4" /> Manajemen Akun
        </button>
        <button
          onClick={() => setActiveTab('rbac')}
          className={`px-5 py-3 text-sm font-semibold border-b-2 transition-all flex items-center gap-2 ${
            activeTab === 'rbac'
              ? 'border-blue-600 text-blue-600 dark:border-blue-500 dark:text-blue-400'
              : 'border-transparent text-gray-500 hover:text-gray-800 dark:hover:text-zinc-300'
          }`}
        >
          <Lock className="w-4 h-4" /> Hak Akses Role (RBAC)
        </button>
      </div>

      {activeTab === 'users' && (
        <div className="bg-white dark:bg-zinc-900 rounded-lg border border-gray-200 dark:border-zinc-805 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-150 dark:border-zinc-850 flex items-center justify-between gap-4 flex-wrap bg-gray-50/30 dark:bg-zinc-955/10">
            <div>
              <h3 className="text-sm font-bold text-gray-900 dark:text-zinc-100 uppercase tracking-wider">Daftar Pengguna</h3>
              <p className="text-[11px] text-gray-500 dark:text-zinc-400 mt-0.5">{filtered.length} pengguna ditemukan</p>
            </div>
            <div className="flex gap-2">
              <select
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value)}
                className="text-xs rounded-md bg-white dark:bg-zinc-950 border border-gray-255 dark:border-zinc-800 px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-gray-700 dark:text-zinc-300 font-semibold transition-all"
              >
                <option value="all">Semua Peran</option>
                <option value="owner">Super Admin</option>
                <option value="cs_admin">CS Admin</option>
                <option value="technician">Teknisi</option>
              </select>
              <button
                onClick={() => {
                  const token = Math.random().toString(36).substring(2, 15)
                  const inviteUrl = `${window.location.origin}/auth/register-staff?token=${token}`
                  navigator.clipboard.writeText(inviteUrl)
                  toast.success('Tautan undangan pendaftaran staf berhasil disalin ke clipboard!')
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-gray-250 dark:border-zinc-800 text-gray-700 dark:text-zinc-300 text-xs font-semibold hover:bg-gray-50 dark:hover:bg-zinc-800 transition-all"
                title="Salin tautan pendaftaran mandiri untuk staf baru"
              >
                <Mail className="w-3.5 h-3.5 text-blue-500" /> Tautan Undangan
              </button>
              <button
                onClick={() => setShowModal(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold transition-all"
              >
                <Plus className="w-3.5 h-3.5" /> Tambah Pengguna
              </button>
            </div>
          </div>

          {isLoadingUsers ? <LoadingSpinner className="py-16" /> :
            !filtered.length ? <EmptyState /> : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="bg-gray-50/80 dark:bg-zinc-800/60 text-[10px] text-gray-500 dark:text-zinc-300 font-bold uppercase tracking-wider border-b border-gray-150 dark:border-zinc-700">
                      <th className="px-6 py-3 text-left">Nama & Email</th>
                      <th className="px-6 py-3 text-left">No. Telepon</th>
                      <th className="px-6 py-3 text-left">Peran</th>
                      <th className="px-6 py-3 text-center">Status</th>
                      <th className="px-6 py-3 text-left">Login Terakhir</th>
                      <th className="px-6 py-3 text-center">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-150 dark:divide-zinc-850">
                    {filtered.map((user) => (
                      <tr key={user.ID} className="hover:bg-gray-50/30 dark:hover:bg-zinc-800/10 transition-colors">
                        <td className="px-6 py-3.5">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-100 to-indigo-100 dark:from-blue-900/40 dark:to-indigo-900/40 flex items-center justify-center flex-shrink-0 border border-blue-200/40 dark:border-blue-900/30">
                              <span className="text-blue-700 dark:text-blue-400 font-bold text-xs uppercase">{user.FullName.charAt(0)}</span>
                            </div>
                            <div>
                              <p className="font-semibold text-gray-900 dark:text-zinc-100">{user.FullName}</p>
                              <p className="text-[10px] text-gray-400 dark:text-zinc-500">{user.Email ?? '-'}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-3.5 text-gray-600 dark:text-zinc-300 font-medium font-mono">{user.Phone}</td>
                        <td className="px-6 py-3.5">
                          <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full ${ROLE_COLORS[user.Role] ?? 'bg-zinc-100 text-zinc-700'}`}>
                            <Shield className="w-2.5 h-2.5" />
                            {ROLE_LABELS[user.Role] ?? user.Role}
                          </span>
                        </td>
                        <td className="px-6 py-3.5 text-center">
                          <button
                            onClick={() => user.Role !== 'owner' && toggleStatusMut.mutate(user.ID)}
                            disabled={user.Role === 'owner' || toggleStatusMut.isPending}
                            className={`inline-flex items-center gap-1 text-[10px] font-bold px-2.5 py-0.5 rounded-full transition-all ${
                              user.IsActive 
                                ? 'bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-100 dark:hover:bg-emerald-900/20 border border-emerald-500/10' 
                                : 'bg-red-50 dark:bg-red-950/20 text-red-500 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/20 border border-red-500/10'
                            } ${user.Role === 'owner' ? 'cursor-default' : 'cursor-pointer'}`}
                            title={user.Role === 'owner' ? 'Peran Super Admin tidak bisa dinonaktifkan' : 'Klik untuk mengubah status aktif'}
                          >
                            {user.IsActive ? <><UserCheck className="w-2.5 h-2.5" />Aktif</> : <><UserX className="w-2.5 h-2.5" />Nonaktif</>}
                          </button>
                        </td>
                        <td className="px-6 py-3.5 text-xs text-gray-500 dark:text-zinc-400 font-medium">{formatDateTime(user.LastLoginAt)}</td>
                        <td className="px-6 py-3.5 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              onClick={() => {
                                setEditTarget(user)
                                setShowModal(true)
                              }}
                              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md border border-gray-250 dark:border-zinc-800 text-xs font-semibold text-gray-750 dark:text-zinc-350 hover:bg-gray-50 dark:hover:bg-zinc-800 transition-all"
                              title="Perbarui data/role staf"
                            >
                              <Edit className="w-3 h-3 text-blue-500" /> Edit
                            </button>
                            <button
                              onClick={() => setResetTarget({ ID: user.ID, FullName: user.FullName })}
                              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md border border-gray-255 dark:border-zinc-800 text-xs font-semibold text-gray-750 dark:text-zinc-350 hover:bg-gray-50 dark:hover:bg-zinc-800 transition-all"
                              title="Reset kata sandi pengguna"
                            >
                              <Key className="w-3 h-3 text-amber-500" /> Reset Password
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
        </div>
      )}

      {activeTab === 'rbac' && (
        <div className="bg-white dark:bg-zinc-900 rounded-lg border border-gray-200 dark:border-zinc-805 p-6 space-y-6">
          <div className="flex items-center justify-between gap-4 flex-wrap pb-4 border-b border-gray-150 dark:border-zinc-850">
            <div>
              <h3 className="text-sm font-bold text-gray-900 dark:text-zinc-100 flex items-center gap-2 uppercase tracking-wider">
                <ShieldCheck className="w-5 h-5 text-blue-600" /> Hak Akses Role
              </h3>
              <p className="text-[11px] text-gray-500 dark:text-zinc-400 mt-1">
                Sesuaikan hak akses modul dashboard untuk tiap peran staf di sistem.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-gray-500 dark:text-zinc-400">Pilih Peran:</span>
              <select
                value={rbacRole}
                onChange={(e) => setRbacRole(e.target.value as any)}
                className="text-xs rounded-md bg-white dark:bg-zinc-955 border border-gray-255 dark:border-zinc-800 px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-gray-700 dark:text-zinc-300 font-semibold transition-all"
              >
                <option value="cs_admin">CS Admin</option>
                <option value="technician">Teknisi</option>
              </select>
            </div>
          </div>

          {isLoadingConfigs ? <LoadingSpinner className="py-16" /> : !permissions ? <EmptyState /> : (
            <div className="space-y-6">
              <div className="bg-blue-50/50 dark:bg-blue-950/10 border border-blue-200/50 dark:border-blue-900/30 rounded-md p-4 flex gap-3 text-xs text-blue-800 dark:text-blue-300">
                <Info className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold">Informasi Akses Default</p>
                  <p className="mt-1 leading-normal text-gray-500 dark:text-zinc-400">
                    Jika opsi di bawah dimatikan, modul menu di sidebar akan disembunyikan dan akses langsung ke halaman tersebut akan dicegah secara otomatis demi keamanan data.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {[
                  { key: 'dashboard', label: 'Dashboard Utama / Ringkasan', desc: 'Akses ke ringkasan pendaftaran baru, metrik statistik, dan performa utama.' },
                  { key: 'registrations', label: 'Registrasi Pelanggan', desc: 'Akses ke modul review pendaftaran masuk, validasi data, dan verifikasi KTP/titik lokasi.' },
                  { key: 'customers', label: 'Database Pelanggan', desc: 'Akses ke daftar pelanggan aktif yang telah terpasang di sistem.' },
                  { key: 'packages', label: 'Paket Internet', desc: 'Mengatur paket layanan internet, harga bulanan, kecepatan bandwidth, dan profil mikrotik.' },
                  { key: 'olt_ports', label: 'OLT Port Config', desc: 'Mengkonfigurasi port OLT, alokasi VLAN, dan parameter link OLT.' },
                  { key: 'mikrotik', label: 'Mikrotik Config', desc: 'Mengatur integrasi API Mikrotik, IP pool, dan server PPPoE.' },
                  { key: 'users', label: 'Manajemen User', desc: 'Mengelola data akun staf, status aktif/nonaktif, dan mereset kata sandi.' },
                  { key: 'activity_log', label: 'Log Aktivitas', desc: 'Melihat riwayat log perubahan status registrasi pelanggan.' },
                  { key: 'settings', label: 'Pengaturan & Branding', desc: 'Mengakses kustomisasi website, template notifikasi, dan alur provisioning OLT.' },
                ].map((m) => (
                  <div 
                    key={m.key} 
                    onClick={() => handlePermissionToggle(rbacRole, m.key)}
                    className={`p-4 rounded-md border transition-all cursor-pointer flex items-start justify-between gap-4 select-none ${
                      permissions[rbacRole]?.[m.key] !== false
                        ? 'bg-blue-50/40 border-blue-400/30 dark:bg-blue-950/10 dark:border-blue-900/40'
                        : 'bg-white dark:bg-zinc-950 border-gray-200 dark:border-zinc-800'
                    }`}
                  >
                    <div className="space-y-1">
                      <p className="text-xs font-semibold text-gray-900 dark:text-zinc-100">{m.label}</p>
                      <p className="text-[10px] text-gray-500 dark:text-zinc-500 leading-relaxed">{m.desc}</p>
                    </div>
                    <div className={`w-8 h-5 rounded-full p-0.5 transition-colors duration-200 flex items-center ${
                      permissions[rbacRole]?.[m.key] !== false ? 'bg-blue-600 justify-end' : 'bg-gray-205 dark:bg-zinc-800 justify-start'
                    }`}>
                      <div className="w-3.5 h-3.5 rounded-full bg-white shadow-sm" />
                    </div>
                  </div>
                ))}
              </div>

              <div className="pt-4 flex justify-end gap-2 border-t border-gray-150 dark:border-zinc-850">
                <button
                  onClick={() => setPermissions(DEFAULT_PERMISSIONS)}
                  className="px-3 py-1.5 rounded-md text-xs font-semibold border border-gray-255 dark:border-zinc-800 hover:bg-gray-50 dark:hover:bg-zinc-800 text-gray-700 dark:text-zinc-300 transition-all"
                >
                  Kembalikan ke Default
                </button>
                <button
                  onClick={() => saveRbacMut.mutate(permissions)}
                  disabled={saveRbacMut.isPending}
                  className="px-4 py-1.5 rounded-md bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold disabled:opacity-60 flex items-center gap-2 transition-all"
                >
                  {saveRbacMut.isPending ? (
                    <><Loader2 className="w-4 h-4 animate-spin" /> Menyimpan...</>
                  ) : (
                    <><Check className="w-4 h-4" /> Simpan Perubahan</>
                  )}
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {showModal && <UserModal user={editTarget} onClose={() => { setShowModal(false); setEditTarget(null) }} />}
      {resetTarget && (
        <ResetPasswordModal 
          user={resetTarget} 
          onClose={() => setResetTarget(null)} 
        />
      )}
    </div>
  )
}
