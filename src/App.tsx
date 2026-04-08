import Editor from '@monaco-editor/react';
import mermaid from 'mermaid';
import type { ChangeEvent, CSSProperties, PointerEvent as ReactPointerEvent } from 'react';
import { useEffect, useEffectEvent, useRef, useState } from 'react';
import svgPanZoom from 'svg-pan-zoom';
import {
  DEFAULT_DIAGRAM_TITLE_PREFIX,
  IDLE_STATUS,
  SAMPLE_DIAGRAM,
  SAVED_DIAGRAMS_STORAGE_KEY,
  THEME_PRESETS,
} from './lib/constants';
import { deleteSavedDiagram, readSavedDiagrams, upsertSavedDiagram } from './lib/savedDiagrams';
import { downloadBlob, downloadDataUrl, normalizeSvgMarkup, sanitizeSvgForPng, timestampForFilename } from './lib/exporters';
import type { RenderStatus, SavedDiagram, ThemePreset } from './lib/types';
import type { SvgPanZoomInstance } from 'svg-pan-zoom';

const RESIZER_WIDTH = 8;
const DESKTOP_MEDIA_QUERY = '(min-width: 1081px)';
const MONACO_OPTIONS = {
  ariaLabel: 'Mermaid 输入框',
  automaticLayout: true,
  fontFamily: 'Cascadia Mono, Consolas, SFMono-Regular, monospace',
  fontSize: 14,
  lineNumbersMinChars: 3,
  minimap: { enabled: false },
  padding: { top: 16, bottom: 16 },
  scrollBeyondLastLine: false,
  tabSize: 2,
  wordWrap: 'on',
  wrappingIndent: 'same',
} as const;

type StorageNotice = {
  kind: 'success' | 'error' | 'info';
  text: string;
};

function getActiveTheme(themeId: string): ThemePreset {
  return THEME_PRESETS.find((theme) => theme.id === themeId) ?? THEME_PRESETS[0];
}

function isDesktopLayout(): boolean {
  return window.matchMedia(DESKTOP_MEDIA_QUERY).matches;
}

function buildDefaultDiagramTitle(): string {
  const formatter = new Intl.DateTimeFormat('zh-CN', {
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    month: '2-digit',
  });

  return `${DEFAULT_DIAGRAM_TITLE_PREFIX} ${formatter.format(new Date())}`;
}

