#!/bin/bash

# 並發測試腳本：驗證競態條件修復
# 用途：模擬多個並發請求，確認配額限制和唯一性約束正常運作
# 執行方式：bash tests/concurrency/test-race-condition.sh

set -e  # 遇到錯誤立即停止

# ============================================================
# 配置變數
# ============================================================

API_URL="${API_URL:-http://localhost:3000/api/listings}"
TEST_USER_SESSION="${TEST_USER_SESSION:-}"  # 從環境變數讀取 session token
CONCURRENT_REQUESTS=10  # 並發請求數量
TEST_ITEM_ID=1002000    # 測試物品 ID
TEMP_DIR="/tmp/trade-system-test"

# 顏色輸出
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# ============================================================
# 前置檢查
# ============================================================

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}競態條件測試腳本${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

# 檢查是否提供 session token
if [ -z "$TEST_USER_SESSION" ]; then
  echo -e "${RED}錯誤：未提供 TEST_USER_SESSION 環境變數${NC}"
  echo ""
  echo "使用方法："
  echo "1. 登入系統並從瀏覽器 DevTools 複製 session cookie"
  echo "2. 執行："
  echo "   TEST_USER_SESSION='your-session-token' bash $0"
  echo ""
  exit 1
fi

# 檢查 API 是否可訪問
echo -e "${YELLOW}檢查 API 連線...${NC}"
if ! curl -s -f -o /dev/null "$API_URL"; then
  echo -e "${RED}錯誤：無法連接到 API ($API_URL)${NC}"
  echo "請確認開發伺服器正在運行：npm run dev"
  exit 1
fi
echo -e "${GREEN}✓ API 連線正常${NC}"
echo ""

# 建立臨時目錄
mkdir -p "$TEMP_DIR"
echo "臨時檔案目錄：$TEMP_DIR"
echo ""

# ============================================================
# 測試 1：並發建立相同物品（測試唯一性約束）
# ============================================================

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}測試 1：並發建立相同物品${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

echo "發送 $CONCURRENT_REQUESTS 個並發請求..."
echo "預期結果：只有 1 個成功，其他收到「已經刊登此物品」錯誤"
echo ""

# 清理舊的測試檔案
rm -f "$TEMP_DIR"/response_*.json

# 發送並發請求
for i in $(seq 1 $CONCURRENT_REQUESTS); do
  {
    HTTP_CODE=$(curl -s -w "%{http_code}" -o "$TEMP_DIR/response_$i.json" \
      -X POST "$API_URL" \
      -H "Content-Type: application/json" \
      -H "Cookie: session_token=$TEST_USER_SESSION" \
      -d "{
        \"trade_type\": \"sell\",
        \"item_id\": $TEST_ITEM_ID,
        \"price\": 1000000,
        \"quantity\": 1
      }")

    echo "$HTTP_CODE" > "$TEMP_DIR/status_$i.txt"
  } &
done

# 等待所有請求完成
wait

# 統計結果
SUCCESS_COUNT=0
DUPLICATE_ERROR_COUNT=0
QUOTA_ERROR_COUNT=0
OTHER_ERROR_COUNT=0

echo "分析結果..."
echo ""

for i in $(seq 1 $CONCURRENT_REQUESTS); do
  STATUS=$(cat "$TEMP_DIR/status_$i.txt")
  RESPONSE=$(cat "$TEMP_DIR/response_$i.json" 2>/dev/null || echo "{}")

  if [ "$STATUS" = "201" ]; then
    SUCCESS_COUNT=$((SUCCESS_COUNT + 1))
    echo -e "${GREEN}請求 $i: 成功 (HTTP $STATUS)${NC}"
  elif echo "$RESPONSE" | grep -q "已經刊登此物品"; then
    DUPLICATE_ERROR_COUNT=$((DUPLICATE_ERROR_COUNT + 1))
    echo -e "${YELLOW}請求 $i: 重複刊登錯誤 (HTTP $STATUS)${NC}"
  elif echo "$RESPONSE" | grep -q "配額上限"; then
    QUOTA_ERROR_COUNT=$((QUOTA_ERROR_COUNT + 1))
    echo -e "${YELLOW}請求 $i: 配額已滿錯誤 (HTTP $STATUS)${NC}"
  else
    OTHER_ERROR_COUNT=$((OTHER_ERROR_COUNT + 1))
    echo -e "${RED}請求 $i: 其他錯誤 (HTTP $STATUS)${NC}"
    echo "   回應: $(echo "$RESPONSE" | head -c 200)"
  fi
done

echo ""
echo "統計結果："
echo "  ✓ 成功: $SUCCESS_COUNT"
echo "  ⚠ 重複刊登錯誤: $DUPLICATE_ERROR_COUNT"
echo "  ⚠ 配額已滿錯誤: $QUOTA_ERROR_COUNT"
echo "  ✗ 其他錯誤: $OTHER_ERROR_COUNT"
echo ""

# 驗證結果
if [ $SUCCESS_COUNT -eq 1 ] && [ $DUPLICATE_ERROR_COUNT -eq $((CONCURRENT_REQUESTS - 1)) ]; then
  echo -e "${GREEN}✅ 測試 1 通過：唯一性約束正常運作${NC}"
  TEST1_PASS=true
else
  echo -e "${RED}❌ 測試 1 失敗：預期 1 個成功 + $((CONCURRENT_REQUESTS - 1)) 個重複錯誤${NC}"
  TEST1_PASS=false
fi

echo ""

# ============================================================
# 測試 2：並發建立不同物品（測試配額限制）
# ============================================================

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}測試 2：並發建立不同物品${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

echo "⚠️  警告：此測試需要用戶配額接近上限"
echo "如果當前用戶已有刊登，請先刪除或確保配額 < 5"
echo ""
echo "按 Enter 繼續，或 Ctrl+C 取消..."
read

echo "發送 10 個不同物品的並發請求..."
echo "預期結果：最多 5 個成功（配額上限），其他收到配額錯誤"
echo ""

# 清理舊的測試檔案
rm -f "$TEMP_DIR"/response2_*.json

# 發送並發請求（使用不同的 item_id）
for i in $(seq 1 10); do
  ITEM_ID=$((1002000 + i))  # 不同的物品 ID
  {
    HTTP_CODE=$(curl -s -w "%{http_code}" -o "$TEMP_DIR/response2_$i.json" \
      -X POST "$API_URL" \
      -H "Content-Type: application/json" \
      -H "Cookie: session_token=$TEST_USER_SESSION" \
      -d "{
        \"trade_type\": \"sell\",
        \"item_id\": $ITEM_ID,
        \"price\": 1000000,
        \"quantity\": 1
      }")

    echo "$HTTP_CODE" > "$TEMP_DIR/status2_$i.txt"
  } &
done

# 等待所有請求完成
wait

# 統計結果
SUCCESS_COUNT2=0
QUOTA_ERROR_COUNT2=0
OTHER_ERROR_COUNT2=0

echo "分析結果..."
echo ""

for i in $(seq 1 10); do
  STATUS=$(cat "$TEMP_DIR/status2_$i.txt")
  RESPONSE=$(cat "$TEMP_DIR/response2_$i.json" 2>/dev/null || echo "{}")

  if [ "$STATUS" = "201" ]; then
    SUCCESS_COUNT2=$((SUCCESS_COUNT2 + 1))
    echo -e "${GREEN}請求 $i: 成功 (HTTP $STATUS)${NC}"
  elif echo "$RESPONSE" | grep -q "配額上限"; then
    QUOTA_ERROR_COUNT2=$((QUOTA_ERROR_COUNT2 + 1))
    echo -e "${YELLOW}請求 $i: 配額已滿錯誤 (HTTP $STATUS)${NC}"
  else
    OTHER_ERROR_COUNT2=$((OTHER_ERROR_COUNT2 + 1))
    echo -e "${RED}請求 $i: 其他錯誤 (HTTP $STATUS)${NC}"
    echo "   回應: $(echo "$RESPONSE" | head -c 200)"
  fi
done

echo ""
echo "統計結果："
echo "  ✓ 成功: $SUCCESS_COUNT2"
echo "  ⚠ 配額已滿錯誤: $QUOTA_ERROR_COUNT2"
echo "  ✗ 其他錯誤: $OTHER_ERROR_COUNT2"
echo ""

# 驗證結果
if [ $SUCCESS_COUNT2 -le 5 ] && [ $QUOTA_ERROR_COUNT2 -gt 0 ]; then
  echo -e "${GREEN}✅ 測試 2 通過：配額限制正常運作（成功 $SUCCESS_COUNT2 個，上限 5 個）${NC}"
  TEST2_PASS=true
else
  echo -e "${RED}❌ 測試 2 失敗：配額限制可能被繞過${NC}"
  TEST2_PASS=false
fi

echo ""

# ============================================================
# 測試總結
# ============================================================

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}測試總結${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

if [ "$TEST1_PASS" = true ] && [ "$TEST2_PASS" = true ]; then
  echo -e "${GREEN}🎉 所有測試通過！競態條件已成功修復${NC}"
  echo ""
  echo "驗證結果："
  echo "  ✅ 唯一性約束有效（防止重複刊登）"
  echo "  ✅ 配額限制有效（防止突破上限）"
  echo "  ✅ 資料庫交易保證原子性"
  echo ""
  EXIT_CODE=0
else
  echo -e "${RED}❌ 部分測試失敗，請檢查實作${NC}"
  echo ""
  if [ "$TEST1_PASS" = false ]; then
    echo "  ✗ 測試 1 失敗：唯一性約束未生效"
  fi
  if [ "$TEST2_PASS" = false ]; then
    echo "  ✗ 測試 2 失敗：配額限制未生效"
  fi
  echo ""
  EXIT_CODE=1
fi

# 清理提示
echo "測試資料保存在：$TEMP_DIR"
echo "如需查看詳細回應，請檢查該目錄下的 *.json 檔案"
echo ""
echo "清理測試資料："
echo "  rm -rf $TEMP_DIR"
echo ""

exit $EXIT_CODE
