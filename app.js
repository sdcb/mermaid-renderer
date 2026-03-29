const SAMPLE_DIAGRAM = `flowchart LR
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

const MERMAID_FONT_STACK = "Segoe UI, Microsoft YaHei UI, Microsoft YaHei, PingFang SC, Hiragino Sans GB, sans-serif";

const THEME_PRESETS = [
  {
    id: "professional-light",
    label: "浅色专业",
    canvasBackground: "#f3f7ff",
    swatches: ["#4f7cff", "#ffffff", "#223252", "#87b6ff"],
    themeVariables: {
      background: "#f3f7ff",
      primaryColor: "#ffffff",
      primaryTextColor: "#1e2a44",
      primaryBorderColor: "#4f7cff",
      lineColor: "#57709f",
      secondaryColor: "#dfe9ff",
      tertiaryColor: "#edf4ff",
      secondaryTextColor: "#1e2a44",
      tertiaryTextColor: "#1e2a44",
      mainBkg: "#ffffff",
      nodeBorder: "#4f7cff",
      clusterBkg: "#e7efff",
      clusterBorder: "#87a9eb",
      titleColor: "#1e2a44",
      edgeLabelBackground: "#f7faff",
      fontFamily: MERMAID_FONT_STACK
    }
  },
  {
    id: "midnight-stage",
    label: "深色演示",
    canvasBackground: "#07111f",
    swatches: ["#57d4ff", "#10243f", "#edf6ff", "#ffbc73"],
    themeVariables: {
      background: "#07111f",
      primaryColor: "#10243f",
      primaryTextColor: "#edf6ff",
      primaryBorderColor: "#57d4ff",
      lineColor: "#79caf0",
      secondaryColor: "#17345c",
      tertiaryColor: "#14304f",
      secondaryTextColor: "#edf6ff",
      tertiaryTextColor: "#edf6ff",
      mainBkg: "#10243f",
      nodeBorder: "#57d4ff",
      clusterBkg: "#0d1d33",
      clusterBorder: "#2d5f8f",
      titleColor: "#edf6ff",
      edgeLabelBackground: "#10243f",
      fontFamily: MERMAID_FONT_STACK
    }
  },
  {
    id: "blueprint-tech",
    label: "蓝图技术",
    canvasBackground: "#eef7fb",
    swatches: ["#0f6d8d", "#d9f1fb", "#113544", "#56b4d3"],
    themeVariables: {
      background: "#eef7fb",
      primaryColor: "#d9f1fb",
      primaryTextColor: "#113544",
      primaryBorderColor: "#0f6d8d",
      lineColor: "#0f6d8d",
      secondaryColor: "#c4e8f4",
      tertiaryColor: "#f7fdff",
      secondaryTextColor: "#113544",
      tertiaryTextColor: "#113544",
      mainBkg: "#d9f1fb",
      nodeBorder: "#0f6d8d",
      clusterBkg: "#caeaf5",
      clusterBorder: "#56b4d3",
      titleColor: "#113544",
      edgeLabelBackground: "#f7fdff",
      fontFamily: MERMAID_FONT_STACK
    }
  },
  {
    id: "paper-warm",
    label: "暖色纸张",
    canvasBackground: "#fbf1e3",
    swatches: ["#ba6f3c", "#fffaf2", "#4f3728", "#d99d6c"],
    themeVariables: {
      background: "#fbf1e3",
      primaryColor: "#fffaf2",
      primaryTextColor: "#4f3728",
      primaryBorderColor: "#ba6f3c",
      lineColor: "#8e6240",
      secondaryColor: "#f8e2c5",
      tertiaryColor: "#fef5e8",
      secondaryTextColor: "#4f3728",
      tertiaryTextColor: "#4f3728",
      mainBkg: "#fffaf2",
      nodeBorder: "#ba6f3c",
      clusterBkg: "#f4dfc7",
      clusterBorder: "#d99d6c",
      titleColor: "#4f3728",
      edgeLabelBackground: "#fffaf2",
      fontFamily: MERMAID_FONT_STACK
    }
  },
  {
    id: "mint-system",
    label: "薄荷系统",
    canvasBackground: "#eefbf7",
    swatches: ["#0f967d", "#ffffff", "#173a34", "#72d3be"],
    themeVariables: {
      background: "#eefbf7",
      primaryColor: "#ffffff",
      primaryTextColor: "#173a34",
      primaryBorderColor: "#0f967d",
      lineColor: "#268774",
      secondaryColor: "#d5f5ec",
      tertiaryColor: "#f8fffd",
      secondaryTextColor: "#173a34",
      tertiaryTextColor: "#173a34",
      mainBkg: "#ffffff",
      nodeBorder: "#0f967d",
      clusterBkg: "#daf6ef",
      clusterBorder: "#72d3be",
      titleColor: "#173a34",
      edgeLabelBackground: "#ffffff",
      fontFamily: MERMAID_FONT_STACK
    }
  },
  {
    id: "pink-dream",
    label: "少女粉",
    canvasBackground: "#fff0f6",
    swatches: ["#ff6fae", "#fff8fb", "#6e2b4d", "#ffb6d2"],
    themeVariables: {
      background: "#fff0f6",
      primaryColor: "#fff8fb",
      primaryTextColor: "#6e2b4d",
      primaryBorderColor: "#ff6fae",
      lineColor: "#d85c93",
      secondaryColor: "#ffd9e8",
      tertiaryColor: "#fff5f9",
      secondaryTextColor: "#6e2b4d",
      tertiaryTextColor: "#6e2b4d",
      mainBkg: "#fff8fb",
      nodeBorder: "#ff6fae",
      clusterBkg: "#ffe2ee",
      clusterBorder: "#ffb6d2",
      titleColor: "#6e2b4d",
      edgeLabelBackground: "#fff8fb",
      fontFamily: MERMAID_FONT_STACK
    }
  }
];

const state = {
  activeThemeId: THEME_PRESETS[0].id,
  lastSuccessfulSvg: "",
  currentValid: false,
  panZoomInstance: null,
  renderToken: 0
};

const input = document.querySelector("#mermaid-input");
const sampleButton = document.querySelector("#sample-button");
const downloadSvgButton = document.querySelector("#download-svg");
const downloadPngButton = document.querySelector("#download-png");
const renderStatus = document.querySelector("#render-status");
const renderMessage = document.querySelector("#render-message");
const themeList = document.querySelector("#theme-list");
const workspace = document.querySelector(".workspace");
const workspaceResizer = document.querySelector("#workspace-resizer");
const previewStage = document.querySelector("#preview-stage");
const previewSurface = document.querySelector("#preview-surface");
const emptyState = document.querySelector("#empty-state");
const zoomInButton = document.querySelector("#zoom-in");
const zoomOutButton = document.querySelector("#zoom-out");
const zoomResetButton = document.querySelector("#zoom-reset");

let renderDebounceTimer = null;
let viewportResizeTimer = null;
let resizeState = null;

function getActiveTheme() {
  return THEME_PRESETS.find((theme) => theme.id === state.activeThemeId) || THEME_PRESETS[0];
}

function setStatus(kind, text, message) {
  renderStatus.className = `status-pill ${kind}`;
  renderStatus.textContent = text;
  renderMessage.textContent = message;
}

function updateDownloadState() {
  const disabled = !state.currentValid || !state.lastSuccessfulSvg;
  downloadSvgButton.disabled = disabled;
  downloadPngButton.disabled = disabled;
}

function buildThemeCards() {
  themeList.innerHTML = "";

  THEME_PRESETS.forEach((theme) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "theme-card";
    button.dataset.themeId = theme.id;
    button.setAttribute("aria-label", theme.label);
    button.title = theme.label;
    if (theme.id === state.activeThemeId) {
      button.classList.add("is-active");
    }

    const swatches = `<i style="background:${theme.swatches[0]}"></i>`;

    button.innerHTML = `
      <span class="swatches" aria-hidden="true">${swatches}</span>
    `;

    button.addEventListener("click", () => {
      if (theme.id === state.activeThemeId) {
        return;
      }

      state.activeThemeId = theme.id;
      syncActiveThemeCard();
      queueRender({ immediate: true });
    });

    themeList.appendChild(button);
  });
}

function isDesktopLayout() {
  return window.matchMedia("(min-width: 1081px)").matches;
}

function clampEditorWidth(nextWidth) {
  const workspaceRect = workspace.getBoundingClientRect();
  const rootStyles = getComputedStyle(document.documentElement);
  const minWidth = 360;
  const previewMinWidth = 420;
  const resizerWidth = Number.parseFloat(rootStyles.getPropertyValue("--resizer-width")) || 14;
  const maxWidth = Math.max(minWidth, Math.min(workspaceRect.width * 0.65, workspaceRect.width - previewMinWidth - resizerWidth));

  return Math.max(minWidth, Math.min(nextWidth, maxWidth));
}

function setEditorWidth(nextWidth) {
  const clampedWidth = clampEditorWidth(nextWidth);
  workspace.style.setProperty("--editor-width", `${clampedWidth}px`);
}

function stopResize() {
  const wasResizing = Boolean(resizeState);
  resizeState = null;
  workspaceResizer.classList.remove("is-active");
  document.body.classList.remove("is-resizing");

  if (wasResizing && input.value.trim()) {
    queueRender({ immediate: true });
  }
}

function handleResizeMove(event) {
  if (!resizeState || !isDesktopLayout()) {
    return;
  }

  setEditorWidth(event.clientX - resizeState.workspaceLeft);
}

function handleResizeEnd() {
  stopResize();
}

function handleResizeStart(event) {
  if (!isDesktopLayout()) {
    return;
  }

  const workspaceRect = workspace.getBoundingClientRect();
  resizeState = {
    workspaceLeft: workspaceRect.left
  };

  workspaceResizer.classList.add("is-active");
  document.body.classList.add("is-resizing");
  event.preventDefault();
}

function syncWorkspaceLayout() {
  if (!isDesktopLayout()) {
    workspace.style.removeProperty("--editor-width");
    stopResize();
    return;
  }

  const currentValue = workspace.style.getPropertyValue("--editor-width");
  const numericWidth = Number.parseFloat(currentValue);
  const fallbackWidth = 520;
  setEditorWidth(Number.isFinite(numericWidth) ? numericWidth : fallbackWidth);
}

function handleViewportResize() {
  syncWorkspaceLayout();

  window.clearTimeout(viewportResizeTimer);
  viewportResizeTimer = window.setTimeout(() => {
    if (input.value.trim()) {
      queueRender({ immediate: true });
    }
  }, 180);
}

function syncActiveThemeCard() {
  themeList.querySelectorAll(".theme-card").forEach((card) => {
    card.classList.toggle("is-active", card.dataset.themeId === state.activeThemeId);
  });
}

function destroyPanZoom() {
  if (state.panZoomInstance) {
    state.panZoomInstance.destroy();
    state.panZoomInstance = null;
  }
}

function applyCanvasBackground(color) {
  previewStage.style.background = color;
}

function normalizeSvgMarkup(svgMarkup, backgroundColor) {
  const parser = new DOMParser();
  const doc = parser.parseFromString(svgMarkup, "image/svg+xml");
  const svgElement = doc.documentElement;

  const viewBox = svgElement.getAttribute("viewBox");
  let width = Number.parseFloat(svgElement.getAttribute("width"));
  let height = Number.parseFloat(svgElement.getAttribute("height"));

  if ((!width || !height) && viewBox) {
    const values = viewBox.split(/\s+/).map(Number);
    width = values[2];
    height = values[3];
  }

  if (!width || !height) {
    width = 1200;
    height = 800;
  }

  svgElement.setAttribute("xmlns", "http://www.w3.org/2000/svg");
  svgElement.setAttribute("xmlns:xlink", "http://www.w3.org/1999/xlink");
  svgElement.setAttribute("width", `${width}`);
  svgElement.setAttribute("height", `${height}`);

  const backgroundRect = doc.createElementNS("http://www.w3.org/2000/svg", "rect");
  backgroundRect.setAttribute("x", "0");
  backgroundRect.setAttribute("y", "0");
  backgroundRect.setAttribute("width", "100%");
  backgroundRect.setAttribute("height", "100%");
  backgroundRect.setAttribute("fill", backgroundColor);

  svgElement.insertBefore(backgroundRect, svgElement.firstChild);

  return {
    markup: new XMLSerializer().serializeToString(svgElement),
    width,
    height
  };
}

function sanitizeSvgForPng(svgMarkup) {
  const parser = new DOMParser();
  const doc = parser.parseFromString(svgMarkup, "image/svg+xml");
  const svgElement = doc.documentElement;
  const svgNamespace = "http://www.w3.org/2000/svg";

  svgElement.querySelectorAll("foreignObject").forEach((foreignObject) => {
    const textContent = foreignObject.textContent.replace(/\s+/g, " ").trim();
    const width = Number.parseFloat(foreignObject.getAttribute("width")) || 0;
    const height = Number.parseFloat(foreignObject.getAttribute("height")) || 0;

    if (!textContent) {
      foreignObject.remove();
      return;
    }

    const textElement = doc.createElementNS(svgNamespace, "text");
    textElement.setAttribute("x", `${width / 2}`);
    textElement.setAttribute("y", `${height / 2}`);
    textElement.setAttribute("text-anchor", "middle");
    textElement.setAttribute("dominant-baseline", "central");
    textElement.setAttribute("font-family", MERMAID_FONT_STACK);
    textElement.setAttribute("font-size", "16");
    textElement.setAttribute("fill", "currentColor");
    textElement.textContent = textContent;

    foreignObject.replaceWith(textElement);
  });

  return new XMLSerializer().serializeToString(svgElement);
}

function mountSvg(svgMarkup) {
  destroyPanZoom();
  previewSurface.innerHTML = `<div class="preview-frame">${svgMarkup}</div>`;
  emptyState.hidden = true;

  const svgElement = previewSurface.querySelector("svg");
  if (!svgElement) {
    return;
  }

  svgElement.removeAttribute("style");
  svgElement.removeAttribute("width");
  svgElement.removeAttribute("height");
  svgElement.setAttribute("preserveAspectRatio", "xMidYMid meet");
  svgElement.style.width = "100%";
  svgElement.style.height = "100%";
  svgElement.style.maxWidth = "none";
  svgElement.style.maxHeight = "none";
  svgElement.style.display = "block";

  state.panZoomInstance = window.svgPanZoom(svgElement, {
    controlIconsEnabled: false,
    fit: true,
    center: true,
    minZoom: 0.3,
    maxZoom: 8,
    zoomScaleSensitivity: 0.22
  });
}

async function renderDiagram() {
  const source = input.value.trim();
  const token = ++state.renderToken;
  const renderId = `mermaid-render-${Date.now()}-${token}`;
  const activeTheme = getActiveTheme();

  applyCanvasBackground(activeTheme.canvasBackground);

  if (!source) {
    state.currentValid = false;
    state.lastSuccessfulSvg = "";
    destroyPanZoom();
    previewSurface.innerHTML = "";
    emptyState.hidden = false;
    setStatus("is-idle", "等待渲染", "请输入 Mermaid 文本以开始生成图表。");
    updateDownloadState();
    return;
  }

  setStatus("is-working", "渲染中", "Mermaid 正在根据当前文本和主题生成图表。");

  try {
    window.mermaid.initialize({
      startOnLoad: false,
      securityLevel: "loose",
      theme: "base",
      themeVariables: activeTheme.themeVariables,
      flowchart: {
        htmlLabels: false
      }
    });

    const { svg } = await window.mermaid.render(renderId, source);
    if (token !== state.renderToken) {
      return;
    }

    state.lastSuccessfulSvg = svg;
    state.currentValid = true;
    mountSvg(svg);
    setStatus("is-success", "已同步", `当前主题为“${activeTheme.label}”，可以拖拽缩放并导出。`);
    updateDownloadState();
  } catch (error) {
    if (token !== state.renderToken) {
      return;
    }

    state.currentValid = false;
    setStatus("is-error", "语法错误", error?.message || "Mermaid 解析失败，请检查语法。");
    updateDownloadState();
  }
}

function queueRender({ immediate = false } = {}) {
  window.clearTimeout(renderDebounceTimer);

  if (immediate) {
    renderDiagram();
    return;
  }

  renderDebounceTimer = window.setTimeout(() => {
    renderDiagram();
  }, 320);
}

function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.rel = "noopener";
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1500);
}

function downloadDataUrl(dataUrl, filename) {
  const link = document.createElement("a");
  link.href = dataUrl;
  link.download = filename;
  link.rel = "noopener";
  document.body.appendChild(link);
  link.click();
  link.remove();
}

function timestampForFilename() {
  const now = new Date();
  const pad = (value) => `${value}`.padStart(2, "0");

  return `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}-${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;
}

