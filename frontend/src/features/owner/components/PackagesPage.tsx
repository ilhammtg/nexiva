import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Loader2, Zap } from 'lucide-react'
import { ownerApi } from '../api/ownerApi'
import { LoadingSpinner, EmptyState } from '@/components/ui'
import { formatCurrency } from '@/lib/utils'
import type { Package } from '../types'
import { toast } from 'sonner'

type FormState = Partial<Package>

function PackageModal({
  pkg,
  onClose,
}: {
  pkg?: Package
  onClose: () => void
}) {
  const qc = useQueryClient()
  const [form, setForm] = useState<FormState>(
    pkg ?? {
      Name: '', Description: '', DeviceRecommendation: '', PriceMonthly: 0, PriceInstallation: 300000,
      SpeedDownMbps: 10, SpeedUpMbps: 10, MikrotikProfile: '',
      OLTLineProfileID: 1, OLTSrvProfileID: 1, VlanID: 100, IsActive: true, SortOrder: 0, Terms: '',
    }
  )

  const mut = useMutation({
    mutationFn: () =>
      pkg ? ownerApi.updatePackage(pkg.ID, form) : ownerApi.createPackage(form),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['packages'] })
      toast.success(pkg ? 'Paket diperbarui' : 'Paket ditambahkan')
      onClose()
    },
    onError: () => toast.error('Gagal menyimpan paket'),
  })

  const set = (key: keyof FormState, value: any) => setForm((f) => ({ ...f, [key]: value }))

  return (
    <div className="fixed inset-0 bg-black/45 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-zinc-900 border border-gray-205 dark:border-zinc-800 rounded-lg shadow-2xl w-full max-w-lg" onClick={(e) => e.stopPropagation()}>
        <div className="px-6 py-4 border-b border-gray-150 dark:border-zinc-850 flex items-center justify-between bg-gray-50/50 dark:bg-zinc-950/40">
          <h3 className="font-semibold text-sm text-gray-900 dark:text-zinc-100">{pkg ? 'Edit Paket' : 'Tambah Paket'}</h3>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-zinc-800 text-gray-450 transition-colors">✕</button>
        </div>
        <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
          {[
            { label: 'Nama Paket', key: 'Name', type: 'text', placeholder: 'Paket Home 20 Mbps' },
            { label: 'Deskripsi', key: 'Description', type: 'text', placeholder: 'Deskripsi paket...' },
            { label: 'Rekomendasi Perangkat', key: 'DeviceRecommendation', type: 'text', placeholder: 'Contoh: Cocok untuk 1-3 perangkat' },
          ].map(({ label, key, type, placeholder }) => (
            <div key={key}>
              <label className="block text-xs font-semibold text-gray-700 dark:text-zinc-300 mb-1.5">{label}</label>
              <input
                type={type}
                value={(form as any)[key] ?? ''}
                onChange={(e) => set(key as any, e.target.value)}
                placeholder={placeholder}
                className="w-full px-3.5 py-2.5 rounded-lg bg-gray-50 dark:bg-zinc-955 border border-gray-255 dark:border-zinc-800 text-gray-900 dark:text-zinc-100 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium placeholder-gray-400"
              />
            </div>
          ))}

          <div className="grid grid-cols-2 gap-4">
            {[
              { label: 'Harga Bulanan (Rp)', key: 'PriceMonthly' },
              { label: 'Biaya Pasang (Rp)', key: 'PriceInstallation' },
              { label: 'Speed Down (Mbps)', key: 'SpeedDownMbps' },
              { label: 'Speed Up (Mbps)', key: 'SpeedUpMbps' },
              { label: 'OLT Line Profile ID', key: 'OLTLineProfileID' },
              { label: 'OLT Srv Profile ID', key: 'OLTSrvProfileID' },
              { label: 'VLAN ID', key: 'VlanID' },
              { label: 'Urutan Tampil', key: 'SortOrder' },
            ].map(({ label, key }) => (
              <div key={key}>
                <label className="block text-[10px] font-bold text-gray-500 dark:text-zinc-400 mb-1 uppercase tracking-wider">{label}</label>
                <input
                  type="number"
                  value={(form as any)[key] ?? 0}
                  onChange={(e) => set(key as any, Number(e.target.value))}
                  className="w-full px-3.5 py-2.5 rounded-lg bg-gray-50 dark:bg-zinc-955 border border-gray-255 dark:border-zinc-800 text-gray-900 dark:text-zinc-100 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium"
                />
              </div>
            ))}
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 dark:text-zinc-300 mb-1.5">Mikrotik Profile Name</label>
            <input
              type="text"
              value={form.MikrotikProfile ?? ''}
              onChange={(e) => set('MikrotikProfile', e.target.value)}
              placeholder="Masukkan Kode Profil Mikrotik"
              className="w-full px-3.5 py-2.5 rounded-lg bg-gray-50 dark:bg-zinc-955 border border-gray-255 dark:border-zinc-800 text-gray-900 dark:text-zinc-100 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-mono font-medium placeholder-gray-400"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 dark:text-zinc-300 mb-1.5">
              Petunjuk Umum / Ketentuan Layanan (Pisahkan dengan baris baru untuk membuat poin list)
            </label>
            <textarea
              rows={3}
              value={form.Terms ?? ''}
              onChange={(e) => set('Terms', e.target.value)}
              placeholder="Contoh:&#10;Pembayaran pascapasang setelah Wifi terpasang&#10;Layanan unlimited tanpa FUP&#10;Biaya pasang dibayar sekali ke teknisi"
              className="w-full px-3.5 py-2.5 rounded-lg bg-gray-50 dark:bg-zinc-955 border border-gray-255 dark:border-zinc-800 text-gray-900 dark:text-zinc-100 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium placeholder-gray-400"
            />
          </div>

          <label className="flex items-center gap-3 cursor-pointer">
            <div
              onClick={() => set('IsActive', !form.IsActive)}
              className={`relative w-10 h-5.5 rounded-full transition-colors ${form.IsActive ? 'bg-blue-600' : 'bg-gray-250 dark:bg-zinc-800'}`}
            >
              <div className={`absolute top-0.5 left-0.5 w-4.5 h-4.5 bg-white dark:bg-zinc-300 rounded-full shadow transition-transform ${form.IsActive ? 'translate-x-4.5' : ''}`} />
            </div>
            <span className="text-xs text-gray-700 dark:text-zinc-400 font-semibold">Paket aktif (tampil di form publik)</span>
          </label>
        </div>
        <div className="px-6 py-4 border-t border-gray-150 dark:border-zinc-850 flex gap-3 justify-end bg-gray-50/50 dark:bg-zinc-955/40">
          <button onClick={onClose} className="px-4 py-2 rounded-lg text-xs text-gray-650 dark:text-zinc-400 hover:bg-gray-100 dark:hover:bg-zinc-800 font-semibold transition-colors">Batal</button>
          <button
            onClick={() => mut.mutate()}
            disabled={mut.isPending}
            className="px-5 py-2 rounded-lg bg-blue-600 text-white text-xs font-semibold hover:bg-blue-700 transition-colors disabled:opacity-60 flex items-center gap-2"
          >
            {mut.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
            Simpan
          </button>
        </div>
      </div>
    </div>
  )
}

