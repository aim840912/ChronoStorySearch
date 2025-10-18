import { NextRequest, NextResponse } from 'next/server'
import { promises as fs } from 'fs'
import path from 'path'
import { apiLogger } from '@/lib/logger'

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params
    apiLogger.info(`讀取轉蛋機資料: machine-${id}`)

    // 驗證 ID 是否為有效數字 (1-7)
    const machineId = parseInt(id, 10)
    if (isNaN(machineId) || machineId < 1 || machineId > 7) {
      apiLogger.warn(`無效的轉蛋機 ID: ${id}`)
      return NextResponse.json(
        {
          success: false,
          error: '無效的轉蛋機 ID',
          message: '轉蛋機 ID 必須是 1-7 之間的數字',
        },
        { status: 400 }
      )
    }

    // 讀取對應的轉蛋機資料
    const filePath = path.join(process.cwd(), 'data', 'gacha', `machine-${id}.json`)
    const fileContents = await fs.readFile(filePath, 'utf8')
    const data = JSON.parse(fileContents)

    apiLogger.info(`成功讀取轉蛋機 ${id} 資料`)

    return NextResponse.json(data, {
      status: 200,
      headers: {
        'Cache-Control': 'public, max-age=3600', // 快取 1 小時
      },
    })
  } catch (error) {
    apiLogger.error('讀取轉蛋機資料失敗', error)

    if (error instanceof Error && 'code' in error && error.code === 'ENOENT') {
      return NextResponse.json(
        {
          success: false,
          error: '轉蛋機資料不存在',
          message: '找不到指定的轉蛋機資料檔案',
        },
        { status: 404 }
      )
    }

    return NextResponse.json(
      {
        success: false,
        error: '無法獲取轉蛋機資料',
        message: error instanceof Error ? error.message : '未知錯誤',
      },
      { status: 500 }
    )
  }
}
