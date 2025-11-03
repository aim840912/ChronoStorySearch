/**
 * SWR Provider
 *
 * 功能：
 * - 提供全域 SWR 配置
 * - 包裝整個應用程式
 * - 啟用 SWR 快取和去重機制
 *
 * 使用方式：
 * 在 app/layout.tsx 中包裝應用程式
 */

'use client'

import { SWRConfig } from 'swr'
import { swrConfig } from '@/lib/swr/config'
import { ReactNode } from 'react'

interface SWRProviderProps {
  children: ReactNode
}

/**
 * SWR Provider 元件
 *
 * 提供全域 SWR 配置給整個應用程式
 *
 * @example
 * ```tsx
 * // app/layout.tsx
 * export default function RootLayout({ children }) {
 *   return (
 *     <html>
 *       <body>
 *         <SWRProvider>
 *           {children}
 *         </SWRProvider>
 *       </body>
 *     </html>
 *   )
 * }
 * ```
 */
export function SWRProvider({ children }: SWRProviderProps) {
  return (
    <SWRConfig value={swrConfig}>
      {children}
    </SWRConfig>
  )
}
