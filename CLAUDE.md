# 项目约定

## 每次改动后必须运行测试

任何改动（代码、样式、数据）完成后、提交之前，都要运行完整的端到端测试，确认没有回归：

```bash
npm install                      # 首次
npm test
```

- 全部通过才能提交和推送；推送到 `main` 后由 Cloudflare 部署（https://india.zhongshutime.com/ ，需在 Cloudflare 中连接本仓库）。
- **例外**：只改了数据文件（`data/*.json`）和 / 或只新增了图片（`images/`）时，不需要运行测试，可以直接提交推送。事件静态页和 sitemap 在部署时由 `tools/build-site.js` 按数据自动重新生成，不需要另外处理。改动涉及任何其他文件（代码、样式、测试、配置等）时仍要运行完整测试。
- 测试失败时先判断是应用的问题还是测试本身的问题，修复后重新运行完整测试。
- 新增或修改功能时，同步在 `tests/` 中补充或更新对应的测试。
- 不要通过跳过、删除或放宽测试来让测试通过。
- 测试不得改动仓库中的真实数据：默认测试服务器是只读的，写入相关测试使用临时目录。

## 结构

网页（`index.html`、`css/style.css`、`js/app.js`、`404.html` 等）、本地服务器、构建脚本、维基导入脚本和大部分测试都在框架
[history-common](https://github.com/plantatree2023/history-common) 中（`package.json` 的依赖），各部分的约定见该仓库的 CLAUDE.md。
**改网页、服务器、工具或通用测试时改 history-common**（功能对所有网站通用），发布新标签后再更新本仓库 `package.json` 中的版本；本仓库只放网站自己的内容：

- `site.config.json`：网站配置（网站名、首页标题、默认数据集 `in_zh` 与英文数据集 `in_en`、对时期的叫法、关于本站的文字、标题字体、配色），框架的模板按它替换；字段说明见 history-common 的 README
- `data/<国家>_<语言>.json`：数据集，包含时期划分 `eras` 与事件 `events`；字段说明见 `data/README.md`，改动字段时同步更新。`in_en` 是 `in_zh` 的翻译，事件 id 相同；改动 `in_zh` 不会自动同步到 `in_en`
- **事件的更新时间 `updatedAt`**（Unix 时间戳，单位秒）：任何人或 AI 改动了 `data/*.json` 中某个事件的任何字段，都要把这个事件的 `updatedAt` 改成当前时间（`date +%s`），没有改动的事件不动；编辑页保存、同步其他语言图片（`saveSiblings`）、`tools/wiki-import.js` 会自动更新，新增修改数据的代码也要更新它（见 `data/README.md`）
- `images/`：事件图片。**所有图片都从本地加载**：数据中的图片路径只能是 `images/<文件名>`，不引用外部地址；`images/` 下一层只放按内容哈希命名的图片（`_headers` 中缓存一年）；`images/share/` 是分享封面图和 apple-touch-icon，由 `node tools/share-images.js` 生成
- `audio/`、`textures/`：背景音乐和纹理（数据集的 `music` / `texture` 字段引用，只从本地加载）
- `css/fonts/`：标题字体（只含标题与时期名用到的字的子集）及许可证，`site.config.json` 的 `titleFont` 引用
- `package.json` 的 `homepage`：正式网址，canonical、sitemap、分享卡片的绝对地址都取自它，换域名时改这里
- `tools/build-site.js`：构建入口，Cloudflare 的构建命令为 `node tools/build-site.js`（调用框架的构建脚本生成 `_site/`），部署命令 `npx wrangler deploy` 按 `wrangler.jsonc` 只上传 `_site`
- history-common 是私有仓库：`package.json` 按提交号依赖它（`package-lock.json` 记录），本地 `npm install` 用自己的 GitHub 权限；部署环境设置能读取它的环境变量 `GITHUB_TOKEN`，`tools/build-site.js` 发现没有安装时用它运行 `npm ci --omit=dev`
- `playwright.config.js`：框架提供，运行框架的测试（按本网站的配置和数据检查）和本网站 `tests/` 中的测试；网站自己的测试用 `require('history-common/tests/helpers')`
- `npm start`：本地可写模式（网页中的修改写回数据文件，提供调试模式），`npm run start:public` 不提供调试模式
