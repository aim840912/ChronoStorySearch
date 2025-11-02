'use client'

import { useLanguage } from '@/contexts/LanguageContext'

/**
 * 聯絡方式輸入元件
 *
 * 功能：
 * - 顯示 Discord 聯絡方式（唯讀，來自 OAuth）
 * - 輸入遊戲內角色名（選填）
 *
 * 使用範例：
 * ```tsx
 * <ContactInfoInput
 *   discordContact="username#1234"
 *   ingameName="MyCharacter"
 *   onIngameNameChange={setIngameName}
 * />
 * ```
 */
interface ContactInfoInputProps {
  /** Discord 聯絡方式（唯讀） */
  discordContact: string
  /** 遊戲內角色名 */
  ingameName: string
  /** 遊戲內角色名變更回調 */
  onIngameNameChange: (value: string) => void
}

export function ContactInfoInput({
  discordContact,
  ingameName,
  onIngameNameChange
}: ContactInfoInputProps) {
  const { t } = useLanguage()

  return (
    <>
      {/* Discord 聯絡方式（唯讀） */}
      <div className="mb-4">
        <label className="block mb-2 font-semibold text-sm text-gray-700 dark:text-gray-300">
          {t('listing.discordContactLabel')}
          <span className="text-red-500 ml-1">*</span>
        </label>
        <div className="relative">
          <input
            type="text"
            value={discordContact}
            readOnly
            disabled
            className="w-full px-4 py-2 border rounded-lg bg-gray-100 dark:bg-gray-700
                       dark:border-gray-600 cursor-not-allowed opacity-75 text-gray-700 dark:text-gray-300"
          />
          <span className="absolute right-3 top-2.5 text-xs text-gray-500 dark:text-gray-400">
            {t('listing.autoFilled')}
          </span>
        </div>
        <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
          {t('listing.discordContactHint')}
        </p>
      </div>

      {/* 遊戲內角色名（選填） */}
      <div className="mb-6">
        <label className="block mb-2 font-semibold text-sm text-gray-700 dark:text-gray-300">
          {t('listing.ingameNameLabel')}
          <span className="text-gray-400 ml-1 text-xs">({t('listing.optional')})</span>
        </label>
        <input
          type="text"
          value={ingameName}
          onChange={(e) => onIngameNameChange(e.target.value)}
          placeholder={t('listing.ingameNamePlaceholder')}
          maxLength={50}
          className="w-full px-4 py-2 border rounded-lg
                     dark:bg-gray-800 dark:border-gray-600
                     focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
        <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
          {t('listing.ingameNameHint')}
        </p>
      </div>
    </>
  )
}
