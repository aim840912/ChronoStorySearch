import { notFound } from 'next/navigation'

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  // 只在開發環境允許訪問管理頁面
  if (process.env.NODE_ENV !== 'development') {
    notFound()
  }

  return <>{children}</>
}
