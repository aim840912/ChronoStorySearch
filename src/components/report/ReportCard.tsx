'use client'

import { useState, useCallback } from 'react'
import { useLanguage } from '@/contexts/LanguageContext'
import { reportService } from '@/lib/supabase/report-service'
import type { Report } from '@/types/report'
import { VideoPreview } from './VideoPreview'

interface ReportCardProps {
  report: Report
  isReviewer: boolean
  onReviewed?: () => void
}

/**
 * 單一檢舉卡片組件
 */
export function ReportCard({ report, isReviewer, onReviewed }: ReportCardProps) {
  const { t } = useLanguage()
  const [isReviewing, setIsReviewing] = useState(false)
  const [showVideo, setShowVideo] = useState(false)

  const handleReview = useCallback(async (status: 'confirmed' | 'rejected') => {
    setIsReviewing(true)
    try {
      await reportService.reviewReport(report.id, { status })
      onReviewed?.()
    } catch (err) {
      console.error('審核失敗:', err)
    } finally {
      setIsReviewing(false)
    }
  }, [report.id, onReviewed])

  // 狀態顏色
  const statusColors = {
    pending: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
    confirmed: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
    rejected: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
  }

  // 狀態標籤
  const statusLabels = {
    pending: t('report.status.pending'),
    confirmed: t('report.status.confirmed'),
    rejected: t('report.status.rejected'),
  }

  return (
    <div className="p-4 bg-white dark:bg-zinc-800 rounded-lg border border-zinc-200 dark:border-zinc-700 space-y-3">
      {/* 標題列 */}
      <div className="flex items-start justify-between gap-2">
        <div>
          <h3 className="font-medium text-zinc-900 dark:text-zinc-100">
            {report.reportedCharacter}
          </h3>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            {t('report.card.reportedBy')}: {report.reporterDiscord}
          </p>
        </div>
        <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusColors[report.status]}`}>
          {statusLabels[report.status]}
        </span>
      </div>

      {/* 檢舉說明 */}
      {report.description && (
        <p className="text-sm text-zinc-600 dark:text-zinc-300">
          {report.description}
        </p>
      )}

      {/* 影片預覽切換 */}
      <div>
        <button
          type="button"
          onClick={() => setShowVideo(!showVideo)}
          className="text-sm text-blue-500 hover:underline"
        >
          {showVideo ? t('report.card.hideVideo') : t('report.card.showVideo')}
        </button>
        {showVideo && (
          <div className="mt-2">
            <VideoPreview url={report.videoUrl} />
          </div>
        )}
      </div>

      {/* 影片連結 */}
      <div>
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
      </div>

      {/* 時間 */}
      <p className="text-xs text-zinc-400">
        {new Date(report.createdAt).toLocaleString()}
      </p>

      {/* 審核資訊 */}
      {report.reviewedAt && (
        <div className="pt-2 border-t border-zinc-200 dark:border-zinc-700">
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

      {/* 審核按鈕（僅 reviewer 且狀態為 pending） */}
      {isReviewer && report.status === 'pending' && (
        <div className="flex gap-2 pt-2 border-t border-zinc-200 dark:border-zinc-700">
          <button
            type="button"
            onClick={() => handleReview('confirmed')}
            disabled={isReviewing}
            className="flex-1 px-3 py-2 rounded-lg bg-red-500 text-white text-sm
                       hover:bg-red-600 disabled:opacity-50"
          >
            {t('report.review.confirm')}
          </button>
          <button
            type="button"
            onClick={() => handleReview('rejected')}
            disabled={isReviewing}
            className="flex-1 px-3 py-2 rounded-lg bg-green-500 text-white text-sm
                       hover:bg-green-600 disabled:opacity-50"
          >
            {t('report.review.reject')}
          </button>
        </div>
      )}
    </div>
  )
}
