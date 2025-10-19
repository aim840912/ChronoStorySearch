#!/bin/bash

#######################################################################
# 使用 Wrangler CLI 上傳圖片到 Cloudflare R2
#
# 使用方式：
# 1. 登入 Cloudflare: npx wrangler login
# 2. 執行腳本: bash scripts/upload-to-r2-wrangler.sh
#
# 或使用 npm:
# npm run r2:upload
#
# 注意：使用 npx 不需要全局安裝 wrangler
#######################################################################

set -e  # 遇到錯誤立即停止

# 顏色定義
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# 設定
BUCKET_NAME="${R2_BUCKET_NAME:-maplestory-images}"
IMAGES_DIR="public/images"
BATCH_SIZE=10  # 每批上傳數量

echo -e "${BLUE}🚀 開始上傳圖片到 Cloudflare R2...${NC}\n"
echo -e "${BLUE}📦 Bucket: ${BUCKET_NAME}${NC}"
echo -e "${BLUE}📁 來源資料夾: ${IMAGES_DIR}${NC}\n"

# 檢查是否已登入（直接使用本地 wrangler）
WRANGLER_BIN="./node_modules/.bin/wrangler"
echo -e "${BLUE}🔍 檢查 Wrangler 登入狀態...${NC}"
if ! "$WRANGLER_BIN" whoami &> /dev/null; then
    echo -e "${RED}❌ 尚未登入 Cloudflare${NC}"
    echo -e "${YELLOW}請先執行登入:${NC}"
    echo -e "  ${GREEN}$WRANGLER_BIN login${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Wrangler 已登入${NC}\n"

# 檢查 images 資料夾是否存在
if [ ! -d "$IMAGES_DIR" ]; then
    echo -e "${RED}❌ 找不到圖片資料夾: ${IMAGES_DIR}${NC}"
    exit 1
fi

# 取得所有圖片檔案
echo -e "${BLUE}🔍 掃描圖片檔案...${NC}"
IMAGE_FILES=()
while IFS= read -r -d '' file; do
    IMAGE_FILES+=("$file")
done < <(find "$IMAGES_DIR" -type f \( -iname "*.png" -o -iname "*.jpg" -o -iname "*.jpeg" -o -iname "*.svg" -o -iname "*.webp" \) -print0)

TOTAL_FILES=${#IMAGE_FILES[@]}
echo -e "${GREEN}✅ 找到 ${TOTAL_FILES} 個圖片檔案${NC}\n"

if [ "$TOTAL_FILES" -eq 0 ]; then
    echo -e "${YELLOW}⚠️  沒有找到任何圖片檔案${NC}"
    exit 0
fi

# 開始上傳
echo -e "${BLUE}📤 開始上傳...${NC}\n"

# 顯示第一個要上傳的文件（方便手動測試）
if [ ${#IMAGE_FILES[@]} -gt 0 ]; then
    first_file="${IMAGE_FILES[0]}"
    first_relative="${first_file#public/}"
    echo -e "${YELLOW}💡 提示：第一個文件是 ${first_relative}${NC}"
    echo -e "${YELLOW}   如果卡住，可以手動測試：${NC}"
    echo -e "${YELLOW}   $WRANGLER_BIN r2 object put ${BUCKET_NAME}/${first_relative} --file=${first_file}${NC}\n"
fi

uploaded=0
failed=0
declare -a failed_files

for file in "${IMAGE_FILES[@]}"; do
    # 取得相對路徑（去掉 public/ 前綴）
    relative_path="${file#public/}"

    # 顯示正在處理的文件
    current_index=$((uploaded + failed + 1))
    echo -e "${BLUE}⏳ [${current_index}/${TOTAL_FILES}] ${relative_path}${NC}"

    # 上傳檔案（直接調用 wrangler 二進制文件，顯示所有輸出以診斷問題）
    if "$WRANGLER_BIN" r2 object put "${BUCKET_NAME}/${relative_path}" --file="$file" 2>&1 | grep -q "Upload complete"; then
        ((uploaded++))
        echo -e "${GREEN}✅ [${uploaded}/${TOTAL_FILES}] 成功${NC}"
    else
        ((failed++))
        failed_files+=("$relative_path")
        echo -e "${RED}❌ 失敗: ${relative_path}${NC}"
    fi

    # 進度提示（每 50 個檔案）
    if [ $((uploaded % 50)) -eq 0 ] && [ $uploaded -gt 0 ]; then
        echo -e "${YELLOW}📊 進度：${uploaded}/${TOTAL_FILES} ($(( uploaded * 100 / TOTAL_FILES ))%)${NC}"
    fi
done

# 總結
echo ""
echo "============================================================"
echo -e "${BLUE}📊 上傳完成統計${NC}"
echo "============================================================"
echo -e "${GREEN}✅ 成功: ${uploaded} 個檔案${NC}"
echo -e "${RED}❌ 失敗: ${failed} 個檔案${NC}"
echo -e "${BLUE}📦 總計: ${TOTAL_FILES} 個檔案${NC}"
echo "============================================================"

# 顯示失敗的檔案列表
if [ ${#failed_files[@]} -gt 0 ]; then
    echo ""
    echo -e "${RED}❌ 失敗的檔案列表:${NC}"
    for failed_file in "${failed_files[@]}"; do
        echo "  - $failed_file"
    done
fi

echo ""
echo -e "${GREEN}🎉 上傳流程完成！${NC}"
echo ""
echo -e "${YELLOW}下一步：${NC}"
echo "1. 前往 Cloudflare Dashboard 驗證圖片已上傳"
echo "2. 在 R2 Bucket Settings → Public Access 啟用並取得 Public URL"
echo "3. 將 Public URL 提供給 Claude 以修改程式碼"
echo ""
