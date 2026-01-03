'use client'

import { useState, useCallback, useEffect } from 'react'
import { useLanguage } from '@/contexts/LanguageContext'
import { useAuth } from '@/contexts/AuthContext'
import { reportService } from '@/lib/supabase/report-service'
import { getVideoType } from '@/types/report'
import { VideoPreview } from './VideoPreview'

// 重複檢舉檢查結果
interface DuplicateCheckResult {
  totalCount: number
  myActiveReportExists: boolean
  myRejectedReportExists: boolean
  existingStatuses: {
    pending: number
    confirmed: number
    rejected: number
  }
}

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
  const [characterName, setCharacterName] = useState('')
  const [characterId, setCharacterId] = useState('')
  const [description, setDescription] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // 重複檢舉檢查狀態
  const [duplicateCheck, setDuplicateCheck] = useState<DuplicateCheckResult | null>(null)
  const [isCheckingDuplicate, setIsCheckingDuplicate] = useState(false)

  // 從 user metadata 取得 Discord 用戶名（開發模式下使用預設值）
  const discordUsername = user?.user_metadata?.full_name ||
    user?.user_metadata?.name ||
    user?.user_metadata?.preferred_username ||
    (process.env.NODE_ENV === 'development' ? 'Dev User' : '')

  // 驗證影片網址
  const videoType = videoUrl ? getVideoType(videoUrl) : null
  const isValidUrl = videoType === 'youtube' || videoType === 'discord'

  // 驗證角色名稱和 ID
  const isValidCharacterName = characterName.trim().length > 0
  const CHARACTER_ID_REGEX = /^[a-zA-Z]{5}$/
  const isValidCharacterIdFormat = CHARACTER_ID_REGEX.test(characterId)
  const isValidCharacterId = isValidCharacterName && isValidCharacterIdFormat

  // 合併後的完整角色 ID（用於提交和顯示）
  const fullCharacterId = characterName.trim() && characterId
    ? `${characterName.trim()}#${characterId}`
    : ''

  // 處理角色 ID 輸入（只允許英文字母，最多5個）
  const handleCharacterIdChange = (value: string) => {
    const filtered = value.replace(/[^a-zA-Z]/g, '').slice(0, 5)
    setCharacterId(filtered)
  }

  // 當角色 ID 格式正確時，檢查重複檢舉
  useEffect(() => {
    if (!isValidCharacterIdFormat) {
      setDuplicateCheck(null)
      return
    }

    // Debounce 500ms
    const timer = setTimeout(async () => {
      setIsCheckingDuplicate(true)
      try {
        const result = await reportService.checkDuplicateReport(characterId)
        setDuplicateCheck(result)
      } catch (err) {
        console.error('檢查重複檢舉失敗:', err)
        setDuplicateCheck(null)
      } finally {
        setIsCheckingDuplicate(false)
      }
    }, 500)

    return () => clearTimeout(timer)
  }, [characterId, isValidCharacterIdFormat])

  // 判斷是否可以提交（有進行中的檢舉時不可提交）
  const canSubmit = !duplicateCheck?.myActiveReportExists

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
    if (!characterName.trim()) {
      setError(t('report.error.characterNameRequired'))
      return
    }
    if (!isValidCharacterIdFormat) {
      setError(t('report.error.invalidCharacterId'))
      return
    }
    if (duplicateCheck?.myActiveReportExists) {
      setError(t('report.error.duplicateActive'))
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
        reportedCharacter: fullCharacterId,
        description: description.trim() || undefined,
        reporterDiscord: discordUsername,
      })

      if (result) {
        // 重置表單
        setVideoUrl('')
        setCharacterName('')
        setCharacterId('')
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
  }, [videoUrl, fullCharacterId, description, discordUsername, isValidUrl, isValidCharacterIdFormat, isValidCharacterName, duplicateCheck, t, onSuccess])

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

      {/* 被檢舉者角色 */}
      <div>
        <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
          {t('report.form.reportedCharacter')} *
        </label>
        <div className="flex gap-2 items-center">
          {/* 角色名稱 */}
          <div className="relative flex-1">
            <input
              type="text"
              value={characterName}
              onChange={(e) => setCharacterName(e.target.value)}
              placeholder={t('report.form.characterNamePlaceholder')}
              className={`w-full px-3 py-2 pr-10 rounded-lg border
                         bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100
                         focus:ring-2 focus:border-transparent
                         ${characterName.trim()
                           ? isValidCharacterName
                             ? 'border-green-500 focus:ring-green-500'
                             : 'border-red-500 focus:ring-red-500'
                           : 'border-zinc-300 dark:border-zinc-600 focus:ring-blue-500'
                         }`}
              disabled={isSubmitting}
            />
            {characterName.trim() && (
              <div className="absolute right-3 top-1/2 -translate-y-1/2">
                {isValidCharacterName ? (
                  <svg className="w-5 h-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                ) : (
                  <svg className="w-5 h-5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                )}
              </div>
            )}
          </div>

          {/* # 分隔符 */}
          <span className="text-lg font-bold text-zinc-500 dark:text-zinc-400">#</span>

          {/* 角色 ID（5個英文字母） */}
          <div className="relative flex-1">
            <input
              type="text"
              value={characterId}
              onChange={(e) => handleCharacterIdChange(e.target.value)}
              placeholder="abcDE"
              maxLength={5}
              className={`w-full px-3 py-2 pr-10 rounded-lg border font-mono uppercase
                         bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100
                         focus:ring-2 focus:border-transparent
                         ${characterId.length > 0
                           ? isValidCharacterIdFormat
                             ? 'border-green-500 focus:ring-green-500'
                             : 'border-red-500 focus:ring-red-500'
                           : 'border-zinc-300 dark:border-zinc-600 focus:ring-blue-500'
                         }`}
              disabled={isSubmitting}
            />
            {characterId.length > 0 && (
              <div className="absolute right-2 top-1/2 -translate-y-1/2">
                {isValidCharacterIdFormat ? (
                  <svg className="w-4 h-4 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                ) : (
                  <svg className="w-4 h-4 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                )}
              </div>
            )}
          </div>
        </div>
        {/* 格式說明 */}
        <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
          {t('report.form.characterIdHint')}
        </p>

        {/* 重複檢舉提示 */}
        {isCheckingDuplicate && (
          <div className="mt-2 p-2 bg-zinc-100 dark:bg-zinc-800 rounded-lg text-xs text-zinc-500 flex items-center gap-2">
            <div className="animate-spin w-3 h-3 border border-zinc-400 border-t-transparent rounded-full" />
            {t('report.duplicate.checking')}
          </div>
        )}
        {!isCheckingDuplicate && duplicateCheck && (
          <>
            {/* 情況 C: 我有進行中的檢舉（阻擋） */}
            {duplicateCheck.myActiveReportExists && (
              <div className="mt-2 p-2 bg-red-100 dark:bg-red-900/30 rounded-lg text-xs text-red-600 dark:text-red-400 flex items-center gap-2">
                <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                {duplicateCheck.existingStatuses.pending > 0 && duplicateCheck.existingStatuses.confirmed === 0
                  ? t('report.duplicate.myPending')
                  : t('report.duplicate.myConfirmed')}
              </div>
            )}
            {/* 情況 D: 我只有被駁回的檢舉（可提交） */}
            {!duplicateCheck.myActiveReportExists && duplicateCheck.myRejectedReportExists && (
              <div className="mt-2 p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg text-xs text-blue-600 dark:text-blue-400 flex items-center gap-2">
                <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                {t('report.duplicate.myRejected')}
              </div>
            )}
            {/* 情況 B: 有他人的檢舉（可提交） */}
            {!duplicateCheck.myActiveReportExists && !duplicateCheck.myRejectedReportExists && duplicateCheck.totalCount > 0 && (
              <div className="mt-2 p-2 bg-yellow-100 dark:bg-yellow-900/30 rounded-lg text-xs text-yellow-700 dark:text-yellow-400 flex items-center gap-2">
                <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                {t('report.duplicate.existingReports', { count: duplicateCheck.totalCount })}
              </div>
            )}
          </>
        )}
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
          disabled={isSubmitting || !isValidUrl || !isValidCharacterId || !canSubmit}
        >
          {isSubmitting ? t('common.submitting') : t('report.form.submit')}
        </button>
      </div>
    </form>
  )
}
