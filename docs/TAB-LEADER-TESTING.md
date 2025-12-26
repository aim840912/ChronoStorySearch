# Tab Leader 多分頁共享連線測試指南

## 功能說明

使用 BroadcastChannel API 實現同一瀏覽器多個分頁共享單一 WebSocket 連線：

- **Leader 分頁**：維持 Supabase Realtime WebSocket 連線
- **Follower 分頁**：不建立 WebSocket，透過 BroadcastChannel 接收更新

## 連線數優化效果

| 情境 | 優化前 | 優化後 |
|------|--------|--------|
| 1 用戶開 1 分頁 | 1 連線 | 1 連線 |
| 1 用戶開 3 分頁 | 3 連線 | **1 連線** |
| 10 用戶各開 2 分頁 | 20 連線 | **10 連線** |

---

## 手動測試步驟

### 前置條件

- 開發伺服器運行中：`npm run dev`
- 使用 Chrome 或其他支援 BroadcastChannel 的瀏覽器

### 測試 1：Leader 選舉

1. 開啟 Chrome 瀏覽器
2. 開啟第一個分頁：`http://localhost:3000`
3. 按 F12 開啟 DevTools → Console
4. 使用 Discord 登入
5. **預期結果**：
   ```
   [TabLeader:xxx] 成為 Leader
   [PreferencesSync] 成為 Leader，建立 Realtime 連線
   [Realtime] 已訂閱 user_preferences 變更
   ```

### 測試 2：Follower 加入

1. 在**同一瀏覽器視窗**開啟第二個分頁：`http://localhost:3000`
2. 開啟 DevTools → Console
3. **預期結果**：
   ```
   [TabLeader:yyy] 成為 Follower
   [PreferencesSync] 成為 Follower，關閉 Realtime 連線
   ```

### 測試 3：跨分頁同步

1. 在第一個分頁（Leader）切換主題（深色/淺色）
2. 觀察第二個分頁（Follower）
3. **預期結果**：
   - 第二個分頁立即更新主題
   - Console 顯示：`[PreferencesSync] 收到 Leader 廣播的更新`

### 測試 4：Leader 交接

1. 關閉第一個分頁（Leader）
2. 觀察第二個分頁的 Console
3. **預期結果**（約 5 秒後）：
   ```
   [TabLeader:yyy] Leader 超時，嘗試接管
   [TabLeader:yyy] 成為 Leader
   [PreferencesSync] 成為 Leader，建立 Realtime 連線
   ```

### 測試 5：多裝置同步

1. 確認本機有一個 Leader 分頁
2. 在另一台裝置（或無痕視窗）登入同一帳號
3. 在另一台裝置切換設定
4. **預期結果**：
   - 本機 Leader 分頁透過 WebSocket 收到更新
   - 本機其他 Follower 分頁透過 BroadcastChannel 收到更新

---

## 相關檔案

| 檔案 | 說明 |
|------|------|
| `src/lib/tab-leader.ts` | Tab Leader 選舉機制 |
| `src/contexts/PreferencesSyncContext.tsx` | 偏好設定同步 Context |
| `src/lib/supabase/realtime-preferences.ts` | Supabase Realtime 訂閱 |

---

## 常見問題

### Q: 為什麼兩個分頁都顯示 "成為 Leader"？

可能原因：
1. 兩個分頁在不同的瀏覽器（Chrome + Firefox）
2. 一個是無痕視窗、一個是正常視窗
3. BroadcastChannel 不支援（舊版瀏覽器）

**解決方式**：確保兩個分頁在同一瀏覽器的同一視窗中

### Q: 關閉 Leader 後，Follower 沒有接管？

可能原因：Leader 超時時間為 5 秒，請等待

### Q: 收不到其他裝置的更新？

檢查：
1. Supabase Realtime 是否已啟用 `user_preferences` 表
2. Console 是否有 `[Realtime] 已訂閱` 訊息
3. RLS 政策是否正確

---

## 技術細節

### 心跳機制

- **心跳間隔**：2 秒
- **Leader 超時**：5 秒
- **宣告延遲**：500ms（避免競爭條件）

### 訊息類型

| 類型 | 說明 |
|------|------|
| `HEARTBEAT` | Leader 定期發送，表示仍在線 |
| `LEADER_CLAIM` | 新分頁嘗試成為 Leader |
| `LEADER_RESIGN` | Leader 關閉時通知其他分頁 |
| `REALTIME_UPDATE` | Leader 廣播 Realtime 更新給 Follower |
