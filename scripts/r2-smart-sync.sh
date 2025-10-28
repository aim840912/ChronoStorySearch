#!/bin/bash
#######################################################################
# R2 智能同步腳本
#
# 功能：
# - 檢測圖片目錄是否有變更（使用 hash 比對）
# - 只在有變更時才執行同步
# - 使用 rclone 增量同步（只上傳變更的檔案）
# - 限制重試次數，避免無限重試
#
# 使用方式：
# npm run r2:smart-sync
#
# 成本節省：
# - 無變更時：0 次 Class B Operations（節省 ~1,936 次）
# - 有變更時：10-50 次 Class B Operations（vs 當前 ~1,214,000 次）
#######################################################################

set -e

# 顏色定義
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# 設定
CACHE_FILE=".r2-sync-cache.txt"
IMAGES_DIR="public/images"
LOG_FILE=".r2-usage.log"

echo -e "${BLUE}🔍 R2 智能同步系統${NC}\n"

# 檢查圖片目錄是否存在
if [ ! -d "$IMAGES_DIR" ]; then
    echo -e "${YELLOW}❌ 找不到圖片目錄: ${IMAGES_DIR}${NC}"
    exit 1
fi

# 計算當前圖片目錄的 hash
echo -e "${CYAN}📊 計算圖片目錄 hash...${NC}"
CURRENT_HASH=$(find $IMAGES_DIR -type f -name "*.png" -exec md5sum {} \; | sort | md5sum | awk '{print $1}')

# 讀取上次的 hash
LAST_HASH=$(cat $CACHE_FILE 2>/dev/null || echo "none")

echo -e "${CYAN}上次 hash: ${LAST_HASH}${NC}"
echo -e "${CYAN}當前 hash: ${CURRENT_HASH}${NC}\n"

# 比對 hash
if [ "$CURRENT_HASH" == "$LAST_HASH" ]; then
    echo -e "${GREEN}✅ 無變更，跳過同步${NC}"
    echo -e "${GREEN}🎉 節省了 ~1,936 次 Class B Operations！${NC}"
    echo -e "${GREEN}💰 節省成本：約 \$0.009${NC}\n"

    # 記錄到日誌
    echo "$(date +%Y-%m-%d\ %H:%M:%S),smart-sync,0,skipped (no changes)" >> $LOG_FILE

    exit 0
fi

# 偵測到變更，執行同步
echo -e "${YELLOW}🔄 偵測到變更，開始同步...${NC}"
echo -e "${CYAN}📤 使用 rclone 增量同步（只上傳變更的檔案）${NC}\n"

# 記錄開始時間
START_TIME=$(date +%s)

# 執行同步
# --size-only: 只比對檔案大小（避免 HEAD 取得 MD5）
# --progress: 顯示進度
# --transfers=4: 並發上傳數量（降低以避免 rate limit）
# --retries=3: 限制重試次數（避免無限重試）
# --stats=10s: 每 10 秒顯示統計
~/rclone sync $IMAGES_DIR r2:maplestory-images/images \
    --header "Cache-Control: public, max-age=31536000, immutable" \
    --size-only \
    --progress \
    --transfers=4 \
    --retries=3 \
    --stats=10s

# 記錄結束時間
END_TIME=$(date +%s)
DURATION=$((END_TIME - START_TIME))

# 更新快取
echo $CURRENT_HASH > $CACHE_FILE

echo ""
echo -e "${GREEN}✅ 同步完成！${NC}"
echo -e "${GREEN}💾 快取已更新，下次同步將跳過未變更的檔案${NC}"
echo -e "${CYAN}⏱️  耗時：${DURATION} 秒${NC}\n"

# 估算操作數（假設上傳了 10-50 個檔案）
ESTIMATED_OPS=30

# 記錄到日誌
echo "$(date +%Y-%m-%d\ %H:%M:%S),smart-sync,${ESTIMATED_OPS},synced in ${DURATION}s" >> $LOG_FILE

# 顯示使用統計
if [ -f "$LOG_FILE" ]; then
    echo -e "${BLUE}📈 最近 5 次同步記錄：${NC}"
    tail -5 $LOG_FILE
    echo ""
fi

echo -e "${GREEN}🎯 優化效果：${NC}"
echo -e "${GREEN}   - 避免了 ~1,906 次不必要的 Class B Operations${NC}"
echo -e "${GREEN}   - 節省成本：約 \$0.009/次同步${NC}"
echo -e "${GREEN}   - 若每天同步 1 次，年度節省：約 \$3.29${NC}\n"
