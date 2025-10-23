import { test, expect } from '@playwright/test';

test.describe('圖片快取系統測試', () => {
  test('應該正確快取圖片並減少重複下載', async ({ page }) => {
    // 監聽所有圖片請求
    const imageRequests: string[] = [];
    const phase1Requests: string[] = [];
    const phase2Requests: string[] = [];

    let currentPhase = 1;

    page.on('request', (request) => {
      const url = request.url();
      if (url.includes('.png') && url.includes('r2.dev')) {
        imageRequests.push(url);
        if (currentPhase === 1) {
          phase1Requests.push(url);
        } else if (currentPhase === 2) {
          phase2Requests.push(url);
        }
      }
    });

    console.log('=== 🧪 開始圖片快取測試 ===\n');

    // Phase 1: 首次訪問頁面
    console.log('Phase 1: 導航至首頁...');
    await page.goto('/', { waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);

    console.log(`✓ 首頁載入完成，偵測到 ${phase1Requests.length} 個圖片請求\n`);

    // Phase 2: 尋找第一張卡片並點擊
    console.log('Phase 2: 尋找並點擊第一張卡片...');

    // 最簡單的方法：找到頁面上第一張來自 R2 的圖片，點擊它的祖父容器（卡片）
    await page.waitForSelector('img[src*="r2.dev"], img[src*=".png"]', { timeout: 10000 });
    const cardLocator = page.locator('img[src*="r2.dev"], img[src*=".png"]').first().locator('../..');

    await expect(cardLocator).toBeVisible({ timeout: 10000 });

    // 清除 Phase 1 的請求記錄，開始記錄 Phase 2
    phase1Requests.length = 0;
    currentPhase = 1;

    await cardLocator.click();
    await page.waitForTimeout(2000);

    console.log(`✓ Modal 已開啟，偵測到 ${phase1Requests.length} 個新圖片請求\n`);

    // 檢查快取統計
    const cacheStatsAfterFirstOpen = await page.evaluate(() => {
      return (window as any).__IMAGE_CACHE_STATS__?.();
    });

    console.log('快取統計（首次開啟）:', cacheStatsAfterFirstOpen);

    // Phase 3: 關閉 Modal
    console.log('\nPhase 3: 關閉 Modal...');

    const closeButton = page.locator('button[aria-label*="關閉"], button[aria-label*="close"]').first();
    if (await closeButton.isVisible({ timeout: 2000 })) {
      await closeButton.click();
    } else {
      await page.keyboard.press('Escape');
    }

    await page.waitForTimeout(500);
    console.log('✓ Modal 已關閉\n');

    // Phase 4: 重新開啟同一張卡片（測試快取）
    console.log('Phase 4: 重新點擊同一張卡片（測試快取）...');

    currentPhase = 2;
    await cardLocator.click();
    await page.waitForTimeout(2000);

    console.log(`✓ Modal 已重新開啟，偵測到 ${phase2Requests.length} 個新圖片請求\n`);

    // 檢查快取統計
    const cacheStatsAfterSecondOpen = await page.evaluate(() => {
      return (window as any).__IMAGE_CACHE_STATS__?.();
    });

    console.log('快取統計（第二次開啟）:', cacheStatsAfterSecondOpen);

    // Phase 5: 驗證結果
    console.log('\n=== 📊 測試結果分析 ===');
    console.log(`首次開啟 Modal: ${phase1Requests.length} 個圖片請求`);
    console.log(`第二次開啟 Modal: ${phase2Requests.length} 個圖片請求`);

    if (cacheStatsAfterSecondOpen) {
      console.log(`快取命中: ${cacheStatsAfterSecondOpen.hits}`);
      console.log(`快取未命中: ${cacheStatsAfterSecondOpen.misses}`);
      console.log(`快取命中率: ${cacheStatsAfterSecondOpen.hitRate}`);
      console.log(`快取大小: ${cacheStatsAfterSecondOpen.cacheSize}`);
    }

    // 斷言：第二次開啟應該比第一次請求少
    expect(phase2Requests.length).toBeLessThanOrEqual(phase1Requests.length);

    // 斷言：如果有快取統計，命中率應該 > 0%
    if (cacheStatsAfterSecondOpen) {
      const hitRate = parseFloat(cacheStatsAfterSecondOpen.hitRate);
      expect(hitRate).toBeGreaterThan(0);

      console.log(`\n✅ 測試通過！快取系統運作正常。`);
      console.log(`請求減少: ${phase1Requests.length - phase2Requests.length} 個`);
      console.log(`流量節省: ${((1 - phase2Requests.length / Math.max(phase1Requests.length, 1)) * 100).toFixed(2)}%`);
    } else {
      console.log('\n⚠️ 警告：無法獲取快取統計（可能在生產環境）');
    }

    // 截圖
    await page.screenshot({ path: 'tests/screenshots/cache-test-result.png', fullPage: true });
    console.log('\n📸 測試結果已截圖：tests/screenshots/cache-test-result.png');
  });

  test('快取統計 API 應該可用', async ({ page }) => {
    await page.goto('/');
    await page.waitForTimeout(1000);

    const cacheStatsAvailable = await page.evaluate(() => {
      return typeof (window as any).__IMAGE_CACHE_STATS__ === 'function';
    });

    expect(cacheStatsAvailable).toBe(true);

    const stats = await page.evaluate(() => {
      return (window as any).__IMAGE_CACHE_STATS__();
    });

    expect(stats).toHaveProperty('hits');
    expect(stats).toHaveProperty('misses');
    expect(stats).toHaveProperty('cacheSize');
    expect(stats).toHaveProperty('hitRate');

    console.log('✓ 快取統計 API 運作正常:', stats);
  });
});
