# Cloudflare R2 CORS 配置指南

## 📋 目的

配置 Cloudflare R2 Bucket 的 CORS 政策，以允許開發環境（localhost）進行跨域圖片請求，確保圖片快取系統完整運作。

---

## 🚨 為什麼需要配置 CORS？

### 問題描述
開發環境（`http://localhost:3000` / `http://localhost:3001`）無法透過 `fetch()` API 從 R2 CDN 載入圖片：

```
Access to fetch at 'https://pub-a1c4c32d4c65452098ab977db77e349e.r2.dev/images/...'
from origin 'http://localhost:3001' has been blocked by CORS policy:
No 'Access-Control-Allow-Origin' header is present on the requested resource.
```

### 影響範圍
- ❌ **開發環境**：`fetch()` 請求被 CORS 阻擋
- ✅ **生產環境**：同源請求不受影響
- ⚠️ **快取系統**：無法將圖片轉換為 Blob URL，降低快取效能

---

## 🔧 配置步驟

### 步驟 1：登入 Cloudflare Dashboard

1. 前往 [Cloudflare Dashboard](https://dash.cloudflare.com/)
2. 使用您的 Cloudflare 帳號登入
3. 在左側選單選擇 **R2**

### 步驟 2：選擇目標 Bucket

1. 在 R2 Buckets 列表中找到 `maplestory-images`
2. 點擊進入 Bucket 詳細頁面

### 步驟 3：編輯 CORS 政策

1. 點擊頁面上方的 **Settings（設定）** Tab
2. 向下捲動找到 **CORS Policy** 區塊
3. 點擊 **Add CORS policy** 按鈕（如已有規則，則點擊 **Edit**）

### 步驟 4：輸入 CORS 配置

將以下 JSON 配置貼上：

```json
[
  {
    "AllowedOrigins": [
      "http://localhost:3000",
      "http://localhost:3001",
      "https://chrono-story-search.vercel.app"
    ],
    "AllowedMethods": ["GET", "HEAD"],
    "AllowedHeaders": ["*"],
    "ExposeHeaders": [
      "Content-Type",
      "Content-Length",
      "ETag",
      "Access-Control-Allow-Origin"
    ],
    "MaxAgeSeconds": 3600
  }
]
```

#### 配置說明

| 欄位 | 說明 | 值 |
|-----|------|-----|
| `AllowedOrigins` | 允許的來源網域列表 | 包含開發環境和生產環境 |
| `AllowedMethods` | 允許的 HTTP 方法 | `GET`, `HEAD`（讀取圖片） |
| `AllowedHeaders` | 允許的請求標頭 | `*`（全部） |
| `ExposeHeaders` | 暴露給瀏覽器的回應標頭 | 包含必要的 CORS 標頭 |
| `MaxAgeSeconds` | 瀏覽器快取 Preflight 請求的時間（秒） | 3600（1 小時） |

### 步驟 5：儲存並等待生效

1. 點擊 **Save** 按鈕儲存配置
2. **等待 30 秒** 讓 CORS 規則完全傳播生效
3. 關閉 Cloudflare Dashboard

---

## ✅ 驗證配置

### 方法 1：使用瀏覽器 DevTools

1. 開啟開發環境：`http://localhost:3000`
2. 打開瀏覽器開發者工具（F12）
3. 切換到 **Console** 分頁
4. 執行測試指令：

```javascript
// 測試 CORS 是否正常
fetch('https://pub-a1c4c32d4c65452098ab977db77e349e.r2.dev/images/items/1062002.png')
  .then(res => {
    console.log('✅ CORS 配置成功！', res.status)
    return res.blob()
  })
  .then(blob => {
    console.log('✅ Blob 轉換成功！', blob.size, 'bytes')
  })
  .catch(err => {
    console.error('❌ CORS 配置失敗：', err.message)
  })
```

**預期結果：**
```
✅ CORS 配置成功！ 200
✅ Blob 轉換成功！ 12345 bytes
```

### 方法 2：檢查快取統計

在 Console 執行：

```javascript
window.__IMAGE_CACHE_STATS__()
```

**預期結果：**
- `errors: 0`（無錯誤）
- `hitRate: > 90%`（高命中率）

### 方法 3：使用自動化測試腳本

專案提供了自動化測試腳本，請參考：
- `public/test-image-cache.html` - 視覺化測試工具
- `public/cache-test-script.js` - 自動化測試腳本

---

## 🐛 疑難排解

### 問題 1：配置後仍然出現 CORS 錯誤

**可能原因：**
- CORS 規則尚未完全生效（需要等待最多 30 秒）
- 瀏覽器快取了舊的 Preflight 回應

**解決方法：**
1. 等待 30-60 秒
2. 清除瀏覽器快取：`Ctrl + Shift + R`（Windows）或 `Cmd + Shift + R`（Mac）
3. 重新載入頁面

### 問題 2：Origin 不匹配

**錯誤訊息：**
```
The 'Access-Control-Allow-Origin' header has a value 'http://localhost:3000'
that is not equal to the supplied origin.
```

**解決方法：**
確認 `AllowedOrigins` 中包含當前使用的 port：
- 如果使用 `localhost:3001`，確保清單中有 `http://localhost:3001`

### 問題 3：無法存取 Cloudflare Dashboard

**解決方法：**
1. 聯絡 Cloudflare 帳號管理員請求權限
2. 或改用**方案 B**：實作 Next.js API 代理（參考 `docs/api-proxy-setup.md`）

---

## 📚 參考資源

- [Cloudflare R2 CORS 官方文件](https://developers.cloudflare.com/r2/buckets/cors/)
- [CORS 標準規範（MDN）](https://developer.mozilla.org/en-US/docs/Web/HTTP/CORS)
- [專案圖片快取系統架構](../src/lib/image-utils.ts)

---

## 🔄 回退計劃

如需移除 CORS 配置：

1. 回到 Cloudflare Dashboard > R2 > Bucket Settings
2. 找到 CORS Policy 區塊
3. 點擊 **Delete** 或清空 JSON 配置
4. 儲存變更

**注意：** 移除後開發環境將再次出現 CORS 錯誤。

---

**最後更新：** 2025-10-23
**維護者：** ChronoStory Development Team
