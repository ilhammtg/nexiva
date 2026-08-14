export interface Package {
  ID: string
  Name: string
  Description: string
  DeviceRecommendation?: string
  PriceMonthly: number
  PriceInstallation: number
  SpeedDownMbps: number
  SpeedUpMbps: number
  MikrotikProfile: string
  OLTLineProfileID: number
  OLTSrvProfileID: number
  VlanID: number
  IsActive: boolean
  SortOrder: number
  Terms?: string
  CreatedAt: string
  UpdatedAt: string
}

export interface OLTPortConfig {
  ID: string
  Name: string
  AreaName: string
  OLTHost: string
  OLTPortSSH: number
  GponSlot: number
  GponPort: number
  MaxONT: number
  CurrentONTCount: number
  IsActive: boolean
  Notes: string
  CreatedAt: string
  UpdatedAt: string
}



export interface ODP {
  id: string
  code: string
  name: string
  olt_port_config_id: string | null
  total_ports: number
  used_ports: number
  latitude: number
  longitude: number
  address_notes: string
  created_at: string
  updated_at: string
}

export interface MikrotikConfig {
  id: string
  name: string
  host: string
  port: number
  username: string
  is_active: boolean
  is_online: boolean | null
  last_checked_at: string | null
  created_at: string
  updated_at: string
}

export interface Registration {
  ID: string
  RegNumber: string
  CustomerNumber: string | null
  CustomerID: string | null
  FullName: string
  NIK: string
  Phone: string
  Email: string | null
  Province: string
  City: string
  District: string
  Village: string
  RT: string | null
  RW: string | null
  AddressDetail: string
  MapsLat: number | null
  MapsLng: number | null
  PackageID: string
  Status: string
  CSUserID: string | null
  TechnicianID: string | null
  SurveyScheduledAt: string | null
  SurveyDoneAt: string | null
  InstallationScheduledAt: string | null
  ActivatedAt: string | null
  InstallationFee: number | null
  PaymentAmount: number | null
  PaymentDate: string | null
  PaymentBank: string | null
  SurveyNotes: string | null
  SurveyIsFeasible: boolean | null
  SurveyCableLengthM: number | null
  PPPoEUsername: string | null
  PPPoEPassword: string | null
  ONTSerialNumber: string | null
  ONTIndex: number | null
  OLTPortConfigID: string | null
  RejectionReason: string | null
  InternalNotes: string | null
  ODPInfo: string | null
  GoogleMapsLink: string | null
  KTPFilePath: string | null
  ONTPhotoPath: string | null
  ServiceExpiresAt: string | null
  CreatedAt: string
  UpdatedAt: string
}

export interface DashboardStats {
  total: number
  by_status: Record<string, number>
  active_this_month: number
  pending_count: number
}

export interface SystemUser {
  ID: string
  FullName: string
  Email: string | null
  Phone: string
  Role: string
  IsActive: boolean
  LastLoginAt: string | null
  CreatedAt: string
}
