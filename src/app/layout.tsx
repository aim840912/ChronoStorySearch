'use client'

import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { LanguageProvider } from "@/contexts/LanguageContext";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { AuthProvider } from "@/contexts/AuthContext";
import { SWRProvider } from "@/providers/SWRProvider";
import { LoginModal } from "@/components/auth/LoginModal";
import { MaintenanceBanner } from "@/components/common/MaintenanceBanner";
import { LoginUserBanner } from "@/components/common/LoginUserBanner";
import { CookieConsentBanner } from "@/components/common/CookieConsentBanner";
import { GoogleAnalytics } from '@/components/analytics/GoogleAnalytics';

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-TW">
      <head>
        <title>ChronoStory Search</title>
        <meta name="description" content="查找裝備、怪物詳細資訊" />
        <meta name="robots" content="index, follow" />
        <meta name="referrer" content="strict-origin-when-cross-origin" />
        <meta name="format-detection" content="telephone=no" />
        <GoogleAnalytics />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <SWRProvider>
          <AuthProvider>
            <ThemeProvider>
              <LanguageProvider>
                <MaintenanceBanner />
                <LoginUserBanner />
                {children}
                <LoginModal />
                <CookieConsentBanner />
                </LanguageProvider>
            </ThemeProvider>
          </AuthProvider>
        </SWRProvider>
      </body>
    </html>
  );
}
