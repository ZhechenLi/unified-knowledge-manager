# Unified Knowledge Manager

独立实现目录：`standalone/unified-knowledge-mvp/`

## Stack

- Electron desktop shell
- React renderer
- Node.js main process services
- SQLite via `node:sqlite`

## Others Can Download It

这个项目现在面向 GitHub Releases 分发，而不只是源码下载。

- 开发者可以直接 clone 源码运行
- 普通用户可以从 GitHub Release 下载桌面安装包
- 当前打包目标：
  - macOS: `dmg` + `zip`
  - Windows: `nsis`
  - Linux: `AppImage` + `tar.gz`

说明：

- 由于当前没有做代码签名，macOS 首次打开可能会看到 Gatekeeper 警告
- 如果要让更多人无障碍下载，后续建议补 Apple notarization 和 Windows code signing
- release workflow 在打 tag 时会把桌面产物发布到 GitHub Releases

## Local Commands

开发环境要求：

```bash
node >= 24
npm >= 10
```

常用命令：

```bash
npm install
npm run test
npm run build
npm run electron
npm run dist:desktop
```

前端开发：

```bash
npm run dev
```

如果需要单独调试服务层，也保留了：

```bash
npm run server
```
