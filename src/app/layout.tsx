import { Geist, Geist_Mono } from "next/font/google";
import type { Metadata } from "next";
import "./globals.css";
import { Providers } from "@/components/Providers";
import { GoogleAnalytics } from '@/components/analytics/GoogleAnalytics';
import { AdSenseScript } from '@/components/adsense';

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
    icon: "https://cdn.chronostorysearch.com/images/chrono.png",
    shortcut: "https://cdn.chronostorysearch.com/images/chrono.png",
    apple: "https://cdn.chronostorysearch.com/images/chrono.png",
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
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  );
}
