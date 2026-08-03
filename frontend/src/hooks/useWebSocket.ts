import { useEffect, useCallback } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { useAuthStore } from '@/features/auth/store/useAuthStore'
import { useNotificationStore } from '@/stores/useNotificationStore'
import { STATUS_LABEL } from '@/lib/utils'

// Module-level singleton to survive React StrictMode double-mount
let globalWs: WebSocket | null = null
let globalReconnectTimeout: ReturnType<typeof setTimeout> | null = null

export function useWebSocket() {
  const queryClient = useQueryClient()
  const { accessToken, isAuthenticated } = useAuthStore()
  const { addNotification } = useNotificationStore()

  const buildWsUrl = useCallback((token: string): string => {
    const apiURL = import.meta.env.VITE_API_URL ?? ''
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
    let wsUrl: string
    if (apiURL.startsWith('http://') || apiURL.startsWith('https://')) {
      wsUrl = apiURL.replace(/^http/, 'ws').replace(/\/$/, '') + '/ws/dashboard'
    } else {
      const host = window.location.host
      const basePath = apiURL ? (apiURL.startsWith('/') ? apiURL : `/${apiURL}`) : '/api/v1'
      wsUrl = `${protocol}//${host}${basePath.replace(/\/$/, '')}/ws/dashboard`
    }
    return `${wsUrl}?token=${encodeURIComponent(token)}`
  }, [])

  useEffect(() => {
    if (!isAuthenticated || !accessToken) {
      closeGlobalWs()
      return
    }

    function connect() {
      if (
        globalWs &&
        (globalWs.readyState === WebSocket.OPEN ||
          globalWs.readyState === WebSocket.CONNECTING)
      ) {
        return
      }

      const url = buildWsUrl(accessToken!)
      const ws = new WebSocket(url)
      globalWs = ws

      ws.onopen = () => console.log('[WS] Connected to dashboard real-time stream')

      ws.onmessage = (event) => {
        try {
          const payload = JSON.parse(event.data as string) as {
            event: string
            data: Record<string, unknown> | string
          }
          const { event: evtType, data } = payload

          queryClient.invalidateQueries()

          if (evtType === 'registration_created') {
            const d = data as Record<string, unknown>
            const fullName = (d.FullName ?? '—') as string
            const regNumber = (d.RegNumber ?? '') as string
            addNotification({
              type: 'created',
              fingerprint: `created-${regNumber}`,
              title: 'Registrasi Baru',
              description: `${fullName} telah mendaftar sebagai calon pelanggan baru.`,
              fullName,
              regNumber,
              status: 'pending_review',
            })
            toast.info(`📋 Registrasi Baru: ${fullName}`, {
              description: `No. Reg: ${regNumber || '-'}`,
            })
          } else if (evtType === 'registration_updated') {
            const d = data as Record<string, unknown>
            const fullName = (d.FullName ?? '—') as string
            const rawStatus = (d.Status ?? '') as string
            const statusLabel = STATUS_LABEL[rawStatus] ?? rawStatus
            const regNumber = ((d.CustomerNumber ?? d.RegNumber ?? '') as string)
            addNotification({
              type: 'updated',
              fingerprint: `updated-${regNumber}-${rawStatus}`,
              title: 'Status Diperbarui',
              description: `${fullName}${regNumber ? ` [${regNumber}]` : ''} → ${statusLabel}`,
              fullName,
              regNumber,
              status: rawStatus,
            })
            toast.success(`🔄 Status Diperbarui: ${fullName}`, {
              description: `Status: ${statusLabel}`,
            })
          } else if (evtType === 'registration_deleted') {
            addNotification({
              type: 'deleted',
              fingerprint: `deleted-${Date.now()}`,
              title: 'Registrasi Dihapus',
              description: 'Data registrasi telah dihapus dari sistem.',
            })
            toast.error('🗑️ Data Registrasi Dihapus')
          }
        } catch (err) {
          console.error('[WS] Failed to parse message:', err)
        }
      }

      ws.onclose = (ev) => {
        console.log(`[WS] Disconnected (code=${ev.code})`)
        globalWs = null
        if (isAuthenticated && accessToken) {
          globalReconnectTimeout = setTimeout(connect, 3000)
        }
      }

      ws.onerror = () => ws.close()
    }

    connect()
  }, [accessToken, isAuthenticated, buildWsUrl, queryClient, addNotification])
}

function closeGlobalWs() {
  if (globalReconnectTimeout) {
    clearTimeout(globalReconnectTimeout)
    globalReconnectTimeout = null
  }
  if (globalWs) {
    globalWs.close()
    globalWs = null
  }
}

