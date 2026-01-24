import { test, expect } from '@playwright/test';

/**
 * API 測試工具 Modal 測試
 *
 * 測試 admin 登入後，API 測試工具 Modal 是否正常顯示
 *
 * 執行方式：npm run test:headed tests/api-tester-modal.spec.ts
 *
 * 注意：測試會在首頁暫停，請手動完成 Discord 登入
 */
test.describe('API 測試工具 Modal', () => {
  test.setTimeout(180000); // 3 分鐘超時（給用戶登入時間）

  test('admin 登入後應該能開啟 API 測試工具 Modal', async ({ page }) => {
    // 1. 導航至首頁
    await page.goto('/', { waitUntil: 'networkidle' });

    // 2. 暫停測試，讓用戶手動登入
    console.log('⏸️ 請在瀏覽器中完成 Discord 登入');
    console.log('💡 登入完成後，在 Playwright Inspector 點擊 "Resume" 繼續');
    await page.pause();

    // 3. 登入完成後，等待頁面更新
    await page.waitForTimeout(2000);

    // 4. 開啟工具欄選單（aria-label="選單" 或 "Menu"）
    const menuButton = page.locator('button[aria-label="選單"], button[aria-label="Menu"]').first();
    await expect(menuButton).toBeVisible({ timeout: 5000 });
    await menuButton.click();
    console.log('✅ 已開啟工具欄選單');

    // 5. 等待選單展開
    await page.waitForTimeout(500);

    // 6. 找到並點擊 API 測試選單項目（僅 admin 可見）
    const apiTesterItem = page.locator('text=API 測試 (DEV)').or(page.locator('text=API Tester (DEV)'));
    await expect(apiTesterItem).toBeVisible({ timeout: 5000 });
    console.log('✅ API 測試選單項目可見（確認為 admin）');
    await apiTesterItem.click();

    // 7. 驗證 Modal 已開啟
    const modalTitle = page.locator('text=MapleStory.io API 測試');
    await expect(modalTitle).toBeVisible({ timeout: 5000 });
    console.log('✅ API 測試工具 Modal 已成功開啟');

    // 8. 驗證 Modal 內容
    const itemButton = page.locator('text=物品 Item');
    const mobButton = page.locator('text=怪物 Mob');
    await expect(itemButton).toBeVisible();
    await expect(mobButton).toBeVisible();
    console.log('✅ Modal 內的切換按鈕已正確顯示');

    // 9. 測試切換功能
    await mobButton.click();
    await expect(mobButton).toHaveClass(/bg-orange-500/);
    console.log('✅ 切換到怪物模式成功');

    // 10. 關閉 Modal（橙色標題列上的 X 按鈕）
    const closeButton = page.locator('.bg-orange-500 button').first();
    await closeButton.click();
    await expect(modalTitle).not.toBeVisible({ timeout: 2000 });
    console.log('✅ Modal 已成功關閉');

    console.log('\n🎉 所有測試通過！API 測試工具 Modal 功能正常');
  });
});