function getExportPayload() {
  const activeTheme = getActiveTheme();
  return normalizeSvgMarkup(state.lastSuccessfulSvg, activeTheme.canvasBackground);
}

function handleSvgDownload() {
  if (!state.currentValid || !state.lastSuccessfulSvg) {
    return;
  }

  const exportPayload = getExportPayload();
  const blob = new Blob([exportPayload.markup], { type: "image/svg+xml;charset=utf-8" });
  downloadBlob(blob, `mermaid-diagram-${timestampForFilename()}.svg`);
}

async function handlePngDownload() {
  if (!state.currentValid || !state.lastSuccessfulSvg) {
    return;
  }

  const sanitizedSvg = sanitizeSvgForPng(state.lastSuccessfulSvg);
  const exportPayload = normalizeSvgMarkup(sanitizedSvg, getActiveTheme().canvasBackground);
  const svgBlob = new Blob([exportPayload.markup], { type: "image/svg+xml;charset=utf-8" });
  const svgUrl = URL.createObjectURL(svgBlob);

  try {
    const image = await new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error("PNG 导出失败，SVG 图像无法加载。"));
      img.src = svgUrl;
    });

    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(exportPayload.width));
    canvas.height = Math.max(1, Math.round(exportPayload.height));

    const context = canvas.getContext("2d");
    if (!context) {
      throw new Error("PNG 导出失败，浏览器不支持 2D canvas。");
    }

    context.fillStyle = getActiveTheme().canvasBackground;
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.drawImage(image, 0, 0, canvas.width, canvas.height);

    const pngDataUrl = canvas.toDataURL("image/png");
    downloadDataUrl(pngDataUrl, `mermaid-diagram-${timestampForFilename()}.png`);
  } catch (error) {
    setStatus("is-error", "导出失败", error.message);
  } finally {
    URL.revokeObjectURL(svgUrl);
  }
}

