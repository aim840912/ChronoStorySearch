/**
 * Tab Leader Election using BroadcastChannel
 *
 * 同一瀏覽器的多個分頁中，只有一個「Leader」維持 WebSocket 連線
 * 其他分頁作為「Follower」接收 Leader 廣播的訊息
 *
 * 運作流程：
 * 1. 新分頁開啟時發送 LEADER_CLAIM
 * 2. 如果在 LEADER_TIMEOUT 內沒收到其他 Leader 的心跳，就成為 Leader
 * 3. Leader 定期發送 HEARTBEAT
 * 4. 如果 Follower 超過 LEADER_TIMEOUT 沒收到心跳，嘗試成為新 Leader
 * 5. Leader 關閉時發送 LEADER_RESIGN，讓其他分頁接管
 *
 * 安全性：
 * - 使用 Zod Schema 驗證訊息格式，防止惡意訊息注入
 */

import { z } from 'zod'

// ============================================
// 訊息格式驗證 Schema
// ============================================

const TabMessageSchema = z.object({
  type: z.enum(['HEARTBEAT', 'LEADER_CLAIM', 'REALTIME_UPDATE', 'LEADER_RESIGN', 'TAB_PING', 'TAB_PONG']),
  tabId: z.string().regex(/^tab_\d+_[a-z0-9]+$/),
  timestamp: z.number().int().positive(),
  payload: z.unknown().optional(),
})

const CHANNEL_NAME = 'chronostory-realtime'
const HEARTBEAT_INTERVAL = 2000 // 心跳間隔 2 秒
const LEADER_TIMEOUT = 5000 // Leader 超時 5 秒
const CLAIM_DELAY = 500 // 宣告 Leader 前等待時間
const TAB_DISCOVERY_DELAY = 300 // 分頁發現等待時間

interface TabMessage {
  type: 'HEARTBEAT' | 'LEADER_CLAIM' | 'REALTIME_UPDATE' | 'LEADER_RESIGN' | 'TAB_PING' | 'TAB_PONG'
  tabId: string
  timestamp: number
  payload?: unknown
}

interface TabLeaderController {
  /** 廣播 Realtime 更新給其他分頁 */
  broadcastUpdate: (payload: unknown) => void
  /** 清理資源 */
  cleanup: () => void
  /** 是否為 Leader */
  isLeader: () => boolean
}

/**
 * 創建 Tab Leader 控制器
 *
 * @param onBecomeLeader - 成為 Leader 時的回調（應建立 WebSocket）
 * @param onBecomeFollower - 成為 Follower 時的回調（應關閉 WebSocket）
 * @param onRealtimeUpdate - 收到其他分頁廣播的 Realtime 更新
 */
