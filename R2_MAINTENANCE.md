# Cloudflare R2 圖片維護指南

本專案使用 **Cloudflare R2** 作為圖片 CDN，以降低 Vercel Edge Requests 並加速圖片載入。

---

## 🏗️ 架構說明

### 雙重存儲策略

```
本地開發環境                生產環境
├── public/images/    →    Vercel (後備)
└── .env.local
                           ↓
                     Cloudflare R2 CDN
                     (主要來源)
```

**為什麼保留本地圖片？**
- ✅ 開發環境不依賴 R2（可離線開發）
- ✅ Git 備份，完整的版本控制
- ✅ 新加入的開發者可以立即開始工作
- ✅ 生產環境發生問題時的後備方案

---

## 📋 新增圖片工作流程

### 完整流程

```bash
# 1. 新增圖片到本地
cp new-item.png public/images/items/12345.png

# 2. 更新圖片清單（如果使用 manifest）
npm run generate-images

# 3. 本地測試（使用本地圖片）
npm run dev
# 開啟 http://localhost:3000 確認圖片正常顯示

# 4. 同步到 R2（增量上傳，只傳新增/修改的檔案）
npm run r2:sync

# 5. 驗證 R2 上的圖片
npm run r2:list

# 6. 提交到 Git
git add public/images/items/12345.png
git commit -m "feat: add item 12345 image"
git push
```

---

## 🔧 常用維護命令

### npm 腳本

```bash
# 增量同步圖片到 R2（推薦）
npm run r2:sync

# 列出 R2 上的前 20 個文件
npm run r2:list

# 檢查本地與 R2 的差異
npm run r2:check

# 完整上傳（首次使用或重建）
npm run r2:upload
```

### 直接使用 Rclone

```bash
# 列出所有 R2 buckets
~/rclone lsd r2:

# 列出特定資料夾的文件
~/rclone ls r2:maplestory-images/images/items | head -50

# 下載單個文件
~/rclone copy r2:maplestory-images/images/items/12345.png ./downloads/

# 刪除單個文件
~/rclone delete r2:maplestory-images/images/items/12345.png

# 同步（刪除 R2 上多餘的文件）
~/rclone sync public/images r2:maplestory-images/images --progress

# 查看同步差異（不實際執行）
~/rclone sync public/images r2:maplestory-images/images --dry-run
```

---

## 🧪 測試 R2 圖片

### 方法 1：檢查 Network 請求

```bash
# 1. 本地啟動
npm run dev

# 2. 開啟瀏覽器 DevTools → Network 面板
# 3. 篩選 "Img" 類型
# 4. 確認圖片 URL 為：
#    https://pub-a1c4c32d4c65452098ab977db77e349e.r2.dev/images/items/...
```

### 方法 2：直接訪問 R2 URL

```bash
# 測試單個圖片
curl -I https://pub-a1c4c32d4c65452098ab977db77e349e.r2.dev/images/items/0.png

# 應該返回：
# HTTP/1.1 200 OK
# Content-Type: image/png
# Server: cloudflare
```

---

## ⚙️ 環境變數設定

### 本地開發（.env.local）

```bash
# Cloudflare R2 設定
R2_BUCKET_NAME=maplestory-images
NEXT_PUBLIC_R2_PUBLIC_URL=https://pub-a1c4c32d4c65452098ab977db77e349e.r2.dev
```

### Vercel 生產環境

1. 前往 Vercel Dashboard → Settings → Environment Variables
2. 新增以下變數：
   ```
   NEXT_PUBLIC_R2_PUBLIC_URL=https://pub-a1c4c32d4c65452098ab977db77e349e.r2.dev
   ```
3. 選擇 Environment: Production, Preview, Development
4. 點擊 Save
5. 重新部署專案

---

## 🔍 故障排除

### 問題 1：本地開發看不到圖片

**原因**：可能設定了 `NEXT_PUBLIC_R2_PUBLIC_URL` 但 R2 上沒有該圖片

