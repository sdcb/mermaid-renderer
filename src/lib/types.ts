export interface ThemePreset {
  id: string;
  label: string;
  canvasBackground: string;
  swatches: string[];
  themeVariables: Record<string, string>;
}

export interface SavedDiagram {
  id: string;
  title: string;
  source: string;
  themeId: string;
  createdAt: number;
  updatedAt: number;
}
