export interface SelectOption {
  label: string
  value: string
}

export interface WSMessage<T = unknown> {
  event: string
  registration_id: string
  data: T
  timestamp: string
}

export type WSEventName =
  | 'provisioning.started'
  | 'provisioning.mikrotik_done'
  | 'provisioning.olt_done'
  | 'provisioning.completed'
  | 'provisioning.failed'
  | 'registration.status_changed'