export function createTabLeader(
  onBecomeLeader: () => void,
  onBecomeFollower: () => void,
  onRealtimeUpdate: (payload: unknown) => void
): TabLeaderController {
  // 檢查 BroadcastChannel 是否可用（SSR 安全）
  if (typeof window === 'undefined' || !('BroadcastChannel' in window)) {
    // 不支援 BroadcastChannel，直接當 Leader
    console.log('[TabLeader] BroadcastChannel 不支援，作為獨立 Leader')
    onBecomeLeader()
    return {
      broadcastUpdate: () => {},
      cleanup: () => {},
      isLeader: () => true,
    }
  }

  const tabId = `tab_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`
  const channel = new BroadcastChannel(CHANNEL_NAME)

  let isLeaderState = false
  let hasMultipleTabs = false // 是否有多個分頁
  let realtimeConnected = false // 是否已建立 Realtime 連線
  let heartbeatTimer: ReturnType<typeof setInterval> | null = null
  let leaderTimeoutTimer: ReturnType<typeof setTimeout> | null = null
  let claimTimer: ReturnType<typeof setTimeout> | null = null
  let discoveryTimer: ReturnType<typeof setTimeout> | null = null
  let lastLeaderHeartbeat = 0

  const log = (msg: string, ...args: unknown[]) => {
    console.log(`[TabLeader:${tabId.slice(-6)}] ${msg}`, ...args)
  }

  /**
   * 當偵測到多分頁時，啟動 Realtime 連線
   */
  const enableRealtimeIfNeeded = () => {
    if (!hasMultipleTabs || realtimeConnected) return

    hasMultipleTabs = true
    log('偵測到多分頁，啟動 Realtime 同步')

    // 只有 Leader 建立 Realtime 連線
    if (isLeaderState) {
      realtimeConnected = true
      onBecomeLeader()
    }
  }

  const sendMessage = (msg: Omit<TabMessage, 'tabId' | 'timestamp'>) => {
    const fullMsg: TabMessage = {
      ...msg,
      tabId,
      timestamp: Date.now(),
    }
    channel.postMessage(fullMsg)
  }

  const becomeLeader = () => {
    if (isLeaderState) return

    isLeaderState = true
    log('成為 Leader')

    // 清除等待計時器
    if (claimTimer) {
      clearTimeout(claimTimer)
      claimTimer = null
    }
    if (leaderTimeoutTimer) {
      clearTimeout(leaderTimeoutTimer)
      leaderTimeoutTimer = null
    }

    // 開始發送心跳
    heartbeatTimer = setInterval(() => {
      sendMessage({ type: 'HEARTBEAT' })
    }, HEARTBEAT_INTERVAL)

    // 立即發送一次心跳
    sendMessage({ type: 'HEARTBEAT' })

    // 優化：只在有多分頁時才建立 Realtime 連線
    // 單分頁不需要跨分頁同步，節省 Supabase Realtime 連線
    if (hasMultipleTabs && !realtimeConnected) {
      realtimeConnected = true
      onBecomeLeader()
    }
  }

  const becomeFollower = () => {
    if (!isLeaderState) return

    isLeaderState = false
    log('成為 Follower')

    // 停止心跳
    if (heartbeatTimer) {
      clearInterval(heartbeatTimer)
      heartbeatTimer = null
    }

    onBecomeFollower()
  }

  const startLeaderTimeout = () => {
    if (leaderTimeoutTimer) {
      clearTimeout(leaderTimeoutTimer)
    }

    leaderTimeoutTimer = setTimeout(() => {
      const now = Date.now()
      if (now - lastLeaderHeartbeat > LEADER_TIMEOUT) {
        log('Leader 超時，嘗試接管')
        tryClaimLeader()
      }
    }, LEADER_TIMEOUT)
  }

  const tryClaimLeader = () => {
    // 發送宣告
    sendMessage({ type: 'LEADER_CLAIM' })

    // 等待一小段時間，看是否有其他 Leader 回應
    claimTimer = setTimeout(() => {
      const now = Date.now()
      if (now - lastLeaderHeartbeat > CLAIM_DELAY) {
        becomeLeader()
      }
    }, CLAIM_DELAY)
  }

  // 監聽訊息
  channel.onmessage = (event: MessageEvent) => {
    // 安全驗證：驗證訊息格式，防止惡意訊息注入
    const parseResult = TabMessageSchema.safeParse(event.data)
    if (!parseResult.success) {
      console.warn('[TabLeader] 收到無效訊息格式，忽略:', parseResult.error.issues)
      return
    }

    const msg = parseResult.data
    if (msg.tabId === tabId) return // 忽略自己的訊息

    switch (msg.type) {
      case 'HEARTBEAT':
        lastLeaderHeartbeat = msg.timestamp
        // 收到心跳意味著有多分頁
        if (!hasMultipleTabs) {
          hasMultipleTabs = true
          log('收到心跳，偵測到多分頁')
          enableRealtimeIfNeeded()
        }
        if (isLeaderState) {
          // 有其他 Leader 存在，降級為 Follower
          log('檢測到其他 Leader，降級為 Follower')
          becomeFollower()
        }
        // 重置超時計時器
        startLeaderTimeout()
        break

      case 'LEADER_CLAIM':
        if (isLeaderState) {
          // 我是 Leader，立即發送心跳讓對方知道
          sendMessage({ type: 'HEARTBEAT' })
        }
        break

      case 'LEADER_RESIGN':
        log('收到 Leader 辭職通知')
        // 立即嘗試成為新 Leader
        tryClaimLeader()
        break

      case 'REALTIME_UPDATE':
        if (!isLeaderState && msg.payload) {
          // Follower 收到 Leader 廣播的更新
          log('收到 Leader 廣播的更新')
          onRealtimeUpdate(msg.payload)
        }
        break

      case 'TAB_PING':
        // 收到其他分頁的探測，回應 PONG
        sendMessage({ type: 'TAB_PONG' })
        // 偵測到多分頁
        if (!hasMultipleTabs) {
          hasMultipleTabs = true
          log('收到其他分頁 PING，偵測到多分頁')
          enableRealtimeIfNeeded()
        }
        break

      case 'TAB_PONG':
        // 收到其他分頁的回應，確認有多分頁
        if (!hasMultipleTabs) {
          hasMultipleTabs = true
          log('收到其他分頁 PONG，確認有多分頁')
          enableRealtimeIfNeeded()
        }
        break
    }
  }

  // 頁面關閉時通知其他分頁
  const handleBeforeUnload = () => {
    if (isLeaderState) {
      sendMessage({ type: 'LEADER_RESIGN' })
    }
    cleanup()
  }

  window.addEventListener('beforeunload', handleBeforeUnload)

  // 初始化：發送 PING 探測其他分頁
  sendMessage({ type: 'TAB_PING' })

  // 等待一小段時間看是否有其他分頁回應
  discoveryTimer = setTimeout(() => {
    discoveryTimer = null
    // 無論是否有多分頁，都嘗試成為 Leader（用於心跳機制）
    tryClaimLeader()

    if (!hasMultipleTabs) {
      log('未偵測到其他分頁，跳過 Realtime 連線（節省資源）')
    }
  }, TAB_DISCOVERY_DELAY)

  const cleanup = () => {
    window.removeEventListener('beforeunload', handleBeforeUnload)

    if (heartbeatTimer) {
      clearInterval(heartbeatTimer)
      heartbeatTimer = null
    }
    if (leaderTimeoutTimer) {
      clearTimeout(leaderTimeoutTimer)
      leaderTimeoutTimer = null
    }
    if (claimTimer) {
      clearTimeout(claimTimer)
      claimTimer = null
    }
    if (discoveryTimer) {
      clearTimeout(discoveryTimer)
      discoveryTimer = null
    }

    channel.close()
  }

  return {
    broadcastUpdate: (payload: unknown) => {
      if (isLeaderState) {
        sendMessage({ type: 'REALTIME_UPDATE', payload })
      }
    },
    cleanup,
    isLeader: () => isLeaderState,
  }
}
