# Cloudflare R2 圖片 CDN 設定指南（Wrangler CLI 方案）

此文件說明如何使用 **Wrangler CLI** 將圖片遷移至 Cloudflare R2，以降低 Vercel Edge Requests。

---

## 🎯 為什麼要使用 Cloudflare R2？

| 項目 | Vercel `public/` | Cloudflare R2 |
|------|-----------------|---------------|
| Edge Requests | ✅ **計費**（每次載入） | ❌ **不計費** |
| 儲存空間 | 計入部署大小 | 獨立儲存（免費 10GB） |
| 流量費用 | 包含在 Edge Requests | **完全免費**（無限流量） |
| 全球 CDN | Vercel Edge | Cloudflare CDN（更快） |
| 快取控制 | 需配置 | 自動優化 |

**預期效果**：
- 減少 **95%+** 圖片相關的 Edge Requests
- 每月節省 **60,000-90,000** 次請求
- 圖片載入速度提升 **20-30%**

---

## 📋 完整步驟總覽

### ✅ 階段 1：建立 R2 Bucket（5 分鐘）
### ✅ 階段 2：安裝 Wrangler CLI（2 分鐘）
### ✅ 階段 3：上傳圖片（20-30 分鐘）
### ✅ 階段 4：啟用 Public Access（2 分鐘）
### ✅ 階段 5：修改程式碼（Claude 自動）

---

## 📋 階段 1：建立 Cloudflare R2 Bucket

### 1.1 註冊 Cloudflare 帳號

