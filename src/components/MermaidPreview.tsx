import { memo, useEffect, useEffectEvent, useRef } from 'react';
import svgPanZoom from 'svg-pan-zoom';
import type { SvgPanZoomInstance } from 'svg-pan-zoom';
import { downloadBlob, downloadDataUrl, normalizeSvgMarkup, sanitizeSvgForPng, timestampForFilename } from '../lib/exporters';
import { IconButton, IconLink } from './IconButton';
import {
  IconDownloadPng,
  IconDownloadSvg,
  IconGitHub,
  IconResetView,
  IconZoomIn,
  IconZoomOut,
} from '../icons';

interface MermaidPreviewProps {
  background: string;
  downloadDisabled: boolean;
  isSourceEmpty: boolean;
  svgMarkup: string;
}

export const MermaidPreview = memo(function MermaidPreview({
  background,
  downloadDisabled,
  isSourceEmpty,
  svgMarkup,
}: MermaidPreviewProps) {
  const previewSurfaceRef = useRef<HTMLDivElement | null>(null);
  const panZoomRef = useRef<SvgPanZoomInstance | null>(null);
  const panZoomSvgRef = useRef<SVGSVGElement | null>(null);
  const panZoomSyncFrameRef = useRef<number | null>(null);

  const destroyPanZoom = useEffectEvent(() => {
    if (panZoomSyncFrameRef.current !== null) {
      window.cancelAnimationFrame(panZoomSyncFrameRef.current);
      panZoomSyncFrameRef.current = null;
    }

    if (panZoomRef.current) {
      panZoomRef.current.destroy();
      panZoomRef.current = null;
    }

    panZoomSvgRef.current = null;
  });

  const syncPanZoom = useEffectEvent((shouldRefit: boolean) => {
    const svgElement = previewSurfaceRef.current?.querySelector('svg');
    if (!(svgElement instanceof SVGSVGElement)) {
      destroyPanZoom();
      return;
    }

    if (panZoomSvgRef.current !== svgElement || !panZoomRef.current) {
      destroyPanZoom();

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
      panZoomSvgRef.current = svgElement;
      return;
    }

    panZoomRef.current.resize();
    panZoomRef.current.updateBBox();

    if (shouldRefit) {
      panZoomRef.current.fit();
      panZoomRef.current.center();
    }
  });

  const schedulePanZoomSync = useEffectEvent((shouldRefit: boolean) => {
    if (panZoomSyncFrameRef.current !== null) {
      window.cancelAnimationFrame(panZoomSyncFrameRef.current);
    }

    panZoomSyncFrameRef.current = window.requestAnimationFrame(() => {
      panZoomSyncFrameRef.current = null;
      syncPanZoom(shouldRefit);
    });
  });

  useEffect(() => {
    if (!svgMarkup) {
      destroyPanZoom();
      return;
    }

    schedulePanZoomSync(true);

    return () => {
      destroyPanZoom();
    };
  }, [svgMarkup]);

  useEffect(() => {
    const previewSurfaceElement = previewSurfaceRef.current;
    if (!previewSurfaceElement || typeof ResizeObserver === 'undefined') {
      return;
    }

    const resizeObserver = new ResizeObserver(() => {
      schedulePanZoomSync(false);
    });

    resizeObserver.observe(previewSurfaceElement);

    return () => {
      resizeObserver.disconnect();
    };
  }, []);

  const handleSvgDownload = () => {
    if (downloadDisabled || !svgMarkup) {
      return;
    }

    const exportPayload = normalizeSvgMarkup(svgMarkup, background);
    const blob = new Blob([exportPayload.markup], { type: 'image/svg+xml;charset=utf-8' });
    downloadBlob(blob, `mermaid-diagram-${timestampForFilename()}.svg`);
  };

  const handlePngDownload = async () => {
    if (downloadDisabled || !svgMarkup) {
      return;
    }

    const sanitizedSvg = sanitizeSvgForPng(svgMarkup);
    const exportPayload = normalizeSvgMarkup(sanitizedSvg, background);
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

      context.fillStyle = background;
      context.fillRect(0, 0, canvas.width, canvas.height);
      context.drawImage(image, 0, 0, canvas.width, canvas.height);

      downloadDataUrl(canvas.toDataURL('image/png'), `mermaid-diagram-${timestampForFilename()}.png`);
    } catch (error) {
      console.error('PNG export failed:', error);
    } finally {
      URL.revokeObjectURL(svgUrl);
    }
  };

  return (
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

      <div className="preview-stage" style={{ background }}>
        <div className="export-toolbar" aria-label="导出工具">
          <IconButton tooltip="下载 SVG" disabled={downloadDisabled} onClick={handleSvgDownload}>
            <IconDownloadSvg />
          </IconButton>
          <IconButton tooltip="下载 PNG" disabled={downloadDisabled} onClick={() => { void handlePngDownload(); }}>
            <IconDownloadPng />
          </IconButton>
        </div>
        <div className="empty-state" hidden={!isSourceEmpty}>
          <p>等待图表渲染</p>
        </div>
        <div ref={previewSurfaceRef} className="preview-surface" aria-live="polite">
          {svgMarkup ? <div className="preview-frame" dangerouslySetInnerHTML={{ __html: svgMarkup }} /> : null}
        </div>
      </div>
    </section>
  );
});