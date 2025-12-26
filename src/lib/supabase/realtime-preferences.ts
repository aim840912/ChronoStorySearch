import { supabase } from './client'
import type { RealtimeChannel, RealtimePostgresChangesPayload } from '@supabase/supabase-js'
import type { UserPreferencesRow } from './preferences-service'

/**
 * Realtime 變更事件的 Payload 型別
 */
export interface PreferencesRealtimePayload {
  eventType: 'UPDATE'
  new: UserPreferencesRow
  old: UserPreferencesRow
}

/**
 * 訂閱用戶偏好設定的即時變更
 *
 * @param userId - 要訂閱的用戶 ID
 * @param onUpdate - 收到變更時的回調函數
 * @returns RealtimeChannel 實例（用於取消訂閱）
 *
 * @example
 * ```ts
 * const channel = subscribeToPreferences(user.id, (payload) => {
 *   console.log('收到變更:', payload.new)
 * })
 *
 * // 取消訂閱
 * unsubscribeFromPreferences(channel)
 * ```
 */
export function subscribeToPreferences(
  userId: string,
  onUpdate: (payload: PreferencesRealtimePayload) => void
): RealtimeChannel {
  const channel = supabase
    .channel(`user_preferences:${userId}`)
    .on(
      'postgres_changes',
      {
        event: 'UPDATE',
        schema: 'public',
        table: 'user_preferences',
        filter: `user_id=eq.${userId}`,
      },
      (payload: RealtimePostgresChangesPayload<UserPreferencesRow>) => {
        const newRow = payload.new as UserPreferencesRow

        // 安全驗證：確保收到的資料確實屬於當前用戶
        // 這是防禦性編程，即使 RLS 失效也不會套用別人的資料
        if (newRow.user_id !== userId) {
          console.error(
            '[Realtime] 安全警告：收到不匹配的用戶資料',
            { expected: userId, received: newRow.user_id }
          )
          return
        }

        // 轉換為我們的型別
        const typedPayload: PreferencesRealtimePayload = {
          eventType: 'UPDATE',
          new: newRow,
          old: payload.old as UserPreferencesRow,
        }
        onUpdate(typedPayload)
      }
    )
    .subscribe((status) => {
      if (status === 'SUBSCRIBED') {
        console.log('[Realtime] 已訂閱 user_preferences 變更')
      } else if (status === 'CHANNEL_ERROR') {
        console.error('[Realtime] 訂閱失敗，將自動重試')
      }
    })

  return channel
}

/**
 * 取消訂閱偏好設定的即時變更
 *
 * @param channel - 要取消的 RealtimeChannel
 */
export function unsubscribeFromPreferences(channel: RealtimeChannel): void {
  supabase.removeChannel(channel)
  console.log('[Realtime] 已取消訂閱 user_preferences')
}
