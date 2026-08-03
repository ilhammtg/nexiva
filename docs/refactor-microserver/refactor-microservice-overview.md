# Refactor Microservice — Overview

Dokumen ini adalah panduan awal untuk mengubah sistem saat ini menjadi arsitektur yang lebih modular dan mudah diperluas.

## Tujuan

Tujuan utama bukan langsung menjadi microservice penuh dalam satu langkah, tetapi membangun fondasi agar:

- service baru bisa ditambahkan dengan cepat
- tiap domain punya batas tanggung jawab yang jelas
- perubahan pada satu domain tidak mengganggu domain lain
- deployment dan scaling bisa dilakukan per service
- arsitektur bisa berkembang dari modular monolith ke service-oriented secara bertahap

## Prinsip dasar

- Satu service, satu tanggung jawab utama
- Data ownership per service
- Komunikasi antar service harus jelas
- Contract-first untuk API dan event
- Standar yang sama untuk semua service

## Target arsitektur

Komponen utama yang akan terbentuk:

- Frontend React
- API Gateway
- Auth Service
- Registration Service
- Provisioning Service
- Notification Service
- Message Broker seperti NATS
- Database per service
- Observability stack

## Roadmap singkat

1. Siapkan fondasi dan shared library
2. Pisahkan Auth Service
3. Pisahkan Registration Service
4. Pisahkan Provisioning Service
5. Pisahkan Notification Service
6. Tambahkan API Gateway dan observability

## Kesimpulan singkat

Pendekatan bertahap lebih aman daripada refactor besar-besaran. Mulai dari fondasi, pisahkan domain yang paling jelas, lalu bangun platform agar penambahan service baru menjadi hal yang standar.
