# dsh-usage-stats

[English](./README.en.md)

> 你的 DeepSeek Harness，Token 都用在哪了？

[![npm version](https://img.shields.io/npm/v/dsh-usage-stats?style=flat-square&logo=npm)](https://www.npmjs.com/package/dsh-usage-stats)
[![npm downloads](https://img.shields.io/npm/dm/dsh-usage-stats?style=flat-square)](https://www.npmjs.com/package/dsh-usage-stats)
[![CI](https://img.shields.io/github/actions/workflow/status/lanlandeli/dsh-usage-stats/ci.yml?branch=main&style=flat-square&label=CI)](https://github.com/lanlandeli/dsh-usage-stats/actions)
[![License](https://img.shields.io/npm/l/dsh-usage-stats?style=flat-square)](./LICENSE)

**dsh-usage-stats** 为 DeepSeek Harness 增加一个清晰、好看的使用统计面板。
Token 总量、近期趋势、活跃日期和模型占比，打开一次就能看明白。

```sh
dsh plugin --profile web add dsh-usage-stats
```

重启 WebUI 后，在侧边栏“设置”上方点击 **使用统计**。

![使用统计演示](./assets/usage-demo.gif)

## 你可以看到什么

| | 功能 | 用途 |
| --- | --- | --- |
| 📊 | **使用总览** | 查看 Token、会话、消息、活跃天数和最常用模型 |
| 📈 | **近期趋势** | 对比最近 7 天或 30 天的每日 Token 用量 |
| 🔥 | **活跃热力图** | 快速找到一年中使用最多的日期 |
| 🤖 | **模型分布** | 看清不同模型分别用了多少 Token |
| 🎯 | **范围筛选** | 按工作区、主任务或子任务查看数据 |
| 💾 | **数据导出** | 导出 CSV 或 JSON，方便留档和继续分析 |

把鼠标放到热力图方格或趋势柱上，可以查看当天的日期、Token 和调用次数。
界面会自动适配 Harness 的浅色与深色主题。

## 界面预览

![完整浅色统计界面](./assets/dashboard-light-full.png)

<details>
<summary>查看深色主题</summary>

![完整深色统计界面](./assets/dashboard-dark-full.png)

</details>

## 安装、更新与卸载

安装：

```sh
dsh plugin --profile web add dsh-usage-stats
```

更新：

```sh
dsh plugin --profile web update dsh-usage-stats
```

卸载：

```sh
dsh plugin --profile web remove dsh-usage-stats
```

执行命令后，请重启 `dsh web`。插件入口会出现在侧边栏“设置”上方。

## 数据与隐私

- 统计数据保存在你的 Harness 数据目录中，不会上传到其他服务。
- 插件只记录时间、工作区、模型名称和 Token 数量等统计信息。
- 不保存提示词、回复正文、工具参数或 API 密钥。
- 没有后台轮询，也不依赖大型图表库。

完整说明见 [隐私说明](./PRIVACY.md)。

## 兼容性

目前已验证：

- DeepSeek Harness `0.1.0-rc.6`
- Node.js `22.19+` 或 `24+`
- 官方 WebUI，以及加载官方 WebUI 的桌面封装

Harness 仍在快速更新。如果升级后遇到问题，欢迎提交
[Issue](https://github.com/lanlandeli/dsh-usage-stats/issues)。详细范围见
[兼容性说明](./docs/COMPATIBILITY.md)。

<details>
<summary><strong>进阶配置</strong></summary>

插件无需配置即可使用。需要调整历史读取速度或存储位置时，可使用：

```yaml
config:
  indexConcurrency: 2
  cacheWriteDelayMs: 1000
  apiPath: /usage-stats/v1
```

| 配置项 | 说明 | 默认值 |
| --- | --- | --- |
| `indexConcurrency` | 同时读取历史会话的数量，可选 `1`–`8` | `2` |
| `cacheWriteDelayMs` | 统计缓存写入前的等待时间（毫秒） | `1000` |
| `cachePath` | 自定义统计缓存位置 | Harness 数据目录 |
| `apiPath` | 统计接口路径 | `/usage-stats/v1` |

</details>

<details>
<summary><strong>统计口径</strong></summary>

- 总 Token = 输入 + 输出 + 缓存读取 + 缓存写入。
- 概览卡显示所选工作区和任务范围内的历史累计。
- 趋势图显示最近 7 天或 30 天。
- 消息数包含用户消息和完整的助手回复。
- 插件不进行价格或费用估算。

</details>

## 参与改进

欢迎提交使用反馈、Issue 或 Pull Request。开发说明见
[贡献指南](./CONTRIBUTING.md)，版本变化见 [更新记录](./CHANGELOG.md)。

## 许可证

[MIT](./LICENSE)
