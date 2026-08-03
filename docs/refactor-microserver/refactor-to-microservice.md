# Blueprint Refactor ke Arsitektur Microservice yang Mudah Diperluas

Dokumen ini adalah indeks dari blueprint refactor yang telah dipisah menjadi beberapa bagian agar lebih mudah dibaca.

## Daftar dokumen

- [Refactor Microservice — Overview](refactor-microservice-overview.md)
- [Refactor Microservice — Architecture](refactor-microservice-architecture.md)
- [Refactor Microservice — Deployment](refactor-microservice-deployment.md)
- [Refactor Microservice — Go + React](refactor-microservice-go-react.md)

## Ringkasan singkat

Blueprint ini menekankan pendekatan bertahap: jangan langsung refactor semuanya sekaligus. Mulai dari fondasi, pisahkan domain yang paling jelas, lalu bangun platform agar penambahan service baru menjadi hal yang standar, bukan custom per project.

Dengan pola ini, proyek Anda bisa tumbuh dari monolith menjadi arsitektur yang lebih fleksibel tanpa harus melakukan rewrite besar-besaran.