前往 [Cloudflare Dashboard](https://dash.cloudflare.com/) 註冊或登入。

**注意**：需要綁定信用卡，但 R2 免費方案**不會收費**。

---

### 1.2 建立 R2 Bucket

1. 在 Cloudflare Dashboard 左側選單選擇 **R2 Object Storage**
2. 點擊 **Create bucket**
3. 設定 Bucket 資訊：
   - **Bucket name**: `maplestory-images`（或自訂名稱）
   - **Location**: `Automatic`（自動選擇最佳位置）
4. 點擊 **Create bucket**

✅ **完成！** Bucket 已建立，接下來安裝上傳工具。

---

## 📋 階段 2：安裝並設定 Wrangler CLI

### 2.1 登入 Cloudflare 帳號

**使用 npx（不需要全局安裝）**：

```bash
npx wrangler login
```

**注意**：使用 `npx` 會自動下載並執行 wrangler，不需要全局安裝，避免權限和路徑問題。

**流程**：
1. 執行指令後會**自動開啟瀏覽器**
2. 在瀏覽器中點擊 **「Allow」**授權 Wrangler
3. 看到 **「Successfully logged in」** 後關閉瀏覽器
4. 回到終端機，應該看到 **「Successfully logged in」**

---

### 2.2 驗證登入狀態

```bash
npx wrangler whoami
```

**預期輸出**：
```
 ⛅️ wrangler 3.x.x
┌──────────────────────────────────────┐
│ Account Name   │ Your Account Name   │
│ Account ID     │ abc123def456...     │
└──────────────────────────────────────┘
```

✅ **完成！** Wrangler 已設定完成，可以開始上傳。

---

## 📋 階段 3：上傳圖片到 R2

### 3.1 設定 Bucket 名稱（可選）

如果你的 Bucket 名稱不是 `maplestory-images`，可以在 `.env.local` 中設定：

```bash
# .env.local
R2_BUCKET_NAME=your-bucket-name
```

---

### 3.2 執行上傳

**方式 1：使用 npm script（推薦）**

```bash
npm run r2:upload
```

**方式 2：直接執行腳本**

```bash
bash scripts/upload-to-r2-wrangler.sh
```

---

### 3.3 上傳過程

**預期輸出**：
```bash
🚀 開始上傳圖片到 Cloudflare R2...

📦 Bucket: maplestory-images
📁 來源資料夾: public/images

🔍 檢查 Wrangler 登入狀態...
✅ Wrangler 已登入

🔍 掃描圖片檔案...
✅ 找到 1936 個圖片檔案

📤 開始上傳...

✅ [1/1936] images/items/0.png
✅ [2/1936] images/items/1002004.png
✅ [3/1936] images/items/1002005.png
...
  ... 已上傳 50/1936 (2%)
  ... 已上傳 100/1936 (5%)
...

============================================================
📊 上傳完成統計
============================================================
✅ 成功: 1936 個檔案
❌ 失敗: 0 個檔案
📦 總計: 1936 個檔案
============================================================

🎉 上傳流程完成！
```

**注意事項**：
- 上傳時間取決於網路速度（約 20-30 分鐘）
- 如果中斷，可以重新執行（Wrangler 會自動覆蓋）
- 失敗的檔案會在結果中列出

---

### 3.4 驗證上傳成功

1. 前往 [Cloudflare Dashboard](https://dash.cloudflare.com/)
2. 選擇 **R2 Object Storage**
3. 進入 `maplestory-images` Bucket
4. 點擊 **Objects** 分頁
5. 確認看到 `images/items/` 和 `images/monsters/` 資料夾
6. 隨機點開幾個檔案，確認可以預覽

---

## 📋 階段 4：啟用 Public Access

上傳完成後，需要啟用公開存取才能在網站上使用圖片。

### 4.1 啟用 R2.dev Subdomain

1. 在 `maplestory-images` Bucket 頁面
2. 點擊 **Settings** 分頁
3. 找到 **Public Access** 區塊
4. 點擊 **Allow Access**
5. 啟用 **R2.dev subdomain**
6. 你會得到一個 Public URL，格式如：
   ```
   https://pub-xxxxxxxxxxxxxx.r2.dev
   ```
7. **複製並保存這個 URL**（稍後會用到）

---

### 4.2 測試圖片 URL

在瀏覽器開啟：
```
https://pub-xxxxxxxxxxxxxx.r2.dev/images/items/1002004.png
```
（將 `pub-xxxxxxxxxxxxxx` 替換為你的實際 URL）

應該可以看到圖片。✅

---

## 📋 階段 5：修改程式碼使用 R2 URL

### 5.1 提供 Public URL 給 Claude

上傳完成並啟用 Public Access 後，告訴 Claude：

```
我已完成 R2 上傳，Public URL 是：https://pub-xxxxx.r2.dev
```

Claude 會自動：
1. 修改 `src/lib/image-utils.ts` 使用 R2 URL
2. 更新 `.env.local.example` 範本
3. 執行測試驗證

---

### 5.2 本地測試

Claude 修改完成後，在本地測試：

```bash
# 在 .env.local 中設定
NEXT_PUBLIC_R2_PUBLIC_URL=https://pub-xxxxx.r2.dev

# 啟動開發伺服器
npm run dev
```

開啟 http://localhost:3000，確認：
1. 圖片正常顯示
2. 開啟 DevTools → Network 面板
3. 圖片請求的 URL 應該是 `https://pub-xxxxx.r2.dev/images/...`

---

### 5.3 部署到 Vercel

**在 Vercel Dashboard 設定環境變數**：

1. 前往你的 Vercel 專案設定
2. 選擇 **Environment Variables**
3. 新增：
   - **Name**: `NEXT_PUBLIC_R2_PUBLIC_URL`
   - **Value**: `https://pub-xxxxx.r2.dev`
   - **Environment**: Production, Preview, Development（全選）
4. 點擊 **Save**

**提交並部署**：

```bash
git add .
git commit -m "feat: 遷移圖片至 Cloudflare R2 CDN

- 使用 Wrangler CLI 上傳 1,936 個圖片
- 修改 image-utils 使用 R2 URL
- 預期減少 95%+ 圖片 Edge Requests

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>"
git push
```

---

## 📋 階段 6：清理舊檔案（可選）

### 選項 A：保留作為備份

保留 `public/images/` 資料夾，以防需要回滾。

### 選項 B：刪除以減少部署大小

```bash
# 備份
cp -r public/images public/images.backup

# 刪除
rm -rf public/images

# 提交
git add .
git commit -m "chore: 移除本地圖片（已遷移至 R2）"
git push
```

**效果**：
- 部署大小減少 **7.9MB**
- 部署速度更快
- Git 歷史更精簡

---

## 🐛 常見問題

### Q: `wrangler` command not found

**解決**：使用 `npx wrangler` 而非 `wrangler`

```bash
# 所有指令都加上 npx
npx wrangler login
npx wrangler whoami
npx wrangler r2 object ...
```

**說明**：`npx` 會自動下載並執行 wrangler，不需要全局安裝。

---

### Q: wrangler login 無法開啟瀏覽器

**原因**：無頭環境或瀏覽器被封鎖

**解決**：
```bash
# 使用手動授權模式
npx wrangler login --browser=false

# 會顯示一個 URL，手動在瀏覽器中開啟並授權
```

---

### Q: 上傳失敗：Permission denied

**原因**：Wrangler 未登入或權限不足

**解決**：
1. 確認已登入：`npx wrangler whoami`
2. 重新登入：`npx wrangler logout && npx wrangler login`
3. 確認 Bucket 名稱正確

---

### Q: 圖片 URL 404

**原因**：Public Access 未啟用

**解決**：
1. 前往 R2 Bucket Settings
2. 確認 **Public Access** 已啟用
3. 確認 **R2.dev subdomain** 已啟用

---

### Q: 想要自訂網域

**解決**：
1. 在 Cloudflare 中新增 Custom Domain
2. 設定 CNAME 指向 R2 Bucket
3. 更新 `NEXT_PUBLIC_R2_PUBLIC_URL`

---

## 📊 效果監控

### Vercel Analytics

部署後 1-2 天，前往 Vercel Analytics：
1. 觀察 **Edge Requests** 趨勢
2. 應該看到顯著下降（-90%+）

### Cloudflare Analytics

前往 R2 Dashboard：
1. 查看 **Requests** 數量
2. 確認流量來自全球各地（CDN 效果）

---

## 🎉 完成！

恭喜！你已經成功將圖片遷移至 Cloudflare R2。

**預期效果**：
- ✅ 圖片 Edge Requests 減少 **95%+**
- ✅ 圖片載入速度提升 **20-30%**
- ✅ 每月節省 **60,000-90,000** 次請求
- ✅ Vercel 部署大小減少 **7.9MB**（如果刪除本地圖片）

---

## 📚 相關資源

- [Cloudflare R2 官方文檔](https://developers.cloudflare.com/r2/)
- [Wrangler CLI 文檔](https://developers.cloudflare.com/workers/wrangler/)
- [R2 Pricing](https://www.cloudflare.com/products/r2/)
