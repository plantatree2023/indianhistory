#!/usr/bin/env node
// 生成部署用的网站目录（默认 _site/）。构建脚本在框架 history-common 中（tools/build-site.js），这里只是入口：
// Cloudflare 的构建命令是 node tools/build-site.js。
// 用法：node tools/build-site.js [输出目录]
const path = require('path');
const { execFileSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..');
process.env.HISTORY_SITE = ROOT;

// history-common 是私有仓库：还没有安装时（部署环境中跳过了自动安装依赖），用环境变量 GITHUB_TOKEN
// （能读取 history-common 的只读令牌）安装。令牌只通过 git 的环境变量传给这一次安装，不写进任何文件
function ensureFramework() {
  try {
    require.resolve('history-common/tools/build-site');
    return;
  } catch {
    // 继续安装
  }
  const token = process.env.GITHUB_TOKEN;
  if (!token) throw new Error('没有安装 history-common：本地先运行 npm install；部署环境需要设置能读取 history-common 的环境变量 GITHUB_TOKEN');
  const auth = `url.https://x-access-token:${token}@github.com/.insteadOf`;
  const from = ['https://github.com/', 'ssh://git@github.com/', 'git@github.com:'];
  const env = { ...process.env, GIT_CONFIG_COUNT: String(from.length), GIT_TERMINAL_PROMPT: '0' };
  from.forEach((f, i) => { env[`GIT_CONFIG_KEY_${i}`] = auth; env[`GIT_CONFIG_VALUE_${i}`] = f; });
  execFileSync('npm', ['ci', '--omit=dev', '--ignore-scripts', '--no-audit', '--no-fund'], { cwd: ROOT, env, stdio: 'inherit' });
}

ensureFramework();
const site = require('history-common/tools/build-site');

module.exports = site;
if (require.main === module) site.cli();
