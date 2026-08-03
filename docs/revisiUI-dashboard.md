Role & Objective:
Bertindaklah sebagai Senior Frontend Developer dan UI/UX Expert. Tolong refactor dan perbaiki kode komponen antarmuka (UI) dashboard dari gambar yang saya lampirkan. 

Saat ini tampilannya terlihat seperti "AI slop" dengan efek neon, kontras warna yang terlalu mencolok, outline tebal, dan penggunaan ikon yang berlebihan. Tujuan utama adalah merombak kode ini agar terlihat sangat profesional, elegan, clean, dan setara dengan desain enterprise modern (seperti Vercel, Stripe, atau Linear). Gunakan Tailwind CSS untuk styling.

Terapkan aturan desain dan palet warna berikut ini dengan sangat ketat:

1. Palet Warna (Gunakan skema ini untuk menggantikan warna bawaan):
Dark Mode (Gunakan spektrum Zinc/Neutral, BUKAN biru pekat/neon):
- Background App: #0a0a0a (bg-zinc-950)
- Background Card/Surface: #171717 (bg-zinc-900)
- Border & Separator: #262626 (border-zinc-800)
- Text Primary (Judul): #ededed (text-zinc-100)
- Text Secondary (Label, IP, Sub-judul): #a1a1aa (text-zinc-400)
- Tombol/Aksi Primary: #2563eb (biru solid, tanpa efek glow)
- Status UP/P1: #10b981 (hijau emerald)
- Status DOWN: #ef4444
- Status WARNING: #f59e0b

Light Mode (Bersih, kontras tinggi, shadow lembut):
- Background App/Sidebar: #f9fafb (bg-gray-50)
- Background Card/Surface: #ffffff (bg-white)
- Border & Separator: #e5e7eb (border-gray-200)
- Text Primary: #111827 (text-gray-900)
- Text Secondary: #6b7280 (text-gray-500)
- Tombol/Aksi Primary: #2563eb
- Status UP/P1: #059669
- Status DOWN: #dc2626
- Status WARNING: #d97706

2. Ikonografi & Dekorasi (Minimalis):
- HAPUS ikon dekoratif berukuran besar yang tidak perlu (seperti ikon chip di judul "MANAGEMENT OLT"). Biarkan tipografi tebal yang mengatur hierarki.
- Gunakan icon set bergaris tipis dan profesional (seperti Lucide Icons).
- Jangan menempelkan ikon di setiap tab atau teks jika tidak ada fungsi konteksnya.

3. Border, Shadow & Efek Visual:
- Hapus semua outline tebal bercahaya (terutama pada card "PERANGKAT OLT" dan tab aktif).
- Dark mode: Gunakan border 1px super halus (border-zinc-800) tanpa drop-shadow.
- Light mode: Gunakan shadow sangat lembut (shadow-sm) dipadu border tipis.
- Untuk state "Aktif" pada Tab (seperti ZTE-PUSAT), jangan gunakan border biru. Gunakan background muted (contoh: bg-zinc-800 di dark mode, bg-gray-100 di light mode).

4. Tipografi, Whitespace & Badge:
- Berikan padding yang lega di dalam card (misal p-6). Jangan buat elemen saling berdesakan.
- Gunakan hierarki font (font-semibold untuk judul, font-medium text-sm untuk label) alih-alih memasukkan semua teks ke dalam kotak/border.
- Perkecil ukuran badge status (UP/WARNING/DOWN), gunakan styling rounded-full, dan buat warnanya lebih kalem (muted), bukan solid yang menyilaukan.
- Tombol aksi sekunder (seperti "Reload Data") sebaiknya menggunakan style ghost atau outline halus, bukan blok warna penuh.

Berikan saya kode komponen yang sudah diperbarui secara lengkap, pastikan mendukung toggle Dark/Light mode bawaan Tailwind (class 'dark:').