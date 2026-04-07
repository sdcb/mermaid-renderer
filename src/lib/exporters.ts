import { MERMAID_FONT_STACK } from './constants';

export interface ExportPayload {
  markup: string;
  width: number;
  height: number;
}

export function normalizeSvgMarkup(svgMarkup: string, backgroundColor: string): ExportPayload {
  const parser = new DOMParser();
  const doc = parser.parseFromString(svgMarkup, 'image/svg+xml');
  const svgElement = doc.documentElement;

  const viewBox = svgElement.getAttribute('viewBox');
  let width = Number.parseFloat(svgElement.getAttribute('width') ?? '');
  let height = Number.parseFloat(svgElement.getAttribute('height') ?? '');

  if ((!width || !height) && viewBox) {
    const values = viewBox.split(/\s+/).map(Number);
    width = values[2];
    height = values[3];
  }

  if (!width || !height) {
    width = 1200;
    height = 800;
  }

  svgElement.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
  svgElement.setAttribute('xmlns:xlink', 'http://www.w3.org/1999/xlink');
  svgElement.setAttribute('width', `${width}`);
  svgElement.setAttribute('height', `${height}`);

  const backgroundRect = doc.createElementNS('http://www.w3.org/2000/svg', 'rect');
  backgroundRect.setAttribute('x', '0');
  backgroundRect.setAttribute('y', '0');
  backgroundRect.setAttribute('width', '100%');
  backgroundRect.setAttribute('height', '100%');
  backgroundRect.setAttribute('fill', backgroundColor);

  svgElement.insertBefore(backgroundRect, svgElement.firstChild);

  return {
    markup: new XMLSerializer().serializeToString(svgElement),
    width,
    height,
  };
}

export function sanitizeSvgForPng(svgMarkup: string): string {
  const parser = new DOMParser();
  const doc = parser.parseFromString(svgMarkup, 'image/svg+xml');
  const svgElement = doc.documentElement;
  const svgNamespace = 'http://www.w3.org/2000/svg';

  svgElement.querySelectorAll('foreignObject').forEach((foreignObject) => {
    const textContent = foreignObject.textContent?.replace(/\s+/g, ' ').trim() ?? '';
    const width = Number.parseFloat(foreignObject.getAttribute('width') ?? '0') || 0;
    const height = Number.parseFloat(foreignObject.getAttribute('height') ?? '0') || 0;

    if (!textContent) {
      foreignObject.remove();
      return;
    }

    const textElement = doc.createElementNS(svgNamespace, 'text');
    textElement.setAttribute('x', `${width / 2}`);
    textElement.setAttribute('y', `${height / 2}`);
    textElement.setAttribute('text-anchor', 'middle');
    textElement.setAttribute('dominant-baseline', 'central');
    textElement.setAttribute('font-family', MERMAID_FONT_STACK);
    textElement.setAttribute('font-size', '16');
    textElement.setAttribute('fill', 'currentColor');
    textElement.textContent = textContent;

    foreignObject.replaceWith(textElement);
  });

  return new XMLSerializer().serializeToString(svgElement);
}

export function timestampForFilename(): string {
  const now = new Date();
  const pad = (value: number) => `${value}`.padStart(2, '0');

  return `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}-${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;
}

export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.rel = 'noopener';
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1500);
}

export function downloadDataUrl(dataUrl: string, filename: string): void {
  const link = document.createElement('a');
  link.href = dataUrl;
  link.download = filename;
  link.rel = 'noopener';
  document.body.appendChild(link);
  link.click();
  link.remove();
}
