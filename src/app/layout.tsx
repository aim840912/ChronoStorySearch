import { Geist, Geist_Mono } from "next/font/google";
import type { Metadata } from "next";
import "./globals.css";
import { Providers } from "@/components/Providers";
import { GoogleAnalytics } from '@/components/analytics/GoogleAnalytics';
import { AdSenseScript, AnchorAd } from '@/components/adsense';

import { Agentation } from 'agentation';

import { R2_PUBLIC_URL as R2_URL } from "@/lib/r2-url";
const SITE_ICON = `${R2_URL}/images/chrono.png`;

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// Server Component 可使用 metadata export（SEO 優化）
export const metadata: Metadata = {
  title: "ChronoStory Search",
  description: "查找裝備、怪物詳細資訊",
  robots: "index, follow",
  referrer: "strict-origin-when-cross-origin",
  formatDetection: {
    telephone: false,
  },
  icons: {
    icon: SITE_ICON,
    shortcut: SITE_ICON,
    apple: SITE_ICON,
  },
  other: {
    'theme-color': '#0a0a0a',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-TW">
      <head>
        <link
          href="https://cdn.jsdelivr.net/npm/open-huninn-font@1.1/font.css"
          rel="stylesheet"
        />
        <GoogleAnalytics />
        <AdSenseScript />
        <script
          dangerouslySetInnerHTML={{
            __html: `
              if ('serviceWorker' in navigator) {
                window.addEventListener('load', () => {
                  navigator.serviceWorker.register('/sw.js')
                })
              }
            `,
          }}
        />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <Providers>
          {children}
        </Providers>
        <AnchorAd />
        {process.env.NODE_ENV === 'development' && <Agentation />}
      </body>
    </html>
  );
}
