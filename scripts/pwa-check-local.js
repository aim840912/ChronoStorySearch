const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  await page.goto('http://localhost:3000/', { waitUntil: 'networkidle' });

  console.log('=== PWA Diagnostic (localhost) ===\n');

  // 1. Check manifest link
  const manifestLink = await page.evaluate(() => {
    const link = document.querySelector('link[rel="manifest"]');
    return link ? link.href : 'NOT FOUND';
  });
  console.log('1. Manifest <link>:', manifestLink);

  // 2. Fetch manifest content
  if (manifestLink && manifestLink !== 'NOT FOUND') {
    const resp = await page.evaluate(async (url) => {
      try {
        const r = await fetch(url);
        return { status: r.status, body: await r.text() };
      } catch (e) { return { error: e.message }; }
    }, manifestLink);
    console.log('2. Manifest content:', resp.status === 200 ? JSON.parse(resp.body) : resp);
  } else {
    // Try known paths
    for (const path of ['/manifest.webmanifest', '/manifest.json']) {
      const resp = await page.evaluate(async (p) => {
        try {
          const r = await fetch(p);
          return { path: p, status: r.status, body: r.status === 200 ? await r.text() : null };
        } catch (e) { return { path: p, error: e.message }; }
      }, path);
      console.log('2. Try', path, ':', resp.status, resp.body ? JSON.parse(resp.body) : '');
    }
  }

  // 3. Check theme-color
  const themeColor = await page.evaluate(() => {
    const meta = document.querySelector('meta[name="theme-color"]');
    return meta ? meta.content : 'NOT FOUND';
  });
  console.log('3. Theme color meta:', themeColor);

  // 4. Check SW registration script
  const swScript = await page.evaluate(() => {
    const scripts = document.querySelectorAll('script');
    for (const s of scripts) {
      if (s.textContent && s.textContent.includes('serviceWorker')) {
        return 'FOUND';
      }
    }
    return 'NOT FOUND';
  });
  console.log('4. SW registration script:', swScript);

  // 5. Check sw.js file
  const swResp = await page.evaluate(async () => {
    try {
      const r = await fetch('/sw.js');
      return { status: r.status, contentType: r.headers.get('content-type'), size: (await r.text()).length };
    } catch (e) { return { error: e.message }; }
  });
  console.log('5. /sw.js file:', swResp);

  // 6. Screenshot
  await page.screenshot({ path: 'screenshots/2026-02-15/pwa-localhost-check.png', fullPage: false });
  console.log('\n6. Screenshot saved: screenshots/2026-02-15/pwa-localhost-check.png');

  await browser.close();
})();
