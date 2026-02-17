/**
 * Server-side 資料抓取函數
 *
 * 供 Server Component（SEO 頁面）使用。
 * 與 client-side 的 useLazyData.ts hooks 平行，但用純 async 函數實作。
 *
 * 資料來源：
 * - 本地 JSON：chronostoryData/ 下的 index 和 mob-info
 * - R2 CDN：drops-by-monster, drops-by-item, items-organized
 */

import { promises as fs } from 'fs'
import path from 'path'
import type {
  MonsterIndexItem,
  ItemIndexItem,
  DropItem,
  DropsByItemData,
  ItemsOrganizedData,
  MobInfo,
} from '@/types'
import {
  getMonsterDropsUrl,
  getItemDropsUrl,
  getItemDataUrl,
} from '@/lib/json-utils'

// ==================== 本地 JSON 讀取 ====================

/**
 * 讀取怪物索引（用於 generateStaticParams + sitemap）
 * 來源：chronostoryData/monster-index.json
 */
export async function getMonsterIndex(): Promise<{
  totalMonsters: number
  monsters: MonsterIndexItem[]
}> {
  const filePath = path.join(process.cwd(), 'chronostoryData', 'monster-index.json')
  const raw = await fs.readFile(filePath, 'utf-8')
  return JSON.parse(raw)
}

/**
 * 讀取物品索引（用於 generateStaticParams + sitemap）
 * 來源：chronostoryData/item-index.json
 */
export async function getItemIndex(): Promise<{
  totalItems: number
  items: ItemIndexItem[]
}> {
  const filePath = path.join(process.cwd(), 'chronostoryData', 'item-index.json')
  const raw = await fs.readFile(filePath, 'utf-8')
  return JSON.parse(raw)
}

// mob-info 快取（整份只需讀一次）
let mobInfoCache: MobInfo[] | null = null

/**
 * 讀取怪物詳細資訊（用於 MonsterStatsCard）
 * 來源：chronostoryData/mob-info.json（228 筆，整份快取）
 */
async function loadMobInfo(): Promise<MobInfo[]> {
  if (mobInfoCache) return mobInfoCache
  const filePath = path.join(process.cwd(), 'chronostoryData', 'mob-info.json')
  const raw = await fs.readFile(filePath, 'utf-8')
  mobInfoCache = JSON.parse(raw) as MobInfo[]
  return mobInfoCache
}

/**
 * 根據 mobId 查詢怪物詳細資訊
 */
export async function getMobInfo(mobId: number): Promise<MobInfo | null> {
  const allMobInfo = await loadMobInfo()
  return allMobInfo.find(m => parseInt(m.mob.id, 10) === mobId) ?? null
}

// ==================== 轉蛋機資料（本地 JSON） ====================

export interface GachaSourceInfo {
  machineId: number
  machineName: string
  chineseMachineName?: string
  probability: string
}

interface RawGachaMachine {
  machineId: number
  machineName: string
  chineseMachineName?: string
  items: Array<{ itemId: number; probability: string }>
}

// 快取所有轉蛋機資料（8 台，只讀一次）
let gachaCache: RawGachaMachine[] | null = null

async function loadGachaMachines(): Promise<RawGachaMachine[]> {
  if (gachaCache) return gachaCache
  const dir = path.join(process.cwd(), 'chronostoryData', 'gacha')
  const machines: RawGachaMachine[] = []
  for (let i = 1; i <= 8; i++) {
    const raw = await fs.readFile(path.join(dir, `machine-${i}-enhanced.json`), 'utf-8')
    machines.push(JSON.parse(raw))
  }
  gachaCache = machines
  return gachaCache
}

/**
 * 查詢某物品來自哪些轉蛋機
 */
export async function getGachaSourcesForItem(itemId: number): Promise<GachaSourceInfo[]> {
  const machines = await loadGachaMachines()
  const sources: GachaSourceInfo[] = []
  for (const machine of machines) {
    const item = machine.items.find(i => i.itemId === itemId)
    if (item) {
      sources.push({
        machineId: machine.machineId,
        machineName: machine.machineName,
        chineseMachineName: machine.chineseMachineName,
        probability: item.probability,
      })
    }
  }
  return sources
}

// ==================== R2 CDN 資料抓取 ====================

/**
 * 從 R2 CDN 抓取怪物掉落資料
 * @returns drops 陣列 + 怪物基本資訊，找不到則返回 null
 */
export async function fetchMonsterDrops(mobId: number): Promise<{
  mobId: number
  mobName: string
  chineseMobName: string | null
  isBoss: boolean
  drops: DropItem[]
} | null> {
  const url = getMonsterDropsUrl(mobId)
  try {
    const res = await fetch(url, { next: { revalidate: 86400 } })
    if (!res.ok) return null
    return await res.json()
  } catch {
    return null
  }
}

/**
 * 從 R2 CDN 抓取物品掉落來源資料
 * @returns 掉落來源怪物列表，找不到則返回 null
 */
export async function fetchItemDrops(itemId: number): Promise<DropsByItemData | null> {
  const url = getItemDropsUrl(itemId)
  try {
    const res = await fetch(url, { next: { revalidate: 86400 } })
    if (!res.ok) return null
    return await res.json()
  } catch {
    return null
  }
}

/**
 * 從 R2 CDN 抓取物品詳細資料（organized format）
 * @returns 物品詳細資料，找不到則返回 null
 */
export async function fetchItemDetails(itemId: number): Promise<ItemsOrganizedData | null> {
  const url = getItemDataUrl(itemId)
  try {
    const res = await fetch(url, { next: { revalidate: 86400 } })
    if (!res.ok) return null
    return await res.json()
  } catch {
    return null
  }
}
