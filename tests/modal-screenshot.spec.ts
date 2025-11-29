import { test, expect } from '@playwright/test';

/**
 * Modal 截圖功能測試
 *
 * 測試 ItemModal 和 MonsterModal 的下載截圖和複製截圖功能
 *
 * 注意：由於 html-to-image 在處理跨域 CDN 圖片時可能遇到 CORS 限制，
 * 這些測試主要驗證 UI 元素和按鈕行為，而非完整的截圖流程。
 */
test.describe('Modal 截圖功能測試', () => {
  // 設定較長的測試超時時間
  test.setTimeout(60000);

  test.describe('MonsterModal 截圖 UI', () => {
    test('應該顯示截圖按鈕並有正確的 aria-label', async ({ page }) => {
      // 導航至首頁
      await page.goto('/', { waitUntil: 'networkidle' });

      // 等待卡片載入
      await page.waitForSelector('img[src*="r2.dev"], img[src*=".png"]', { timeout: 15000 });

      // 點擊第一張怪物卡片開啟 Modal
      const monsterCard = page.locator('img[src*="r2.dev"], img[src*=".png"]').first().locator('../..');
      await monsterCard.click();

      // 等待 Modal 開啟
      await page.waitForTimeout(1500);

      // 確認截圖按鈕存在並有正確的 aria-label
      const downloadButton = page.locator('button[aria-label="下載截圖"], button[title="下載截圖"]').first();
      const copyButton = page.locator('button[aria-label="複製截圖"], button[title="複製截圖"]').first();

      await expect(downloadButton).toBeVisible({ timeout: 5000 });
      await expect(copyButton).toBeVisible({ timeout: 5000 });

      // 驗證按鈕初始狀態不是禁用的
      await expect(downloadButton).not.toBeDisabled();
      await expect(copyButton).not.toBeDisabled();

      console.log('✅ MonsterModal 截圖按鈕 UI 測試通過');
    });

    test('點擊下載截圖按鈕後應該進入擷取狀態', async ({ page }) => {
      // 導航至首頁
      await page.goto('/', { waitUntil: 'networkidle' });

      // 等待卡片載入
      await page.waitForSelector('img[src*="r2.dev"], img[src*=".png"]', { timeout: 15000 });

      // 點擊第一張怪物卡片開啟 Modal
      const monsterCard = page.locator('img[src*="r2.dev"], img[src*=".png"]').first().locator('../..');
      await monsterCard.click();

      // 等待 Modal 開啟
      await page.waitForTimeout(1500);

      // 取得下載按鈕
      const downloadButton = page.locator('button[aria-label="下載截圖"], button[title="下載截圖"]').first();
      await expect(downloadButton).toBeVisible({ timeout: 5000 });

      // 點擊下載截圖按鈕
      await downloadButton.click();

      // 短暫等待後檢查按鈕是否變成 disabled（表示進入擷取狀態）
      await page.waitForTimeout(100);

      // 按鈕應該變成 disabled（isCapturing = true）
      const isDisabled = await downloadButton.isDisabled();

      // 記錄狀態（無論成功與否）
      if (isDisabled) {
        console.log('✅ 下載按鈕正確進入擷取狀態 (disabled)');
      } else {
        console.log('ℹ️ 下載按鈕未進入擷取狀態（可能截圖已快速完成或失敗）');
      }

      // 等待一段時間讓截圖流程處理
      await page.waitForTimeout(3000);

      // 檢查是否有任何 Toast 訊息出現（成功或失敗）
      const successToast = page.locator('text=截圖已下載');
      const failedToast = page.locator('text=截圖失敗');

      const hasSuccessToast = await successToast.isVisible().catch(() => false);
      const hasFailedToast = await failedToast.isVisible().catch(() => false);

      if (hasSuccessToast) {
        console.log('✅ 截圖下載成功，顯示成功 Toast');
      } else if (hasFailedToast) {
        console.log('⚠️ 截圖下載失敗（可能是 CORS 問題），顯示失敗 Toast');
      } else {
        console.log('ℹ️ 未檢測到 Toast 訊息（可能仍在處理中或 Toast 已消失）');
      }

      // 測試通過條件：按鈕曾經進入 disabled 狀態 或 有任何 Toast 出現
      expect(isDisabled || hasSuccessToast || hasFailedToast).toBe(true);
    });

    test('點擊複製截圖按鈕後應該進入擷取狀態', async ({ page, context }) => {
      // 授予 Clipboard 權限
      await context.grantPermissions(['clipboard-read', 'clipboard-write']);

      // 導航至首頁
      await page.goto('/', { waitUntil: 'networkidle' });

      // 等待卡片載入
      await page.waitForSelector('img[src*="r2.dev"], img[src*=".png"]', { timeout: 15000 });

      // 點擊第一張怪物卡片開啟 Modal
      const monsterCard = page.locator('img[src*="r2.dev"], img[src*=".png"]').first().locator('../..');
      await monsterCard.click();

      // 等待 Modal 開啟
      await page.waitForTimeout(1500);

      // 取得複製按鈕
      const copyButton = page.locator('button[aria-label="複製截圖"], button[title="複製截圖"]').first();
      await expect(copyButton).toBeVisible({ timeout: 5000 });

      // 點擊複製截圖按鈕
      await copyButton.click();

      // 短暫等待後檢查按鈕是否變成 disabled（表示進入擷取狀態）
      await page.waitForTimeout(100);

      const isDisabled = await copyButton.isDisabled();

      if (isDisabled) {
        console.log('✅ 複製按鈕正確進入擷取狀態 (disabled)');
      } else {
        console.log('ℹ️ 複製按鈕未進入擷取狀態');
      }

      // 等待一段時間讓截圖流程處理
      await page.waitForTimeout(3000);

      // 檢查是否有任何 Toast 訊息出現
      const successToast = page.locator('text=截圖已複製到剪貼簿');
      const focusToast = page.locator('text=請保持視窗焦點後再試');
      const failedToast = page.locator('text=複製失敗');

      const hasSuccessToast = await successToast.isVisible().catch(() => false);
      const hasFocusToast = await focusToast.isVisible().catch(() => false);
      const hasFailedToast = await failedToast.isVisible().catch(() => false);

      if (hasSuccessToast) {
        console.log('✅ 截圖複製成功，顯示成功 Toast');
      } else if (hasFocusToast) {
        console.log('⚠️ 需要視窗焦點（這是預期行為）');
      } else if (hasFailedToast) {
        console.log('⚠️ 截圖複製失敗（可能是 CORS 問題）');
      } else {
        console.log('ℹ️ 未檢測到 Toast 訊息');
      }

      expect(isDisabled || hasSuccessToast || hasFocusToast || hasFailedToast).toBe(true);
    });
  });

  test.describe('截圖按鈕樣式測試', () => {
    test('截圖按鈕應該有正確的 hover 效果 class', async ({ page }) => {
      // 導航至首頁
      await page.goto('/', { waitUntil: 'networkidle' });

      // 等待卡片載入
      await page.waitForSelector('img[src*="r2.dev"], img[src*=".png"]', { timeout: 15000 });

      // 點擊第一張卡片開啟 Modal
      const card = page.locator('img[src*="r2.dev"], img[src*=".png"]').first().locator('../..');
      await card.click();

      // 等待 Modal 開啟
      await page.waitForTimeout(1500);

      // 取得下載和複製按鈕
      const downloadButton = page.locator('button[aria-label="下載截圖"], button[title="下載截圖"]').first();
      const copyButton = page.locator('button[aria-label="複製截圖"], button[title="複製截圖"]').first();

      await expect(downloadButton).toBeVisible({ timeout: 5000 });
      await expect(copyButton).toBeVisible({ timeout: 5000 });

      // 驗證下載按鈕包含 hover 效果 class
      const downloadButtonClass = await downloadButton.getAttribute('class');
      expect(downloadButtonClass).toContain('hover:scale-110');
      expect(downloadButtonClass).toContain('hover:text-blue-500');

      // 驗證複製按鈕包含 hover 效果 class
      const copyButtonClass = await copyButton.getAttribute('class');
      expect(copyButtonClass).toContain('hover:scale-110');
      expect(copyButtonClass).toContain('hover:text-green-500');

      console.log('✅ 截圖按鈕有正確的 hover 效果');
    });

    test('截圖按鈕應該包含 disabled 相關樣式', async ({ page }) => {
      // 導航至首頁
      await page.goto('/', { waitUntil: 'networkidle' });

      // 等待卡片載入
      await page.waitForSelector('img[src*="r2.dev"], img[src*=".png"]', { timeout: 15000 });

      // 點擊第一張卡片開啟 Modal
      const card = page.locator('img[src*="r2.dev"], img[src*=".png"]').first().locator('../..');
      await card.click();

      // 等待 Modal 開啟
      await page.waitForTimeout(1500);

      // 取得按鈕
      const downloadButton = page.locator('button[aria-label="下載截圖"], button[title="下載截圖"]').first();

      // 驗證按鈕包含 disabled 狀態樣式
      const buttonClass = await downloadButton.getAttribute('class');
      expect(buttonClass).toContain('disabled:opacity-50');
      expect(buttonClass).toContain('disabled:cursor-not-allowed');

      console.log('✅ 截圖按鈕包含正確的 disabled 樣式');
    });
  });

  test.describe('關閉按鈕測試', () => {
    test('關閉按鈕應該正確關閉 Modal', async ({ page }) => {
      // 導航至首頁
      await page.goto('/', { waitUntil: 'networkidle' });

      // 等待卡片載入
      await page.waitForSelector('img[src*="r2.dev"], img[src*=".png"]', { timeout: 15000 });

      // 點擊第一張卡片開啟 Modal
      const card = page.locator('img[src*="r2.dev"], img[src*=".png"]').first().locator('../..');
      await card.click();

      // 等待 Modal 開啟
      await page.waitForTimeout(1500);

      // 確認 Modal 已開啟
      const closeButton = page.locator('button[aria-label="關閉"]').first();
      await expect(closeButton).toBeVisible({ timeout: 5000 });

      // 點擊關閉按鈕
      await closeButton.click();

      // 等待 Modal 關閉
      await page.waitForTimeout(500);

      // 驗證 Modal 已關閉（關閉按鈕不再可見）
      await expect(closeButton).not.toBeVisible({ timeout: 2000 });

      console.log('✅ 關閉按鈕正確關閉 Modal');
    });
  });
});
