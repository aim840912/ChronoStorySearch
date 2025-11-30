'use client'

import { Geist, Geist_Mono } from "next/font/google";
import { Toaster } from 'sonner';
import "./globals.css";
import { LanguageProvider } from "@/contexts/LanguageContext";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { ImageFormatProvider } from "@/contexts/ImageFormatContext";
import { SWRProvider } from "@/providers/SWRProvider";
import { MaintenanceBanner } from "@/components/common/MaintenanceBanner";
import { CookieConsentBanner } from "@/components/common/CookieConsentBanner";
import Footer from "@/components/common/Footer";
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
        <link
          href="https://cdn.jsdelivr.net/npm/open-huninn-font@1.1/font.css"
          rel="stylesheet"
        />
        <GoogleAnalytics />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <Toaster position="top-center" richColors />
        <SWRProvider>
          <ThemeProvider>
            <LanguageProvider>
              <ImageFormatProvider>
                <>
                  <MaintenanceBanner key="maintenance-banner" />
                  <div key="page-content">{children}</div>
                  <CookieConsentBanner key="cookie-consent-banner" />
                  <Footer key="footer" />
                </>
              </ImageFormatProvider>
            </LanguageProvider>
          </ThemeProvider>
        </SWRProvider>
      </body>
    </html>
  );
}
