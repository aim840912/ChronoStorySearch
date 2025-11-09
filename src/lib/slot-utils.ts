import type { SlotSymbol, WinLine, SlotResult } from '@/types/slot'

/**
 * 拉霸符號定義
 * 使用 8 種怪物，權重越高出現機率越大
 * 權重和賠率根據怪物等級分配：高等級 = 低權重高賠率，低等級 = 高權重低賠率
 */
export const SLOT_SYMBOLS: SlotSymbol[] = [
  {
    id: 'mob_1130100',
    name: 'Axe Stump',
    chineseName: '斧木妖',
    mobId: 1130100,
    weight: 5,
    payout: 50,
  },
  {
    id: 'mob_1110100',
    name: 'Green Mushroom',
    chineseName: '綠菇菇',
    mobId: 1110100,
    weight: 8,
    payout: 20,
  },
  {
    id: 'mob_1210101',
    name: 'Ribbon Pig',
    chineseName: '緞帶肥肥',
    mobId: 1210101,
    weight: 10,
    payout: 15,
  },
  {
    id: 'mob_210100',
    name: 'Slime',
    chineseName: '綠水靈',
    mobId: 210100,
    weight: 15,
    payout: 10,
  },
  {
    id: 'mob_130100',
    name: 'Stump',
    chineseName: '木妖',
    mobId: 130100,
    weight: 18,
    payout: 8,
  },
  {
    id: 'mob_120100',
    name: 'Shroom',
    chineseName: '菇菇仔',
    mobId: 120100,
    weight: 20,
    payout: 5,
  },
  {
    id: 'mob_100101',
    name: 'Blue Snail',
    chineseName: '藍寶',
    mobId: 100101,
    weight: 22,
    payout: 3,
  },
  {
    id: 'mob_100100',
    name: 'Snail',
    chineseName: '嫩寶',
    mobId: 100100,
    weight: 25,
    payout: 2,
  },
]

/**
 * 獲勝線定義
 * 3×3 網格（9 個位置），8 條獲勝線：3 橫 + 3 豎 + 2 對角
 *
 * 位置編號：
 * 0  1  2
 * 3  4  5
 * 6  7  8
 */
export const WIN_LINES: WinLine[] = [
  // 橫線（3 條）
  {
    id: 'top',
    name: '上橫線',
    positions: [0, 1, 2],
  },
  {
    id: 'middle',
    name: '中橫線',
    positions: [3, 4, 5],
  },
  {
    id: 'bottom',
    name: '下橫線',
    positions: [6, 7, 8],
  },
  // 豎線（3 條）
  {
    id: 'left',
    name: '左豎線',
    positions: [0, 3, 6],
  },
  {
    id: 'center',
    name: '中豎線',
    positions: [1, 4, 7],
  },
  {
    id: 'right',
    name: '右豎線',
    positions: [2, 5, 8],
  },
  // 對角線（2 條）
  {
    id: 'diagonal-down',
    name: '↘對角線',
    positions: [0, 4, 8],
  },
  {
    id: 'diagonal-up',
    name: '↗對角線',
    positions: [6, 4, 2],
  },
]

/**
 * 加權隨機選擇符號
 * 參考 gacha-utils.ts 的 weightedRandomDraw 實作
 *
 * @returns 隨機選擇的符號
 */
export function selectRandomSymbol(): SlotSymbol {
  // 計算總權重
  const totalWeight = SLOT_SYMBOLS.reduce((sum, symbol) => sum + symbol.weight, 0)

  // 生成 0 到 totalWeight 之間的隨機數
  let random = Math.random() * totalWeight

  // 根據權重區間選擇符號
  for (const symbol of SLOT_SYMBOLS) {
    random -= symbol.weight
    if (random <= 0) {
      return symbol
    }
  }

  // 容錯：如果因為浮點數誤差沒有返回，返回最後一個符號
  return SLOT_SYMBOLS[SLOT_SYMBOLS.length - 1]
}

