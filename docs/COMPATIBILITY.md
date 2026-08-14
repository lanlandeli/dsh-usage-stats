# 兼容性说明

| 组件 | 已验证环境 | 声明范围 |
| --- | --- | --- |
| DeepSeek Harness / dsh | `0.1.0-rc.6` | `>=0.1.0-rc.6 <0.2.0` 的对等接口 |
| Node.js | 本地验证 `24.19.0` | `^22.19.0 || >=24.0.0` |
| Web UI | 官方 `web` Profile | 必需 |
| 主题 | 浅色、深色、跟随系统 | 支持 |
| 桌面封装 | 加载同源 Web UI 的封装 | 支持 |

DeepSeek Harness 仍处于开发者预览阶段，后续版本可能包含不兼容改动。本插件只依赖以下公开接口：

- Host：`sessionQuery`、`session/event` 和 `webServer`；
- Client：`sidebar.footer.action` 和 `shell.overlay` 插槽；
- 不查询、监听或修改 Harness 所有的 DOM 节点。

每次发布必须完成：

1. TypeScript 类型检查与单元测试；
2. 生产构建与 npm 包内容检查；
3. 在全新 `DSH_HOME` 中安装打包后的插件；
4. 合成配置并启动 Web Profile；
5. 检查统计接口返回结构；
6. 从 Profile 中移除插件，且不修改 Harness 官方包。

CI 覆盖 Node.js 22.19 和 24。扩大兼容范围前，应先对新的 Harness 预览版本进行验证。
