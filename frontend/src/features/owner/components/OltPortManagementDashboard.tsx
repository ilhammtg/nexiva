import React, { useState, useMemo } from 'react'
import {
  Server,
  Layers,
  Cpu,
  Search,
  Thermometer,
  Zap,
  Users
} from 'lucide-react'

// ---- Model Definitions ----
export interface PortData {
  slotNumber: number
  portNumber: number
  portType: 'PON' | 'UPLINK' | string
  status: 'UP' | 'DOWN' | 'WARNING' | string
  txPowerDbm: number
  temperatureCelsius: number
  totalOntConnected: number
  totalOntOnline: number
}

export type OltBrand = 'zte' | 'vsol' | 'hioso' | string

export interface OltDeviceItem {
  id: string
  name: string
  brand: OltBrand
  model: string
  ipAddress: string
  portCount: number
  status: 'ONLINE' | 'OFFLINE'
  ports: PortData[]
}

export function BrandBadge({ brand }: { brand: OltBrand }) {
  const normalized = brand.toLowerCase()

  if (normalized.includes('zte')) {
    return (
      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20 shadow-sm">
        <Cpu className="w-3.5 h-3.5" />
        ZTE — Modular
      </span>
    )
  }

  if (normalized.includes('vsol')) {
    return (
      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20 shadow-sm">
        <Server className="w-3.5 h-3.5" />
        VSOL — Pizza Box
      </span>
    )
  }

  if (normalized.includes('hioso')) {
    return (
      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 shadow-sm">
        <Layers className="w-3.5 h-3.5" />
        HIOSO — Pizza Box
      </span>
    )
  }

  return (
    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-slate-500/10 text-slate-600 dark:text-slate-400 border border-slate-500/20">
      {brand.toUpperCase()}
    </span>
  )
}

// ---- Custom Interactive Tooltip Wrapper ----
interface PortTooltipProps {
  port: PortData
  children: React.ReactNode
}

