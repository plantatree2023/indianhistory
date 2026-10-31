// Playwright 测试配置：框架 history-common 提供（自动启动只读模式的本地服务，运行框架的测试和本网站 tests/ 中的测试）。
module.exports = require('history-common/playwright.config')(__dirname);