function bindEvents() {
  sampleButton.addEventListener("click", () => {
    input.value = SAMPLE_DIAGRAM;
    queueRender({ immediate: true });
  });

  input.addEventListener("input", () => {
    queueRender();
  });

  downloadSvgButton.addEventListener("click", handleSvgDownload);
  downloadPngButton.addEventListener("click", () => {
    handlePngDownload();
  });

  zoomInButton.addEventListener("click", () => {
    state.panZoomInstance?.zoomIn();
  });

  zoomOutButton.addEventListener("click", () => {
    state.panZoomInstance?.zoomOut();
  });

  zoomResetButton.addEventListener("click", () => {
    if (!state.panZoomInstance) {
      return;
    }

    state.panZoomInstance.resetZoom();
    state.panZoomInstance.center();
    state.panZoomInstance.fit();
  });

  workspaceResizer.addEventListener("pointerdown", handleResizeStart);
  window.addEventListener("pointermove", handleResizeMove);
  window.addEventListener("pointerup", handleResizeEnd);
  window.addEventListener("pointercancel", handleResizeEnd);
  window.addEventListener("resize", handleViewportResize);
}

function initializeApp() {
  buildThemeCards();
  bindEvents();
  syncWorkspaceLayout();
  input.value = SAMPLE_DIAGRAM;
  queueRender({ immediate: true });
}

initializeApp();
