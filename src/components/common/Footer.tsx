'use client'

import { useLanguage } from '@/contexts/LanguageContext'
import Link from 'next/link'

// SVG 圖示元件
const DiscordIcon = ({ className = 'w-5 h-5' }: { className?: string }) => (
  <svg
    className={className}
    fill="currentColor"
    viewBox="0 0 24 24"
    aria-hidden="true"
  >
    <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515a.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0a12.64 12.64 0 0 0-.617-1.25a.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057a19.9 19.9 0 0 0 5.993 3.03a.078.078 0 0 0 .084-.028a14.09 14.09 0 0 0 1.226-1.994a.076.076 0 0 0-.041-.106a13.107 13.107 0 0 1-1.872-.892a.077.077 0 0 1-.008-.128a10.2 10.2 0 0 0 .372-.292a.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127a12.299 12.299 0 0 1-1.873.892a.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028a19.839 19.839 0 0 0 6.002-3.03a.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419c0-1.333.956-2.419 2.157-2.419c1.21 0 2.176 1.096 2.157 2.42c0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419c0-1.333.955-2.419 2.157-2.419c1.21 0 2.176 1.096 2.157 2.42c0 1.333-.946 2.418-2.157 2.418z" />
  </svg>
)

const ExternalLinkIcon = ({ className = 'w-5 h-5' }: { className?: string }) => (
  <svg
    className={className}
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
    strokeWidth={2}
    aria-hidden="true"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
    />
  </svg>
)

const CoffeeIcon = ({ className = 'w-5 h-5' }: { className?: string }) => (
  <svg
    className={className}
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
    strokeWidth={2}
    aria-hidden="true"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M8 3v3a3 3 0 003 3h2a3 3 0 003-3V3m-8 5v8a3 3 0 003 3h2a3 3 0 003-3V8m1 0v3a2 2 0 01-2 2h-1"
    />
  </svg>
)

export default function Footer() {
  const { t } = useLanguage()
  const discordInviteUrl = process.env.NEXT_PUBLIC_DISCORD_INVITE_URL || '#'
  const coffeeChatUrl =
    process.env.NEXT_PUBLIC_DISCORD_COFFEE_CHANNEL_URL ||
    'https://discord.com/channels/1326772066124566538/1436971026255970365'

  return (
    <footer className="fixed bottom-0 left-0 right-0 z-30 bg-slate-900 dark:bg-slate-950 border-t border-slate-700 dark:border-slate-800">
      <div className="container mx-auto px-4 py-2">
        <div className="flex flex-wrap items-center justify-center gap-1 sm:gap-2 text-sm text-slate-300 dark:text-slate-400 text-center">
          <span className="inline-flex items-center gap-1">
            <span className="hidden min-[420px]:inline">{t('footer.serverBy')}</span>
            <Link
              href={discordInviteUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-slate-400 hover:text-slate-200 dark:text-slate-500 dark:hover:text-slate-300 transition-colors inline-flex items-center"
              aria-label={t('footer.discordLink')}
              title={t('footer.discordLink')}
            >
              <DiscordIcon className="w-4 h-4" />
            </Link>
          </span>
          <span className="text-slate-500 dark:text-slate-600 hidden sm:inline">
            |
          </span>
          <Link
            href={coffeeChatUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-slate-400 hover:text-slate-200 dark:text-slate-500 dark:hover:text-slate-300 transition-colors inline-flex items-center gap-1"
            aria-label={t('footer.buyCoffee')}
            title={t('footer.buyCoffee')}
          >
            <CoffeeIcon className="w-4 h-4" />
            <span className="hidden min-[607px]:inline text-sm">{t('footer.buyCoffee')}</span>
          </Link>
          <span className="text-slate-500 dark:text-slate-600 hidden sm:inline">
            |
          </span>
          <span>
            {t('footer.dataSource')}{' '}
            <Link
              href="https://docs.google.com/spreadsheets/d/e/2PACX-1vRpKuZGJQIFFxSi6kzYx4ALI0MQborpLEkh3J1qIGSd0Bw7U4NYg5CK-3ESzyK580z4D8NO59SUeC3k/pubhtml?gid=1888753114&single=true"
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-400 hover:text-blue-300 dark:text-blue-500 dark:hover:text-blue-400 transition-colors inline-flex items-center gap-1"
              aria-label="Google Sheets 資料來源"
            >
              Google Sheets
              <ExternalLinkIcon className="w-3 h-3" />
            </Link>
          </span>
        </div>
      </div>
    </footer>
  )
}
