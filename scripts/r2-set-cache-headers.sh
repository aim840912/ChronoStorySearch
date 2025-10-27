#!/bin/bash

# R2 Cache-Control Headers 批次設定腳本
# 用途：為所有現有圖片添加 Cache-Control metadata

set -e

BUCKET_NAME="maplestory-images"
CACHE_CONTROL="public, max-age=31536000, immutable"

echo "🚀 開始設定 R2 圖片的 Cache-Control headers..."
echo "📦 Bucket: $BUCKET_NAME"
echo "⏱️  Cache-Control: $CACHE_CONTROL"
echo ""

# 檢查 wrangler 是否已安裝
if ! command -v npx &> /dev/null; then
    echo "❌ 錯誤：找不到 npx，請先安裝 Node.js"
    exit 1
fi

# 列出所有圖片檔案
echo "📂 正在列出所有圖片檔案..."
FILES=$(npx wrangler r2 object list "$BUCKET_NAME" --prefix="images/" | grep -E '\.(png|jpg|jpeg)$' || true)

if [ -z "$FILES" ]; then
    echo "⚠️  未找到任何圖片檔案"
    exit 0
fi

# 計算檔案數量
TOTAL_FILES=$(echo "$FILES" | wc -l)
echo "📊 找到 $TOTAL_FILES 個圖片檔案"
echo ""

# 警告：這會產生大量 Class B Operations
echo "⚠️  警告：此操作會對每個檔案執行 PUT，將產生大量 Class B Operations"
echo "建議改用 Cloudflare Custom Domain + Transform Rules"
echo ""
read -p "確定要繼續嗎？(yes/no): " CONFIRM

if [ "$CONFIRM" != "yes" ]; then
    echo "❌ 操作已取消"
    exit 0
fi

# 批次處理（示例，實際需要下載並重新上傳）
echo ""
echo "⚠️  注意：R2 不支援僅更新 metadata，必須重新上傳檔案"
echo "建議使用以下方法："
echo ""
echo "1. 使用 Cloudflare Custom Domain + Transform Rules（無需重新上傳）"
echo "2. 修改未來的上傳腳本，在上傳時設定 Cache-Control"
echo ""
echo "如需修改現有檔案，請執行："
echo ""
echo "  npx wrangler r2 object put $BUCKET_NAME/images/items/ITEM_ID.png \\"
echo "    --file=local-file.png \\"
echo "    --cache-control='$CACHE_CONTROL'"
echo ""

exit 0
