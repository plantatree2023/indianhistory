#!/usr/bin/env node
// 生成社交分享卡片用的图片（index.html 的 og:image / twitter:image 和 apple-touch-icon）：
//   images/share/cover.png             1200×630 封面图
//   images/share/apple-touch-icon.png  180×180 主屏幕图标
// 用 Playwright 的 Chromium 截图，标题字体、背景纹理和时期配色都取自网站本身。
// 用法：node tools/share-images.js [数据文件，默认 data/in_zh.json]
const fs = require('fs');
const path = require('path');
const { chromium } = require('@playwright/test');

const ROOT = path.resolve(__dirname, '..');
const OUT_DIR = path.join(ROOT, 'images', 'share');
// 字体和纹理以 data URL 内嵌（about:blank 页面不能加载本地文件）
const MIME = { '.woff2': 'font/woff2', '.svg': 'image/svg+xml' };
const fileUrl = (p) => `data:${MIME[path.extname(p)]};base64,${fs.readFileSync(path.join(ROOT, p)).toString('base64')}`;

// 封面上标出的年份（数字都在标题字体中）
const MARKS = ['前2600', '前1500', '前322', '320', '1206', '1526', '1757', '1857', '1947', '1991'];

const TITLE_FONT = fileUrl('css/fonts/noto-serif-sc-title.woff2');

// 印章里的莲花（与背景纹理 textures/in-lotus.svg 同一图形）：铺满容器的 SVG；scale 为图形占方框的比例
const LOTUS = 'M50 76 C67 58.6 63.6 27.6 50 14 C36.4 27.6 33 58.6 50 76 ZM43 79 C46.9 58.8 29.9 38.9 13.9 35.9 C10.7 51.9 22.8 75 43 79 ZM57 79 C77.2 75 89.3 51.9 86.1 35.9 C70.1 38.9 53.1 58.8 57 79 ZM37 83 C32.7 67.9 15.3 62.8 4.1 68.4 C7.4 80.3 22.9 89.9 37 83 ZM63 83 C77.1 89.9 92.6 80.3 95.9 68.4 C84.7 62.8 67.3 67.9 63 83 ZM24 86C38 93 62 93 76 86C70 95 30 95 24 86Z';
function lotusSvg(scale, color) {
  const t = `translate(50 50) scale(${scale}) translate(-50 -50)`;
  return `<svg viewBox="0 0 100 100" width="100%" height="100%"><path fill="${color}" transform="${t}" d="${LOTUS}"/></svg>`;
}

function esc(s) {
  return String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
}

function baseCss(texture) {
  return `
    @font-face { font-family: 'Title'; src: url(${TITLE_FONT}) format('woff2'); }
    * { margin: 0; padding: 0; box-sizing: border-box; }
    html, body { width: 100%; height: 100%; }
    body {
      position: relative; overflow: hidden; background: #f5eee1; color: #2a2118;
      font-family: "Noto Serif SC", "WenQuanYi Zen Hei", serif;
      background-image: radial-gradient(ellipse at 30% 35%, rgba(255,255,255,.6), transparent 60%),
                        radial-gradient(ellipse at 85% 90%, rgba(168,64,26,.12), transparent 55%);
    }
    .texture {
      position: absolute; inset: 0; background: #1f5c45; opacity: ${texture ? texture.opacity * 1.3 : 0};
      -webkit-mask: url(${texture ? fileUrl(texture.src) : ''}) repeat 0 0 / ${texture ? texture.size : 240}px;
    }`;
}

function coverHtml(data) {
  const eras = data.eras;
  const segs = eras.map((e) => `<i style="background:${e.color}"></i>`).join('');
  const marks = MARKS.map((m) => `<span>${m}</span>`).join('');
  return `<!DOCTYPE html><html lang="zh-CN"><head><meta charset="utf-8"><style>
    ${baseCss(data.texture)}
    .frame { position: absolute; inset: 28px; border: 2px solid rgba(31,92,69,.55); border-radius: 6px; }
    .frame::after { content: ''; position: absolute; inset: 7px; border: 1px solid rgba(168,64,26,.4); border-radius: 3px; }
    .main { position: absolute; left: 96px; right: 96px; top: 0; bottom: 190px; display: flex; align-items: center; gap: 44px; }
    .seal {
      flex: none; width: 150px; height: 150px; border-radius: 14px; background: #1f5c45; color: #fff;
      box-shadow: 0 10px 26px rgba(20,30,55,.28);
    }
    h1 { font-family: 'Title'; font-weight: 700; font-size: 104px; line-height: 1.1; letter-spacing: 6px; white-space: nowrap; }
    p { margin-top: 18px; font-size: 38px; color: #4a3d30; letter-spacing: 3px; }
    .axis { position: absolute; left: 96px; right: 96px; bottom: 96px; }
    .marks { display: flex; justify-content: space-between; padding: 0 6px 14px; font-family: 'Title'; font-size: 34px; color: #4a3d30; }
    .band { display: flex; height: 22px; border-radius: 11px; overflow: hidden; box-shadow: 0 2px 6px rgba(20,30,55,.18); }
    .band i { flex: 1; }
  </style></head><body>
    <div class="texture"></div>
    <div class="frame"></div>
    <div class="main">
      <div class="seal">${lotusSvg(0.8, '#fff')}</div>
      <div><h1>${esc(data.title || '时间轴上的印度')}</h1><p>从印度河文明到今天 · 拖拽浏览印度历史</p></div>
    </div>
    <div class="axis"><div class="marks">${marks}</div><div class="band">${segs}</div></div>
  </body></html>`;
}

function iconHtml() {
  // iOS 会自动加圆角，图标本身铺满不留透明边
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><style>
    * { margin: 0; padding: 0; }
    body { width: 180px; height: 180px; background: #1f5c45; }
  </style></head><body>${lotusSvg(0.82, '#fff')}</body></html>`;
}

async function render(browser, html, width, height, out) {
  const page = await browser.newPage({ viewport: { width, height } });
  await page.setContent(html, { waitUntil: 'load' });
  await page.evaluate(() => document.fonts.ready);
  await page.screenshot({ path: out });
  await page.close();
}

async function main() {
  const dataFile = path.resolve(ROOT, process.argv[2] || 'data/in_zh.json');
  const data = JSON.parse(fs.readFileSync(dataFile, 'utf8'));
  fs.mkdirSync(OUT_DIR, { recursive: true });
  const browser = await chromium.launch();
  try {
    await render(browser, coverHtml(data), 1200, 630, path.join(OUT_DIR, 'cover.png'));
    await render(browser, iconHtml(), 180, 180, path.join(OUT_DIR, 'apple-touch-icon.png'));
  } finally {
    await browser.close();
  }
  console.log(`已生成 ${path.relative(ROOT, OUT_DIR)}/cover.png、apple-touch-icon.png`);
}

if (require.main === module) main().catch((e) => { console.error(e); process.exit(1); });
