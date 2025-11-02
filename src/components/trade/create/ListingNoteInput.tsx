'use client'

import { useLanguage } from '@/contexts/LanguageContext'

/**
 * 刊登備註輸入元件
 *
 * 功能：
 * - 輸入刊登備註（選填）
 * - 顯示字數計數器
 * - 限制最大字數
 *
 * 使用範例：
 * ```tsx
 * <ListingNoteInput
 *   notes={notes}
 *   onChange={setNotes}
 *   maxLength={500}
 * />
 * ```
 */
interface ListingNoteInputProps {
  /** 備註內容 */
  notes: string
  /** 備註變更回調 */
  onChange: (value: string) => void
  /** 最大字數限制 */
  maxLength?: number
}

export function ListingNoteInput({
  notes,
  onChange,
  maxLength = 500
}: ListingNoteInputProps) {
  const { t } = useLanguage()

  return (
    <div className="mb-6">
      <label className="block mb-2 font-semibold text-sm text-gray-700 dark:text-gray-300">
        {t('listing.notes.label')}
        <span className="text-gray-400 ml-1 text-xs">({t('listing.optional')})</span>
      </label>
      <textarea
        value={notes}
        onChange={(e) => onChange(e.target.value)}
        placeholder={t('listing.notes.placeholder')}
        maxLength={maxLength}
        rows={3}
        className="w-full px-4 py-2 border rounded-lg
                   dark:bg-gray-800 dark:border-gray-600
                   focus:ring-2 focus:ring-blue-500 focus:border-transparent
                   resize-none"
      />
      <div className="flex justify-between items-center mt-1">
        <p className="text-xs text-gray-500 dark:text-gray-400">
          {t('listing.notes.counter', { current: notes.length, max: maxLength })}
        </p>
      </div>
    </div>
  )
}
