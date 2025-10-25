# Cloudflare R2 圖片 CDN 設定指南

使用 **Wrangler CLI** 將圖片遷移至 Cloudflare R2，以降低 Vercel Edge Requests。

---

## 🎯 為什麼要使用 Cloudflare R2？

| 項目 | Vercel `public/` | Cloudflare R2 |
|------|-----------------|---------------|
| Edge Requests | ✅ **計費**（每次載入） | ❌ **不計費** |
| 儲存空間 | 計入部署大小 | 獨立儲存（免費 10GB） |
| 流量費用 | 包含在 Edge Requests | **完全免費**（無限流量） |
| 全球 CDN | Vercel Edge | Cloudflare CDN |
| 快取控制 | 需配置 | 自動優化 |

**預期效果**：減少 95%+ 圖片 Edge Requests，每月節省 60,000-90,000 次請求

---

## 📋 階段 1：建立 R2 Bucket

### 1.1 註冊 Cloudflare 帳號

前往 [Cloudflare Dashboard](https://dash.cloudflare.com/) 註冊或登入。

⚠️ **注意**：需綁定信用卡，但 R2 免費方案不會收費

### 1.2 建立 Bucket

1. 左側選單選擇 **R2 Object Storage**
2. 點擊 **Create bucket**
3. 設定：
   - **Bucket name**: `maplestory-images`
   - **Location**: `Automatic`
4. 點擊 **Create bucket**

---

## 📋 階段 2：設定 Wrangler CLI

### 2.1 登入 Cloudflare

使用 `npx` 執行（無需全局安裝）：

```bash
npx wrangler login
```

執行後會自動開啟瀏覽器，點擊 **Allow** 授權，看到 **Successfully logged in** 即完成。

### 2.2 驗證登入

```bash
npx wrangler whoami
```

應顯示你的帳號名稱和 Account ID。

---

## 📋 階段 3：上傳圖片到 R2

### 3.1 設定 Bucket 名稱（可選）

如果 Bucket 名稱不是 `maplestory-images`，在 `.env.local` 中設定：

```env
R2_BUCKET_NAME=your-bucket-name
```

### 3.2 執行上傳

**推薦使用 npm script**：

```bash
npm run r2:upload
```

或直接執行腳本：

```bash
bash scripts/upload-to-r2-wrangler.sh
```

### 3.3 上傳過程

**預期輸出**：
```bash
🚀 開始上傳圖片到 Cloudflare R2...
📦 Bucket: maplestory-images
📁 來源資料夾: public/images

✅ 找到 1936 個圖片檔案
📤 開始上傳...

✅ [1/1936] images/items/0.png
✅ [2/1936] images/items/1002004.png
...
  ... 已上傳 100/1936 (5%)
...

📊 上傳完成統計
✅ 成功: 1936 個檔案
```

**注意**：
- 上傳時間約 20-30 分鐘（視網路速度）
- 中斷後可重新執行（自動覆蓋）

### 3.4 驗證上傳

1. 前往 [Cloudflare Dashboard](https://dash.cloudflare.com/)
2. 進入 **R2 Object Storage** → `maplestory-images`
3. 點擊 **Objects** 分頁
4. 確認看到 `images/items/` 和 `images/monsters/` 資料夾

---

## 📋 階段 4：啟用 Public Access

### 4.1 啟用 R2.dev Subdomain

1. 在 `maplestory-images` Bucket 頁面
2. 點擊 **Settings** 分頁
3. 找到 **Public Access** 區塊
4. 點擊 **Allow Access** → 啟用 **R2.dev subdomain**
5. 複製 Public URL（格式：`https://pub-xxxxxxxxxxxxxx.r2.dev`）

### 4.2 測試圖片 URL

在瀏覽器開啟：
```
https://pub-xxxxxxxxxxxxxx.r2.dev/images/items/1002004.png
```
（將 `pub-xxxxxxxxxxxxxx` 替換為你的實際 URL）

應該可以看到圖片。

---

## 📋 階段 5：修改程式碼使用 R2 URL

### 5.1 設定環境變數

**本地測試** - 在 `.env.local` 中設定：

```env
NEXT_PUBLIC_R2_PUBLIC_URL=https://pub-xxxxx.r2.dev
```

**Vercel 部署** - 在 Vercel Dashboard：

1. 專案 Settings → **Environment Variables**
2. 新增：
   - **Name**: `NEXT_PUBLIC_R2_PUBLIC_URL`
   - **Value**: `https://pub-xxxxx.r2.dev`
   - **Environment**: Production, Preview, Development（全選）
3. 點擊 **Save**

### 5.2 本地測試

```bash
npm run dev
```

開啟 http://localhost:3000，確認：
1. 圖片正常顯示
2. DevTools → Network 面板中圖片 URL 為 `https://pub-xxxxx.r2.dev/images/...`

### 5.3 部署到 Vercel

提交並推送：

```bash
git add .
git commit -m "feat: 遷移圖片至 Cloudflare R2 CDN"
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

**效果**：部署大小減少 **7.9MB**，部署速度更快

---

## 🐛 常見問題

### Q: `wrangler` command not found

使用 `npx wrangler` 而非 `wrangler`：

```bash
npx wrangler login
npx wrangler whoami
```

`npx` 會自動下載並執行，無需全局安裝。

### Q: wrangler login 無法開啟瀏覽器

使用手動授權模式：

```bash
npx wrangler login --browser=false
```

會顯示 URL，手動在瀏覽器中開啟並授權。

### Q: 上傳失敗 - Permission denied

**解決方式**：
1. 確認已登入：`npx wrangler whoami`
2. 重新登入：`npx wrangler logout && npx wrangler login`
3. 確認 Bucket 名稱正確

### Q: 圖片 URL 404

**解決方式**：
1. 前往 R2 Bucket **Settings**
2. 確認 **Public Access** 已啟用
3. 確認 **R2.dev subdomain** 已啟用

### Q: 想要自訂網域

1. 在 Cloudflare 新增 **Custom Domain**
2. 設定 CNAME 指向 R2 Bucket
3. 更新 `NEXT_PUBLIC_R2_PUBLIC_URL` 環境變數

---

## 📊 效果監控

### Vercel Analytics

部署後 1-2 天，觀察 **Edge Requests** 趨勢，應該看到顯著下降（-90%+）。

### Cloudflare Analytics

前往 R2 Dashboard 查看 **Requests** 數量，確認流量來自全球各地（CDN 效果）。

---

## 🔗 相關資源

- [Cloudflare R2 官方文檔](https://developers.cloudflare.com/r2/)
- [Wrangler CLI 文檔](https://developers.cloudflare.com/workers/wrangler/)
- [R2 Pricing](https://www.cloudflare.com/products/r2/)
