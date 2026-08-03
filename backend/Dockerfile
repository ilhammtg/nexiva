## ─── Stage 1: Build ──────────────────────────────────────────
FROM golang:1.24-alpine AS builder

WORKDIR /app

# Install git (needed by go mod)
RUN apk add --no-cache git

# Download deps first (layer cache)
COPY go.mod go.sum ./
RUN go mod download

# Copy source & build static binary
COPY . .
RUN CGO_ENABLED=0 GOOS=linux go build \
    -ldflags="-w -s" \
    -o server \
    cmd/server/main.go

## ─── Stage 2: Runtime ────────────────────────────────────────
FROM alpine:3.19

WORKDIR /app

# ca-certificates: untuk HTTPS ke Mikrotik & webhook
# tzdata: timezone support
RUN apk add --no-cache ca-certificates tzdata curl

ENV TZ=Asia/Jakarta

# Copy binary and migrations from builder
COPY --from=builder /app/server .
COPY --from=builder /app/migrations ./migrations

# Copy entrypoint script
COPY docker-entrypoint.sh .
RUN chmod +x docker-entrypoint.sh

# Create uploads directory
RUN mkdir -p ./uploads/ktp

EXPOSE 8080

ENTRYPOINT ["./docker-entrypoint.sh"]
CMD ["./server"]