export default function PackagesPage() {
  const qc = useQueryClient()
  const [modal, setModal] = useState<'new' | Package | null>(null)

  const { data: packages, isLoading } = useQuery({
    queryKey: ['packages'],
    queryFn: ownerApi.getPackages,
  })

  const toggleMut = useMutation({
    mutationFn: ownerApi.deletePackage,
    onSuccess: () => { 
      qc.invalidateQueries({ queryKey: ['packages'] })
      toast.success('Status aktif paket berhasil diperbarui') 
    },
    onError: () => toast.error('Gagal memperbarui status paket'),
  })

  return (
    <div className="p-4 sm:p-6 md:p-8 space-y-6 w-full">
      <div className="bg-white dark:bg-zinc-900 rounded-lg border border-gray-200 dark:border-zinc-805 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-150 dark:border-zinc-850 flex items-center justify-between bg-gray-50/50 dark:bg-zinc-950/40">
          <div>
            <h3 className="text-sm font-semibold text-gray-900 dark:text-zinc-100">Paket Internet</h3>
            <p className="text-xs text-gray-500 dark:text-zinc-400">{packages?.length ?? 0} paket terdaftar</p>
          </div>
          <button
            onClick={() => setModal('new')}
            className="flex items-center gap-1.5 px-4 py-2 rounded-md bg-blue-600 text-white text-xs font-semibold hover:bg-blue-700 transition-colors"
          >
            <Plus className="w-4 h-4" /> Tambah Paket
          </button>
        </div>

        {isLoading ? (
          <LoadingSpinner className="py-16" />
        ) : !packages?.length ? (
          <EmptyState message="Belum ada paket internet" />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-gray-50/80 dark:bg-zinc-800/60 text-gray-500 dark:text-zinc-300 font-semibold uppercase tracking-wider border-b border-gray-200 dark:border-zinc-700">
                  <th className="px-5 py-3 text-left">NAMA PAKET</th>
                  <th className="px-5 py-3 text-center">SPEED DOWN / UP</th>
                  <th className="px-5 py-3 text-right">HARGA BULANAN</th>
                  <th className="px-5 py-3 text-right">BIAYA PASANG</th>
                  <th className="px-5 py-3 text-center">PROFIL & VLAN</th>
                  <th className="px-5 py-3 text-center">STATUS</th>
                  <th className="px-5 py-3 text-center">AKSI</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-150 dark:divide-zinc-800/45">
                {packages.map((pkg) => (
                  <tr
                    key={pkg.ID}
                    className={`hover:bg-gray-50/40 dark:hover:bg-zinc-800/20 transition-colors group ${
                      !pkg.IsActive ? 'opacity-65' : ''
                    }`}
                  >
                    {/* Package Name & Desc */}
                    <td className="px-5 py-4">
                      <div>
                        <div className="flex items-center gap-2">
                          <Zap className={`w-3.5 h-3.5 ${pkg.IsActive ? 'text-blue-600 dark:text-blue-400' : 'text-gray-400'}`} />
                          <span className="font-bold text-gray-900 dark:text-zinc-100">{pkg.Name}</span>
                        </div>
                        <p className="text-[11px] text-gray-450 dark:text-zinc-450 mt-1">{pkg.Description}</p>
                      </div>
                    </td>

                    {/* Speed Down / Up */}
                    <td className="px-5 py-4 text-center font-mono font-semibold text-gray-700 dark:text-zinc-350">
                      ↓ {pkg.SpeedDownMbps} Mbps / ↑ {pkg.SpeedUpMbps} Mbps
                    </td>

                    {/* Price Monthly */}
                    <td className="px-5 py-4 text-right font-mono font-bold text-blue-650 dark:text-blue-400">
                      {formatCurrency(pkg.PriceMonthly)}
                    </td>

                    {/* Installation Price */}
                    <td className="px-5 py-4 text-right font-mono text-gray-655 dark:text-zinc-400">
                      {formatCurrency(pkg.PriceInstallation)}
                    </td>

                    {/* MK Profile & VLAN */}
                    <td className="px-5 py-4 text-center font-mono text-[11px] text-gray-500">
                      Profile: <span className="font-bold text-gray-700 dark:text-zinc-300">{pkg.MikrotikProfile || '-'}</span>
                      <span className="mx-1.5">•</span>
                      VLAN: <span className="font-bold text-gray-700 dark:text-zinc-300">{pkg.VlanID}</span>
                    </td>

                    {/* Status Active */}
                    <td className="px-5 py-4 text-center">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                          pkg.IsActive
                            ? 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-100/60 dark:border-emerald-900/30'
                            : 'bg-gray-100 dark:bg-zinc-800 text-gray-500 dark:text-zinc-400 border-gray-200 dark:border-zinc-700'
                        }`}
                      >
                        {pkg.IsActive ? 'AKTIF' : 'NONAKTIF'}
                      </span>
                    </td>

                    {/* Actions */}
                    <td className="px-5 py-4 text-center">
                      <div className="flex justify-center items-center gap-1.5">
                        <button
                          onClick={() => setModal(pkg)}
                          className="px-2 py-1 rounded border border-gray-200 dark:border-zinc-800 text-gray-500 hover:text-blue-600 dark:text-zinc-400 dark:hover:text-blue-400 hover:bg-blue-50/50 dark:hover:bg-blue-950/30 transition-colors"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => toggleMut.mutate(pkg.ID)}
                          disabled={toggleMut.isPending}
                          className={`px-2 py-1 rounded border font-semibold transition-all disabled:opacity-50 ${
                            pkg.IsActive
                              ? 'border-amber-100 dark:border-amber-900/20 text-amber-600 dark:text-amber-400 hover:bg-amber-50/50 dark:hover:bg-amber-950/20'
                              : 'border-emerald-100 dark:border-emerald-900/20 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50/50 dark:hover:bg-emerald-950/20'
                          }`}
                        >
                          {toggleMut.isPending && toggleMut.variables === pkg.ID ? 'Memproses...' : pkg.IsActive ? 'Nonaktifkan' : 'Aktifkan'}
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

      {modal && (
        <PackageModal
          pkg={modal === 'new' ? undefined : modal}
          onClose={() => setModal(null)}
        />
      )}
    </div>
  )
}
