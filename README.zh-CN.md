# dsh-usage-stats

[English](./README.md)

为 DeepSeek Harness 打造的精美 Token 数据面板：历史累计、近期趋势、活跃热力图、
模型用量分析、工作区/任务筛选与 CSV/JSON 导出，并通过官方 Web UI Slot 无缝集成。

![完整浅色统计界面](./assets/dashboard-light-full.png)

<details>
<summary>深色主题</summary>

![完整深色统计界面](./assets/dashboard-dark-full.png)

</details>

## 安装

```sh
dsh plugin --profile web add dsh-usage-stats
```

重启 Web Profile 后，可在侧边栏“设置”上方打开“使用统计”。升级或卸载：

```sh
dsh plugin --profile web update dsh-usage-stats
dsh plugin --profile web remove dsh-usage-stats
```

## 功能

- Token、会话、消息、活跃天数、连续天数和最常用模型的历史累计。
- 最近 7/30 天 Token 趋势，悬停可查看各模型精确用量。
- 一年活跃热力图，悬停可查看每日 Token 和调用轮次。
- 工作区以及主任务/子任务筛选。
- 浅色、深色及跟随系统主题。
- 同源只读的 CSV/JSON 导出。
- 无图表运行时依赖，无后台轮询。

## 隐私

索引仅保存在 `DSH_HOME/usage-stats`，内容包括会话标识、时间戳、工作目录标签、
提供商/模型标识和 Token 计数。插件不保存提示词正文、回复正文、工具参数或 API
密钥。完整说明见 [PRIVACY.md](./PRIVACY.md)。

## 兼容性

已验证基线为 DeepSeek Harness `0.1.0-rc.6`，Node.js `22.19+` 或 `24+`，
适用于官方 Web UI 及加载该 Web UI 的桌面封装。Harness 仍处于开发者预览阶段，
因此我们只声明经过测试的版本，不承诺未经验证的未来版本。详见
[兼容性说明](./docs/COMPATIBILITY.md)。

Host 侧只使用 `sessionQuery`、`session/event` 和 `webServer`；浏览器侧只使用
公开的 `sidebar.footer.action` 与 `shell.overlay` Slot，不查询或修改 Harness DOM。

## 配置

```yaml
config:
  indexConcurrency: 2
  cacheWriteDelayMs: 1000
  apiPath: /usage-stats/v1
```

- `indexConcurrency`：历史会话读取并发数（`1`–`8`）。
- `cacheWriteDelayMs`：本地索引原子写入的防抖时间。
- `cachePath`：可选的自定义索引路径。
- `apiPath`：同源只读 API 前缀。

## 统计口径

- 总 Token = 输入 + 输出 + 缓存读取 + 缓存写入。
- 顶部概览卡显示当前工作区/任务范围内的历史累计。
- 趋势图显示选择的最近 7/30 天。
- 消息数为直接用户消息与完整助手回复数之和。
- 插件不进行价格或费用估算。

## 开发验证

```sh
npm ci
npm run check
npm run pack:check
npm run smoke:clean-profile
```

另见 [贡献指南](./CONTRIBUTING.md)、[安全策略](./SECURITY.md) 与
[更新记录](./CHANGELOG.md)。

## 许可证

MIT
