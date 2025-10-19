import { NextResponse } from 'next/server'
import { promises as fs } from 'fs'
import path from 'path'
import { apiLogger } from '@/lib/logger'

// 定義掉落資料類型
export interface DropItem {
  mobId: number
  mobName: string
  itemId: number
  itemName: string
  chance: number // 實際機率 (0-1)
  minQty: number
  maxQty: number
}

// 從本地 JSON 檔案讀取掉落資料
async function getDropData(): Promise<DropItem[]> {
  try {
    const filePath = path.join(process.cwd(), 'data', 'drops.json')
    const fileContents = await fs.readFile(filePath, 'utf8')
    const data: DropItem[] = JSON.parse(fileContents)
    return data
  } catch (error) {
    apiLogger.error('讀取掉落資料失敗', error)
    throw new Error('無法讀取掉落資料檔案')
  }
}

export async function GET() {
  try {
    apiLogger.info('從本地 JSON 讀取掉落資料...')
    const dropData = await getDropData()
    apiLogger.info(`成功讀取 ${dropData.length} 筆掉落資料`)

    return NextResponse.json(
      {
        success: true,
        data: dropData,
        count: dropData.length,
        timestamp: new Date().toISOString(),
        message: '成功讀取楓之谷掉落資料',
      },
      {
        headers: {
          // 快取 1 小時，CDN 快取 1 小時，過期後可使用舊資料並在背景重新驗證（24 小時內）
          'Cache-Control': 'public, max-age=3600, s-maxage=3600, stale-while-revalidate=86400',
        },
      }
    )
  } catch (error) {
    apiLogger.error('API route 錯誤', error)

    return NextResponse.json(
      {
        success: false,
        error: '無法獲取掉落資料',
        message: error instanceof Error ? error.message : '未知錯誤',
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    )
  }
}
