/**
 * 拉霸機相關類型定義
 */

/**
 * 拉霸符號定義
 */
export interface SlotSymbol {
  /** 符號唯一識別碼 */
  id: string
  /** 符號名稱（英文） */
  name: string
  /** 符號中文名稱 */
  chineseName: string | null
  /** 怪物 ID */
  mobId: number
  /** 符號權重（出現機率） */
  weight: number
  /** 賠率倍數 */
  payout: number
}

/**
 * 轉輪狀態
 */
export type ReelStatus = 'idle' | 'spinning' | 'stopping' | 'stopped'

/**
 * 單個轉輪資料（顯示 3 個符號：上、中、下）
 */
export interface Reel {
  /** 轉輪索引 (0-2) */
  index: number
  /** 當前顯示的 3 個符號（上、中、下） */
  symbols: [SlotSymbol | null, SlotSymbol | null, SlotSymbol | null]
  /** 轉輪狀態 */
  status: ReelStatus
}

/**
 * 獲勝線定義
 */
export interface WinLine {
  /** 獲勝線 ID */
  id: string
  /** 獲勝線名稱 */
  name: string
  /** 獲勝線位置索引 (長度為 3) */
  positions: [number, number, number]
}

/**
 * 拉霸結果
 */
export interface SlotResult {
  /** 3×3 網格的符號結果（9 個符號，按行存儲：[上排, 中排, 下排]） */
  symbols: [
    [SlotSymbol, SlotSymbol, SlotSymbol],  // 上排 (位置 0, 1, 2)
    [SlotSymbol, SlotSymbol, SlotSymbol],  // 中排 (位置 3, 4, 5)
    [SlotSymbol, SlotSymbol, SlotSymbol]   // 下排 (位置 6, 7, 8)
  ]
  /** 獲勝的線 */
  winLines: WinLine[]
  /** 總賠率倍數 */
  totalPayout: number
  /** 是否獲勝 */
  isWin: boolean
}

/**
 * 獲勝線條動畫狀態
 */
export type WinLineAnimationStatus = 'idle' | 'flashing' | 'showing'

/**
 * 拉霸機狀態
 */
export interface SlotMachineState {
  /** 3 個轉輪 */
  reels: [Reel, Reel, Reel]
  /** 是否正在旋轉 */
  isSpinning: boolean
  /** 最後一次結果 */
  lastResult: SlotResult | null
  /** 總旋轉次數 */
  totalSpins: number
  /** 總獲勝次數 */
  totalWins: number
  /** 獲勝線條動畫狀態 */
  winLineStatus: WinLineAnimationStatus
}
