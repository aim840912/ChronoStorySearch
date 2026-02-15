const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  await page.goto('https://www.chronostorysearch.com/', { waitUntil: 'networkidle' });

  // Check manifest link
  const manifestLink = await page.evaluate(() => {
    const link = document.querySelector('link[rel="manifest"]');
    return link ? link.href : 'NOT FOUND';
  });
  console.log('Manifest link:', manifestLink);

  // Fetch manifest content
  if (manifestLink && manifestLink !== 'NOT FOUND') {
    const resp = await page.evaluate(async (url) => {
      try {
        const r = await fetch(url);
        return { status: r.status, body: await r.text() };
      } catch (e) { return { error: e.message }; }
    }, manifestLink);
    console.log('Manifest response:', JSON.stringify(resp, null, 2));
  }

  // Check theme-color
  const themeColor = await page.evaluate(() => {
    const meta = document.querySelector('meta[name="theme-color"]');
    return meta ? meta.content : 'NOT FOUND';
  });
  console.log('Theme color:', themeColor);

  // Check for SW script tag
  const swScript = await page.evaluate(() => {
    const scripts = document.querySelectorAll('script');
    for (const s of scripts) {
      if (s.textContent && s.textContent.includes('serviceWorker')) {
        return s.textContent.trim();
      }
    }
    return 'NOT FOUND';
  });
  console.log('SW registration script:', swScript);

  // Try fetching sw.js directly
  const swResp = await page.evaluate(async () => {
    try {
      const r = await fetch('/sw.js');
      return { status: r.status, contentType: r.headers.get('content-type'), bodyLength: (await r.text()).length };
    } catch (e) { return { error: e.message }; }
  });
  console.log('SW file:', JSON.stringify(swResp));

  await page.screenshot({ path: 'screenshots/2026-02-15/pwa-check.png', fullPage: false });
  console.log('Screenshot saved.');

  await browser.close();
})();
