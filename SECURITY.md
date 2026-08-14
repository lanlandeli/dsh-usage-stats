# 安全策略

## 支持版本

安全修复适用于最新发布的 `0.1.x` 版本。经过验证的 Harness 基线记录在 [兼容性说明](./docs/COMPATIBILITY.md) 中。

## 报告安全问题

请使用 GitHub 仓库中的 **Security → Report a vulnerability** 私密报告入口。请勿在公开 Issue 中提交 API 密钥、提示词、会话日志或其他隐私数据。

报告中建议包含插件版本、Harness 版本、Node.js 版本，以及使用匿名示例数据编写的最小复现步骤。

## 信任边界

插件运行在 Harness Host 与 Web UI 进程中。安装前可检查源代码及 npm 包来源。插件不添加对外网络请求；其 HTTP 接口与 Harness Web UI 同源，并且仅提供只读操作。
