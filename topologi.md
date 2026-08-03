# DOKUMENTASI TOPOLOGI JARRINGAN HYBRID (FTTH - HTB - MULTI WAN)*Dokumentasi Teknis Infrastruktur Jaringan Distribusi Pusat & Cabang*
---## 1. STRUKTUR UTAMA & MANAJEMEN BANDWIDTH (CORE LAYER)Pada bagian hulu (Pusat), jaringan dikendalikan oleh Router Utama Mikrotik Pusat yang menggabungkan dua sumber internet untuk didistribusikan ke jaringan OLT.
### Alur Distribusi Utama:*   **Multi-WAN (Load Balancing):** 
    *   **ISP 1 (Utama):** Masuk ke port WAN 1 Mikrotik Pusat.
    *   **ISP 2 (Tambahan):** Masuk via ONU ISP B ke port WAN 2 Mikrotik Pusat.
    *   *Sistem:* Bandwidth digabungkan di Mikrotik menggunakan metode PCC/ECMP.*   **Core Switch ke OLT Pusat:**
    *   Mikrotik melakukan *VLAN Tagging* (Contoh: VLAN 100 untuk PPPoE, VLAN 200 untuk Hotspot).
    *   Koneksi dialirkan melalui kabel *Uplink* (Gigabit Ethernet/SFP) menuju **OLT ZTE Pusat**.
---## 2. DETAIL SEKTOR DISTRIBUSI (DISTRIBUTION & ACCESS LAYER)
Jaringan distribusi dibagi menjadi 4 skema karena kondisi geografis dan pengembangan area yang bervariasi.
### 🗺️ Skema 1: OLT Cascade (Estafet OLT ke OLT via ONU)Skema perluasan area tanpa menarik kabel *backbone* baru langsung dari Mikrotik Pusat.


[OLT ZTE PUSAT]
│ (Kabel FO - Splitter Pasif)
▼
[ONU A (Distribusi)] <-- Diatur Mode Bridge (VLAN Trunk/Pass-through)
│ (Kabel LAN RJ45 - Wajib Gigabit)
▼
[OLT B (Cabang)] <-- Menerima VLAN dari OLT Pusat via ONU A
│ (Kabel FO - Splitter)
▼
[Rumah-Rumah User]

*   **Catatan Konfigurasi:** ONU A dipasang dalam **Mode Bridge** dengan fitur *VLAN Transparent/Trunk*. Port LAN ONU langsung masuk ke port *Uplink* OLT B tanpa perlu Mikrotik tambahan di titik ini.

---

### 🗺️ Skema 2: Segmen Hybrid FO-Tembaga (Media Converter HTB)
Skema hemat biaya untuk area padat penduduk dengan jarak pendek menggunakan konverter media.


[OLT PUSAT / CABANG]
│
▼
[ONU Distribusi] <-- Mengeluarkan VLAN Hotspot/PPPoE (Mode Bridge)
│ (Kabel LAN Short Patch Cord)
▼
[HTB Switch 6 Port] <-- Sisi A (Pusat Distribusi Kampung)
│
├─ (1 Core FO) ─> [HTB 1 Port Sisi B] ─> [Router TP-Link User (PPPoE)]
├─ (1 Core FO) ─> [HTB 1 Port Sisi B] ─> [Router TP-Link User (PPPoE)]
└─ (1 Core FO) ─> [HTB 1 Port Sisi B] ─> [Router TP-Link User (PPPoE)]

*   **Catatan Konfigurasi:** HTB bersifat *Unmanaged*, sehingga VLAN dari ONU Distribusi diteruskan secara utuh (*Pass-through*) hingga ke port WAN Router TP-Link di rumah pelanggan. Router pelanggan bertindak sebagai *PPPoE Client*.

---

### 🗺️ Skema 3: Sektor Estafet SFP Mikrotik & Double Cascade OLT
Sektor paling kompleks yang menggunakan Mikrotik Cabang sebagai pos kontrol tengah jalan sebelum disebar kembali.


[OLT PUSAT] ──> [ONU Distribusi]
│
▼
[Mikrotik Cabang 1]
│ (SFP Out - Link FO Murni)
▼
[Mikrotik Cabang 2] (SFP In)
│ (Uplink)
▼
[OLT Cabang B]
│
▼
[ONU Pelanggan / Repeater]
│ (Kabel LAN)
▼
[OLT Cabang C] ──> [User Akhir]

*   **Fungsi Struktur:** Mikrotik Cabang 1 & 2 berfungsi sebagai *repeater data pintar* dan filter lalu lintas jaringan. Di OLT Cabang B, terdapat ONU yang kembali dijadikan jembatan (colok LAN langsung) ke *Uplink* OLT Cabang C.

---

## 3. PEMETAAN TRAFIK VLAN (LOGICAL LOG)
Untuk mencegah tabrakan data (*broadcast storm*), segmentasi jaringan diatur sebagai berikut:

| Nama Layanan | VLAN ID | Sumber Server | Target Distribusi |
| :--- | :--- | :--- | :--- |
| **VLAN PPPoE** | VLAN 100 | Mikrotik Pusat | Rumah User (TP-Link via HTB / OLT) |
| **VLAN Hotspot** | VLAN 200 | Mikrotik Pusat | Voucheran / Akses Poin Area |
| **VLAN Management**| VLAN 99 | Mikrotik Pusat | Remote Akses OLT Pusat, OLT B, OLT C |

---

## 4. ANALISIS KERAWANAN & STANDAR OPERASIONAL (SOP)

Mengingat topologi ini sangat panjang dan bertingkat (*cascade*), titik-titik berikut wajib diawasi ketat:

1.  **Potensi Bottleneck Port ONU:**
    *   *Masalah:* ONU Distribusi pada Skema 1 dan Skema 3 menampung traffic dari seluruh OLT di bawahnya.
    *   *Solusi:* Pastikan ONU tersebut menggunakan tipe **Giga Port (GE)** dan kabel LAN kategori **Cat6**. Jika user di bawahnya sudah di atas 50 KK, pertimbangkan mengganti jalur ini dengan *Kabel FO Backbone langsung* (interkoneksi SFP).
2.  **Bahaya Loop Jaringan di Skema HTB:**
    *   *Masalah:* HTB Switch tidak punya fitur *Loop Protection*. Jika pelanggan salah colok kabel di TP-Link mereka, satu segmen OLT bisa mati (*RTO Massal*).
    *   *Solusi:* Aktifkan fitur **Loop Protect** di port Mikrotik yang mengarah ke jaringan tersebut, dan aktifkan **Isolate Port** pada OLT jika tersedia.
3.  **Akumulasi Redaman Optik (Optical Budget):**
    *   *Masalah:* Estafet FO pasif yang terlalu panjang membuat redaman drop di ujung area.
    *   *Solusi:* Batasi redaman maksimal di angka **-24 dBm** s/d **-25 dBm** pada ONU yang bertindak sebagai *Uplink* OLT Cabang agar transmisi data tetap stabil dan tidak *packet loss*.

## note : OLT dibawah repeater punya merek yang berbeda-beda tidak cuma ZTE tapi ada HIOSO, VSOL, dll.

## keamanan diabaikan dulu
