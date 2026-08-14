# 开发说明

## 本地环境

使用 Node.js 22.19+ 或 24+：

```sh
npm ci
npm run check
```

## 修改要求

- Host 代码不得依赖 Harness Web UI 的 DOM 结构；
- 仅使用 Harness 公开服务与 UI 插槽；
- 用户可见行为变化时同步更新 `README.md` 与 `README.en.md`；
- 统计逻辑或筛选行为变化时添加对应测试；
- 不保存事件正文、提示词、回复、工具参数、凭据或文件内容；
- 提交前运行 `npm run release:check`。

## 发布检查

发布前更新 `CHANGELOG.md` 与版本号，并运行全新 Profile 冒烟测试。正式版本通过 npm Trusted Publishing 发布。