/**
 * 生成 3×3 網格的隨機符號（9 個符號）
 *
 * @returns 3×3 陣列，每行 3 個符號
 */
export function generateReelResults(): [
  [SlotSymbol, SlotSymbol, SlotSymbol],
  [SlotSymbol, SlotSymbol, SlotSymbol],
  [SlotSymbol, SlotSymbol, SlotSymbol]
] {
  return [
    // 上排 (位置 0, 1, 2)
    [selectRandomSymbol(), selectRandomSymbol(), selectRandomSymbol()],
    // 中排 (位置 3, 4, 5)
    [selectRandomSymbol(), selectRandomSymbol(), selectRandomSymbol()],
    // 下排 (位置 6, 7, 8)
    [selectRandomSymbol(), selectRandomSymbol(), selectRandomSymbol()],
  ]
}

/**
 * 檢查獲勝線
 * 檢查所有 8 條獲勝線，累加賠率
 *
 * @param symbols - 3×3 符號網格
 * @returns 獲勝線列表和總賠率
 */
export function checkWinLines(symbols: [
  [SlotSymbol, SlotSymbol, SlotSymbol],
  [SlotSymbol, SlotSymbol, SlotSymbol],
  [SlotSymbol, SlotSymbol, SlotSymbol]
]): {
  winLines: WinLine[]
  totalPayout: number
} {
  // 將 3×3 陣列展平為一維陣列（位置 0-8）
  const flatSymbols = [
    symbols[0][0], symbols[0][1], symbols[0][2], // 上排 (0, 1, 2)
    symbols[1][0], symbols[1][1], symbols[1][2], // 中排 (3, 4, 5)
    symbols[2][0], symbols[2][1], symbols[2][2], // 下排 (6, 7, 8)
  ]

  const winLines: WinLine[] = []
  let totalPayout = 0

  // 檢查所有 8 條獲勝線
  for (const line of WIN_LINES) {
    const [pos1, pos2, pos3] = line.positions
    const symbol1 = flatSymbols[pos1]
    const symbol2 = flatSymbols[pos2]
    const symbol3 = flatSymbols[pos3]

    // 檢查 3 個符號是否相同
    if (symbol1.id === symbol2.id && symbol2.id === symbol3.id) {
      winLines.push(line)
      totalPayout += symbol1.payout
    }
  }

  return {
    winLines,
    totalPayout,
  }
}

/**
 * 計算拉霸結果
 *
 * @param symbols - 3×3 符號網格
 * @returns 完整的拉霸結果
 */
export function calculateSlotResult(symbols: [
  [SlotSymbol, SlotSymbol, SlotSymbol],
  [SlotSymbol, SlotSymbol, SlotSymbol],
  [SlotSymbol, SlotSymbol, SlotSymbol]
]): SlotResult {
  const { winLines, totalPayout } = checkWinLines(symbols)

  return {
    symbols,
    winLines,
    totalPayout,
    isWin: winLines.length > 0,
  }
}

/**
 * 執行完整的拉霸旋轉
 * 生成隨機結果並計算獲勝情況
 *
 * @returns 完整的拉霸結果
 */
export function spinSlotMachine(): SlotResult {
  const symbols = generateReelResults()
  return calculateSlotResult(symbols)
}

/**
 * 計算符號出現機率（用於顯示賠率表）
 *
 * @param symbol - 符號
 * @returns 機率百分比
 */
export function calculateSymbolProbability(symbol: SlotSymbol): number {
  const totalWeight = SLOT_SYMBOLS.reduce((sum, s) => sum + s.weight, 0)
  return (symbol.weight / totalWeight) * 100
}

/**
 * 計算獲得特定符號 3 連線的機率
 *
 * @param symbol - 符號
 * @returns 機率百分比
 */
export function calculateWinProbability(symbol: SlotSymbol): number {
  const singleProbability = calculateSymbolProbability(symbol) / 100
  // 3 個獨立轉輪都需要是同一符號
  return singleProbability ** 3 * 100
}
