# Mermaid Renderer

一个纯前端的 Mermaid 渲染工具网站。

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
- 纯静态前端实现，无后端依赖

## Local Development

直接启动一个静态文件服务器即可，例如：

```powershell
python -m http.server 4173
```

然后打开：

```text
http://127.0.0.1:4173/
```

## Tech

- `Mermaid`
- `svg-pan-zoom`
- 原生 `HTML / CSS / JavaScript`
