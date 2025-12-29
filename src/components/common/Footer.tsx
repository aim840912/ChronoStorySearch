'use client'

import { useState } from 'react'
import Link from 'next/link'
import { AboutModal } from '@/components/AboutModal'

// 連結常數
const KOFI_URL = 'https://ko-fi.com/U7U21O9JVQ'

// SVG 圖示元件
const KofiIcon = ({ className = 'w-5 h-5' }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <path d="M23.881 8.948c-.773-4.085-4.859-4.593-4.859-4.593H.723c-.604 0-.679.798-.679.798s-.082 7.324-.022 11.822c.164 2.424 2.586 2.672 2.586 2.672s8.267-.023 11.966-.049c2.438-.426 2.683-2.566 2.658-3.734 4.352.24 7.422-2.831 6.649-6.916zm-11.062 3.511c-1.246 1.453-4.011 3.976-4.011 3.976s-.121.119-.31.023c-.076-.057-.108-.09-.108-.09-.443-.441-3.368-3.049-4.034-3.954-.709-.965-1.041-2.7-.091-3.71.951-1.01 3.005-1.086 4.363.407 0 0 1.565-1.782 3.468-.963 1.904.82 1.832 3.011.723 4.311zm6.173.478c-.928.116-1.682.028-1.682.028V7.284h1.77s1.971.551 1.971 2.638c0 1.913-.985 2.667-2.059 3.015z"/>
  </svg>
)

export default function Footer() {
  const [isAboutOpen, setIsAboutOpen] = useState(false)
  const coffeeChatUrl = 'https://ko-fi.com/chronostory'

  return (
    <footer className="fixed bottom-0 left-0 right-0 z-30 bg-slate-900 dark:bg-slate-950 border-t border-slate-700 dark:border-slate-800">
      <div className="container mx-auto px-4 py-2">
        <div className="flex flex-wrap items-center justify-center gap-2 text-sm text-slate-300 dark:text-slate-400 text-center">
          <Link
            href={coffeeChatUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-amber-400 hover:text-amber-300 transition-colors inline-flex items-center gap-1"
            aria-label="Ko-fi - Boutei. & Vaft"
            title="Ko-fi - Boutei. & Vaft"
          >
            <KofiIcon className="w-4 h-4" />
            <span className="text-sm hidden sm:inline">Ko-fi (Boutei. & Vaft)</span>
            <span className="text-sm sm:hidden">遊戲作者</span>
          </Link>
          <span className="text-slate-500 dark:text-slate-600">|</span>
          <Link
            href={KOFI_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[#FF5E5B] hover:text-[#ff7572] transition-colors inline-flex items-center gap-1"
            aria-label="Ko-fi - 贊助網站作者"
            title="Ko-fi - 贊助網站作者"
          >
            <KofiIcon className="w-4 h-4" />
            <span className="text-sm hidden sm:inline">Ko-fi (網站作者)</span>
            <span className="text-sm sm:hidden">網站作者</span>
          </Link>
          <span className="text-slate-500 dark:text-slate-600">|</span>
          <span className="inline-flex items-center gap-1">
            <span className="hidden sm:inline">Assets ©</span>
            <Link
              href="https://www.nexon.com/main/en"
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-400 hover:text-blue-300 transition-colors"
            >
              NEXON
            </Link>
          </span>
          <span className="text-slate-500 dark:text-slate-600">|</span>
          <button
            onClick={() => setIsAboutOpen(true)}
            className="text-emerald-400 hover:text-emerald-300 dark:text-emerald-500 dark:hover:text-emerald-400 transition-colors font-medium"
          >
            <span className="hidden sm:inline">關於本站</span>
            <span className="sm:hidden">關於</span>
          </button>
        </div>
      </div>

      {/* 關於本站 Modal */}
      <AboutModal isOpen={isAboutOpen} onClose={() => setIsAboutOpen(false)} />
    </footer>
  )
}
