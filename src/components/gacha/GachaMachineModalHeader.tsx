'use client'

/**
 * 轉蛋機 Modal Header 元件
 *
 * 職責：
 * - 顯示標題和統計資訊
 * - 處理導航按鈕（返回、關閉）
 * - 顯示模式切換、語言切換、分享按鈕
 */

import type { GachaMachine } from '@/types'

type ViewMode = 'browse' | 'gacha'

interface GachaMachineModalHeaderProps {
  selectedMachine: GachaMachine | null
  machines: GachaMachine[]
  language: 'zh-TW' | 'en'
  t: (key: string) => string
  viewMode: ViewMode
  onToggleViewMode: () => void
  onToggleLanguage: () => void
  onShare: () => void
  onClose: () => void
  onBack: () => void
  hasPreviousModal?: boolean
  onGoBack?: () => void
  initialMachineId?: number
}

export function GachaMachineModalHeader({
  selectedMachine,
  machines,
  language,
  t,
  viewMode,
  onToggleViewMode,
  onToggleLanguage,
  onShare,
  onClose,
  onBack,
  hasPreviousModal,
  onGoBack,
  initialMachineId,
}: GachaMachineModalHeaderProps) {
  // 處理關閉/返回按鈕點擊
  const handleCloseClick = () => {
    if (initialMachineId !== undefined) {
      onClose()
    } else if (selectedMachine) {
      onBack()
    } else {
      onClose()
    }
  }

  return (
    <div className="sticky top-0 z-10 bg-purple-500 dark:bg-purple-600 p-4 sm:p-6 rounded-t-xl flex-shrink-0">
      <div className="flex items-center justify-between">
        {/* 左側：返回按鈕 */}
        <div className="flex-1 flex items-center">
          {hasPreviousModal && onGoBack && (
            <button
              onClick={onGoBack}
              className="p-3 min-h-[44px] rounded-full transition-all duration-200 hover:scale-110 active:scale-95 bg-white/20 hover:bg-white/30 text-white border border-white/30 flex items-center gap-2"
              aria-label={t('modal.goBack')}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              <span className="text-sm font-medium hidden sm:inline">{t('modal.goBack')}</span>
            </button>
          )}
        </div>

        {/* 中間：標題 */}
        <div className="text-center">
          <h2 className="text-xl sm:text-2xl font-bold text-white">
            {selectedMachine
              ? (language === 'zh-TW' && selectedMachine.chineseMachineName
                  ? selectedMachine.chineseMachineName
                  : selectedMachine.machineName)
              : t('gacha.title')}
          </h2>
          <p className="text-purple-100 text-xs sm:text-sm mt-1">
            {selectedMachine
              ? `${t('gacha.total')} ${selectedMachine.totalItems} ${t('gacha.itemCount')}`
              : `${t('gacha.total')} ${machines.length} ${t('gacha.machineCount')}`}
          </p>
        </div>

        {/* 右側：功能按鈕 */}
        <div className="flex-1 flex items-center gap-2 justify-end">
          {/* 模式切換按鈕 */}
          {selectedMachine && (
            <button
              onClick={onToggleViewMode}
              className="px-3 py-1.5 sm:px-4 sm:py-2 rounded-lg transition-all duration-200 bg-white/20 hover:bg-white/30 text-white border border-white/30 font-medium text-xs sm:text-sm flex items-center gap-1 sm:gap-2"
              aria-label={viewMode === 'browse' ? t('gacha.gachaMode') : t('gacha.browseMode')}
            >
              {viewMode === 'browse' ? (
                <>
                  <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
                  </svg>
                  {t('gacha.gachaMode')}
                </>
              ) : (
                <>
                  <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
                  </svg>
                  {t('gacha.browseMode')}
                </>
              )}
            </button>
          )}

          {/* 語言切換按鈕 */}
          <button
            onClick={onToggleLanguage}
            className="p-2 sm:p-3 rounded-full transition-all duration-200 hover:scale-110 active:scale-95 bg-white/20 hover:bg-white/30 text-white border border-white/30"
            aria-label={t('language.toggle')}
          >
            <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </button>

          {/* 分享按鈕 */}
          <button
            onClick={onShare}
            className="p-2 sm:p-3 rounded-full transition-all duration-200 hover:scale-110 active:scale-95 bg-white/20 hover:bg-white/30 text-white border border-white/30"
            aria-label={t('modal.share')}
          >
            <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z"
              />
            </svg>
          </button>

          {/* 關閉/返回按鈕 */}
          <button
            onClick={handleCloseClick}
            className="text-white hover:bg-white/20 rounded-full p-2 sm:p-2 transition-colors"
            aria-label={initialMachineId !== undefined ? t('gacha.close') : (selectedMachine ? t('gacha.back') : t('gacha.close'))}
          >
            {selectedMachine && initialMachineId === undefined ? (
              <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M10 19l-7-7m0 0l7-7m-7 7h18"
                />
              </svg>
            ) : (
              <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
