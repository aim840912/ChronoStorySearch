'use client'

import { useState, useEffect, useCallback } from 'react'
import { Download, X } from 'lucide-react'

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

/**
 * PWA 安裝提示按鈕
 * 當瀏覽器觸發 beforeinstallprompt 事件時顯示
 * 安裝完成或使用者關閉後自動隱藏
 */
export function PWAInstallButton() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [dismissed, setDismissed] = useState(false)

  useEffect(() => {
    // 檢查是否已經關閉過（本次 session）
    if (sessionStorage.getItem('pwa-install-dismissed')) {
      setDismissed(true)
    }

    const handler = (e: Event) => {
      e.preventDefault()
      setDeferredPrompt(e as BeforeInstallPromptEvent)
    }

    window.addEventListener('beforeinstallprompt', handler)

    // 安裝完成後隱藏
    window.addEventListener('appinstalled', () => {
      setDeferredPrompt(null)
    })

    return () => {
      window.removeEventListener('beforeinstallprompt', handler)
    }
  }, [])

  const handleInstall = useCallback(async () => {
    if (!deferredPrompt) return
    await deferredPrompt.prompt()
    const { outcome } = await deferredPrompt.userChoice
    if (outcome === 'accepted') {
      setDeferredPrompt(null)
    }
  }, [deferredPrompt])

  const handleDismiss = useCallback(() => {
    setDismissed(true)
    sessionStorage.setItem('pwa-install-dismissed', '1')
  }, [])

  // 沒有安裝提示或已關閉 → 不顯示
  if (!deferredPrompt || dismissed) return null

  return (
    <div className="fixed bottom-20 right-4 z-50 animate-in slide-in-from-bottom-4 fade-in duration-300">
      <div className="flex items-center gap-2 bg-purple-600 text-white pl-4 pr-2 py-2.5 rounded-full shadow-lg shadow-purple-600/30 hover:bg-purple-700 transition-colors">
        <button
          onClick={handleInstall}
          className="flex items-center gap-2 text-sm font-medium"
        >
          <Download className="w-4 h-4" />
          安裝 App
        </button>
        <button
          onClick={handleDismiss}
          className="p-1 rounded-full hover:bg-purple-500 transition-colors"
          aria-label="關閉安裝提示"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  )
}
