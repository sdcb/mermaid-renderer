declare module 'svg-pan-zoom' {
  export interface SvgPanZoomInstance {
    destroy(): void;
    zoomIn(): void;
    zoomOut(): void;
    resetZoom(): void;
    center(): void;
    fit(): void;
    resize(): void;
    updateBBox(): void;
  }

  interface SvgPanZoomOptions {
    controlIconsEnabled?: boolean;
    fit?: boolean;
    center?: boolean;
    minZoom?: number;
    maxZoom?: number;
    zoomScaleSensitivity?: number;
  }

  export default function svgPanZoom(
    element: Element | string,
    options?: SvgPanZoomOptions,
  ): SvgPanZoomInstance;
}
