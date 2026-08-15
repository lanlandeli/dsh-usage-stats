# 📊 dsh-usage-stats

[English](./README.en.md)

> DeepSeek Harness Token 使用情况，一目了然。

[![npm version](https://img.shields.io/npm/v/dsh-usage-stats?style=flat-square&logo=npm)](https://www.npmjs.com/package/dsh-usage-stats)
[![npm downloads](https://img.shields.io/npm/dm/dsh-usage-stats?style=flat-square)](https://www.npmjs.com/package/dsh-usage-stats)
[![CI](https://img.shields.io/github/actions/workflow/status/lanlandeli/dsh-usage-stats/ci.yml?branch=main&style=flat-square&label=CI)](https://github.com/lanlandeli/dsh-usage-stats/actions)
[![Node](https://img.shields.io/badge/node-%3E%3D22.19%20%7C%7C%20%3E%3D24-339933?style=flat-square&logo=nodedotjs&logoColor=white)](https://nodejs.org)
[![License](https://img.shields.io/npm/l/dsh-usage-stats?style=flat-square)](./LICENSE)

dsh-usage-stats 是面向 DeepSeek Harness Web UI 的轻量使用统计插件，用于集中展示 Token 总量、每日趋势、活跃日期及模型分布。

插件通过 Harness 提供的扩展接口集成，不修改 Web UI 或官方 npm 包。统计数据保存在本机。

```sh
dsh plugin --profile web add dsh-usage-stats
```

重启 Web Profile 后，侧边栏「设置」上方会出现 **使用统计**。

更新或卸载：

```sh
dsh plugin --profile web update dsh-usage-stats
dsh plugin --profile web remove dsh-usage-stats
```

## 🎬 效果演示

![使用效果演示](./assets/usage-demo.gif)

## 🖼️ 界面截图

<details>
<summary>查看浅色主题</summary>

![浅色主题](./assets/dashboard-light-full.png)

</details>

<details>
<summary>查看深色主题</summary>

![深色主题](./assets/dashboard-dark-full.png)

</details>

## ✨ 功能概览

| 模块 | 说明 |
| --- | --- |
| 📈 **使用概览** | 展示 Token、会话、消息、活跃天数、连续使用天数及最常用模型的历史累计值 |
| 📊 **每日趋势** | 展示最近 7 天或 30 天的 Token 变化，悬停可查看指定日期的模型用量 |
| 🔥 **活跃热力图** | 以颜色深度表示一年内各日期的 Token 用量，悬停可查看 Token 数量及调用轮次 |
| 🎯 **范围筛选** | 支持按工作区、主任务或子任务限定统计范围；子任务统计会排除从父会话继承的上下文 |
| 💾 **数据导出** | 支持导出 CSV 或 JSON，用于归档或进一步分析 |
| 🎨 **主题适配** | 自动跟随 Harness 的浅色或深色主题 |
| ⚡ **轻量运行** | 无第三方图表库、无后台轮询，减少额外的网络请求与运行开销 |

## ⚙️ 配置

```yaml
config:
  indexConcurrency: 2
  cacheWriteDelayMs: 1000
  apiPath: /usage-stats/v1
```

| 配置项 | 说明 | 默认值 |
| --- | --- | --- |
| `indexConcurrency` | 同时读取历史会话的数量（`1`–`8`） | `2` |
| `cacheWriteDelayMs` | 更新本地统计前的等待时间（毫秒） | `1000` |
| `cachePath` | 自定义统计缓存位置 | Harness 数据目录 |
| `apiPath` | 统计接口路径 | `/usage-stats/v1` |

## 🔒 隐私与安全

- 统计索引保存在 `DSH_HOME/usage-stats`，内容包括会话标识、时间、工作目录、模型名称和 Token 数量。
- 插件**不保存**提示词正文、回复正文、工具参数或 API 密钥。
- 具体记录范围见 [隐私说明](./PRIVACY.md)。

## 🧩 兼容性

目前已在 DeepSeek Harness `0.1.0-rc.6`、Node.js `22.19+` 和 `24+` 上测试，可用于官方 Web UI，以及加载该 Web UI 的桌面封装。

Harness 仍在持续更新。本文仅声明经过实际测试的运行环境；其他版本可能可以正常运行，但不在当前验证范围内。详细信息见 [兼容性说明](./docs/COMPATIBILITY.md)。

## 🐛 遇到问题

如果出现插件入口缺失、统计结果不完整、界面显示异常或版本兼容问题，请 [提交 Issue](https://github.com/lanlandeli/dsh-usage-stats/issues/new)。

提交时请尽量附上：

- DeepSeek Harness 和 Node.js 版本；
- 安装或更新插件时执行的命令；
- 可复现问题的操作步骤；
- 错误日志或界面截图。

完整的环境信息和复现步骤有助于定位问题。涉及安全问题时，请勿在公开 Issue 中提交 API 密钥、访问令牌或本机数据，报告方式见 [安全策略](./SECURITY.md)。

## 📜 许可证

[MIT](./LICENSE)
