#!/bin/bash
#######################################################################
# Artale R2 同步腳本
#
# 功能：
# - 將 artaleImages/ 目錄的圖片上傳到 R2 CDN
# - 使用獨立路徑 artale/images/ 與 ChronoStory 分開
# - 支援增量同步（只上傳變更的檔案）
#
# 使用方式：
# npm run artale:r2-upload
#######################################################################

set -e

# 顏色定義
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# 設定
IMAGES_DIR="artaleImages"
R2_BUCKET="maplestory-images"
R2_PATH="artale/images"

echo -e "${BLUE}🖼️  Artale R2 圖片同步${NC}\n"

# 檢查圖片目錄是否存在
if [ ! -d "$IMAGES_DIR" ]; then
    echo -e "${RED}❌ 找不到圖片目錄: ${IMAGES_DIR}${NC}"
    echo -e "${YELLOW}請先執行: npm run artale:sync-images${NC}"
    exit 1
fi

# 統計檔案數量
FILE_COUNT=$(find "$IMAGES_DIR" -name "*.png" | wc -l | tr -d ' ')
echo -e "${CYAN}📊 找到 ${FILE_COUNT} 張圖片${NC}\n"

if [ "$FILE_COUNT" -eq 0 ]; then
    echo -e "${YELLOW}⚠️  目錄中沒有圖片檔案${NC}"
    exit 0
fi

# 檢查 rclone 是否存在
if ! command -v ~/rclone &> /dev/null; then
    echo -e "${RED}❌ 找不到 rclone${NC}"
    echo -e "${YELLOW}請確認 rclone 已安裝在 ~/rclone${NC}"
    exit 1
fi

# 記錄開始時間
START_TIME=$(date +%s)

echo -e "${CYAN}📤 開始上傳到 R2: ${R2_BUCKET}/${R2_PATH}${NC}\n"

# 執行同步
# --size-only: 只比對檔案大小（避免 HEAD 取得 MD5）
# --progress: 顯示進度
# --transfers=8: 並發上傳數量
# --retries=3: 限制重試次數
~/rclone sync "$IMAGES_DIR" "r2:${R2_BUCKET}/${R2_PATH}" \
    --header "Cache-Control: public, max-age=31536000, immutable" \
    --size-only \
    --progress \
    --transfers=8 \
    --retries=3 \
    --stats=10s

# 記錄結束時間
END_TIME=$(date +%s)
DURATION=$((END_TIME - START_TIME))

echo ""
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}✅ 同步完成！${NC}"
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${CYAN}📁 來源:    ${IMAGES_DIR}${NC}"
echo -e "${CYAN}☁️  目標:    r2:${R2_BUCKET}/${R2_PATH}${NC}"
echo -e "${CYAN}📊 檔案數:  ${FILE_COUNT}${NC}"
echo -e "${CYAN}⏱️  耗時:    ${DURATION} 秒${NC}"
echo ""
echo -e "${GREEN}🌐 CDN URL 格式:${NC}"
echo -e "${CYAN}   \${R2_PUBLIC_URL}/artale/images/{圖片名稱}.png${NC}"
echo ""
