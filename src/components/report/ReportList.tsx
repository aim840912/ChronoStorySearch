'use client'

import { useState, useEffect, useCallback } from 'react'
import { useLanguage } from '@/contexts/LanguageContext'
import { reportService } from '@/lib/supabase/report-service'
import type { Report, ReportStatus } from '@/types/report'
import { ReportCard } from './ReportCard'

interface ReportListProps {
  isReviewer: boolean
  showMyReports?: boolean
}

/**
 * 檢舉列表組件
 */
export function ReportList({ isReviewer, showMyReports = false }: ReportListProps) {
  const { t } = useLanguage()
  const [reports, setReports] = useState<Report[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState<ReportStatus | 'all'>('all')

  const loadReports = useCallback(async () => {
    setIsLoading(true)
    try {
      const filters = statusFilter !== 'all' ? { status: statusFilter } : undefined

      if (showMyReports) {
        // 顯示自己的檢舉
        const { data } = await reportService.getMyReports(50, 0)
        setReports(statusFilter !== 'all'
          ? data.filter(r => r.status === statusFilter)
          : data
        )
      } else if (isReviewer) {
        // Reviewer 可以看所有檢舉
        const { data } = await reportService.getReports(filters, 50, 0)
        setReports(data)
      } else {
        // 一般用戶只能看自己的
        const { data } = await reportService.getMyReports(50, 0)
        setReports(statusFilter !== 'all'
          ? data.filter(r => r.status === statusFilter)
          : data
        )
      }
    } catch (err) {
      console.error('載入檢舉列表失敗:', err)
    } finally {
      setIsLoading(false)
    }
  }, [isReviewer, showMyReports, statusFilter])

  useEffect(() => {
    loadReports()
  }, [loadReports])

  const handleReviewed = useCallback(() => {
    loadReports()
  }, [loadReports])

  // 狀態篩選按鈕
  const statusOptions: { value: ReportStatus | 'all'; label: string }[] = [
    { value: 'all', label: t('report.filter.all') },
    { value: 'pending', label: t('report.filter.pending') },
    { value: 'confirmed', label: t('report.filter.confirmed') },
    { value: 'rejected', label: t('report.filter.rejected') },
  ]

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin w-6 h-6 border-2 border-zinc-300 border-t-blue-500 rounded-full" />
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* 狀態篩選 */}
      <div className="flex flex-wrap gap-2">
        {statusOptions.map((option) => (
          <button
            key={option.value}
            type="button"
            onClick={() => setStatusFilter(option.value)}
            className={`px-3 py-1.5 rounded-lg text-sm transition-colors
              ${statusFilter === option.value
                ? 'bg-blue-500 text-white'
                : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-700'
              }`}
          >
            {option.label}
          </button>
        ))}
      </div>

      {/* 檢舉列表 */}
      {reports.length === 0 ? (
        <div className="text-center py-8 text-zinc-500 dark:text-zinc-400">
          {t('report.empty')}
        </div>
      ) : (
        <div className="space-y-3">
          {reports.map((report) => (
            <ReportCard
              key={report.id}
              report={report}
              isReviewer={isReviewer}
              onReviewed={handleReviewed}
            />
          ))}
        </div>
      )}
    </div>
  )
}
