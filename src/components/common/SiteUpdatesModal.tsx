'use client'

import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { useLanguage } from '@/contexts/LanguageContext'
import { SITE_UPDATES } from '@/data/updates'
import type { UpdateEntry } from '@/data/updates'

interface SiteUpdatesModalProps {
  isOpen: boolean
  onClose: () => void
}

const TAG_STYLES: Record<UpdateEntry['tag'], { bg: string; text: string }> = {
  new: {
    bg: 'bg-emerald-100 dark:bg-emerald-900/30',
    text: 'text-emerald-700 dark:text-emerald-400',
  },
  improve: {
    bg: 'bg-blue-100 dark:bg-blue-900/30',
    text: 'text-blue-700 dark:text-blue-400',
  },
  fix: {
    bg: 'bg-amber-100 dark:bg-amber-900/30',
    text: 'text-amber-700 dark:text-amber-400',
  },
}

/**
 * Site Updates Modal — shows recent website feature updates.
 * Follows the same Portal pattern as AboutModal.
 */
export function SiteUpdatesModal({ isOpen, onClose }: SiteUpdatesModalProps) {
  const { t, language } = useLanguage()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  // ESC to close + body scroll lock
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

  if (!isOpen || !mounted) return null

  const lang = language as 'zh-TW' | 'en'

  return createPortal(
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-md max-h-[80vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-blue-500 dark:bg-blue-600 p-5 rounded-t-xl flex-shrink-0">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-white">
              {t('updates.title')}
            </h2>
            <button
              onClick={onClose}
              className="text-white hover:bg-white/20 rounded-full p-2 transition-colors"
              aria-label={t('common.close')}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Scrollable content */}
        <div className="overflow-y-auto flex-1 p-4 space-y-3">
          {SITE_UPDATES.map((entry, i) => {
            const tagStyle = TAG_STYLES[entry.tag]
            const tagLabel = t(`updates.tag${entry.tag.charAt(0).toUpperCase() + entry.tag.slice(1)}`)

            return (
              <div
                key={i}
                className="flex gap-3 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg"
              >
                {/* Timeline dot */}
                <div className="flex flex-col items-center flex-shrink-0 pt-1">
                  <div className={`w-2.5 h-2.5 rounded-full ${tagStyle.bg} ring-2 ring-white dark:ring-gray-800`} />
                  {i < SITE_UPDATES.length - 1 && (
                    <div className="w-px flex-1 bg-gray-200 dark:bg-gray-600 mt-1" />
                  )}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${tagStyle.bg} ${tagStyle.text}`}>
                      {tagLabel}
                    </span>
                    <span className="text-xs text-gray-400 dark:text-gray-500">
                      {entry.date}
                    </span>
                  </div>
                  <p className="text-sm font-medium text-gray-900 dark:text-white leading-snug">
                    {entry.title[lang]}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 leading-relaxed">
                    {entry.desc[lang]}
                  </p>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>,
    document.body
  )
}
