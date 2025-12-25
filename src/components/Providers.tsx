'use client'

import { ReactNode } from 'react'
import { Toaster } from 'sonner'
import { LanguageProvider } from '@/contexts/LanguageContext'
import { ThemeProvider } from '@/contexts/ThemeContext'
import { ImageFormatProvider } from '@/contexts/ImageFormatContext'
import { AuthProvider } from '@/contexts/AuthContext'
import { PreferencesSyncProvider } from '@/contexts/PreferencesSyncContext'
import { SWRProvider } from '@/providers/SWRProvider'
import { MaintenanceBanner } from '@/components/common/MaintenanceBanner'
import { CookieConsentBanner } from '@/components/common/CookieConsentBanner'
import Footer from '@/components/common/Footer'

interface ProvidersProps {
  children: ReactNode
}

/**
 * Client-side Providers 包裝元件
 *
 * 此元件包裝所有需要客戶端功能的 Context Providers，
 * 使 Root Layout 可以成為 Server Component，減少 Vercel Function Invocations。
 */
export function Providers({ children }: ProvidersProps) {
  return (
    <AuthProvider>
      <PreferencesSyncProvider>
        <SWRProvider>
          <ThemeProvider>
            <LanguageProvider>
              <ImageFormatProvider>
                <Toaster position="top-center" richColors />
                <MaintenanceBanner />
                <div className="min-h-screen">{children}</div>
                <CookieConsentBanner />
                <Footer />
              </ImageFormatProvider>
            </LanguageProvider>
          </ThemeProvider>
        </SWRProvider>
      </PreferencesSyncProvider>
    </AuthProvider>
  )
}
