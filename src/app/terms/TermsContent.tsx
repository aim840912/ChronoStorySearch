'use client'

import Link from 'next/link'
import { useLanguage } from '@/contexts/LanguageContext'

export function TermsContent() {
  const { t } = useLanguage()

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-200">
      <div className="max-w-3xl mx-auto px-4 py-12">
        <h1 className="text-3xl font-bold mb-2">{t('legal.terms.title')}</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mb-8">
          {t('legal.privacy.lastUpdated')}: 2026-01-31
        </p>

        <div className="space-y-8 leading-relaxed">
          {/* Introduction */}
          <section>
            <p>{t('legal.terms.intro')}</p>
          </section>

          {/* Purpose */}
          <section>
            <h2 className="text-xl font-semibold mb-3">{t('legal.terms.purpose.title')}</h2>
            <p>{t('legal.terms.purpose.desc')}</p>
          </section>

          {/* Disclaimer */}
          <section>
            <h2 className="text-xl font-semibold mb-3">{t('legal.terms.disclaimer.title')}</h2>
            <ul className="list-disc list-inside space-y-1 ml-2">
              <li>{t('legal.terms.disclaimer.unofficial')}</li>
              <li>{t('legal.terms.disclaimer.accuracy')}</li>
              <li>{t('legal.terms.disclaimer.availability')}</li>
              <li>{t('legal.terms.disclaimer.liability')}</li>
            </ul>
          </section>

          {/* Intellectual Property */}
          <section>
            <h2 className="text-xl font-semibold mb-3">{t('legal.terms.ip.title')}</h2>
            <ul className="list-disc list-inside space-y-1 ml-2">
              <li>{t('legal.terms.ip.nexon')}</li>
              <li>{t('legal.terms.ip.siteContent')}</li>
              <li>{t('legal.terms.ip.noCommercial')}</li>
            </ul>
          </section>

          {/* Usage Restrictions */}
          <section>
            <h2 className="text-xl font-semibold mb-3">{t('legal.terms.usage.title')}</h2>
            <ul className="list-disc list-inside space-y-1 ml-2">
              <li>{t('legal.terms.usage.noAbuse')}</li>
              <li>{t('legal.terms.usage.noScraping')}</li>
              <li>{t('legal.terms.usage.noInterference')}</li>
              <li>{t('legal.terms.usage.noFraud')}</li>
            </ul>
          </section>

          {/* User-Generated Content */}
          <section>
            <h2 className="text-xl font-semibold mb-3">{t('legal.terms.ugc.title')}</h2>
            <p>{t('legal.terms.ugc.desc')}</p>
          </section>

          {/* Changes to Terms */}
          <section>
            <h2 className="text-xl font-semibold mb-3">{t('legal.terms.changes.title')}</h2>
            <p>{t('legal.terms.changes.desc')}</p>
          </section>

          {/* Contact */}
          <section>
            <h2 className="text-xl font-semibold mb-3">{t('legal.terms.contact.title')}</h2>
            <p>{t('legal.terms.contact.desc')}</p>
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
