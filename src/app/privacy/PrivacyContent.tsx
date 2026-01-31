'use client'

import Link from 'next/link'
import { useLanguage } from '@/contexts/LanguageContext'

export function PrivacyContent() {
  const { t } = useLanguage()

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-200">
      <div className="max-w-3xl mx-auto px-4 py-12">
        <h1 className="text-3xl font-bold mb-2">{t('legal.privacy.title')}</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mb-8">
          {t('legal.privacy.lastUpdated')}: 2026-01-31
        </p>

        <div className="space-y-8 leading-relaxed">
          {/* Introduction */}
          <section>
            <p>{t('legal.privacy.intro')}</p>
          </section>

          {/* Data Collection */}
          <section>
            <h2 className="text-xl font-semibold mb-3">{t('legal.privacy.dataCollection.title')}</h2>
            <p className="mb-2">{t('legal.privacy.dataCollection.desc')}</p>
            <ul className="list-disc list-inside space-y-1 ml-2">
              <li>{t('legal.privacy.dataCollection.pageViews')}</li>
              <li>{t('legal.privacy.dataCollection.interactions')}</li>
              <li>{t('legal.privacy.dataCollection.deviceInfo')}</li>
              <li>{t('legal.privacy.dataCollection.preferences')}</li>
            </ul>
          </section>

          {/* Data We Do NOT Collect */}
          <section>
            <h2 className="text-xl font-semibold mb-3">{t('legal.privacy.noCollect.title')}</h2>
            <ul className="list-disc list-inside space-y-1 ml-2">
              <li>{t('legal.privacy.noCollect.personalInfo')}</li>
              <li>{t('legal.privacy.noCollect.passwords')}</li>
              <li>{t('legal.privacy.noCollect.financial')}</li>
            </ul>
          </section>

          {/* Cookies */}
          <section>
            <h2 className="text-xl font-semibold mb-3">{t('legal.privacy.cookies.title')}</h2>
            <p className="mb-2">{t('legal.privacy.cookies.desc')}</p>
            <ul className="list-disc list-inside space-y-1 ml-2">
              <li><strong>{t('legal.privacy.cookies.essential')}</strong>: {t('legal.privacy.cookies.essentialDesc')}</li>
              <li><strong>{t('legal.privacy.cookies.analytics')}</strong>: {t('legal.privacy.cookies.analyticsDesc')}</li>
              <li><strong>{t('legal.privacy.cookies.advertising')}</strong>: {t('legal.privacy.cookies.advertisingDesc')}</li>
            </ul>
          </section>

          {/* Google Analytics */}
          <section>
            <h2 className="text-xl font-semibold mb-3">{t('legal.privacy.ga.title')}</h2>
            <p>{t('legal.privacy.ga.desc')}</p>
          </section>

          {/* Google AdSense */}
          <section>
            <h2 className="text-xl font-semibold mb-3">{t('legal.privacy.adsense.title')}</h2>
            <p>{t('legal.privacy.adsense.desc')}</p>
          </section>

          {/* Third-party Services */}
          <section>
            <h2 className="text-xl font-semibold mb-3">{t('legal.privacy.thirdParty.title')}</h2>
            <p className="mb-2">{t('legal.privacy.thirdParty.desc')}</p>
            <ul className="list-disc list-inside space-y-1 ml-2">
              <li>{t('legal.privacy.thirdParty.discord')}</li>
              <li>{t('legal.privacy.thirdParty.supabase')}</li>
              <li>{t('legal.privacy.thirdParty.cloudflare')}</li>
              <li>{t('legal.privacy.thirdParty.vercel')}</li>
            </ul>
          </section>

          {/* User Rights */}
          <section>
            <h2 className="text-xl font-semibold mb-3">{t('legal.privacy.rights.title')}</h2>
            <ul className="list-disc list-inside space-y-1 ml-2">
              <li>{t('legal.privacy.rights.consent')}</li>
              <li>{t('legal.privacy.rights.localStorage')}</li>
              <li>{t('legal.privacy.rights.contact')}</li>
            </ul>
          </section>

          {/* Contact */}
          <section>
            <h2 className="text-xl font-semibold mb-3">{t('legal.privacy.contact.title')}</h2>
            <p>{t('legal.privacy.contact.desc')}</p>
          </section>
        </div>

        {/* Back to Home */}
        <div className="mt-12 pt-6 border-t border-slate-200 dark:border-slate-700">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-blue-500 hover:text-blue-400 transition-colors font-medium"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M19 12H5M12 19l-7-7 7-7" />
            </svg>
            {t('common.backToHome')}
          </Link>
        </div>
      </div>
    </div>
  )
}
