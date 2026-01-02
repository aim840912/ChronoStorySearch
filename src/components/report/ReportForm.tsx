'use client'

import { useState, useCallback } from 'react'
import { useLanguage } from '@/contexts/LanguageContext'
import { useAuth } from '@/contexts/AuthContext'
import { reportService } from '@/lib/supabase/report-service'
import { getVideoType } from '@/types/report'
import { VideoPreview } from './VideoPreview'

interface ReportFormProps {
  onSuccess?: () => void
  onCancel?: () => void
}

/**
 * 檢舉表單組件
 */
export function ReportForm({ onSuccess, onCancel }: ReportFormProps) {
  const { t } = useLanguage()
  const { user } = useAuth()

  const [videoUrl, setVideoUrl] = useState('')
  const [reportedCharacter, setReportedCharacter] = useState('')
  const [description, setDescription] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // 從 user metadata 取得 Discord 用戶名（開發模式下使用預設值）
  const discordUsername = user?.user_metadata?.full_name ||
    user?.user_metadata?.name ||
    user?.user_metadata?.preferred_username ||
    (process.env.NODE_ENV === 'development' ? 'Dev User' : '')

  // 驗證影片網址
  const videoType = videoUrl ? getVideoType(videoUrl) : null
  const isValidUrl = videoType === 'youtube' || videoType === 'discord'

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    // 驗證
    if (!videoUrl.trim()) {
      setError(t('report.error.videoRequired'))
      return
    }
    if (!isValidUrl) {
      setError(t('report.error.invalidUrl'))
      return
    }
    if (!reportedCharacter.trim()) {
      setError(t('report.error.characterRequired'))
      return
    }
    if (!discordUsername) {
      setError(t('report.error.loginRequired'))
      return
    }

    setIsSubmitting(true)

    try {
      const result = await reportService.createReport({
        videoUrl: videoUrl.trim(),
        reportedCharacter: reportedCharacter.trim(),
        description: description.trim() || undefined,
        reporterDiscord: discordUsername,
      })

      if (result) {
        // 重置表單
        setVideoUrl('')
        setReportedCharacter('')
        setDescription('')
        onSuccess?.()
      } else {
        setError(t('report.error.submitFailed'))
      }
    } catch (err) {
      console.error('提交檢舉失敗:', err)
      setError(t('report.error.submitFailed'))
    } finally {
      setIsSubmitting(false)
    }
  }, [videoUrl, reportedCharacter, description, discordUsername, isValidUrl, t, onSuccess])

  // 開發環境下即使未登入也可使用
  const isDev = process.env.NODE_ENV === 'development'

  if (!user && !isDev) {
    return (
      <div className="p-4 text-center text-zinc-500 dark:text-zinc-400">
        {t('report.loginRequired')}
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* 影片網址 */}
      <div>
        <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
          {t('report.form.videoUrl')} *
        </label>
        <input
          type="url"
          value={videoUrl}
          onChange={(e) => setVideoUrl(e.target.value)}
          placeholder={t('report.form.videoUrlPlaceholder')}
          className="w-full px-3 py-2 rounded-lg border border-zinc-300 dark:border-zinc-600
                     bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100
                     focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          disabled={isSubmitting}
        />
        <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
          {t('report.form.videoUrlHint')}
        </p>
      </div>

      {/* 影片預覽 */}
      {videoUrl && isValidUrl && (
        <div>
          <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
            {t('report.form.preview')}
          </label>
          <VideoPreview url={videoUrl} className="max-w-md" />
        </div>
      )}

      {/* 被檢舉者角色名稱 */}
      <div>
        <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
          {t('report.form.reportedCharacter')} *
        </label>
        <input
          type="text"
          value={reportedCharacter}
          onChange={(e) => setReportedCharacter(e.target.value)}
          placeholder={t('report.form.reportedCharacterPlaceholder')}
          className="w-full px-3 py-2 rounded-lg border border-zinc-300 dark:border-zinc-600
                     bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100
                     focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          disabled={isSubmitting}
        />
      </div>

      {/* 檢舉說明 */}
      <div>
        <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
          {t('report.form.description')}
        </label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder={t('report.form.descriptionPlaceholder')}
          rows={3}
          className="w-full px-3 py-2 rounded-lg border border-zinc-300 dark:border-zinc-600
                     bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100
                     focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
          disabled={isSubmitting}
        />
      </div>

      {/* 檢舉者資訊（自動帶入） */}
      <div className="p-3 bg-zinc-100 dark:bg-zinc-800 rounded-lg">
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          {t('report.form.reporter')}: <span className="font-medium">{discordUsername}</span>
        </p>
      </div>

      {/* 錯誤訊息 */}
      {error && (
        <div className="p-3 bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-lg text-sm">
          {error}
        </div>
      )}

      {/* 按鈕 */}
      <div className="flex gap-3 justify-end">
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 rounded-lg border border-zinc-300 dark:border-zinc-600
                       text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800"
            disabled={isSubmitting}
          >
            {t('common.cancel')}
          </button>
        )}
        <button
          type="submit"
          className="px-4 py-2 rounded-lg bg-red-500 text-white hover:bg-red-600
                     disabled:opacity-50 disabled:cursor-not-allowed"
          disabled={isSubmitting || !isValidUrl || !reportedCharacter.trim()}
        >
          {isSubmitting ? t('common.submitting') : t('report.form.submit')}
        </button>
      </div>
    </form>
  )
}
