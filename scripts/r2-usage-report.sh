#!/bin/bash
#######################################################################
# R2 使用量報告
#
# 功能：
# - 顯示 R2 同步歷史記錄
# - 估算 Class B Operations 使用量
# - 計算成本節省
#
# 使用方式：
# npm run r2:usage-report
#######################################################################

# 顏色定義
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

LOG_FILE=".r2-usage.log"

echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}   📊 R2 Class B Operations 使用報告${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}\n"

# 檢查日誌檔案是否存在
if [ ! -f "$LOG_FILE" ]; then
    echo -e "${YELLOW}⚠️  尚無使用記錄${NC}"
    echo -e "${CYAN}   執行 'npm run r2:smart-sync' 開始記錄${NC}\n"
    exit 0
fi

# 計算統計
TOTAL_SYNCS=$(wc -l < $LOG_FILE)
SKIPPED_SYNCS=$(grep -c "skipped" $LOG_FILE || echo 0)
ACTUAL_SYNCS=$((TOTAL_SYNCS - SKIPPED_SYNCS))

# 估算總 Class B Operations
# 假設每次實際同步平均 30 次操作
ESTIMATED_TOTAL_OPS=$((ACTUAL_SYNCS * 30))

# 計算節省的操作數
# 如果使用舊方式（每次 1,936 次），總共會是：
OLD_WAY_OPS=$((TOTAL_SYNCS * 1936))
SAVED_OPS=$((OLD_WAY_OPS - ESTIMATED_TOTAL_OPS))

# 計算成本
# Class B Operations: $4.50 / 百萬次
CURRENT_COST=$(echo "scale=4; $ESTIMATED_TOTAL_OPS * 4.50 / 1000000" | bc)
OLD_COST=$(echo "scale=4; $OLD_WAY_OPS * 4.50 / 1000000" | bc)
SAVED_COST=$(echo "scale=4; $SAVED_OPS * 4.50 / 1000000" | bc)

echo -e "${CYAN}📈 同步統計${NC}"
echo -e "${CYAN}─────────────────────────────────────────${NC}"
echo -e "   總同步次數：      ${GREEN}${TOTAL_SYNCS}${NC} 次"
echo -e "   實際上傳：        ${GREEN}${ACTUAL_SYNCS}${NC} 次"
echo -e "   跳過（無變更）：  ${GREEN}${SKIPPED_SYNCS}${NC} 次"
echo ""

echo -e "${CYAN}💰 Class B Operations${NC}"
echo -e "${CYAN}─────────────────────────────────────────${NC}"
echo -e "   當前使用：        ${GREEN}${ESTIMATED_TOTAL_OPS}${NC} 次"
echo -e "   舊方式會使用：    ${YELLOW}${OLD_WAY_OPS}${NC} 次"
echo -e "   節省：            ${GREEN}${SAVED_OPS}${NC} 次 ($(echo "scale=1; $SAVED_OPS * 100 / $OLD_WAY_OPS" | bc)%)"
echo ""

echo -e "${CYAN}💵 成本分析${NC}"
echo -e "${CYAN}─────────────────────────────────────────${NC}"
echo -e "   當前成本：        ${GREEN}\$${CURRENT_COST}${NC}"
echo -e "   舊方式成本：      ${YELLOW}\$${OLD_COST}${NC}"
echo -e "   節省成本：        ${GREEN}\$${SAVED_COST}${NC}"
echo ""

echo -e "${CYAN}📅 最近 10 次同步記錄${NC}"
echo -e "${CYAN}─────────────────────────────────────────${NC}"
tail -10 $LOG_FILE | while IFS=',' read -r timestamp method ops notes; do
    if [[ "$notes" == *"skipped"* ]]; then
        echo -e "   ${timestamp} | ${YELLOW}跳過${NC} | 節省 ~1,936 ops"
    else
        echo -e "   ${timestamp} | ${GREEN}同步${NC} | ~${ops} ops | ${notes}"
    fi
done
echo ""

echo -e "${GREEN}🎯 優化效果${NC}"
echo -e "${GREEN}─────────────────────────────────────────${NC}"

if [ $SAVED_OPS -gt 0 ]; then
    echo -e "   ${GREEN}✅ 智能同步系統運作正常${NC}"
    echo -e "   ${GREEN}✅ 成功節省 $(echo "scale=1; $SAVED_OPS * 100 / $OLD_WAY_OPS" | bc)% Class B Operations${NC}"
    echo -e "   ${GREEN}✅ 累積節省成本：\$${SAVED_COST}${NC}"
else
    echo -e "   ${YELLOW}⚠️  尚未產生節省效果${NC}"
    echo -e "   ${CYAN}   提示：多使用 'npm run r2:smart-sync'${NC}"
fi

echo ""
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}\n"