function formatSavedAt(timestamp: number): string {
  return new Intl.DateTimeFormat('zh-CN', {
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(new Date(timestamp));
}

function App() {
  const [source, setSource] = useState(SAMPLE_DIAGRAM);
  const [activeThemeId, setActiveThemeId] = useState(THEME_PRESETS[0].id);
  const [lastSuccessfulSvg, setLastSuccessfulSvg] = useState('');
  const [currentValid, setCurrentValid] = useState(false);
  const [status, setStatus] = useState<RenderStatus>(IDLE_STATUS);
  const [editorWidth, setEditorWidth] = useState<number | null>(520);
  const [isResizing, setIsResizing] = useState(false);
  const [renderCycle, setRenderCycle] = useState(0);
  const [savedDiagrams, setSavedDiagrams] = useState<SavedDiagram[]>(() => readSavedDiagrams());
  const [diagramTitle, setDiagramTitle] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [currentDiagramId, setCurrentDiagramId] = useState<string | null>(null);
  const [storageNotice, setStorageNotice] = useState<StorageNotice | null>(null);

  const workspaceRef = useRef<HTMLDivElement | null>(null);
  const previewSurfaceRef = useRef<HTMLDivElement | null>(null);
  const panZoomRef = useRef<SvgPanZoomInstance | null>(null);
  const renderTokenRef = useRef(0);
  const renderDebounceTimerRef = useRef<number | null>(null);
  const viewportResizeTimerRef = useRef<number | null>(null);
  const resizeStateRef = useRef<{ workspaceLeft: number } | null>(null);
  const shouldRenderImmediatelyRef = useRef(true);

  const activeTheme = getActiveTheme(activeThemeId);
  const downloadDisabled = !currentValid || !lastSuccessfulSvg;
  const workspaceStyle = (isDesktopLayout() && editorWidth !== null
    ? { '--editor-width': `${editorWidth}px` }
    : undefined) as CSSProperties | undefined;
  const currentDiagram = currentDiagramId ? savedDiagrams.find((diagram) => diagram.id === currentDiagramId) ?? null : null;
  const normalizedSearchQuery = searchQuery.trim().toLowerCase();
  const filteredDiagrams = normalizedSearchQuery
    ? savedDiagrams.filter((diagram) => diagram.title.toLowerCase().includes(normalizedSearchQuery))
    : savedDiagrams;

  const clearTimers = () => {
    if (renderDebounceTimerRef.current !== null) {
      window.clearTimeout(renderDebounceTimerRef.current);
      renderDebounceTimerRef.current = null;
    }

    if (viewportResizeTimerRef.current !== null) {
      window.clearTimeout(viewportResizeTimerRef.current);
      viewportResizeTimerRef.current = null;
    }
  };

  const destroyPanZoom = useEffectEvent(() => {
    if (panZoomRef.current) {
      panZoomRef.current.destroy();
      panZoomRef.current = null;
    }
  });

  const clampEditorWidth = (nextWidth: number) => {
    const workspaceElement = workspaceRef.current;
    if (!workspaceElement) {
      return 520;
    }

    const workspaceRect = workspaceElement.getBoundingClientRect();
    const minWidth = 360;
    const previewMinWidth = 420;
    const maxWidth = Math.max(
      minWidth,
      Math.min(workspaceRect.width * 0.65, workspaceRect.width - previewMinWidth - RESIZER_WIDTH),
    );

    return Math.max(minWidth, Math.min(nextWidth, maxWidth));
  };

  const requestImmediateRender = () => {
    shouldRenderImmediatelyRef.current = true;
    setRenderCycle((value) => value + 1);
  };

  const syncWorkspaceLayout = useEffectEvent(() => {
    if (!isDesktopLayout()) {
      setEditorWidth(null);
      resizeStateRef.current = null;
      setIsResizing(false);
      document.body.classList.remove('is-resizing');
      return;
    }

    setEditorWidth((currentWidth) => clampEditorWidth(currentWidth ?? 520));
  });

  const stopResize = useEffectEvent((shouldRequestRender: boolean) => {
    const wasResizing = Boolean(resizeStateRef.current);
    resizeStateRef.current = null;
    setIsResizing(false);
    document.body.classList.remove('is-resizing');

    if (shouldRequestRender && wasResizing && source.trim()) {
      requestImmediateRender();
    }
  });

  const runRender = useEffectEvent(async (nextSource: string, themeId: string) => {
    const trimmedSource = nextSource.trim();
    const nextTheme = getActiveTheme(themeId);
    const token = ++renderTokenRef.current;

    if (!trimmedSource) {
      setCurrentValid(false);
      setLastSuccessfulSvg('');
      destroyPanZoom();
      setStatus({
        kind: 'idle',
        text: '等待渲染',
        message: '请输入 Mermaid 文本以开始生成图表。',
      });
      return;
    }

    setStatus({
      kind: 'working',
      text: '渲染中',
      message: 'Mermaid 正在根据当前文本和主题生成图表。',
    });

    try {
      mermaid.initialize({
        startOnLoad: false,
        securityLevel: 'loose',
        theme: 'base',
        themeVariables: nextTheme.themeVariables,
        flowchart: {
          htmlLabels: false,
        },
      });

      const { svg } = await mermaid.render(`mermaid-render-${Date.now()}-${token}`, trimmedSource);
      if (token !== renderTokenRef.current) {
        return;
      }

      setLastSuccessfulSvg(svg);
      setCurrentValid(true);
      setStatus({
        kind: 'success',
        text: '已同步',
        message: `当前主题为“${nextTheme.label}”，可以拖拽缩放并导出。`,
      });
    } catch (error) {
      if (token !== renderTokenRef.current) {
        return;
      }

      setCurrentValid(false);
      setStatus({
        kind: 'error',
        text: '语法错误',
        message: error instanceof Error ? error.message : 'Mermaid 解析失败，请检查语法。',
      });
    }
  });

  useEffect(() => {
    clearTimers();

    if (shouldRenderImmediatelyRef.current) {
      shouldRenderImmediatelyRef.current = false;
      void runRender(source, activeThemeId);
      return () => {
        clearTimers();
      };
    }

    renderDebounceTimerRef.current = window.setTimeout(() => {
      void runRender(source, activeThemeId);
    }, 320);

    return () => {
      if (renderDebounceTimerRef.current !== null) {
        window.clearTimeout(renderDebounceTimerRef.current);
        renderDebounceTimerRef.current = null;
      }
    };
  }, [activeThemeId, renderCycle, source]);

  useEffect(() => {
    destroyPanZoom();

    const svgElement = previewSurfaceRef.current?.querySelector('svg');
    if (!svgElement) {
      return;
    }

    svgElement.removeAttribute('style');
    svgElement.removeAttribute('width');
    svgElement.removeAttribute('height');
    svgElement.setAttribute('preserveAspectRatio', 'xMidYMid meet');

    const svgStyle = svgElement.style;
    svgStyle.width = '100%';
    svgStyle.height = '100%';
    svgStyle.maxWidth = 'none';
    svgStyle.maxHeight = 'none';
    svgStyle.display = 'block';

    panZoomRef.current = svgPanZoom(svgElement, {
      controlIconsEnabled: false,
      fit: true,
      center: true,
      minZoom: 0.3,
      maxZoom: 8,
      zoomScaleSensitivity: 0.22,
    });

    return () => {
      destroyPanZoom();
    };
  }, [lastSuccessfulSvg]);

  useEffect(() => {
    syncWorkspaceLayout();

    const handlePointerMove = (event: PointerEvent) => {
      if (!resizeStateRef.current || !isDesktopLayout()) {
        return;
      }

      setEditorWidth(clampEditorWidth(event.clientX - resizeStateRef.current.workspaceLeft));
    };

    const handlePointerEnd = () => {
      stopResize(true);
    };

    const handleViewportResize = () => {
      syncWorkspaceLayout();

      if (viewportResizeTimerRef.current !== null) {
        window.clearTimeout(viewportResizeTimerRef.current);
      }

      viewportResizeTimerRef.current = window.setTimeout(() => {
        if (source.trim()) {
          requestImmediateRender();
        }
      }, 180);
    };

    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerEnd);
    window.addEventListener('pointercancel', handlePointerEnd);
    window.addEventListener('resize', handleViewportResize);

    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerEnd);
      window.removeEventListener('pointercancel', handlePointerEnd);
      window.removeEventListener('resize', handleViewportResize);
      clearTimers();
      destroyPanZoom();
      document.body.classList.remove('is-resizing');
    };
  }, [source]);

  useEffect(() => {
    const handleStorage = (event: StorageEvent) => {
      if (event.key !== SAVED_DIAGRAMS_STORAGE_KEY) {
        return;
      }

      setSavedDiagrams(readSavedDiagrams());
    };

    window.addEventListener('storage', handleStorage);
    return () => {
      window.removeEventListener('storage', handleStorage);
    };
  }, []);

  useEffect(() => {
    if (currentDiagramId && !currentDiagram) {
      setCurrentDiagramId(null);
    }
  }, [currentDiagram, currentDiagramId]);

  const handleEditorChange = (value: string | undefined) => {
    setSource(value ?? '');
  };

  const handleTitleChange = (event: ChangeEvent<HTMLInputElement>) => {
    setDiagramTitle(event.target.value);
  };

  const handleSearchChange = (event: ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(event.target.value);
  };

  const handleLoadSample = () => {
    shouldRenderImmediatelyRef.current = true;
    setSource(SAMPLE_DIAGRAM);
    setCurrentDiagramId(null);
    setDiagramTitle('');
    setStorageNotice({
      kind: 'info',
      text: '已载入内置示例，可保存为新的本地图稿。',
    });
    setRenderCycle((value) => value + 1);
  };

  const handleThemeSelect = (themeId: string) => {
    if (themeId === activeThemeId) {
      return;
    }

    shouldRenderImmediatelyRef.current = true;
    setActiveThemeId(themeId);
    setRenderCycle((value) => value + 1);
  };

  const handleResizeStart = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (!isDesktopLayout()) {
      return;
    }

    const workspaceRect = workspaceRef.current?.getBoundingClientRect();
    if (!workspaceRect) {
      return;
    }

    resizeStateRef.current = {
      workspaceLeft: workspaceRect.left,
    };
    setIsResizing(true);
    document.body.classList.add('is-resizing');
    event.preventDefault();
  };

  const handleSvgDownload = () => {
    if (downloadDisabled) {
      return;
    }

    const exportPayload = normalizeSvgMarkup(lastSuccessfulSvg, activeTheme.canvasBackground);
    const blob = new Blob([exportPayload.markup], { type: 'image/svg+xml;charset=utf-8' });
    downloadBlob(blob, `mermaid-diagram-${timestampForFilename()}.svg`);
  };

  const handlePngDownload = async () => {
    if (downloadDisabled) {
      return;
    }

    const sanitizedSvg = sanitizeSvgForPng(lastSuccessfulSvg);
    const exportPayload = normalizeSvgMarkup(sanitizedSvg, activeTheme.canvasBackground);
    const svgBlob = new Blob([exportPayload.markup], { type: 'image/svg+xml;charset=utf-8' });
    const svgUrl = URL.createObjectURL(svgBlob);

    try {
      const image = await new Promise<HTMLImageElement>((resolve, reject) => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = () => reject(new Error('PNG 导出失败，SVG 图像无法加载。'));
        img.src = svgUrl;
      });

      const canvas = document.createElement('canvas');
      canvas.width = Math.max(1, Math.round(exportPayload.width));
      canvas.height = Math.max(1, Math.round(exportPayload.height));

      const context = canvas.getContext('2d');
      if (!context) {
        throw new Error('PNG 导出失败，浏览器不支持 2D canvas。');
      }

      context.fillStyle = activeTheme.canvasBackground;
      context.fillRect(0, 0, canvas.width, canvas.height);
      context.drawImage(image, 0, 0, canvas.width, canvas.height);

      downloadDataUrl(canvas.toDataURL('image/png'), `mermaid-diagram-${timestampForFilename()}.png`);
    } catch (error) {
      setStatus({
        kind: 'error',
        text: '导出失败',
        message: error instanceof Error ? error.message : 'PNG 导出失败。',
      });
    } finally {
      URL.revokeObjectURL(svgUrl);
    }
  };

  const handleSaveDiagram = () => {
    const trimmedSource = source.trim();
    if (!trimmedSource) {
      setStorageNotice({
        kind: 'error',
        text: '空白内容无法保存，请先输入 Mermaid 图形定义。',
      });
      return;
    }

    try {
      const title = diagramTitle.trim() || buildDefaultDiagramTitle();
      const now = Date.now();
      const nextDiagram: SavedDiagram = currentDiagram
        ? {
            ...currentDiagram,
            title,
            source,
            themeId: activeThemeId,
            updatedAt: now,
          }
        : {
            id: crypto.randomUUID(),
            title,
            source,
            themeId: activeThemeId,
            createdAt: now,
            updatedAt: now,
          };

      const nextDiagrams = upsertSavedDiagram(nextDiagram);
      setSavedDiagrams(nextDiagrams);
      setCurrentDiagramId(nextDiagram.id);
      setDiagramTitle(title);
      setStorageNotice({
        kind: 'success',
        text: currentDiagram ? `已更新“${title}”。` : `已保存“${title}”。`,
      });
    } catch (error) {
      setStorageNotice({
        kind: 'error',
        text: error instanceof Error ? error.message : '保存失败，请稍后重试。',
      });
    }
  };

  const handleDetachCurrentDiagram = () => {
    setCurrentDiagramId(null);
    setStorageNotice({
      kind: 'info',
      text: '当前编辑内容已解除与已存图稿的关联，再次保存会创建新图稿。',
    });
  };

  const handleLoadDiagram = (diagram: SavedDiagram) => {
    shouldRenderImmediatelyRef.current = true;
    setSource(diagram.source);
    setActiveThemeId(diagram.themeId);
    setCurrentDiagramId(diagram.id);
    setDiagramTitle(diagram.title);
    setStorageNotice({
      kind: 'info',
      text: `已载入“${diagram.title}”。`,
    });
    setRenderCycle((value) => value + 1);
  };

  const handleDeleteDiagram = (diagram: SavedDiagram) => {
    const shouldDelete = window.confirm(`确认删除“${diagram.title}”吗？此操作无法撤销。`);
    if (!shouldDelete) {
      return;
    }

    try {
      const nextDiagrams = deleteSavedDiagram(diagram.id);
      setSavedDiagrams(nextDiagrams);
      if (diagram.id === currentDiagramId) {
        setCurrentDiagramId(null);
      }
      setStorageNotice({
        kind: 'success',
        text: `已删除“${diagram.title}”。`,
      });
    } catch (error) {
      setStorageNotice({
        kind: 'error',
        text: error instanceof Error ? error.message : '删除失败，请稍后重试。',
      });
    }
  };

  return (
    <div className="app-shell">
      <header className="topbar">
        <h1>Mermaid Renderer</h1>
        <a
          className="github-link"
          href="https://github.com/sdcb/mermaid-renderer"
          target="_blank"
          rel="noopener noreferrer"
          aria-label="GitHub"
          title="GitHub"
        >
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M12 .5C5.65.5.5 5.65.5 12c0 5.08 3.29 9.39 7.86 10.91.58.11.79-.25.79-.56 0-.28-.01-1.2-.02-2.18-3.2.7-3.88-1.36-3.88-1.36-.52-1.33-1.28-1.68-1.28-1.68-1.05-.72.08-.71.08-.71 1.16.08 1.77 1.19 1.77 1.19 1.03 1.77 2.71 1.26 3.37.96.1-.75.4-1.26.73-1.55-2.56-.29-5.25-1.28-5.25-5.72 0-1.27.45-2.3 1.19-3.11-.12-.29-.52-1.47.11-3.06 0 0 .97-.31 3.19 1.19a11.1 11.1 0 0 1 5.8 0c2.21-1.5 3.18-1.19 3.18-1.19.64 1.59.24 2.77.12 3.06.74.81 1.19 1.84 1.19 3.11 0 4.45-2.69 5.42-5.26 5.7.41.36.78 1.08.78 2.18 0 1.58-.01 2.85-.01 3.24 0 .31.21.68.8.56A11.5 11.5 0 0 0 23.5 12C23.5 5.65 18.35.5 12 .5Z" />
          </svg>
        </a>
      </header>

      <main ref={workspaceRef} className="workspace" style={workspaceStyle}>
        <section className="panel panel-editor">
          <div className="panel-header">
            <div>
              <h2>编辑器</h2>
            </div>
            <button className="ghost-button" type="button" onClick={handleLoadSample}>
              载入示例
            </button>
          </div>

          <div className="editor-field">
            <span className="sr-only">Mermaid 输入框</span>
            <div className="mermaid-editor-shell">
              <Editor
                height="100%"
                language="markdown"
                loading={<div className="editor-loading">正在加载 Monaco Editor...</div>}
                options={MONACO_OPTIONS}
                theme="vs-dark"
                value={source}
                onChange={handleEditorChange}
              />
            </div>
          </div>

          <div className="status-card">
            <div className="status-row">
              <span className="status-label">渲染状态</span>
              <span className={`status-pill is-${status.kind}`}>{status.text}</span>
            </div>
            <p className="status-message">{status.message}</p>
          </div>

          <div className="controls-section">
            <div className="section-heading">
              <h3>配色风格</h3>
            </div>
            <div className="theme-list" aria-label="主题预设">
              {THEME_PRESETS.map((theme) => (
                <button
                  key={theme.id}
                  type="button"
                  className={`theme-card${theme.id === activeThemeId ? ' is-active' : ''}`}
                  aria-label={theme.label}
                  title={theme.label}
                  onClick={() => handleThemeSelect(theme.id)}
                >
                  <span className="swatches" aria-hidden="true">
                    <i style={{ background: theme.swatches[0] }} />
                  </span>
                </button>
              ))}
            </div>
          </div>

          <div className="controls-section storage-section">
            <div className="section-heading storage-heading">
              <div>
                <h3>本地图稿</h3>
                <p className="section-caption">保存在当前浏览器 localStorage，可搜索、删除和重新载入。</p>
              </div>
              {currentDiagramId ? (
                <button className="ghost-button compact-button" type="button" onClick={handleDetachCurrentDiagram}>
                  新建图稿
                </button>
              ) : null}
            </div>

            <div className="storage-form">
              <input
                className="text-input"
                type="text"
                placeholder="输入图稿名称"
                value={diagramTitle}
                onChange={handleTitleChange}
              />
              <button className="ghost-button" type="button" onClick={handleSaveDiagram}>
                {currentDiagramId ? '更新图稿' : '保存图稿'}
              </button>
            </div>

            {storageNotice ? <p className={`storage-notice is-${storageNotice.kind}`}>{storageNotice.text}</p> : null}

            <div className="storage-search-row">
              <input
                className="text-input"
                type="search"
                placeholder="搜索图稿标题"
                value={searchQuery}
                onChange={handleSearchChange}
              />
              <span className="storage-count">
                {filteredDiagrams.length} / {savedDiagrams.length}
              </span>
            </div>

            <div className="saved-diagram-list" aria-label="已保存图稿列表">
              {filteredDiagrams.length > 0 ? (
                filteredDiagrams.map((diagram) => {
                  const diagramTheme = getActiveTheme(diagram.themeId);
                  return (
                    <article
                      key={diagram.id}
                      className={`saved-diagram-card${diagram.id === currentDiagramId ? ' is-active' : ''}`}
                    >
                      <div className="saved-diagram-copy">
                        <strong>{diagram.title}</strong>
                        <span>
                          {diagramTheme.label} · {formatSavedAt(diagram.updatedAt)}
                        </span>
                      </div>
                      <div className="saved-diagram-actions">
                        <button
                          className="ghost-button compact-button"
                          type="button"
                          onClick={() => handleLoadDiagram(diagram)}
                        >
                          加载
                        </button>
                        <button
                          className="ghost-button compact-button danger-button"
                          type="button"
                          onClick={() => handleDeleteDiagram(diagram)}
                        >
                          删除
                        </button>
                      </div>
                    </article>
                  );
                })
              ) : (
                <div className="saved-diagram-empty">
                  <p>{savedDiagrams.length > 0 ? '没有匹配的标题。' : '还没有本地图稿，保存后会显示在这里。'}</p>
                </div>
              )}
            </div>
          </div>
        </section>

        <div
          className={`workspace-resizer${isResizing ? ' is-active' : ''}`}
          aria-hidden="true"
          title="拖拽调整编辑器宽度"
          onPointerDown={handleResizeStart}
        />

        <section className="panel panel-preview">
          <div className="panel-header">
            <div>
              <h2>图形预览</h2>
            </div>
            <div className="zoom-controls" aria-label="缩放控制">
              <button className="ghost-button" type="button" onClick={() => panZoomRef.current?.zoomOut()}>
                -
              </button>
              <button
                className="ghost-button"
                type="button"
                onClick={() => {
                  if (!panZoomRef.current) {
                    return;
                  }

                  panZoomRef.current.resetZoom();
                  panZoomRef.current.center();
                  panZoomRef.current.fit();
                }}
              >
                重置
              </button>
              <button className="ghost-button" type="button" onClick={() => panZoomRef.current?.zoomIn()}>
                +
              </button>
            </div>
          </div>

          <div className="preview-stage" style={{ background: activeTheme.canvasBackground }}>
            <div className="export-toolbar" aria-label="导出工具">
              <button
                className="icon-button"
                type="button"
                data-tooltip="下载 SVG"
                aria-label="下载 SVG"
                title="下载 SVG"
                disabled={downloadDisabled}
                onClick={handleSvgDownload}
              >
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M12 2v10" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                  <path d="M7 8l5 5 5-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  <text x="12" y="22" textAnchor="middle" fontSize="8" fontWeight="800" fontFamily="Arial,Helvetica,sans-serif" letterSpacing="0.5">SVG</text>
                </svg>
              </button>
              <button
                className="icon-button"
                type="button"
                data-tooltip="下载 PNG"
                aria-label="下载 PNG"
                title="下载 PNG"
                disabled={downloadDisabled}
                onClick={() => {
                  void handlePngDownload();
                }}
              >
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M12 2v10" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                  <path d="M7 8l5 5 5-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  <text x="12" y="22" textAnchor="middle" fontSize="8" fontWeight="800" fontFamily="Arial,Helvetica,sans-serif" letterSpacing="0.5">PNG</text>
                </svg>
              </button>
            </div>
            <div className="empty-state" hidden={Boolean(source.trim())}>
              <p>等待图表渲染</p>
            </div>
            <div ref={previewSurfaceRef} className="preview-surface" aria-live="polite">
              {lastSuccessfulSvg ? <div className="preview-frame" dangerouslySetInnerHTML={{ __html: lastSuccessfulSvg }} /> : null}
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}

export default App;
