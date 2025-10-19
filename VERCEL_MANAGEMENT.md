# Vercel 專案管理指南

此文件說明如何使用 Vercel REST API 暫停和恢復專案。

---

## 🎯 功能說明

透過 npm 指令，你可以：
- **暫停專案**: 立即停止所有流量，網站無法訪問
- **恢復專案**: 恢復專案運作
- **查詢狀態**: 檢視專案當前狀態和部署資訊

---

## 📋 設定步驟

### 步驟 1: 獲取 Vercel API Token

1. 前往 [Vercel Tokens 頁面](https://vercel.com/account/tokens)
2. 點擊 **"Create Token"**
3. 設定 Token 名稱（例如: `Project Management`）
4. 選擇 **Scope**:
   - 如果是個人專案: 選擇 **Full Account**
   - 如果是團隊專案: 選擇特定 Team
5. 點擊 **"Create"**
6. **立即複製 Token**（只會顯示一次！）

---

### 步驟 2: 獲取 Project ID

1. 前往你的專案 Dashboard: `https://vercel.com/[your-team]/[project-name]`
2. 點擊 **Settings** → **General**
3. 滾動到頁面底部，找到 **"Project ID"**
4. 複製 Project ID

---

### 步驟 3: 獲取 Team ID (如果是團隊專案)

**只有團隊專案需要此步驟，個人專案可以跳過**

1. 前往 **Team Settings**
2. 在 URL 中可以看到 Team ID: `https://vercel.com/teams/[team-id]/settings`
3. 或在 **Settings** → **General** 中找到
4. 複製 Team ID

---

### 步驟 4: 建立環境變數檔案

1. **複製範本檔案**:
   ```bash
   cp .env.local.example .env.local
   ```

2. **編輯 `.env.local`** 並填入你的值:
   ```env
   VERCEL_TOKEN=vercel_live_xxxxxxxxxxxxxxxxxxxxx
   VERCEL_PROJECT_ID=prj_xxxxxxxxxxxxxxxxxxxxx

   # 如果是團隊專案，取消註解並填入:
   # VERCEL_TEAM_ID=team_xxxxxxxxxxxxxxxxxxxxx
   ```

3. **儲存檔案**

⚠️ **重要**: `.env.local` 已被 `.gitignore` 忽略，不會提交到 Git

---

## 🚀 使用方式

### 查詢專案狀態

```bash
npm run vercel:status
```

**輸出範例**:
```
🔧 Vercel 專案管理工具

ℹ️  正在查詢專案狀態...

═══════════════════════════════════════
📦 專案名稱: maplestory
🆔 專案 ID: prj_xxxxxxxxxxxxxxxxxxxxx
🔗 專案 URL: https://vercel.com/your-team/maplestory
▶️  狀態: 運行中
⚙️  框架: next.js
🚀 最新部署: maplestory-xyz.vercel.app
📅 部署時間: 2025/1/20 下午3:45:12
═══════════════════════════════════════

ℹ️  執行 npm run vercel:pause 可暫停專案
```

---

### 暫停專案

```bash
npm run vercel:pause
```

**輸出範例**:
```
🔧 Vercel 專案管理工具

ℹ️  正在暫停專案...
✅ 專案已成功暫停！
ℹ️  網站現在無法訪問
ℹ️  執行 npm run vercel:unpause 可恢復專案
```

**效果**:
- 網站立即無法訪問
- 所有 Edge Requests 停止計費
- 專案在 Vercel Dashboard 顯示為 "Paused"

---

### 恢復專案

```bash
npm run vercel:unpause
```

**輸出範例**:
```
🔧 Vercel 專案管理工具

ℹ️  正在恢復專案...
✅ 專案已成功恢復！
ℹ️  網站現在可以正常訪問
```

**效果**:
- 網站立即恢復訪問
- 恢復正常運作

---

## 🔐 安全性建議

### ✅ 已實施的安全措施

1. **Token 本地儲存**: API Token 只儲存在本地 `.env.local`
2. **Git 忽略**: `.env.local` 已加入 `.gitignore`，不會提交到版本控制
3. **權限控制**: Token 可限制為特定團隊或專案

### ⚠️ 注意事項

1. **不要分享 Token**: Token 擁有完整權限，切勿分享給他人
2. **定期更換**: 建議定期更換 API Token
3. **最小權限原則**: 建議為 Token 設定最小必要權限
4. **撤銷舊 Token**: 如果 Token 洩漏，立即前往 Vercel 撤銷

---

## 🐛 常見問題

### Q: 出現 "缺少 VERCEL_TOKEN 環境變數" 錯誤

**解決方式**:
1. 確認 `.env.local` 檔案存在
2. 確認檔案中有 `VERCEL_TOKEN=xxx`
3. 確認沒有拼字錯誤
4. 重新執行指令

---

### Q: 出現 "無法獲取專案資訊" 錯誤

**可能原因**:
1. **Project ID 錯誤**: 檢查 `.env.local` 中的 `VERCEL_PROJECT_ID`
2. **Token 權限不足**: 確認 Token 有訪問此專案的權限
3. **團隊專案需要 Team ID**: 如果是團隊專案，需要設定 `VERCEL_TEAM_ID`

**解決方式**:
```bash
# 先測試連線
npm run vercel:status

# 如果是團隊專案，取消註解並填入 Team ID
# VERCEL_TEAM_ID=team_xxxxxxxxxxxxxxxxxxxxx
```

---

### Q: Token 在哪裡？我找不到了

**解決方式**:
1. Vercel Token 只在生成時顯示一次
2. 如果忘記，需要重新生成:
   - 前往 https://vercel.com/account/tokens
   - 刪除舊 Token
   - 建立新 Token
   - 更新 `.env.local`

---

### Q: 暫停後還會計費嗎？

**答案**: 不會

- 專案暫停後，所有 Edge Requests 停止
- 不會產生新的費用
- 恢復專案後才會繼續計費

---

### Q: 暫停會影響資料嗎？

**答案**: 不會

- 暫停只是停止專案運作
- 所有資料、設定、部署歷史都保留
- 恢復後一切如常

---

## 📚 進階使用

### 整合到 CI/CD

你可以在 GitHub Actions 中使用這些指令：

```yaml
# .github/workflows/pause-on-weekend.yml
name: Pause on Weekend
on:
  schedule:
    - cron: '0 0 * * 6'  # 每週六 00:00

jobs:
  pause:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Setup Node
        uses: actions/setup-node@v4
        with:
          node-version: '20'
      - name: Pause project
        env:
          VERCEL_TOKEN: ${{ secrets.VERCEL_TOKEN }}
          VERCEL_PROJECT_ID: ${{ secrets.VERCEL_PROJECT_ID }}
        run: npm run vercel:pause
```

---

### 自動化預算保護

結合 Vercel Spend Management Webhook，可以實現：

1. 達到預算上限時自動暫停
2. 每日自動檢查使用量
3. 發送通知到 Slack/Discord

---

## 🔗 相關連結

- [Vercel REST API 文檔](https://vercel.com/docs/rest-api)
- [Vercel Tokens 管理](https://vercel.com/account/tokens)
- [Vercel Spend Management](https://vercel.com/docs/pricing/networking)

---

## 📝 腳本檔案

- **主腳本**: `scripts/vercel-manage.js`
- **環境變數範本**: `.env.local.example`
- **環境變數**: `.env.local` (不會提交到 Git)

---

## 💡 技術細節

- **語言**: Node.js (無額外依賴)
- **API**: Vercel REST API v1/v9
- **認證**: Bearer Token
- **請求方式**: HTTPS

---

如有任何問題或建議，歡迎提出 Issue！