**解決**：
```bash
# 方案 A：暫時移除環境變數（使用本地圖片）
# 編輯 .env.local，註解掉：
# NEXT_PUBLIC_R2_PUBLIC_URL=...

# 方案 B：同步到 R2
npm run r2:sync
```

---

### 問題 2：R2 圖片 404

**原因**：圖片尚未上傳到 R2

**解決**：
```bash
# 同步到 R2
npm run r2:sync

# 驗證圖片存在
~/rclone ls r2:maplestory-images/images/items | grep "圖片ID"
```

---

### 問題 3：本地與 R2 不同步

**原因**：新增圖片後忘記執行 `npm run r2:sync`

**解決**：
```bash
# 檢查差異
npm run r2:check

# 同步差異
npm run r2:sync
```

---

### 問題 4：Rclone 配置遺失

**原因**：rclone 配置文件被刪除

**解決**：
```bash
# 重新配置 R2
cd ~/projects/maplestory && source .env.local
~/rclone config create r2 s3 \
  provider Cloudflare \
  access_key_id $R2_ACCESS_KEY_ID \
  secret_access_key $R2_SECRET_ACCESS_KEY \
  endpoint https://$R2_ACCOUNT_ID.r2.cloudflarestorage.com \
  acl private
```

---

## 📊 效能監控

### Vercel Analytics

部署後 1-2 天，前往 Vercel Dashboard：

1. 點擊 **Analytics**
2. 觀察 **Edge Requests** 趨勢
3. 應該看到顯著下降（-90%+）

### Cloudflare R2 Analytics

前往 Cloudflare Dashboard：

1. 選擇 **R2 Object Storage**
2. 點擊 **maplestory-images**
3. 查看 **Requests** 和 **Data Transfer**
4. 確認流量來自全球各地（CDN 效果）

---

## 🚨 重要注意事項

### DO（應該做的）
- ✅ 定期執行 `npm run r2:sync` 同步新圖片
- ✅ 在 Git 中保留 `public/images/` 資料夾
- ✅ 測試本地開發環境可以正常運作
- ✅ 部署前確認 Vercel 環境變數設定正確

### DON'T（不應該做的）
- ❌ 不要刪除 `public/images/` 資料夾
- ❌ 不要在沒有備份的情況下執行 `rclone sync`（會刪除多餘文件）
- ❌ 不要手動修改 R2 檔案（應該透過同步）
- ❌ 不要將 R2 Access Keys 提交到 Git

---

## 📚 相關文檔

- [Cloudflare R2 設定指南](./CLOUDFLARE_R2_SETUP.md) - 初次設定流程
- [Rclone 官方文檔](https://rclone.org/docs/)
- [Cloudflare R2 官方文檔](https://developers.cloudflare.com/r2/)

---

## 💡 進階技巧

### 批量重命名圖片

```bash
# 使用 Rclone 批量處理
for file in public/images/items/*.png; do
  newname=$(echo "$file" | sed 's/old/new/g')
  mv "$file" "$newname"
done

# 同步到 R2
npm run r2:sync
```

### 清理未使用的圖片

```bash
# 1. 檢查 manifest 中使用的圖片
cat data/available-images.json

# 2. 找出未使用的圖片
comm -23 <(ls public/images/items/*.png | sort) <(cat data/available-images.json | jq -r '.items[]' | sort)

# 3. 手動刪除後同步
npm run r2:sync
```

---

## ✅ 快速檢查清單

每次新增圖片時，確認：

- [ ] 圖片已加到 `public/images/items/` 或 `public/images/monsters/`
- [ ] 執行 `npm run dev` 本地可以正常顯示
- [ ] 執行 `npm run r2:sync` 同步到 R2
- [ ] 執行 `npm run r2:list` 確認圖片已上傳
- [ ] 提交到 Git（包含新圖片）
- [ ] 部署到 Vercel
- [ ] 檢查生產環境圖片正常顯示

---

**最後更新**：2025-10-19
**維護者**：開發團隊
