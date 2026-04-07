# Mermaid Renderer

一个基于 React、TypeScript 和 Vite 的 Mermaid 渲染工具网站。

它提供左侧代码编辑、右侧实时预览，支持拖拽缩放、主题配色切换，以及导出 `SVG` 和 `PNG`。

在线地址：

[https://mermaid-renderer.sdcb.ai](https://mermaid-renderer.sdcb.ai)

截图：

![Mermaid Renderer screenshot](https://github.com/user-attachments/assets/deddad0d-c1f1-4cc3-a7ca-269253332486)

## Features

- 实时渲染 Mermaid 文本
- 图形预览支持拖拽和平滑缩放
- 支持多套配色风格
- 支持导出 `SVG` 和 `PNG`
- 支持拖拽调整编辑器和预览区宽度
- 基于 `React 19` + `TypeScript` + `Vite 8`
- 纯前端实现，无后端依赖

## Local Development

安装依赖：

```powershell
npm install
```

启动开发服务器：

```powershell
npm run dev
```

执行 lint：

```powershell
npm run lint
```

构建生产版本：

```powershell
npm run build
```

默认开发地址：

```text
http://127.0.0.1:5173/
```

## Tech

- `Mermaid`
- `svg-pan-zoom`
- `React`
- `TypeScript`
- `Vite`
- `ESLint`
