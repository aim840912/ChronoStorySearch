'use client'

import { useLanguage } from '@/contexts/LanguageContext'

/**
 * 刊登備註顯示元件
 *
 * 功能：
 * - 顯示刊登備註（如果有）
 * - 支援多行文字與自動換行
 * - 僅當有備註時才顯示
 *
 * 使用範例：
 * ```tsx
 * <ListingNotes notes={listing.notes} />
 * ```
 */
interface ListingNotesProps {
  /** 備註內容 */
  notes: string | null | undefined
}

export function ListingNotes({ notes }: ListingNotesProps) {
  const { t } = useLanguage()

  // 如果沒有備註，不顯示
  if (!notes) {
    return null
  }

  return (
    <div className="border rounded-lg p-4 dark:border-gray-700 bg-white dark:bg-gray-800">
      <h3 className="font-semibold mb-3 text-gray-900 dark:text-white">{t('listing.notes')}</h3>
      <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap break-words">
        {notes}
      </p>
    </div>
  )
}
