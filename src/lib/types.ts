export interface ThemePreset {
  id: string;
  label: string;
  canvasBackground: string;
  swatches: string[];
  themeVariables: Record<string, string>;
}

export type RenderStatusKind = 'idle' | 'working' | 'success' | 'error';

export interface RenderStatus {
  kind: RenderStatusKind;
  text: string;
  message: string;
}
