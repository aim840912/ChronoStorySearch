#!/bin/bash
#######################################################################
# Cache-Control Header 驗證腳本
#
# 功能：
# - 驗證 R2 圖片是否包含正確的 Cache-Control headers
# - 測試多個圖片 URL
# - 顯示清晰的驗證結果
#
# 使用方式：
# bash scripts/verify-cache-control.sh
#######################################################################

set -e

# 顏色定義
GREEN='\033[0;32m'
RED='\033[0;31m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# CDN Domain
CDN_DOMAIN="cdn.chronostorysearch.com"

# 測試的圖片列表
TEST_IMAGES=(
    "images/items/1002004.png"
    "images/items/1050001.png"
    "images/items/1060002.png"
)

# 期望的 Cache-Control header
EXPECTED_CACHE_CONTROL="public, max-age=31536000, immutable"

echo -e "${BLUE}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║       Cache-Control Header 驗證工具                        ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════════╝${NC}\n"

echo -e "${CYAN}📍 CDN Domain: ${CDN_DOMAIN}${NC}"
echo -e "${CYAN}🎯 期望的 Cache-Control: ${EXPECTED_CACHE_CONTROL}${NC}\n"

# 統計
TOTAL_TESTS=0
PASSED_TESTS=0
FAILED_TESTS=0

# 測試每個圖片
for IMAGE_PATH in "${TEST_IMAGES[@]}"; do
    TOTAL_TESTS=$((TOTAL_TESTS + 1))
    URL="https://${CDN_DOMAIN}/${IMAGE_PATH}"

    echo -e "${BLUE}[測試 ${TOTAL_TESTS}/${#TEST_IMAGES[@]}] ${IMAGE_PATH}${NC}"
    echo -e "${CYAN}   URL: ${URL}${NC}"

    # 發送 HEAD 請求並取得 Cache-Control header
    RESPONSE=$(curl -sI "$URL" 2>&1)

    if [ $? -ne 0 ]; then
        echo -e "${RED}   ✗ 請求失敗: 無法連接到 ${URL}${NC}\n"
        FAILED_TESTS=$((FAILED_TESTS + 1))
        continue
    fi

    # 提取 Cache-Control header（不區分大小寫）
    CACHE_CONTROL=$(echo "$RESPONSE" | grep -i "^cache-control:" | sed 's/cache-control: //i' | tr -d '\r')

    if [ -z "$CACHE_CONTROL" ]; then
        echo -e "${RED}   ✗ 失敗: 缺少 Cache-Control header${NC}"
        echo -e "${YELLOW}   提示: 請執行 npm run r2:sync-full 重新上傳圖片${NC}\n"
        FAILED_TESTS=$((FAILED_TESTS + 1))
        continue
    fi

    # 比對 Cache-Control header（允許空白差異）
    if echo "$CACHE_CONTROL" | grep -q "max-age=31536000" && echo "$CACHE_CONTROL" | grep -q "immutable"; then
        echo -e "${GREEN}   ✓ 通過${NC}"
        echo -e "${GREEN}   Cache-Control: ${CACHE_CONTROL}${NC}\n"
        PASSED_TESTS=$((PASSED_TESTS + 1))
    else
        echo -e "${RED}   ✗ 失敗: Cache-Control header 不正確${NC}"
        echo -e "${YELLOW}   實際值: ${CACHE_CONTROL}${NC}"
        echo -e "${YELLOW}   期望值: ${EXPECTED_CACHE_CONTROL}${NC}"
        echo -e "${YELLOW}   提示: 請執行 npm run r2:sync-full 重新上傳圖片${NC}\n"
        FAILED_TESTS=$((FAILED_TESTS + 1))
    fi
done

# 顯示總結
echo -e "${BLUE}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║                   驗證結果總結                              ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════════╝${NC}\n"

echo -e "${CYAN}總測試數: ${TOTAL_TESTS}${NC}"
echo -e "${GREEN}通過: ${PASSED_TESTS}${NC}"
echo -e "${RED}失敗: ${FAILED_TESTS}${NC}\n"

if [ $FAILED_TESTS -eq 0 ]; then
    echo -e "${GREEN}╔════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${GREEN}║  🎉 所有測試通過！Cache-Control headers 配置正確         ║${NC}"
    echo -e "${GREEN}╚════════════════════════════════════════════════════════════╝${NC}\n"

    echo -e "${CYAN}📊 預期效果：${NC}"
    echo -e "${GREEN}   • 瀏覽器將快取圖片 1 年（max-age=31536000）${NC}"
    echo -e "${GREEN}   • 快取不會發送驗證請求（immutable）${NC}"
    echo -e "${GREEN}   • Class B Operations 將減少 90-95%${NC}"
    echo -e "${GREEN}   • 預計 1-3 天後可觀察到完整效果${NC}\n"

    exit 0
else
    echo -e "${RED}╔════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${RED}║  ⚠️  部分測試失敗，請檢查配置                            ║${NC}"
    echo -e "${RED}╚════════════════════════════════════════════════════════════╝${NC}\n"

    echo -e "${YELLOW}🔧 修復步驟：${NC}"
    echo -e "${CYAN}   1. 確認已修改 package.json 和 r2-smart-sync.sh${NC}"
    echo -e "${CYAN}   2. 執行以下指令重新上傳圖片：${NC}"
    echo -e "${CYAN}      npm run r2:sync-full${NC}"
    echo -e "${CYAN}   3. 等待 2-3 分鐘後重新執行此驗證腳本${NC}"
    echo -e "${CYAN}   4. 如問題持續，請檢查 rclone 版本和配置${NC}\n"

    exit 1
fi
