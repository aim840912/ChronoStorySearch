# Vercel 專案管理指南

透過 npm 指令管理 Vercel 專案的暫停和恢復功能。

**腳本位置**: `scripts/vercel-manage.js`

---

## 🚀 快速開始

### 1. 設定環境變數

複製範本並填入必要資訊：

```bash
cp .env.local.example .env.local
```

編輯 `.env.local` 並填入以下資訊：

```env
VERCEL_TOKEN=vercel_live_xxxxxxxxxxxxxxxxxxxxx
VERCEL_PROJECT_ID=prj_xxxxxxxxxxxxxxxxxxxxx

# 如果是團隊專案，取消註解並填入:
# VERCEL_TEAM_ID=team_xxxxxxxxxxxxxxxxxxxxx
```

### 2. 獲取所需資訊

| 項目 | 取得方式 | 必要性 |
|------|---------|--------|
| **API Token** | [Vercel Tokens](https://vercel.com/account/tokens) → Create Token | 必要 |
| **Project ID** | 專案 Settings → General → 底部找到 Project ID | 必要 |
| **Team ID** | Team Settings URL 或頁面中的 Team ID | 僅團隊專案 |

⚠️ **注意**: API Token 只顯示一次，請立即複製並妥善保管

---

## 📋 使用方式

### 查詢專案狀態

```bash
npm run vercel:status
```

顯示專案名稱、運行狀態、最新部署資訊等。

### 暫停專案

```bash
npm run vercel:pause
```

**效果**:
- 網站立即無法訪問
- 停止所有流量計費
- 專案標記為 "Paused"

### 恢復專案

```bash
npm run vercel:unpause
```

**效果**:
- 網站立即恢復訪問
- 恢復正常運作

---

## 🔐 安全性提示

- ✅ `.env.local` 已加入 `.gitignore`，不會提交到 Git
- ⚠️ **不要分享 Token** - Token 擁有完整專案權限
- 🔄 **定期更換 Token** - 建議定期更新 API Token
- 🚫 **Token 洩漏處理** - 立即前往 Vercel 撤銷舊 Token

---

## 🐛 常見問題

### Q: 出現 "缺少 VERCEL_TOKEN 環境變數" 錯誤

**解決方式**:
1. 確認 `.env.local` 檔案存在
2. 確認檔案中有 `VERCEL_TOKEN=xxx`（無拼字錯誤）
3. 重新執行指令

### Q: 出現 "無法獲取專案資訊" 錯誤

**可能原因**:
- Project ID 錯誤
- Token 權限不足
- 團隊專案缺少 Team ID

**解決方式**:
```bash
# 先測試連線
npm run vercel:status

# 如果是團隊專案，在 .env.local 中設定 VERCEL_TEAM_ID
```

### Q: Token 遺失怎麼辦？

Token 只在生成時顯示一次，若遺失需重新生成：
1. 前往 https://vercel.com/account/tokens
2. 刪除舊 Token
3. 建立新 Token
4. 更新 `.env.local`

### Q: 暫停專案會影響資料或計費嗎？

- **資料**: 不會，所有資料、設定、部署歷史都保留
- **計費**: 暫停後停止計費，恢復後才繼續

---

## 🔗 相關連結

- [Vercel REST API 文檔](https://vercel.com/docs/rest-api)
- [Vercel Tokens 管理](https://vercel.com/account/tokens)
- [Vercel Pricing](https://vercel.com/docs/pricing/networking)
