/**
 * ChronoStory 圖片快取自動化測試腳本
 *
 * 使用方法：
 * 1. 開啟 http://localhost:3000
 * 2. 打開瀏覽器開發者工具 Console
 * 3. 複製並貼上此腳本
 * 4. 執行 testImageCache()
 */

async function testImageCache() {
  console.clear();
  console.log('%c=== 🧪 ChronoStory 圖片快取測試 ===', 'color: #667eea; font-size: 20px; font-weight: bold;');
  console.log('');

  const results = {
    phase1: null,
    phase2: null,
    cacheStats: null,
    success: false
  };

  try {
    // ========== Phase 1: 初始檢查 ==========
    console.log('%c📋 Phase 1: 初始檢查', 'color: #4299e1; font-size: 16px; font-weight: bold;');

    // 檢查快取系統是否存在
    if (typeof window.__IMAGE_CACHE_STATS__ !== 'function') {
      console.error('❌ 快取系統未啟用！請確認程式碼已部署。');
      return;
    }

    const initialStats = window.__IMAGE_CACHE_STATS__();
    console.log('✓ 快取系統已啟用');
    console.log('初始狀態:', initialStats);
    console.log('');

    // ========== Phase 2: 尋找測試目標 ==========
    console.log('%c🎯 Phase 2: 尋找測試卡片', 'color: #4299e1; font-size: 16px; font-weight: bold;');

    // 等待頁面完全載入
    await sleep(1000);

    // 尋找第一張物品卡片
    const itemCard = document.querySelector('[class*="ItemCard"], [class*="MonsterCard"], [data-testid="item-card"], [data-testid="monster-card"]');

    if (!itemCard) {
      // 嘗試尋找任何可點擊的卡片
      const anyCard = document.querySelector('div[class*="card"]:not([class*="modal"])');
      if (anyCard) {
        console.log('✓ 找到卡片元素');
        console.log('卡片元素:', anyCard);
      } else {
        console.error('❌ 找不到任何卡片！請確認：');
        console.error('  1. 頁面已完全載入');
        console.error('  2. 當前頁面有顯示卡片');
        console.error('  3. 嘗試切換到「最愛物品」或「最愛怪物」模式');
        return;
      }
    }

    const targetCard = itemCard || document.querySelector('div[class*="card"]:not([class*="modal"])');
    console.log('✓ 測試目標:', targetCard);
    console.log('');

    // ========== Phase 3: 首次開啟 Modal（建立快取）==========
    console.log('%c🚀 Phase 3: 首次開啟 Modal（建立快取）', 'color: #48bb78; font-size: 16px; font-weight: bold;');

    // 監聽 Network 請求
    const phase1Requests = [];
    const originalFetch = window.fetch;
    window.fetch = function(...args) {
      const url = args[0];
      if (url && url.includes('.png')) {
        phase1Requests.push({
          url,
          timestamp: Date.now()
        });
        console.log('  → 圖片請求:', url.split('/').pop());
      }
      return originalFetch.apply(this, args);
    };

    console.log('點擊卡片...');
    targetCard.click();

    // 等待 Modal 開啟和圖片載入
    await sleep(2000);

    const statsAfterOpen1 = window.__IMAGE_CACHE_STATS__();
    console.log('✓ Modal 已開啟');
    console.log(`✓ 偵測到 ${phase1Requests.length} 個圖片請求`);
    console.log('快取狀態:', statsAfterOpen1);
    results.phase1 = {
      requests: phase1Requests.length,
      stats: statsAfterOpen1
    };
    console.log('');

    // ========== Phase 4: 關閉 Modal ==========
    console.log('%c✖ Phase 4: 關閉 Modal', 'color: #4299e1; font-size: 16px; font-weight: bold;');

    // 尋找關閉按鈕
    const closeButton = document.querySelector('[aria-label*="關閉"], [aria-label*="close"], button[class*="close"]');
    if (closeButton) {
      console.log('點擊關閉按鈕...');
      closeButton.click();
    } else {
      // 嘗試按 ESC
      console.log('嘗試按 ESC 鍵...');
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    }

    await sleep(500);
    console.log('✓ Modal 已關閉');
    console.log('');

    // ========== Phase 5: 重新開啟 Modal（測試快取）==========
    console.log('%c🔄 Phase 5: 重新開啟 Modal（測試快取）', 'color: #ed8936; font-size: 16px; font-weight: bold;');

    // 重置請求監聽
    const phase2Requests = [];
    window.fetch = function(...args) {
      const url = args[0];
      if (url && url.includes('.png')) {
        phase2Requests.push({
          url,
          timestamp: Date.now()
        });
        console.log('  → 新圖片請求:', url.split('/').pop());
      }
      return originalFetch.apply(this, args);
    };

    console.log('再次點擊相同卡片...');
    targetCard.click();

    await sleep(2000);

    const statsAfterOpen2 = window.__IMAGE_CACHE_STATS__();
    console.log('✓ Modal 已重新開啟');
    console.log(`✓ 偵測到 ${phase2Requests.length} 個新圖片請求`);
    console.log('快取狀態:', statsAfterOpen2);
    results.phase2 = {
      requests: phase2Requests.length,
      stats: statsAfterOpen2
    };

    // 恢復原始 fetch
    window.fetch = originalFetch;
    console.log('');

    // ========== Phase 6: 結果分析 ==========
    console.log('%c📊 Phase 6: 測試結果分析', 'color: #667eea; font-size: 18px; font-weight: bold;');
    console.log('');

    const cacheWorking = phase2Requests.length < phase1Requests.length;

    console.log('┌─────────────────────────────────────────┐');
    console.log('│           快取效能比較                    │');
    console.log('├─────────────────────────────────────────┤');
    console.log(`│ 首次開啟：${phase1Requests.length.toString().padEnd(30)} 個請求 │`);
    console.log(`│ 第二次開啟：${phase2Requests.length.toString().padEnd(28)} 個請求 │`);
    console.log(`│ 快取命中率：${statsAfterOpen2.hitRate.padEnd(28)} │`);
    console.log(`│ 快取大小：${statsAfterOpen2.cacheSize.toString().padEnd(30)} │`);
    console.log('└─────────────────────────────────────────┘');
    console.log('');

    if (cacheWorking && phase2Requests.length === 0) {
      console.log('%c✅ 測試通過！快取系統運作完美！', 'color: #48bb78; font-size: 18px; font-weight: bold; background: #c6f6d5; padding: 10px; border-radius: 5px;');
      console.log('%c重複開啟 Modal 時完全沒有新的網路請求，所有圖片都從記憶體快取載入。', 'color: #22543d;');
      results.success = true;
    } else if (cacheWorking) {
      console.log('%c⚠️ 測試部分通過：快取有運作，但仍有部分圖片重複載入。', 'color: #ed8936; font-size: 16px; font-weight: bold;');
      console.log(`減少了 ${phase1Requests.length - phase2Requests.length} 個請求 (${((1 - phase2Requests.length / phase1Requests.length) * 100).toFixed(1)}% 改善)`);
    } else {
      console.log('%c❌ 測試失敗：快取未生效', 'color: #f56565; font-size: 18px; font-weight: bold; background: #fed7d7; padding: 10px; border-radius: 5px;');
      console.log('請檢查：');
      console.log('  1. 快取系統是否正確實作');
      console.log('  2. getCachedImageUrl 是否被正確調用');
      console.log('  3. 瀏覽器 Console 是否有錯誤訊息');
    }

    console.log('');
    console.log('%c完整測試報告:', 'color: #667eea; font-weight: bold;');
    console.table({
      '首次開啟請求數': results.phase1.requests,
      '第二次開啟請求數': results.phase2.requests,
      '請求減少數': results.phase1.requests - results.phase2.requests,
      '快取命中次數': statsAfterOpen2.hits,
      '快取未命中次數': statsAfterOpen2.misses,
      '快取命中率': statsAfterOpen2.hitRate,
      '快取大小': statsAfterOpen2.cacheSize,
      '測試結果': results.success ? '✅ 通過' : '❌ 失敗'
    });

    results.cacheStats = statsAfterOpen2;
    return results;

  } catch (error) {
    console.error('%c❌ 測試過程發生錯誤', 'color: #f56565; font-size: 16px; font-weight: bold;');
    console.error(error);
    return results;
  }
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// 提供便捷函數
window.testImageCache = testImageCache;

console.log('%c📦 圖片快取測試腳本已載入', 'color: #48bb78; font-size: 14px; font-weight: bold;');
console.log('執行測試: testImageCache()');
