// 默认数据集（data/in_zh.json，印度 · 中文）及其英文版（data/in_en.json）。
// 检查服务器校验通过、事件数量、两种语言的事件一一对应、文字长度、按年份排列，以及图片都是本地文件、尺寸一致、带版权信息、没有重复；
// 网站不带 ?data= 时打开的就是 in_zh。
const fs = require('fs');
const path = require('path');
const { test, expect, waitForStableLayout } = require('history-common/tests/helpers');
const { validateDataset } = require('history-common/server');
const { imageSize } = require('history-common/lib/images');

const ROOT = path.join(__dirname, '..');
const ID = 'in_zh';
const read = (id) => JSON.parse(fs.readFileSync(path.join(ROOT, 'data', `${id}.json`), 'utf8'));
const PUNCT = /[\s，。、；：“”‘’《》〈〉（）【】！？·—…,.;:()[\]!?"'-]/g;

test('in_zh、in_en 通过服务器校验，事件超过 400 个，两种语言的事件、时期、类型一一对应', () => {
  const zh = read(ID);
  expect(() => validateDataset(ID, zh)).not.toThrow();
  expect([zh.country, zh.language]).toEqual(['in', 'zh']);
  expect(zh.events.length).toBeGreaterThan(400);
  for (const lang of ['en']) {
    const other = read(`in_${lang}`);
    expect(() => validateDataset(`in_${lang}`, other)).not.toThrow();
    expect([other.country, other.language]).toEqual(['in', lang]);
    expect(other.events.map((e) => [e.id, e.year, e.majorScore])).toEqual(zh.events.map((e) => [e.id, e.year, e.majorScore]));
    expect(other.eras.map((e) => [e.start, e.end, e.color])).toEqual(zh.eras.map((e) => [e.start, e.end, e.color]));
    expect(other.types.map((t) => [t.key, t.color])).toEqual(zh.types.map((t) => [t.key, t.color]));
    zh.events.forEach((e, i) => {
      expect(other.events[i].images.map((im) => im.src), e.title).toEqual(e.images.map((im) => im.src));
      expect(!!other.events[i].transition, e.title).toBe(!!e.transition);
      expect(other.events[i].title.trim(), e.title).not.toBe('');
    });
  }
  // 每个时期（第一个除外）都从一个时期更迭事件开始
  const starts = zh.events.filter((e) => e.transition).map((e) => e.year);
  expect(starts).toEqual(zh.eras.slice(1).map((e) => e.start));
});

test('in_zh / in_en 的每张图片都有明确的许可证、来源网址和标题', () => {
  for (const id of [ID, 'in_en']) {
    for (const e of read(id).events) {
      for (const im of e.images) {
        expect(im.license, `${id} ${e.title} ${im.src}`).toMatch(/^(Public domain|CC0|CC BY(-SA)? [\d.]+)$/);
        expect(im.sourceUrl, `${id} ${e.title} ${im.src}`).toMatch(/^https:\/\/commons\.wikimedia\.org\/wiki\/File:/);
        expect(String(im.caption || '').trim(), `${id} ${e.title} ${im.src}`).not.toBe('');
      }
    }
  }
});

test('in_zh 的事件按年份排列，标题不重复，说明长度合适', () => {
  const { events } = read(ID);
  const titles = new Set();
  events.forEach((e, i) => {
    if (i) expect(e.year, `${e.title} 的年份顺序`).toBeGreaterThanOrEqual(events[i - 1].year);
    expect(titles.has(e.title), `标题重复：${e.title}`).toBe(false);
    titles.add(e.title);
    expect(e.short.replace(PUNCT, '').length, `${e.title} 的简要说明`).toBeGreaterThanOrEqual(20);
    expect(e.short.length, `${e.title} 的简要说明`).toBeLessThanOrEqual(60);
    expect(e.detail.length, `${e.title} 的详细说明`).toBeGreaterThan(e.short.length);
    expect(e.detail.length, `${e.title} 的详细说明`).toBeLessThanOrEqual(500);
  });
});

test('in_zh 的维基百科链接标题为“维基百科 - 条目名”', () => {
  const { events } = read(ID);
  const problems = [];
  for (const e of events) {
    for (const s of e.sources) {
      if (!/^https:\/\/zh\.wikipedia\.org\/wiki\/\S+$/.test(s.url)) continue;
      if (!/^维基百科 - \S.*$/.test(s.title || '')) problems.push(`${e.title}：${s.title || '（无标题）'}`);
    }
  }
  expect(problems).toEqual([]);
});

test('in_zh 的图片都是 images/ 下的本地文件，尺寸与记录一致，同一事件内没有重复', () => {
  const { events } = read(ID);
  const problems = [];
  for (const e of events) {
    expect(e.images.length, e.title).toBeLessThanOrEqual(9);
    const seen = new Set();
    for (const img of e.images) {
      if (!/^images\/[0-9a-f]{12,16}\.(jpg|png|gif|webp)$/.test(img.src)) { problems.push(`${e.title}：图片路径 ${img.src}`); continue; }
      if (seen.has(img.src)) problems.push(`${e.title}：重复图片 ${img.src}`);
      seen.add(img.src);
      const file = path.join(ROOT, img.src);
      if (!fs.existsSync(file)) { problems.push(`${e.title}：文件不存在 ${img.src}`); continue; }
      const size = imageSize(fs.readFileSync(file));
      if (!size || size.w !== img.w || size.h !== img.h) problems.push(`${e.title}：尺寸与记录不符 ${img.src}`);
    }
  }
  expect(problems).toEqual([]);
});

test('网页可以通过 ?data=in_zh 打开默认数据集', async ({ page }) => {
  const { events } = read(ID);
  await page.goto(`/?data=${ID}`);
  await expect(page.locator('.card').first()).toBeVisible();
  await waitForStableLayout(page);
  const title = await page.locator('.card .card-title').first().textContent();
  expect(events.map((e) => e.title)).toContain(title);
});

test('网页不带 ?data= 时默认打开 in_zh（不使用测试数据时）', async ({ page }) => {
  const { events } = read(ID);
  // 测试中默认数据集被换成测试数据（window.TIMELINE_DATASET），这里去掉，检查网站真正的默认值
  await page.addInitScript(() => { delete window.TIMELINE_DATASET; });
  const requested = [];
  page.on('request', (req) => { if (/\/data\/[^/]+\.json$/.test(new URL(req.url()).pathname)) requested.push(new URL(req.url()).pathname); });
  await page.goto('/');
  await expect(page.locator('.card').first()).toBeVisible();
  await waitForStableLayout(page);
  expect(requested).toEqual(['/data/in_zh.json']);
  const title = await page.locator('.card .card-title').first().textContent();
  expect(events.map((e) => e.title)).toContain(title);
  expect(new URL(page.url()).searchParams.has('data')).toBe(false);
});
