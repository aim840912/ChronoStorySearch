# Discord OAuth 2.0 設定指南

> **階段 1**：Discord 認證系統設定
>
> **預估時間**：15-30 分鐘（首次設定）

---

## 步驟 1：建立 Discord Application

### 1.1 前往 Discord Developer Portal

1. 打開瀏覽器，前往 [Discord Developer Portal](https://discord.com/developers/applications)
2. 使用您的 Discord 帳號登入
3. 點擊右上角的 **「New Application」** 按鈕

### 1.2 建立 Application

1. **Application Name**：輸入應用程式名稱
   ```
   建議名稱：MapleStory Trading System
   ```

2. 閱讀並同意 Discord 服務條款

3. 點擊 **「Create」**

---

## 步驟 2：配置 OAuth2 設定

### 2.1 取得 Client ID 和 Secret

1. 在左側選單點擊 **「OAuth2」** → **「General」**

2. 複製以下資訊（稍後需要貼到 `.env.local`）：
   - **Client ID**：顯示在 「CLIENT ID」欄位
   - **Client Secret**：點擊 「Reset Secret」（首次）或 「Copy」

   ⚠️ **重要**：Client Secret 只會顯示一次，請立即複製儲存！

### 2.2 設定 Redirect URIs

1. 在同一頁面找到 **「Redirects」** 區塊

2. 點擊 **「Add Redirect」**，新增以下兩個 URI：

   **開發環境**：
   ```
   http://localhost:3000/api/auth/discord/callback
   ```

   **生產環境**（Vercel 部署後）：
   ```
   https://your-domain.vercel.app/api/auth/discord/callback
   ```

   替換 `your-domain` 為您的實際域名。

3. 點擊 **「Save Changes」**

---

## 步驟 3：配置環境變數

### 3.1 編輯 `.env.local`

打開專案根目錄的 `.env.local` 檔案，在最後新增以下內容：

```bash
# ============================================================
# Discord OAuth 2.0 設定
# ============================================================

# Discord Application Client ID（從 Developer Portal 複製）
DISCORD_CLIENT_ID=your_client_id_here

# Discord Application Client Secret（從 Developer Portal 複製）
# ⚠️ 請勿洩漏此金鑰，不要提交到 Git
DISCORD_CLIENT_SECRET=your_client_secret_here

# OAuth 重導向 URI（需與 Discord Developer Portal 設定一致）
DISCORD_REDIRECT_URI=http://localhost:3000/api/auth/discord/callback

# （可選）Discord Bot Token（如需 Bot 功能）
# DISCORD_BOT_TOKEN=your_bot_token_here

# （可選）Discord Server ID（如需檢查用戶是否在特定伺服器）
# DISCORD_GUILD_ID=your_server_id_here
```

### 3.2 填入實際值

將 `your_client_id_here` 和 `your_client_secret_here` 替換為步驟 2.1 複製的實際值。

**範例**（僅供參考，請使用您自己的值）：
```bash
DISCORD_CLIENT_ID=1234567890123456789
DISCORD_CLIENT_SECRET=abcdefghijklmnopqrstuvwxyz123456
DISCORD_REDIRECT_URI=http://localhost:3000/api/auth/discord/callback
```

---

## 步驟 4：驗證設定

### 4.1 檢查環境變數

執行以下指令確認環境變數已正確設定：

```bash
# 檢查是否已設定（不會顯示實際值）
grep -E "DISCORD_CLIENT_ID|DISCORD_CLIENT_SECRET|DISCORD_REDIRECT_URI" .env.local
```

應該看到三行包含這些變數的輸出。

### 4.2 重啟開發伺服器

如果開發伺服器正在運行，請重啟以載入新的環境變數：

```bash
# 停止開發伺服器（Ctrl+C）

# 重新啟動
npm run dev
```

---

## 步驟 5：測試 OAuth 流程

### 5.1 啟動 OAuth 流程

開啟瀏覽器，前往：

```
http://localhost:3000/api/auth/discord
```

**預期行為**：
- 自動重導向至 Discord 授權頁面
- 顯示授權請求（「MapleStory Trading System 想要訪問您的帳號」）

### 5.2 授權應用程式

1. 在 Discord 授權頁面，點擊 **「授權」**

2. 完成授權後，Discord 會重導向回您的應用程式：
   ```
   http://localhost:3000/api/auth/discord/callback?code=...&state=...
   ```

3. **預期結果**：
   - ✅ 成功：顯示「登入成功」訊息，設定 session cookie
   - ❌ 失敗：顯示錯誤訊息（檢查環境變數和 Redirect URI 設定）

---

## 常見問題

### Q1: 「Invalid Redirect URI」錯誤

**原因**：`.env.local` 中的 `DISCORD_REDIRECT_URI` 與 Discord Developer Portal 設定不一致。

**解決方法**：
1. 檢查 Discord Developer Portal 的 Redirects 設定
2. 確保 URI 完全一致（包含 http/https、域名、路徑）
3. 重啟開發伺服器

### Q2: 「Invalid Client Secret」錯誤

**原因**：Client Secret 錯誤或已過期。

**解決方法**：
1. 前往 Discord Developer Portal
2. 在 OAuth2 頁面點擊 **「Reset Secret」**
3. 複製新的 Secret 並更新 `.env.local`
4. 重啟開發伺服器

### Q3: 授權後顯示 404 錯誤

**原因**：OAuth callback 端點尚未實作或路徑錯誤。

**解決方法**：
1. 確認檔案存在：`src/app/api/auth/discord/callback/route.ts`
2. 確認 Redirect URI 路徑正確（`/api/auth/discord/callback`）

### Q4: Session cookie 沒有設定

**原因**：Cookie 設定可能被瀏覽器安全策略阻擋。

**解決方法**：
1. 開發環境使用 `http://localhost`（不要用 127.0.0.1）
2. 檢查瀏覽器 DevTools → Application → Cookies
3. 確認 `SameSite` 設定為 `Lax`（而非 `Strict`）

---

## 生產環境部署

### Vercel 環境變數設定

1. 前往 Vercel Dashboard → 您的專案 → **Settings** → **Environment Variables**

2. 新增以下變數（每個變數需要分別新增）：
   - `DISCORD_CLIENT_ID`：貼上您的 Client ID
   - `DISCORD_CLIENT_SECRET`：貼上您的 Client Secret
   - `DISCORD_REDIRECT_URI`：更新為生產環境 URI
     ```
     https://your-domain.vercel.app/api/auth/discord/callback
     ```

3. 選擇適用環境：
   - ✅ Production
   - ✅ Preview
   - ✅ Development

4. 點擊 **「Save」**

5. 重新部署專案以套用新的環境變數

### Discord Developer Portal 生產環境設定

1. 前往 OAuth2 設定頁面
2. 在 Redirects 新增生產環境 URI：
   ```
   https://your-domain.vercel.app/api/auth/discord/callback
   ```
3. 儲存變更

---

## 安全注意事項

### ⚠️ 絕對不要做的事

1. **不要** 將 Client Secret 提交到 Git
2. **不要** 在前端程式碼中暴露 Client Secret
3. **不要** 在公開場合分享 Client Secret
4. **不要** 在截圖中包含 Client Secret

### ✅ 安全最佳實踐

1. ✅ Client Secret 僅存在於 `.env.local`（已加入 `.gitignore`）
2. ✅ 使用 Vercel 環境變數管理生產環境金鑰
3. ✅ 定期輪換 Client Secret（每 3-6 個月）
4. ✅ 啟用 Discord Application 的 2FA（Two-Factor Authentication）

---

## 下一步

設定完成後，您可以：

1. ✅ 測試完整的 OAuth 流程（登入 → 授權 → 回調 → Session 建立）
2. ✅ 實作前端登入按鈕（`components/auth/LoginButton.tsx`）
3. ✅ 實作登出功能（`POST /api/auth/logout`）
4. ✅ 實作個人資料頁面（顯示 Discord 用戶資訊）

繼續前往：**階段 2 - 核心功能實作**

---

**疑難排解**：如遇到問題，請檢查：
1. `.env.local` 檔案格式正確（無多餘空格）
2. Discord Developer Portal 設定已儲存
3. 開發伺服器已重啟
4. 瀏覽器無快取問題（使用無痕模式測試）

**需要協助**？請查看：
- [Discord OAuth2 官方文件](https://discord.com/developers/docs/topics/oauth2)
- [專案架構文件](./architecture/交易系統/02-認證與資料庫.md)
