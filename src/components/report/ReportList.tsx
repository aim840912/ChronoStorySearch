'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { useLanguage } from '@/contexts/LanguageContext'
import { reportService } from '@/lib/supabase/report-service'
import type { Report, ReportStatus, ReportFilters, ReportViewMode } from '@/types/report'
import { groupReportsByCharacter } from '@/types/report'
import { ReportCard } from './ReportCard'
import { GroupedReportCard } from './GroupedReportCard'
import { ViewModeToggle } from './ViewModeToggle'

// 搜尋類型
type SearchType = 'all' | 'reporter' | 'reported'

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

  // 搜尋相關狀態
  const [searchQuery, setSearchQuery] = useState('')
  const [searchType, setSearchType] = useState<SearchType>('all')
  const [debouncedQuery, setDebouncedQuery] = useState('')

  // 視圖模式（預設平鋪）
  const [viewMode, setViewMode] = useState<ReportViewMode>('flat')

  // 是否顯示搜尋和視圖切換（僅 reviewer 在 All Reports 時顯示）
  const showSearch = isReviewer && !showMyReports

  // 分組後的資料（僅在分組模式時計算）
  const groupedReports = useMemo(() => {
    if (viewMode !== 'grouped') return []
    return groupReportsByCharacter(reports)
  }, [reports, viewMode])

  // Debounce 搜尋輸入
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(searchQuery)
    }, 300)
    return () => clearTimeout(timer)
  }, [searchQuery])

  // 搜尋類型選項
  const searchTypeOptions = useMemo(() => [
    { value: 'all' as const, label: t('report.search.all') },
    { value: 'reporter' as const, label: t('report.search.reporter') },
    { value: 'reported' as const, label: t('report.search.reported') },
  ], [t])

  const loadReports = useCallback(async () => {
    setIsLoading(true)
    try {
      // 建構篩選條件
      const filters: ReportFilters = {}
      if (statusFilter !== 'all') {
        filters.status = statusFilter
      }
      // 搜尋條件（僅 reviewer 在 All Reports 時使用）
      if (showSearch && debouncedQuery.trim()) {
        const query = debouncedQuery.trim()
        if (searchType === 'reporter') {
          filters.reporterDiscord = query
        } else if (searchType === 'reported') {
          filters.reportedCharacter = query
        } else {
          // searchType === 'all': 同時搜尋兩個欄位（前端過濾）
          filters.reporterDiscord = query
        }
      }

      if (showMyReports) {
        // 顯示自己的檢舉
        const { data } = await reportService.getMyReports(50, 0)
        setReports(statusFilter !== 'all'
          ? data.filter(r => r.status === statusFilter)
          : data
        )
      } else if (isReviewer) {
        // Reviewer 可以看所有檢舉
        let { data } = await reportService.getReports(
          Object.keys(filters).length > 0 ? filters : undefined,
          50,
          0
        )

        // 如果是「全部」搜尋，需要額外查詢被檢舉角色並合併結果
        if (showSearch && debouncedQuery.trim() && searchType === 'all') {
          const { data: reportedData } = await reportService.getReports(
            { ...filters, reporterDiscord: undefined, reportedCharacter: debouncedQuery.trim() },
            50,
            0
          )
          // 合併並去重
          const mergedIds = new Set(data.map(r => r.id))
          for (const report of reportedData) {
            if (!mergedIds.has(report.id)) {
              data.push(report)
            }
          }
          // 依建立時間排序
          data.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        }

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
  }, [isReviewer, showMyReports, statusFilter, showSearch, debouncedQuery, searchType])

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
      {/* 搜尋區塊（僅 reviewer 在 All Reports 顯示） */}
      {showSearch && (
        <div className="flex flex-col gap-2">
          {/* 搜尋列 + 視圖切換 */}
          <div className="flex flex-col sm:flex-row gap-2">
            {/* 搜尋輸入框 */}
            <div className="relative flex-1">
              <svg
                className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={t('report.search.placeholder')}
                className="w-full pl-10 pr-3 py-2 rounded-lg border border-zinc-300 dark:border-zinc-600
                           bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100
                           focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              )}
            </div>
            {/* 搜尋類型選擇 */}
            <select
              value={searchType}
              onChange={(e) => setSearchType(e.target.value as SearchType)}
              className="px-3 py-2 rounded-lg border border-zinc-300 dark:border-zinc-600
                         bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100
                         focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm
                         sm:w-auto w-full"
            >
              {searchTypeOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            {/* 視圖模式切換 */}
            <ViewModeToggle viewMode={viewMode} onViewModeChange={setViewMode} />
          </div>
        </div>
      )}

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
      ) : viewMode === 'grouped' && showSearch ? (
        // 分組檢視（僅 reviewer 在 All Reports 時可用）
        <div className="space-y-3">
          {groupedReports.map((group) => (
            <GroupedReportCard
              key={group.reportedCharacter}
              group={group}
              isReviewer={isReviewer}
              onReviewed={handleReviewed}
            />
          ))}
        </div>
      ) : (
        // 平鋪檢視（預設）
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
