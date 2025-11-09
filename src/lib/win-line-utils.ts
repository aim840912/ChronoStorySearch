import type { WinLine } from '@/types/slot'

/**
 * 3x3 網格配置
 * 對應 ReelDisplay 的尺寸設定
 */
export const GRID_CONFIG = {
  // 符號框尺寸（w-20 h-20 在 mobile, w-24 h-24 在 desktop）
  boxSize: {
    mobile: 80,  // w-20 = 5rem = 80px
    desktop: 96, // w-24 = 6rem = 96px
  },
  gap: 8, // gap-2 = 0.5rem = 8px
}

/**
 * 線條顏色配置（支援深色模式）
 */
export const LINE_COLORS = {
  light: '#F59E0B',  // amber-500 亮色模式
  dark: '#FBBF24',   // amber-400 深色模式（更亮）
}

/**
 * 將位置編號（0-8）轉換為 reel 座標
 *
 * 實際 DOM 結構是 3 個垂直的 reel（轉輪），每個 reel 有 3 個符號：
 *
 *    Reel 0    Reel 1    Reel 2
 *    [上0]     [上1]     [上2]     ← 位置 0, 1, 2
 *    [中0]     [中1]     [中2]     ← 位置 3, 4, 5
 *    [下0]     [下1]     [下2]     ← 位置 6, 7, 8
 *
 * @param position - 位置編號 (0-8)
 * @returns { reel: 轉輪索引 (0-2), row: 垂直位置 (0=上, 1=中, 2=下) }
 */
export function positionToReelCoord(position: number): { reel: number; row: number } {
  return {
    reel: position % 3,              // 0-2: 哪個 reel
    row: Math.floor(position / 3),   // 0-2: 上(0)、中(1)、下(2)
  }
}

/**
 * 計算符號框中心點的 SVG 座標
 *
 * @param reel - 轉輪索引 (0-2)，對應水平位置
 * @param row - 垂直位置 (0-2)，對應上中下
 * @param boxSize - 符號框尺寸
 * @param gap - 間隙尺寸
 * @returns 中心點座標 { x, y }
 */
export function getCenterPoint(
  reel: number,
  row: number,
  boxSize: number,
  gap: number
): { x: number; y: number } {
  // X 座標：水平位置（reel 索引）
  const x = reel * (boxSize + gap) + boxSize / 2

  // Y 座標：垂直位置（row 索引）
  const y = row * (boxSize + gap) + boxSize / 2

  return { x, y }
}

/**
 * 根據獲勝線的位置計算 SVG 線條的起點和終點
 *
 * @param line - 獲勝線定義
 * @param boxSize - 符號框尺寸
 * @param gap - 間隙尺寸
 * @returns 線條起點和終點座標
 */
export function getLineEndpoints(
  line: WinLine,
  boxSize: number,
  gap: number
): {
  start: { x: number; y: number }
  end: { x: number; y: number }
} {
  const [startPos, , endPos] = line.positions

  const startCoord = positionToReelCoord(startPos)
  const endCoord = positionToReelCoord(endPos)

  return {
    start: getCenterPoint(startCoord.reel, startCoord.row, boxSize, gap),
    end: getCenterPoint(endCoord.reel, endCoord.row, boxSize, gap),
  }
}

/**
 * 計算 SVG 容器的總尺寸
 *
 * @param boxSize - 符號框尺寸
 * @param gap - 間隙尺寸
 * @returns 容器寬度和高度
 */
export function getSVGContainerSize(
  boxSize: number,
  gap: number
): { width: number; height: number } {
  // 3 個符號框 + 2 個間隙
  const width = 3 * boxSize + 2 * gap
  const height = 3 * boxSize + 2 * gap

  return { width, height }
}
