import Editor from '@monaco-editor/react';
import mermaid from 'mermaid';
import type { CSSProperties, FormEvent, PointerEvent as ReactPointerEvent } from 'react';
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
import { IconButton, IconLink } from './components/IconButton';
import {
  IconClose,
  IconLoad,
  IconSave,
  IconSaveAs,
  IconResetView,
  IconDownloadSvg,
  IconDownloadPng,
  IconGitHub,
  IconZoomOut,
  IconZoomIn,
} from './icons';

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

type SavePopoverMode = 'save' | 'save-as';

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
  const [currentDiagramId, setCurrentDiagramId] = useState<string | null>(null);
  const [toast, setToast] = useState<StorageNotice | null>(null);
  const [isLoadPopoverOpen, setIsLoadPopoverOpen] = useState(false);
  const [loadSearchQuery, setLoadSearchQuery] = useState('');
  const [isSavePopoverOpen, setIsSavePopoverOpen] = useState(false);
  const [savePopoverMode, setSavePopoverMode] = useState<SavePopoverMode>('save');
  const [saveTitleInput, setSaveTitleInput] = useState('');

  const workspaceRef = useRef<HTMLDivElement | null>(null);
  const previewSurfaceRef = useRef<HTMLDivElement | null>(null);
  const panZoomRef = useRef<SvgPanZoomInstance | null>(null);
  const renderTokenRef = useRef(0);
  const renderDebounceTimerRef = useRef<number | null>(null);
  const viewportResizeTimerRef = useRef<number | null>(null);
  const toastTimerRef = useRef<number | null>(null);
  const resizeStateRef = useRef<{ workspaceLeft: number } | null>(null);
  const shouldRenderImmediatelyRef = useRef(true);

  const activeTheme = getActiveTheme(activeThemeId);
  const downloadDisabled = !currentValid || !lastSuccessfulSvg;
  const workspaceStyle = (isDesktopLayout() && editorWidth !== null
    ? { '--editor-width': `${editorWidth}px` }
    : undefined) as CSSProperties | undefined;
  const currentDiagram = currentDiagramId ? savedDiagrams.find((diagram) => diagram.id === currentDiagramId) ?? null : null;
  const saveDisabled = currentDiagram !== null
    && source === currentDiagram.source
    && activeThemeId === currentDiagram.themeId;
  const normalizedLoadSearchQuery = loadSearchQuery.trim().toLowerCase();
  const filteredDiagrams = normalizedLoadSearchQuery
    ? savedDiagrams.filter((diagram) => diagram.title.toLowerCase().includes(normalizedLoadSearchQuery))
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

  useEffect(() => {
    if (!isLoadPopoverOpen && !isSavePopoverOpen) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') {
        return;
      }

      setIsLoadPopoverOpen(false);
      setIsSavePopoverOpen(false);
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isLoadPopoverOpen, isSavePopoverOpen]);

  const handleEditorChange = (value: string | undefined) => {
    setSource(value ?? '');
  };

  const showToast = (notice: StorageNotice) => {
    if (toastTimerRef.current !== null) {
      window.clearTimeout(toastTimerRef.current);
    }
    setToast(notice);
    toastTimerRef.current = window.setTimeout(() => {
      setToast(null);
      toastTimerRef.current = null;
    }, 3000);
  };

  const openLoadPopover = () => {
    setLoadSearchQuery('');
    setIsSavePopoverOpen(false);
    setIsLoadPopoverOpen(true);
  };

  const closeLoadPopover = () => {
    setIsLoadPopoverOpen(false);
  };

  const openSavePopover = (mode: SavePopoverMode) => {
    setSavePopoverMode(mode);
    setSaveTitleInput(diagramTitle.trim() || currentDiagram?.title || '');
    setIsLoadPopoverOpen(false);
    setIsSavePopoverOpen(true);
  };

  const closeSavePopover = () => {
    setIsSavePopoverOpen(false);
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
      showToast({
        kind: 'error',
        text: '空白内容无法保存，请先输入 Mermaid 图形定义。',
      });
      return;
    }

    try {
      const title = saveTitleInput.trim() || diagramTitle.trim() || buildDefaultDiagramTitle();
      const now = Date.now();
      const shouldCreateNew = savePopoverMode === 'save-as' || !currentDiagram;
      const nextDiagram: SavedDiagram = shouldCreateNew
        ? {
            id: crypto.randomUUID(),
            title,
            source,
            themeId: activeThemeId,
            createdAt: now,
            updatedAt: now,
          }
        : {
            ...currentDiagram,
            title,
            source,
            themeId: activeThemeId,
            updatedAt: now,
          };

      const nextDiagrams = upsertSavedDiagram(nextDiagram);
      setSavedDiagrams(nextDiagrams);
      setCurrentDiagramId(nextDiagram.id);
      setDiagramTitle(title);
      setSaveTitleInput(title);
      setIsSavePopoverOpen(false);
      showToast({
        kind: 'success',
        text: shouldCreateNew ? `已保存"${title}"。` : `已更新"${title}"。`,
      });
    } catch (error) {
      showToast({
        kind: 'error',
        text: error instanceof Error ? error.message : '保存失败，请稍后重试。',
      });
    }
  };

  const handleSaveSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    handleSaveDiagram();
  };

  const handleDirectSave = () => {
    if (!currentDiagram) return;
    try {
      const now = Date.now();
      const nextDiagram: SavedDiagram = {
        ...currentDiagram,
        source,
        themeId: activeThemeId,
        updatedAt: now,
      };
      const nextDiagrams = upsertSavedDiagram(nextDiagram);
      setSavedDiagrams(nextDiagrams);
      showToast({ kind: 'success', text: `已更新"${currentDiagram.title}"。` });
    } catch (error) {
      showToast({ kind: 'error', text: error instanceof Error ? error.message : '保存失败，请稍后重试。' });
    }
  };

  const handleLoadDiagram = (diagram: SavedDiagram) => {
    shouldRenderImmediatelyRef.current = true;
    setSource(diagram.source);
    setActiveThemeId(diagram.themeId);
    setCurrentDiagramId(diagram.id);
    setDiagramTitle(diagram.title);
    setIsLoadPopoverOpen(false);
    showToast({
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
      showToast({
        kind: 'success',
        text: diagram.id === currentDiagramId ? `已删除"${diagram.title}"，当前内容已解除关联。` : `已删除"${diagram.title}"。`,
      });
    } catch (error) {
      showToast({
        kind: 'error',
        text: error instanceof Error ? error.message : '删除失败，请稍后重试。',
      });
    }
  };

  return (
    <div className="app-shell">
      <main ref={workspaceRef} className="workspace" style={workspaceStyle}>
        <section className="panel panel-editor">
          <div className="panel-header panel-header-editor">
            <div className="panel-copy">
              <h2>Mermaid Renderer</h2>
            </div>
            <div className="panel-toolbar" aria-label="图稿操作">
              <IconButton tooltip="载入" className="toolbar-icon-button" onClick={openLoadPopover}>
                <IconLoad />
              </IconButton>
              <IconButton tooltip="保存" className="toolbar-icon-button" disabled={saveDisabled} onClick={currentDiagram ? handleDirectSave : () => openSavePopover('save')}>
                <IconSave />
              </IconButton>
              <IconButton tooltip="另存为" className="toolbar-icon-button" onClick={() => openSavePopover('save-as')}>
                <IconSaveAs />
              </IconButton>
            </div>
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
                  onClick={() => handleThemeSelect(theme.id)}
                >
                  <span className="swatches" aria-hidden="true">
                    <i style={{ background: theme.swatches[0] }} />
                  </span>
                </button>
              ))}
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
            <div className="preview-toolbar">
              <div className="zoom-controls" aria-label="缩放控制">
                <IconButton tooltip="缩小" onClick={() => panZoomRef.current?.zoomOut()}>
                  <IconZoomOut />
                </IconButton>
                <IconButton
                  tooltip="重置视图"
                  onClick={() => {
                    if (!panZoomRef.current) {
                      return;
                    }
                    panZoomRef.current.resetZoom();
                    panZoomRef.current.center();
                    panZoomRef.current.fit();
                  }}
                >
                  <IconResetView />
                </IconButton>
                <IconButton tooltip="放大" onClick={() => panZoomRef.current?.zoomIn()}>
                  <IconZoomIn />
                </IconButton>
              </div>
              <IconLink
                tooltip="GitHub"
                href="https://github.com/sdcb/mermaid-renderer"
                target="_blank"
                rel="noopener noreferrer"
                className="github-link-inline"
              >
                <IconGitHub />
              </IconLink>
            </div>
          </div>

          <div className="preview-stage" style={{ background: activeTheme.canvasBackground }}>
            <div className="export-toolbar" aria-label="导出工具">
              <IconButton tooltip="下载 SVG" disabled={downloadDisabled} onClick={handleSvgDownload}>
                <IconDownloadSvg />
              </IconButton>
              <IconButton tooltip="下载 PNG" disabled={downloadDisabled} onClick={() => { void handlePngDownload(); }}>
                <IconDownloadPng />
              </IconButton>
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

      {isLoadPopoverOpen ? (
        <div className="popover-scrim" role="presentation" onClick={closeLoadPopover}>
          <section
            className="popover-card"
            role="dialog"
            aria-modal="true"
            aria-labelledby="load-popover-title"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="popover-header">
              <div>
                <h3 id="load-popover-title">载入稿件</h3>
                <p className="popover-description">从当前浏览器中已保存的稿件里搜索、载入或删除。</p>
              </div>
              <IconButton tooltip="关闭" onClick={closeLoadPopover}>
                <IconClose />
              </IconButton>
            </div>

            <div className="popover-body">
              <div className="storage-search-row">
                <input
                  className="text-input"
                  type="search"
                  placeholder="搜索稿件标题"
                  value={loadSearchQuery}
                  onChange={(event) => setLoadSearchQuery(event.target.value)}
                />
                <span className="storage-count">
                  {filteredDiagrams.length} / {savedDiagrams.length}
                </span>
              </div>

              <div className="saved-diagram-list popover-list" aria-label="已保存稿件列表">
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
                            载入
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
                    <p>{savedDiagrams.length > 0 ? '没有匹配的稿件。' : '还没有已保存稿件，先用“保存”或“另存为”创建。'}</p>
                  </div>
                )}
              </div>
            </div>
          </section>
        </div>
      ) : null}

      {isSavePopoverOpen ? (
        <div className="popover-scrim" role="presentation" onClick={closeSavePopover}>
          <section
            className="popover-card popover-card-narrow"
            role="dialog"
            aria-modal="true"
            aria-labelledby="save-popover-title"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="popover-header">
              <div>
                <h3 id="save-popover-title">{savePopoverMode === 'save-as' ? '另存为' : '保存稿件'}</h3>
                <p className="popover-description">
                  {savePopoverMode === 'save-as'
                    ? '输入新的稿件名称，当前内容会以新的条目保存到 localStorage。'
                    : currentDiagram
                      ? '可修改名称后覆盖当前稿件，或保留原名称直接保存。'
                      : '输入稿件名称后保存到当前浏览器的 localStorage。'}
                </p>
              </div>
              <IconButton tooltip="关闭" onClick={closeSavePopover}>
                <IconClose />
              </IconButton>
            </div>

            <form className="popover-body popover-form" onSubmit={handleSaveSubmit}>
              <label className="popover-field">
                <span className="popover-field-label">稿件名称</span>
                <input
                  autoFocus
                  className="text-input"
                  type="text"
                  placeholder="输入稿件名称"
                  value={saveTitleInput}
                  onChange={(event) => setSaveTitleInput(event.target.value)}
                />
              </label>

              <div className="popover-actions">
                <button className="ghost-button" type="button" onClick={closeSavePopover}>
                  取消
                </button>
                <button className="ghost-button" type="submit">
                  {savePopoverMode === 'save-as' ? '保存为新稿件' : currentDiagram ? '保存修改' : '保存'}
                </button>
              </div>
            </form>
          </section>
        </div>
      ) : null}

      {toast ? (
        <div className={`toast is-${toast.kind}`} role="status" aria-live="polite">
          {toast.text}
        </div>
      ) : null}
    </div>
  );
}

export default App;
