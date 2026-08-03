import React from 'react'
import { cn, STATUS_LABEL } from '@/lib/utils'

export function StatusBadge({ status }: { status: string }) {
  const themeColors: Record<string, string> = {
    pending_review: 'bg-yellow-50 text-yellow-750 border-yellow-250 dark:bg-yellow-500/10 dark:text-yellow-400 dark:border-yellow-500/20',
    survey_scheduled: 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-500/10 dark:text-blue-400 dark:border-blue-500/20',
    survey_done: 'bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-500/10 dark:text-indigo-400 dark:border-indigo-500/20',
    survey_failed: 'bg-red-50 text-red-700 border-red-200 dark:bg-red-500/10 dark:text-red-400 dark:border-red-500/20',
    survey_pending: 'bg-amber-50 text-amber-700 border-amber-205 dark:bg-amber-500/10 dark:text-amber-400 dark:border-amber-500/20',
    rejected: 'bg-red-50 text-red-700 border-red-200 dark:bg-red-500/10 dark:text-red-400 dark:border-red-500/20',
    waiting_payment: 'bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-500/10 dark:text-orange-400 dark:border-orange-500/20',
    payment_confirmed: 'bg-cyan-50 text-cyan-700 border-cyan-200 dark:bg-cyan-500/10 dark:text-cyan-400 dark:border-cyan-500/20',
    installation_scheduled: 'bg-purple-50 text-purple-750 border-purple-200 dark:bg-purple-500/10 dark:text-purple-400 dark:border-purple-500/20',
    provisioning: 'bg-violet-50 text-violet-750 border-violet-200 dark:bg-violet-500/10 dark:text-violet-400 dark:border-violet-500/20',
    provisioning_failed: 'bg-red-50 text-red-700 border-red-200 dark:bg-red-500/10 dark:text-red-400 dark:border-red-500/20',
    active: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-450 dark:border-emerald-500/20',
  }

  const colorClass = themeColors[status] ?? 'bg-zinc-100 text-zinc-700 border-zinc-200 dark:bg-zinc-800 dark:text-zinc-300 dark:border-zinc-700'

  return (
    <span className={cn(
      'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border transition-colors duration-200',
      colorClass
    )}>
      {STATUS_LABEL[status] ?? status}
    </span>
  )
}

export function StatCard({
  title, value, subtitle, icon, color = 'blue', trend,
}: {
  title: string
  value: string | number
  subtitle?: string
  icon: React.ReactNode
  color?: 'blue' | 'green' | 'orange' | 'red' | 'purple' | 'indigo' | 'teal'
  trend?: { value: number; label: string }
}) {
  const iconColors = {
    blue: 'bg-blue-50 dark:bg-blue-950/30 text-blue-600 dark:text-blue-400 border border-blue-100/50 dark:border-blue-900/20',
    green: 'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400 border border-emerald-100/50 dark:border-emerald-900/20',
    orange: 'bg-orange-50 dark:bg-orange-950/30 text-orange-600 dark:text-orange-400 border border-orange-100/50 dark:border-orange-900/20',
    red: 'bg-rose-50 dark:bg-rose-950/30 text-rose-600 dark:text-rose-450 border border-rose-100/50 dark:border-rose-900/20',
    purple: 'bg-purple-50 dark:bg-purple-950/30 text-purple-600 dark:text-purple-400 border border-purple-100/50 dark:border-purple-900/20',
    indigo: 'bg-indigo-50 dark:bg-indigo-950/30 text-indigo-600 dark:text-indigo-400 border border-indigo-100/50 dark:border-indigo-900/20',
    teal: 'bg-teal-50 dark:bg-teal-950/30 text-teal-600 dark:text-teal-400 border border-teal-100/50 dark:border-teal-900/20',
  }

  return (
    <div className="bg-white dark:bg-zinc-900 rounded-lg p-5 border border-gray-200 dark:border-zinc-805 transition-all duration-300 group">
      {/* Icon */}
      <div className={cn(
        'w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 transition-transform duration-300 group-hover:scale-105 shadow-sm',
        iconColors[color]
      )}>
        <div className="w-4 h-4">{icon}</div>
      </div>

      {/* Info Content */}
      <div className="flex-1 min-w-0 mt-3">
        <p className="text-[11.5px] font-semibold text-gray-400 dark:text-zinc-500 uppercase tracking-wider leading-none">
          {title}
        </p>
        <p className="text-2xl sm:text-[26px] font-bold text-gray-900 dark:text-zinc-100 mt-2 leading-none tracking-tight">
          {value}
        </p>
        {(trend || subtitle) && (
          <div className="flex items-center gap-1.5 mt-2">
            {trend && (
              <span className={cn(
                'text-[10px] font-bold px-1.5 py-0.5 rounded flex items-center gap-0.5 leading-none',
                trend.value >= 0
                  ? 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                  : 'bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400'
              )}>
                {trend.value >= 0 ? '↑' : '↓'} {Math.abs(trend.value)}%
              </span>
            )}
            {subtitle && (
              <span className="text-[11px] text-gray-400 dark:text-zinc-500 font-medium truncate leading-none">
                {subtitle}
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

export function LoadingSpinner({ className }: { className?: string }) {
  return (
    <div className={cn('flex items-center justify-center', className)}>
      <div className="w-8 h-8 border-3 border-blue-500/20 border-t-blue-600 rounded-full animate-spin" />
    </div>
  )
}

export function EmptyState({ message = 'Tidak ada data' }: { message?: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-gray-400 dark:text-zinc-650">
      <div className="w-16 h-16 bg-gray-50 dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-full flex items-center justify-center mb-3">
        <svg className="w-8 h-8 text-gray-300 dark:text-zinc-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
        </svg>
      </div>
      <p className="text-sm font-medium">{message}</p>
    </div>
  )
}
