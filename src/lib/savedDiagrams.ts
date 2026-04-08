import { SAVED_DIAGRAMS_STORAGE_KEY } from './constants';
import type { SavedDiagram } from './types';

function sortByUpdatedAt(diagrams: SavedDiagram[]): SavedDiagram[] {
  return [...diagrams].sort((left, right) => right.updatedAt - left.updatedAt);
}

function isSavedDiagram(value: unknown): value is SavedDiagram {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const candidate = value as Record<string, unknown>;
  return (
    typeof candidate.id === 'string' &&
    typeof candidate.title === 'string' &&
    typeof candidate.source === 'string' &&
    typeof candidate.themeId === 'string' &&
    typeof candidate.createdAt === 'number' &&
    typeof candidate.updatedAt === 'number'
  );
}

function persistSavedDiagrams(diagrams: SavedDiagram[]): SavedDiagram[] {
  const sortedDiagrams = sortByUpdatedAt(diagrams);
  window.localStorage.setItem(SAVED_DIAGRAMS_STORAGE_KEY, JSON.stringify(sortedDiagrams));
  return sortedDiagrams;
}

export function readSavedDiagrams(): SavedDiagram[] {
  if (typeof window === 'undefined') {
    return [];
  }

  try {
    const rawValue = window.localStorage.getItem(SAVED_DIAGRAMS_STORAGE_KEY);
    if (!rawValue) {
      return [];
    }

    const parsedValue = JSON.parse(rawValue);
    if (!Array.isArray(parsedValue)) {
      return [];
    }

    return sortByUpdatedAt(parsedValue.filter(isSavedDiagram));
  } catch {
    return [];
  }
}

export function upsertSavedDiagram(diagram: SavedDiagram): SavedDiagram[] {
  const currentDiagrams = readSavedDiagrams();
  const existingIndex = currentDiagrams.findIndex((item) => item.id === diagram.id);

  if (existingIndex === -1) {
    return persistSavedDiagrams([...currentDiagrams, diagram]);
  }

  const nextDiagrams = [...currentDiagrams];
  nextDiagrams[existingIndex] = diagram;
  return persistSavedDiagrams(nextDiagrams);
}

export function deleteSavedDiagram(diagramId: string): SavedDiagram[] {
  return persistSavedDiagrams(readSavedDiagrams().filter((diagram) => diagram.id !== diagramId));
}