function PortTooltip({ port, children }: PortTooltipProps) {
  const [isOpen, setIsOpen] = useState(false)

  const formattedPower = port.txPowerDbm > 0 ? `+${port.txPowerDbm.toFixed(1)} dBm` : `${port.txPowerDbm.toFixed(1)} dBm`

  return (
    <div
      className="relative group/tooltip flex items-center justify-center"
      onMouseEnter={() => setIsOpen(true)}
      onMouseLeave={() => setIsOpen(false)}
      onClick={() => setIsOpen(!isOpen)}
    >
      {children}

      {/* Tooltip Popup */}
      <div
        className={`absolute bottom-full mb-2 z-50 w-56 p-3 bg-slate-900/95 dark:bg-slate-950 text-white rounded-xl shadow-xl border border-slate-800 backdrop-blur-md transition-all duration-200 pointer-events-none ${
          isOpen ? 'opacity-100 scale-100 translate-y-0' : 'opacity-0 scale-95 translate-y-1'
        }`}
      >
        <div className="flex items-center justify-between border-b border-slate-800 pb-1.5 mb-2">
          <span className="font-bold text-xs text-blue-400 font-mono tracking-wide">
            {port.portType} {port.portNumber} (Slot {port.slotNumber})
          </span>
          <span
            className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
              port.status === 'UP'
                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                : port.status === 'WARNING'
                ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                : 'bg-slate-700 text-slate-300'
            }`}
          >
            {port.status}
          </span>
        </div>

        <div className="space-y-1 text-[11px] font-mono text-slate-300">
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-1 text-slate-400">
              <Zap className="w-3 h-3 text-amber-400" /> SFP TX Power:
            </span>
            <span className="font-semibold text-white">{formattedPower}</span>
          </div>

          <div className="flex items-center justify-between">
            <span className="flex items-center gap-1 text-slate-400">
              <Thermometer className="w-3 h-3 text-rose-400" /> Temperatur SFP:
            </span>
            <span className="font-semibold text-white">{port.temperatureCelsius}°C</span>
          </div>

          <div className="flex items-center justify-between">
            <span className="flex items-center gap-1 text-slate-400">
              <Users className="w-3 h-3 text-cyan-400" /> ONU Connected:
            </span>
            <span className="font-semibold text-emerald-400">
              {port.totalOntOnline} <span className="text-slate-400">/ {port.totalOntConnected}</span>
            </span>
          </div>
        </div>

        {/* Tooltip Pointer */}
        <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-slate-900/95" />
      </div>
    </div>
  )
}

// ---- Dummy Initial Data for Demonstration ----
const INITIAL_DEVICES: OltDeviceItem[] = [
  {
    id: 'olt-1',
    name: 'OLT-PUSAT-STO-1',
    brand: 'zte',
    model: 'C320',
    ipAddress: '192.168.10.1',
    portCount: 16,
    status: 'ONLINE',
    ports: [
      { slotNumber: 1, portNumber: 1, portType: 'PON', status: 'UP', txPowerDbm: 4.5, temperatureCelsius: 42.0, totalOntConnected: 50, totalOntOnline: 45 },
      { slotNumber: 1, portNumber: 2, portType: 'PON', status: 'UP', txPowerDbm: 4.2, temperatureCelsius: 41.5, totalOntConnected: 48, totalOntOnline: 44 },
      { slotNumber: 1, portNumber: 3, portType: 'PON', status: 'WARNING', txPowerDbm: 1.8, temperatureCelsius: 58.0, totalOntConnected: 32, totalOntOnline: 20 },
      { slotNumber: 1, portNumber: 4, portType: 'PON', status: 'DOWN', txPowerDbm: 0.0, temperatureCelsius: 30.0, totalOntConnected: 0, totalOntOnline: 0 },
      { slotNumber: 2, portNumber: 1, portType: 'PON', status: 'UP', txPowerDbm: 4.8, temperatureCelsius: 39.0, totalOntConnected: 64, totalOntOnline: 62 },
      { slotNumber: 2, portNumber: 2, portType: 'PON', status: 'UP', txPowerDbm: 4.6, temperatureCelsius: 40.2, totalOntConnected: 60, totalOntOnline: 58 },
      { slotNumber: 2, portNumber: 3, portType: 'PON', status: 'UP', txPowerDbm: 4.4, temperatureCelsius: 41.0, totalOntConnected: 55, totalOntOnline: 51 },
      { slotNumber: 2, portNumber: 4, portType: 'UPLINK', status: 'UP', txPowerDbm: 7.2, temperatureCelsius: 37.5, totalOntConnected: 1, totalOntOnline: 1 },
    ],
  },
  {
    id: 'olt-2',
    name: 'OLT-VSOL-TIMUR',
    brand: 'vsol',
    model: 'V1600D4',
    ipAddress: '192.168.10.21',
    portCount: 8,
    status: 'ONLINE',
    ports: [
      { slotNumber: 1, portNumber: 1, portType: 'PON', status: 'UP', txPowerDbm: 4.1, temperatureCelsius: 40.0, totalOntConnected: 30, totalOntOnline: 28 },
      { slotNumber: 1, portNumber: 2, portType: 'PON', status: 'UP', txPowerDbm: 4.0, temperatureCelsius: 40.5, totalOntConnected: 25, totalOntOnline: 25 },
      { slotNumber: 1, portNumber: 3, portType: 'PON', status: 'UP', txPowerDbm: 3.9, temperatureCelsius: 41.0, totalOntConnected: 22, totalOntOnline: 20 },
      { slotNumber: 1, portNumber: 4, portType: 'PON', status: 'DOWN', txPowerDbm: 0.0, temperatureCelsius: 28.0, totalOntConnected: 0, totalOntOnline: 0 },
      { slotNumber: 1, portNumber: 5, portType: 'UPLINK', status: 'UP', txPowerDbm: 6.5, temperatureCelsius: 36.0, totalOntConnected: 1, totalOntOnline: 1 },
      { slotNumber: 1, portNumber: 6, portType: 'UPLINK', status: 'UP', txPowerDbm: 6.5, temperatureCelsius: 36.5, totalOntConnected: 1, totalOntOnline: 1 },
    ],
  },
  {
    id: 'olt-3',
    name: 'OLT-HIOSO-BARAT',
    brand: 'hioso',
    model: 'HA7304',
    ipAddress: '192.168.10.33',
    portCount: 4,
    status: 'ONLINE',
    ports: [
      { slotNumber: 1, portNumber: 1, portType: 'PON', status: 'UP', txPowerDbm: 3.8, temperatureCelsius: 41.5, totalOntConnected: 16, totalOntOnline: 15 },
      { slotNumber: 1, portNumber: 2, portType: 'PON', status: 'UP', txPowerDbm: 4.1, temperatureCelsius: 42.0, totalOntConnected: 24, totalOntOnline: 22 },
      { slotNumber: 1, portNumber: 3, portType: 'PON', status: 'WARNING', txPowerDbm: 2.1, temperatureCelsius: 52.0, totalOntConnected: 10, totalOntOnline: 7 },
      { slotNumber: 1, portNumber: 4, portType: 'UPLINK', status: 'UP', txPowerDbm: 5.8, temperatureCelsius: 38.0, totalOntConnected: 1, totalOntOnline: 1 },
    ],
  },
]

export default function OltPortManagementDashboard() {
  const [devices] = useState<OltDeviceItem[]>(INITIAL_DEVICES)
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>(INITIAL_DEVICES[0].id)
  const [searchVal, setSearchVal] = useState('')

  const selectedDevice = useMemo(() => {
    return devices.find((d) => d.id === selectedDeviceId) ?? devices[0]
  }, [devices, selectedDeviceId])

  // Determine if OLT is Modular (ZTE) or Pizza Box (VSOL, HIOSO or Single Slot)
  const slotsMap = useMemo(() => {
    if (!selectedDevice) return {}
    const map: Record<number, PortData[]> = {}
    selectedDevice.ports.forEach((p) => {
      if (!map[p.slotNumber]) {
        map[p.slotNumber] = []
      }
      map[p.slotNumber].push(p)
    })
    return map
  }, [selectedDevice])

  const slotNumbers = Object.keys(slotsMap).map(Number).sort((a, b) => a - b)
  const isModularZte = selectedDevice.brand.toLowerCase().includes('zte') && slotNumbers.length > 1

  return (
    <div className="p-6 md:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Header Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-800 dark:text-white tracking-tight flex items-center gap-2.5">
            <Cpu className="w-7 h-7 text-blue-600 dark:text-blue-400" />
            OLT Port Management Dashboard
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Monitoring multi-brand OLT telemetry (ZTE, VSOL, HIOSO) dengan layout adaptif
          </p>
        </div>
      </div>

      {/* Master-Detail Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Master List of OLTs (4 cols) */}
        <div className="lg:col-span-4 space-y-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm p-4 space-y-3">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <h3 className="font-bold text-sm text-slate-800 dark:text-white flex items-center gap-2">
                <Server className="w-4 h-4 text-blue-500" /> OLT Devices ({devices.length})
              </h3>
            </div>

            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                value={searchVal}
                onChange={(e) => setSearchVal(e.target.value)}
                placeholder="Cari OLT..."
                className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="space-y-2 max-h-[600px] overflow-y-auto pr-1">
              {devices
                .filter((d) => d.name.toLowerCase().includes(searchVal.toLowerCase()) || d.ipAddress.includes(searchVal))
                .map((dev) => {
                  const isSelected = dev.id === selectedDeviceId
                  return (
                    <div
                      key={dev.id}
                      onClick={() => setSelectedDeviceId(dev.id)}
                      className={`p-3.5 rounded-xl border transition-all cursor-pointer ${
                        isSelected
                          ? 'bg-blue-50/80 dark:bg-blue-950/40 border-blue-300 dark:border-blue-700 shadow-sm'
                          : 'bg-white dark:bg-slate-900 border-slate-100 dark:border-slate-800/80 hover:border-slate-300 dark:hover:border-slate-700'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1.5">
                        <span className={`font-bold text-sm ${isSelected ? 'text-blue-700 dark:text-blue-300' : 'text-slate-800 dark:text-slate-200'}`}>
                          {dev.name}
                        </span>
                        <BrandBadge brand={dev.brand} />
                      </div>

                      <div className="flex items-center justify-between text-xs text-slate-400 font-mono mt-1">
                        <span>{dev.ipAddress}</span>
                        <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                          {dev.ports.length} Ports
                        </span>
                      </div>
                    </div>
                  )
                })}
            </div>
          </div>
        </div>

        {/* Right Column: Detail View of Selected OLT (8 cols) */}
        <div className="lg:col-span-8 space-y-6">
          {selectedDevice && (
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm p-6 space-y-6">
              {/* Detail Device Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-800 pb-5">
                <div>
                  <div className="flex items-center gap-3">
                    <h2 className="text-xl font-black text-slate-800 dark:text-white">
                      {selectedDevice.name}
                    </h2>
                    <BrandBadge brand={selectedDevice.brand} />
                  </div>
                  <p className="text-xs text-slate-400 font-mono mt-1">
                    IP Address: {selectedDevice.ipAddress} | Model: {selectedDevice.model}
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    ONLINE
                  </span>
                </div>
              </div>

              {/* Port Status Legend */}
              <div className="flex items-center gap-4 text-xs font-semibold text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-slate-800/50 p-3 rounded-xl">
                <span className="text-slate-400 font-bold uppercase tracking-wider text-[10px]">Status Legend:</span>
                <div className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded-md bg-emerald-500" />
                  <span>UP</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded-md bg-amber-500" />
                  <span>WARNING</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded-md bg-slate-300 dark:bg-slate-700" />
                  <span>DOWN</span>
                </div>
              </div>

              {/* Adaptive Grid Rendering */}
              {isModularZte ? (
                /* MULTI-SLOT (Modular ZTE) */
                <div className="space-y-6">
                  {slotNumbers.map((slotNum) => (
                    <div key={slotNum} className="space-y-3">
                      <div className="flex items-center gap-2 border-b border-slate-100 dark:border-slate-800/80 pb-2">
                        <span className="px-2.5 py-1 bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 font-bold text-xs rounded-lg font-mono">
                          SLOT {slotNum}
                        </span>
                        <span className="text-xs text-slate-400">({slotsMap[slotNum].length} Ports)</span>
                      </div>

                      <div className="grid grid-cols-4 sm:grid-cols-8 md:grid-cols-12 lg:grid-cols-16 gap-2">
                        {slotsMap[slotNum].map((port) => (
                          <PortTooltip key={`${port.slotNumber}-${port.portNumber}`} port={port}>
                            <div
                              className={`h-12 w-full rounded-xl flex flex-col items-center justify-center cursor-pointer transition-all duration-200 transform hover:scale-105 shadow-sm font-mono text-xs font-bold ${
                                port.status === 'UP'
                                  ? 'bg-emerald-500 text-white hover:bg-emerald-600 shadow-emerald-500/20'
                                  : port.status === 'WARNING'
                                  ? 'bg-amber-500 text-white hover:bg-amber-600 shadow-amber-500/20'
                                  : 'bg-slate-200 dark:bg-slate-700 text-slate-500 dark:text-slate-400 hover:bg-slate-300 dark:hover:bg-slate-600'
                              }`}
                            >
                              <span>P{port.portNumber}</span>
                              <span className="text-[9px] opacity-80">{port.portType}</span>
                            </div>
                          </PortTooltip>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                /* SINGLE SLOT / PIZZA BOX (VSOL & HIOSO) */
                <div className="space-y-3">
                  <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800/80 pb-2">
                    <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                      ALL PORTS ({selectedDevice.ports.length} PON & UPLINK)
                    </span>
                  </div>

                  <div className="grid grid-cols-4 sm:grid-cols-8 md:grid-cols-12 lg:grid-cols-16 gap-2">
                    {selectedDevice.ports.map((port) => (
                      <PortTooltip key={`${port.slotNumber}-${port.portNumber}`} port={port}>
                        <div
                          className={`h-12 w-full rounded-xl flex flex-col items-center justify-center cursor-pointer transition-all duration-200 transform hover:scale-105 shadow-sm font-mono text-xs font-bold ${
                            port.status === 'UP'
                              ? 'bg-emerald-500 text-white hover:bg-emerald-600 shadow-emerald-500/20'
                              : port.status === 'WARNING'
                              ? 'bg-amber-500 text-white hover:bg-amber-600 shadow-amber-500/20'
                              : 'bg-slate-200 dark:bg-slate-700 text-slate-500 dark:text-slate-400 hover:bg-slate-300 dark:hover:bg-slate-600'
                          }`}
                        >
                          <span>P{port.portNumber}</span>
                          <span className="text-[9px] opacity-80">{port.portType}</span>
                        </div>
                      </PortTooltip>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
