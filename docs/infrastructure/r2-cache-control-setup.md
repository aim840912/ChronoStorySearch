# R2 Cache-Control Headers 設定指南

## 🎯 目標

為所有 R2 圖片添加 `Cache-Control: public, max-age=31536000, immutable`，以最小化 Class B Operations。

---

## 📊 當前狀態

**問題**：
```http
❌ Cache-Control: (缺失)
✅ ETag: "aad44e4b4c90170225fdb685d4eb8539"
✅ Last-Modified: Sun, 19 Oct 2025 05:20:41 GMT
```

**影響**：
- 瀏覽器使用啟發式快取（通常數小時）
- 快取過期後仍會發送 304 驗證請求（Class B Operation）
- 每日每用戶可能產生 10-20 次不必要的 Class B Operations

---

## ✅ 解決方案（推薦順序）

### 方案 1：Cloudflare Custom Domain + Transform Rules（⭐ 推薦）

**優點**：
- ✅ 無需重新上傳圖片
- ✅ 立即生效
- ✅ 零 Class B Operations
- ✅ 未來自動套用

**步驟**：

#### Step 1：設定 Custom Domain

1. 登入 [Cloudflare Dashboard](https://dash.cloudflare.com/)
2. 前往 **R2** → 選擇 `maplestory-images` bucket
3. 點選 **Settings** → **Custom Domains**
4. 點選 **Connect Domain**
5. 輸入子域名（建議：`cdn.yourdomain.com`）
6. 完成 DNS 設定（Cloudflare 會自動添加 CNAME 記錄）

#### Step 2：建立 Transform Rule

1. 前往您的域名 Dashboard
2. 選擇 **Rules** → **Transform Rules** → **Modify Response Header**
3. 點選 **Create rule**
4. 填寫以下設定：

```
Rule name: R2 Images Cache Control

When incoming requests match:
  Expression Editor:
    (http.request.uri.path matches "^/images/.*\\.(png|jpg|jpeg|gif|webp|svg)$")

Then:
  Modify response header:
    Operation: Set static
    Header name: Cache-Control
    Value: public, max-age=31536000, immutable
```

5. 點選 **Deploy**

#### Step 3：更新環境變數

```bash
# .env.local
NEXT_PUBLIC_R2_PUBLIC_URL=https://cdn.yourdomain.com
```

#### Step 4：驗證

```bash
curl -I "https://cdn.yourdomain.com/images/items/1002004.png" | grep Cache-Control
# 應該看到：Cache-Control: public, max-age=31536000, immutable
```

---

### 方案 2：Cloudflare Workers（進階）

**適用情境**：
- 無法使用 Custom Domain
- 需要更複雜的邏輯

**步驟**：

#### Step 1：建立 Worker

```bash
npx wrangler init r2-cache-proxy
cd r2-cache-proxy
```

#### Step 2：編輯 `src/index.ts`

```typescript
export default {
  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url)

    // 代理到 R2
    const r2Url = `https://pub-a1c4c32d4c65452098ab977db77e349e.r2.dev${url.pathname}`
    const response = await fetch(r2Url, {
      headers: request.headers,
    })

    // 添加 Cache-Control
    const newResponse = new Response(response.body, response)

    if (url.pathname.match(/\.(png|jpg|jpeg|gif|webp|svg)$/)) {
      newResponse.headers.set('Cache-Control', 'public, max-age=31536000, immutable')
    }

    return newResponse
  }
}
```

#### Step 3：部署

```bash
npx wrangler deploy
```

#### Step 4：綁定 Custom Domain

在 Worker Dashboard 中綁定您的域名。

---

### 方案 3：修改上傳腳本（僅未來檔案）

**適用情境**：
- 只想優化未來上傳的檔案
- 現有檔案使用啟發式快取

**步驟**：

編輯 `scripts/r2-smart-sync.sh`：

```bash
# 在 rclone 或 wrangler 上傳時添加 metadata
npx wrangler r2 object put maplestory-images/images/items/NEW_ITEM.png \
  --file=local-file.png \
  --cache-control="public, max-age=31536000, immutable"
```

**或使用 rclone**：

```bash
~/rclone copy public/images r2:maplestory-images/images \
  --header "Cache-Control: public, max-age=31536000, immutable" \
  --progress
```

---

## 📈 預期效果

### Class B Operations 減少

| 情境 | 優化前 | 優化後 | 減少 |
|------|--------|--------|------|
| 首次訪問 | 10-50 次 | 10-50 次 | 0% |
| 回訪（1天後） | 5-10 次 | 0 次 | **100%** |
| 回訪（1週後） | 10-15 次 | 0 次 | **100%** |
| 回訪（1個月後） | 15-20 次 | 0 次 | **100%** |

### 總體影響

- **當前**：每用戶每月 ~100-200 Class B Operations
- **優化後**：每用戶每月 ~10-50 Class B Operations（僅首次訪問）
- **減少**：**75-95%**

---

## 🔍 驗證方法

### 1. 使用 curl 檢查

```bash
curl -I "https://your-cdn-domain.com/images/items/1002004.png"
```

預期輸出：
```http
HTTP/1.1 200 OK
Cache-Control: public, max-age=31536000, immutable
ETag: "aad44e4b4c90170225fdb685d4eb8539"
Last-Modified: Sun, 19 Oct 2025 05:20:41 GMT
```

### 2. 使用瀏覽器開發者工具

1. 開啟 DevTools → Network
2. 重新整理頁面
3. 點選任一圖片請求
4. 查看 Response Headers
5. 確認有 `Cache-Control: public, max-age=31536000, immutable`

### 3. 測試快取行為

```bash
# 第一次請求（應該是 200）
curl -I "https://your-cdn-domain.com/images/items/1002004.png"

# 第二次請求（瀏覽器會直接使用快取，不會發送請求）
# 可以用 --max-time 1 測試，如果立即返回表示使用快取
curl -I "https://your-cdn-domain.com/images/items/1002004.png" --max-time 1
```

---

## 📝 維護

### 定期檢查

```bash
# 每週檢查一次 Cache-Control 設定
curl -I "$(grep NEXT_PUBLIC_R2_PUBLIC_URL .env.local | cut -d'=' -f2)/images/items/1002004.png" | grep Cache-Control
```

### 監控 R2 Dashboard

1. 登入 Cloudflare Dashboard
2. 前往 **R2** → 選擇 bucket
3. 查看 **Metrics** → **Class B Operations**
4. 確認趨勢穩定（用戶增長時緩慢增加）

---

## 🎯 最終建議

**立即執行**：
1. ✅ 設定 Cloudflare Custom Domain（15 分鐘）
2. ✅ 建立 Transform Rule（5 分鐘）
3. ✅ 更新 `.env.local`（1 分鐘）
4. ✅ 驗證 Cache-Control（2 分鐘）

**預期結果**：
- Class B Operations 減少 **75-95%**
- 用戶體驗改善（快取命中率 > 95%）
- 成本降低（每月節省數千次請求）

🎉 **完成後，您的 R2 快取策略將達到業界最佳實踐！**
