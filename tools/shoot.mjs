// node tools/shoot.mjs <outDir> [url] [onlyDesktop]
import { createRequire } from 'module'; import fs from 'fs';
const require = createRequire('C:/Users/cloud/OneDrive/Desktop/Hybrid_Second_Brain/clients website/robert-junior-patisserie/node_modules/');
const { chromium } = require('playwright');
const out = process.argv[2] || 'shots'; const url = process.argv[3] || 'http://localhost:5180/'; const onlyD = process.argv[4] === 'd';
fs.mkdirSync(out, { recursive: true });
const exe = process.env.LOCALAPPDATA + '/ms-playwright/chromium-1254/chrome-win64/chrome.exe';
const browser = await chromium.launch({ executablePath: exe, args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const errors = [];
async function run(name, viewport, mobile, stops) {
  const ctx = await browser.newContext({ viewport, deviceScaleFactor: 1, reducedMotion: 'no-preference', isMobile: mobile, hasTouch: mobile });
  const page = await ctx.newPage();
  page.on('console', m => { if (m.type() === 'error' || m.type() === 'warning') errors.push(`${name} ${m.type()}: ${m.text()}`); });
  page.on('pageerror', e => errors.push(`${name} pageerror: ${e.message}`));
  await page.goto(url, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1200); await page.screenshot({ path: `${out}/${name}-00-loader.jpg`, type: 'jpeg', quality: 70 });
  await page.waitForTimeout(6000);
  const H = await page.evaluate(() => document.documentElement.scrollHeight);
  const vh = viewport.height;
  for (let i = 0; i < stops; i++) {
    const y = Math.round((H - vh) * i / (stops - 1));
    await page.evaluate((y) => { window.__lenis ? window.__lenis.scrollTo(y, { immediate: true }) : window.scrollTo(0, y); }, y);
    await page.waitForTimeout(1400);
    await page.screenshot({ path: `${out}/${name}-${String(i + 1).padStart(2, '0')}.jpg`, type: 'jpeg', quality: 70 });
  }
  await ctx.close();
}
await run('d', { width: 1440, height: 900 }, false, 30);
if (!onlyD) await run('m', { width: 390, height: 844 }, true, 26);
fs.writeFileSync(`${out}/errors.txt`, errors.join('\n'));
console.log('errors:', errors.length); console.log(errors.slice(0, 15).join('\n'));
await browser.close();
