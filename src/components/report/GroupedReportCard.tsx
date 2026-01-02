'use client'

import { useState, useCallback } from 'react'
import { useLanguage } from '@/contexts/LanguageContext'
import { reportService } from '@/lib/supabase/report-service'
import type { GroupedReport } from '@/types/report'
import { VideoPreview } from './VideoPreview'

interface GroupedReportCardProps {
  group: GroupedReport
  isReviewer: boolean
  onReviewed?: () => void
}

/**
 * 分組檢舉卡片組件
 * 顯示同一被檢舉角色的所有檢舉，支援展開/收合和批量審核
 */
export function GroupedReportCard({ group, isReviewer, onReviewed }: GroupedReportCardProps) {
  const { t } = useLanguage()
  const [isExpanded, setIsExpanded] = useState(false)
  const [isBulkReviewing, setIsBulkReviewing] = useState(false)
  const [expandedVideoId, setExpandedVideoId] = useState<string | null>(null)

  // 批量審核（只審核 pending 狀態的檢舉）
  const handleBulkReview = useCallback(async (status: 'confirmed' | 'rejected') => {
    const pendingReports = group.reports.filter(r => r.status === 'pending')
    if (pendingReports.length === 0) return

    setIsBulkReviewing(true)
    try {
      // 依序審核所有 pending 的檢舉
      await Promise.all(
        pendingReports.map(report =>
          reportService.reviewReport(report.id, { status })
        )
      )
      onReviewed?.()
    } catch (err) {
      console.error('批量審核失敗:', err)
    } finally {
      setIsBulkReviewing(false)
    }
  }, [group.reports, onReviewed])

  // 狀態顏色
  const statusColors = {
    pending: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
    confirmed: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
    rejected: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
  }

  const statusLabels = {
    pending: t('report.status.pending'),
    confirmed: t('report.status.confirmed'),
    rejected: t('report.status.rejected'),
  }

  const pendingCount = group.statusCounts.pending

  return (
    <div className="bg-white dark:bg-zinc-800 rounded-lg border border-zinc-200 dark:border-zinc-700 overflow-hidden">
      {/* 摘要區塊（始終顯示） */}
      <div className="p-4 space-y-3">
        {/* 標題列 */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-lg text-zinc-900 dark:text-zinc-100 truncate">
              {group.reportedCharacter}
            </h3>
            <p className="text-sm text-zinc-500 dark:text-zinc-400">
              {t('report.grouped.reportCount', { count: group.totalCount })}
            </p>
          </div>
          {/* 狀態統計 */}
          <div className="flex flex-wrap gap-1 justify-end">
            {group.statusCounts.pending > 0 && (
              <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusColors.pending}`}>
                {group.statusCounts.pending} {statusLabels.pending}
              </span>
            )}
            {group.statusCounts.confirmed > 0 && (
              <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusColors.confirmed}`}>
                {group.statusCounts.confirmed} {statusLabels.confirmed}
              </span>
            )}
            {group.statusCounts.rejected > 0 && (
              <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusColors.rejected}`}>
                {group.statusCounts.rejected} {statusLabels.rejected}
              </span>
            )}
          </div>
        </div>

        {/* 檢舉者列表 */}
        <p className="text-sm text-zinc-600 dark:text-zinc-300">
          <span className="text-zinc-500 dark:text-zinc-400">{t('report.grouped.reporters')}: </span>
          {group.reporters.join(', ')}
        </p>

        {/* 最新檢舉時間 */}
        <p className="text-xs text-zinc-400">
          {t('report.grouped.latestReport')}: {new Date(group.latestReportAt).toLocaleString()}
        </p>

        {/* 操作按鈕 */}
        <div className="flex flex-wrap gap-2 pt-2">
          {/* 展開/收合按鈕 */}
          <button
            type="button"
            onClick={() => setIsExpanded(!isExpanded)}
            className="px-3 py-1.5 rounded-lg text-sm border border-zinc-300 dark:border-zinc-600
                       text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-700
                       transition-colors flex items-center gap-1"
          >
            <svg
              className={`w-4 h-4 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
            {isExpanded ? t('report.grouped.collapse') : t('report.grouped.expand')}
          </button>

          {/* 批量審核按鈕（僅 reviewer 且有 pending） */}
          {isReviewer && pendingCount > 0 && (
            <>
              <button
                type="button"
                onClick={() => handleBulkReview('confirmed')}
                disabled={isBulkReviewing}
                className="px-3 py-1.5 rounded-lg text-sm bg-red-500 text-white
                           hover:bg-red-600 disabled:opacity-50 transition-colors"
              >
                {t('report.grouped.bulkConfirm', { count: pendingCount })}
              </button>
              <button
                type="button"
                onClick={() => handleBulkReview('rejected')}
                disabled={isBulkReviewing}
                className="px-3 py-1.5 rounded-lg text-sm bg-green-500 text-white
                           hover:bg-green-600 disabled:opacity-50 transition-colors"
              >
                {t('report.grouped.bulkReject', { count: pendingCount })}
              </button>
            </>
          )}
        </div>
      </div>

      {/* 展開的詳細檢舉列表 */}
      {isExpanded && (
        <div className="border-t border-zinc-200 dark:border-zinc-700">
          {group.reports.map((report, index) => (
            <div
              key={report.id}
              className={`p-4 ${
                index > 0 ? 'border-t border-zinc-100 dark:border-zinc-700/50' : ''
              }`}
            >
              {/* 檢舉項目標題 */}
              <div className="flex items-start justify-between gap-2 mb-2">
                <div>
                  <p className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                    {t('report.card.reportedBy')}: {report.reporterDiscord}
                  </p>
                  <p className="text-xs text-zinc-400">
                    {new Date(report.createdAt).toLocaleString()}
                  </p>
                </div>
                <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusColors[report.status]}`}>
                  {statusLabels[report.status]}
                </span>
              </div>

              {/* 檢舉說明 */}
              {report.description && (
                <p className="text-sm text-zinc-600 dark:text-zinc-300 mb-2">
                  {report.description}
                </p>
              )}

              {/* 影片預覽切換 */}
              <div className="mb-2">
                <button
                  type="button"
                  onClick={() => setExpandedVideoId(expandedVideoId === report.id ? null : report.id)}
                  className="text-sm text-blue-500 hover:underline"
                >
                  {expandedVideoId === report.id ? t('report.card.hideVideo') : t('report.card.showVideo')}
                </button>
                {expandedVideoId === report.id && (
                  <div className="mt-2">
                    <VideoPreview url={report.videoUrl} />
                  </div>
                )}
              </div>

              {/* 影片連結 */}
              <a
                href={report.videoUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-blue-500 hover:underline break-all"
              >
                {report.videoUrl.length > 60
                  ? `${report.videoUrl.slice(0, 60)}...`
                  : report.videoUrl}
              </a>

              {/* 審核資訊 */}
              {report.reviewedAt && (
                <div className="mt-2 pt-2 border-t border-zinc-100 dark:border-zinc-700/50">
                  <p className="text-xs text-zinc-500 dark:text-zinc-400">
                    {t('report.card.reviewedAt')}: {new Date(report.reviewedAt).toLocaleString()}
                  </p>
                  {report.reviewNote && (
                    <p className="text-sm text-zinc-600 dark:text-zinc-300 mt-1">
                      {report.reviewNote}
                    </p>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
