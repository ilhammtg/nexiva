import { create } from 'zustand'

export interface Notification {
  id: string
  fingerprint: string // dedup key: hash of event+regNumber+status
  type: 'created' | 'updated' | 'deleted'
  title: string
  description: string
  timestamp: Date
  read: boolean
  regNumber?: string
  fullName?: string
  status?: string
}

interface NotificationStore {
  notifications: Notification[]
  unreadCount: number
  addNotification: (n: Omit<Notification, 'id' | 'timestamp' | 'read' | 'fingerprint'> & { fingerprint: string }) => void
  markAllRead: () => void
  markRead: (id: string) => void
  clear: () => void
}

export const useNotificationStore = create<NotificationStore>((set) => ({
  notifications: [],
  unreadCount: 0,

  addNotification: (n) => {
    set((s) => {
      // Deduplicate: ignore if same fingerprint exists within the last 2 seconds
      const now = Date.now()
      const isDuplicate = s.notifications.some(
        (existing) =>
          existing.fingerprint === n.fingerprint &&
          now - existing.timestamp.getTime() < 2000
      )
      if (isDuplicate) return s

      const newNotif: Notification = {
        ...n,
        id: `${now}-${Math.random().toString(36).slice(2)}`,
        timestamp: new Date(),
        read: false,
      }
      const notifications = [newNotif, ...s.notifications].slice(0, 50)
      return { notifications, unreadCount: s.unreadCount + 1 }
    })
  },

  markRead: (id) => {
    set((s) => {
      const notifications = s.notifications.map((n) =>
        n.id === id ? { ...n, read: true } : n
      )
      return { notifications, unreadCount: notifications.filter((n) => !n.read).length }
    })
  },

  markAllRead: () => {
    set((s) => ({
      notifications: s.notifications.map((n) => ({ ...n, read: true })),
      unreadCount: 0,
    }))
  },

  clear: () => set({ notifications: [], unreadCount: 0 }),
}))
