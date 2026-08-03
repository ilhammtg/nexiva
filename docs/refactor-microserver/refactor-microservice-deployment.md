# Refactor Microservice — Deployment

Bagian ini fokus pada blueprint deployment menggunakan Docker Compose untuk development dan Kubernetes untuk production.

## Deployment awal dengan Docker Compose

Diagram konseptual:

```mermaid
flowchart LR
    U[User] --> FE[React Frontend]
    FE --> GW[API Gateway]
    GW --> AUTH[Auth Service]
    GW --> REG[Registration Service]
    GW --> PROV[Provisioning Service]
    GW --> NOTIF[Notification Service]

    REG --> NATS[NATS]
    PROV --> NATS
    NOTIF --> NATS
```

Komponen yang disarankan:

- frontend: React/Vite container
- gateway: reverse proxy atau Go service
- auth-service, registration-service, provisioning-service, notification-service: container terpisah
- NATS: event bus
- PostgreSQL dan Redis: masing-masing bisa dipakai per service atau terpisah dengan schema berbeda

## Deployment matang dengan Kubernetes

Komponen utama:

- Ingress / Load Balancer
- Deployment per service
- Service per deployment
- ConfigMap / Secret
- StatefulSet untuk PostgreSQL dan Redis bila perlu
- HPA untuk scaling otomatis

Diagram konseptual:

```mermaid
flowchart TB
    IN[Ingress] --> GW[Gateway Service]
    GW --> AUTH[Auth Deployment]
    GW --> REG[Registration Deployment]
    GW --> PROV[Provisioning Deployment]
    GW --> NOTIF[Notification Deployment]
```

## Prinsip operasional

Setiap service sebaiknya punya:

- Dockerfile sendiri
- health endpoint
- structured logging
- metrics endpoint
- retry policy untuk consumer event
- autoscaling dasar
