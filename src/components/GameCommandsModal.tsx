'use client'

import { useEffect } from 'react'
import { useLanguage } from '@/contexts/LanguageContext'
import { useToast } from '@/hooks/useToast'

interface GameCommandsModalProps {
  isOpen: boolean
  onClose: () => void
}

interface Command {
  command: string
  descriptionKey: string
  parameters?: string
}

const GAME_COMMANDS: Command[] = [
  { command: '/discord', descriptionKey: 'commands.discord' },
  { command: '/mswavatar', descriptionKey: 'commands.mswavatar' },
  { command: '/changeunderwear', descriptionKey: 'commands.changeunderwear' },
  { command: '/reply', descriptionKey: 'commands.reply' },
  { command: '/check', descriptionKey: 'commands.check', parameters: '[username]' },
  { command: '/partyinfo', descriptionKey: 'commands.partyinfo' },
  { command: '/maporder', descriptionKey: 'commands.maporder' },
  { command: '/mutesmegas', descriptionKey: 'commands.mutesmegas' },
  { command: '/mutesmegasNA', descriptionKey: 'commands.mutesmegasNA' },
  { command: '/mutesmegasEU', descriptionKey: 'commands.mutesmegasEU' },
  { command: '/mutesmegasASIA1', descriptionKey: 'commands.mutesmegasASIA1' },
  { command: '/mutesmegasASIA2', descriptionKey: 'commands.mutesmegasASIA2' },
  { command: '/str', descriptionKey: 'commands.str', parameters: '[number]' },
  { command: '/dex', descriptionKey: 'commands.dex', parameters: '[number]' },
  { command: '/int', descriptionKey: 'commands.int', parameters: '[number]' },
  { command: '/luk', descriptionKey: 'commands.luk', parameters: '[number]' },
  { command: '/find', descriptionKey: 'commands.find', parameters: '[#code or username]' },
  { command: '/help', descriptionKey: 'commands.help' },
]

export function GameCommandsModal({ isOpen, onClose }: GameCommandsModalProps) {
  const { language, setLanguage, t } = useLanguage()
  const toast = useToast()

  // 複製指令到剪貼簿（如果有參數則加上空格）
  const copyCommand = async (command: string, parameters?: string) => {
    try {
      // 如果有參數，複製指令加上一個空格；否則只複製指令
      const textToCopy = parameters ? `${command} ` : command
      await navigator.clipboard.writeText(textToCopy)
      toast.showToast(t('commands.copied'), 'success')
    } catch {
      toast.showToast(t('commands.copyError'), 'error')
    }
  }

  // ESC 鍵關閉 & 背景滾動鎖定
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    if (isOpen) {
      window.addEventListener('keydown', handleEsc)
      document.body.style.overflow = 'hidden'
    }
    return () => {
      window.removeEventListener('keydown', handleEsc)
      document.body.style.overflow = 'unset'
    }
  }, [isOpen, onClose])

  if (!isOpen) return null

  return (
    <div
      className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-2 sm:p-4"
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl max-w-3xl w-full flex flex-col max-h-[90vh] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="sticky top-0 z-10 bg-green-500 dark:bg-green-600 text-white px-4 py-3 sm:px-6 sm:py-4 rounded-t-xl">
          <div className="flex items-center justify-between">
            {/* 左側：佔位 */}
            <div className="flex-1"></div>

            {/* 中間：標題區域 */}
            <div className="text-center">
              <div className="flex items-center justify-center gap-2">
                <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                  />
                </svg>
                <h2 className="text-lg sm:text-xl md:text-2xl font-bold">{t('commands.title')}</h2>
              </div>
            </div>

            {/* 右側：按鈕群組 */}
            <div className="flex-1 flex items-center gap-2 justify-end">
              {/* 語言切換按鈕 */}
              <button
                onClick={() => setLanguage(language === 'zh-TW' ? 'en' : 'zh-TW')}
                className="p-3 min-h-[44px] min-w-[44px] rounded-full transition-all duration-200 hover:scale-110 active:scale-95 bg-white/20 hover:bg-white/30 text-white border border-white/30 flex items-center justify-center"
                aria-label={t('language.toggle')}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              </button>
              {/* 關閉按鈕 */}
              <button
                onClick={onClose}
                className="text-white hover:bg-white/20 rounded-full p-3 min-h-[44px] min-w-[44px] transition-all duration-200 hover:scale-110 active:scale-95 flex items-center justify-center"
                aria-label={t('commands.close')}
              >
                <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>
        </div>

        {/* Commands List */}
        <div className="px-3 py-3 sm:px-6 sm:py-4 overflow-y-auto scrollbar-hide">
          <div className="space-y-1.5 sm:space-y-2">
            {GAME_COMMANDS.map((cmd, index) => (
              <div
                key={index}
                className="bg-gray-50 dark:bg-gray-700 rounded-lg px-3 py-2.5 sm:px-4 sm:py-3 hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors"
              >
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-3">
                  <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 flex-1 min-w-0">
                    <code className="bg-gray-200 dark:bg-gray-800 px-2.5 py-1 rounded text-xs sm:text-sm font-mono text-green-600 dark:text-green-400 font-semibold whitespace-nowrap w-fit">
                      {cmd.command}
                      {cmd.parameters && <span className="text-gray-500 dark:text-gray-400 ml-1">{cmd.parameters}</span>}
                    </code>
                    <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-300">{t(cmd.descriptionKey)}</p>
                  </div>
                  <button
                    onClick={() => copyCommand(cmd.command, cmd.parameters)}
                    className="flex-shrink-0 bg-green-500 hover:bg-green-600 active:bg-green-700 dark:bg-green-600 dark:hover:bg-green-700 dark:active:bg-green-800 text-white px-4 py-2 sm:px-3 sm:py-1.5 rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-1.5 w-full sm:w-auto min-h-[44px]"
                    aria-label={`${t('commands.copy')} ${cmd.command}`}
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
                      />
                    </svg>
                    <span>{t('commands.copy')}</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
