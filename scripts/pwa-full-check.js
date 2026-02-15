const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  await page.goto('http://localhost:3000/', { waitUntil: 'networkidle' });

  console.log('=== PWA Installability Check ===\n');

  // 1. Manifest link and content
  const manifest = await page.evaluate(async () => {
    const link = document.querySelector('link[rel="manifest"]');
    if (!link) return { error: 'No manifest link found' };
    const r = await fetch(link.href);
    return { url: link.href, status: r.status, content: await r.json() };
  });
  console.log('1. Manifest:', JSON.stringify(manifest, null, 2));

  // 2. Check each icon
  if (manifest.content && manifest.content.icons) {
    for (const icon of manifest.content.icons) {
      const src = icon.src.startsWith('http') ? icon.src : 'http://localhost:3000' + icon.src;
      const iconCheck = await page.evaluate(async (url) => {
        try {
          const r = await fetch(url);
          const blob = await r.blob();
          return { status: r.status, size: blob.size, type: blob.type };
        } catch (e) { return { error: e.message }; }
      }, src);
      console.log('   Icon', icon.sizes, ':', JSON.stringify(iconCheck));
    }
  }

  // 3. SW registration script present
  const swPresent = await page.evaluate(() => {
    const scripts = [...document.querySelectorAll('script')];
    return scripts.some(s => s.textContent && s.textContent.includes('serviceWorker'));
  });
  console.log('2. SW registration script:', swPresent);

  // 4. sw.js file accessible and has fetch handler
  const swFile = await page.evaluate(async () => {
    const r = await fetch('/sw.js');
    const text = await r.text();
    return {
      status: r.status,
      size: text.length,
      hasFetchHandler: text.includes("addEventListener('fetch'"),
    };
  });
  console.log('3. sw.js:', JSON.stringify(swFile));

  // 5. Theme color
  const themeColor = await page.evaluate(() => {
    const m = document.querySelector('meta[name="theme-color"]');
    return m ? m.content : 'NOT FOUND';
  });
  console.log('4. Theme color:', themeColor);

  console.log('\n=== Checklist ===');
  console.log('name/short_name:', manifest.content ? 'OK' : 'FAIL');
  console.log('start_url:', manifest.content?.start_url ? 'OK' : 'FAIL');
  console.log('display standalone:', manifest.content?.display === 'standalone' ? 'OK' : 'FAIL');
  console.log('192x192 icon:', manifest.content?.icons?.some(i => i.sizes === '192x192') ? 'OK' : 'FAIL');
  console.log('512x512 icon:', manifest.content?.icons?.some(i => i.sizes === '512x512') ? 'OK' : 'FAIL');
  console.log('SW registered:', swPresent ? 'OK' : 'FAIL');
  console.log('SW has fetch handler:', swFile.hasFetchHandler ? 'OK' : 'FAIL');
  console.log('HTTPS:', 'N/A (localhost) - required on production');

  await browser.close();
})();
