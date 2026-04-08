import type { ThemePreset } from './types';

export const SAVED_DIAGRAMS_STORAGE_KEY = 'mermaid-renderer.saved-diagrams.v1';
export const DEFAULT_DIAGRAM_TITLE_PREFIX = '未命名图稿';

export const SAMPLE_DIAGRAM = `flowchart LR
    subgraph 产品流程
        A[需求整理] --> B{方案评审}
        B -->|通过| C[前端实现]
        B -->|调整| D[补充说明]
        D --> B
        C --> E[渲染预览]
        E --> F[导出 SVG / PNG]
    end

    C -. 主题切换 .-> G[浅色专业]
    C -. 主题切换 .-> H[深色演示]
    C -. 主题切换 .-> I[蓝图技术]
    C -. 主题切换 .-> J[暖色纸张]
`;

export const MERMAID_FONT_STACK = 'Segoe UI, Microsoft YaHei UI, Microsoft YaHei, PingFang SC, Hiragino Sans GB, sans-serif';

export const THEME_PRESETS: ThemePreset[] = [
  {
    id: 'professional-light',
    label: '浅色专业',
    canvasBackground: '#f3f7ff',
    swatches: ['#4f7cff', '#ffffff', '#223252', '#87b6ff'],
    themeVariables: {
      background: '#f3f7ff',
      primaryColor: '#ffffff',
      primaryTextColor: '#1e2a44',
      primaryBorderColor: '#4f7cff',
      lineColor: '#57709f',
      secondaryColor: '#dfe9ff',
      tertiaryColor: '#edf4ff',
      secondaryTextColor: '#1e2a44',
      tertiaryTextColor: '#1e2a44',
      mainBkg: '#ffffff',
      nodeBorder: '#4f7cff',
      clusterBkg: '#e7efff',
      clusterBorder: '#87a9eb',
      titleColor: '#1e2a44',
      edgeLabelBackground: '#f7faff',
      fontFamily: MERMAID_FONT_STACK,
    },
  },
  {
    id: 'midnight-stage',
    label: '深色演示',
    canvasBackground: '#07111f',
    swatches: ['#57d4ff', '#10243f', '#edf6ff', '#ffbc73'],
    themeVariables: {
      background: '#07111f',
      primaryColor: '#10243f',
      primaryTextColor: '#edf6ff',
      primaryBorderColor: '#57d4ff',
      lineColor: '#79caf0',
      secondaryColor: '#17345c',
      tertiaryColor: '#14304f',
      secondaryTextColor: '#edf6ff',
      tertiaryTextColor: '#edf6ff',
      mainBkg: '#10243f',
      nodeBorder: '#57d4ff',
      clusterBkg: '#0d1d33',
      clusterBorder: '#2d5f8f',
      titleColor: '#edf6ff',
      edgeLabelBackground: '#10243f',
      fontFamily: MERMAID_FONT_STACK,
    },
  },
  {
    id: 'blueprint-tech',
    label: '蓝图技术',
    canvasBackground: '#eef7fb',
    swatches: ['#0f6d8d', '#d9f1fb', '#113544', '#56b4d3'],
    themeVariables: {
      background: '#eef7fb',
      primaryColor: '#d9f1fb',
      primaryTextColor: '#113544',
      primaryBorderColor: '#0f6d8d',
      lineColor: '#0f6d8d',
      secondaryColor: '#c4e8f4',
      tertiaryColor: '#f7fdff',
      secondaryTextColor: '#113544',
      tertiaryTextColor: '#113544',
      mainBkg: '#d9f1fb',
      nodeBorder: '#0f6d8d',
      clusterBkg: '#caeaf5',
      clusterBorder: '#56b4d3',
      titleColor: '#113544',
      edgeLabelBackground: '#f7fdff',
      fontFamily: MERMAID_FONT_STACK,
    },
  },
  {
    id: 'paper-warm',
    label: '暖色纸张',
    canvasBackground: '#fbf1e3',
    swatches: ['#ba6f3c', '#fffaf2', '#4f3728', '#d99d6c'],
    themeVariables: {
      background: '#fbf1e3',
      primaryColor: '#fffaf2',
      primaryTextColor: '#4f3728',
      primaryBorderColor: '#ba6f3c',
      lineColor: '#8e6240',
      secondaryColor: '#f8e2c5',
      tertiaryColor: '#fef5e8',
      secondaryTextColor: '#4f3728',
      tertiaryTextColor: '#4f3728',
      mainBkg: '#fffaf2',
      nodeBorder: '#ba6f3c',
      clusterBkg: '#f4dfc7',
      clusterBorder: '#d99d6c',
      titleColor: '#4f3728',
      edgeLabelBackground: '#fffaf2',
      fontFamily: MERMAID_FONT_STACK,
    },
  },
  {
    id: 'mint-system',
    label: '薄荷系统',
    canvasBackground: '#eefbf7',
    swatches: ['#0f967d', '#ffffff', '#173a34', '#72d3be'],
    themeVariables: {
      background: '#eefbf7',
      primaryColor: '#ffffff',
      primaryTextColor: '#173a34',
      primaryBorderColor: '#0f967d',
      lineColor: '#268774',
      secondaryColor: '#d5f5ec',
      tertiaryColor: '#f8fffd',
      secondaryTextColor: '#173a34',
      tertiaryTextColor: '#173a34',
      mainBkg: '#ffffff',
      nodeBorder: '#0f967d',
      clusterBkg: '#daf6ef',
      clusterBorder: '#72d3be',
      titleColor: '#173a34',
      edgeLabelBackground: '#ffffff',
      fontFamily: MERMAID_FONT_STACK,
    },
  },
  {
    id: 'pink-dream',
    label: '少女粉',
    canvasBackground: '#fff0f6',
    swatches: ['#ff6fae', '#fff8fb', '#6e2b4d', '#ffb6d2'],
    themeVariables: {
      background: '#fff0f6',
      primaryColor: '#fff8fb',
      primaryTextColor: '#6e2b4d',
      primaryBorderColor: '#ff6fae',
      lineColor: '#d85c93',
      secondaryColor: '#ffd9e8',
      tertiaryColor: '#fff5f9',
      secondaryTextColor: '#6e2b4d',
      tertiaryTextColor: '#6e2b4d',
      mainBkg: '#fff8fb',
      nodeBorder: '#ff6fae',
      clusterBkg: '#ffe2ee',
      clusterBorder: '#ffb6d2',
      titleColor: '#6e2b4d',
      edgeLabelBackground: '#fff8fb',
      fontFamily: MERMAID_FONT_STACK,
    },
  },
];

