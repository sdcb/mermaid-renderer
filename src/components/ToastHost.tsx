import { createPortal } from 'react-dom';
import type { StorageNotice } from '../lib/types';

interface ToastHostProps {
  notice: StorageNotice | null;
}

export function ToastHost({ notice }: ToastHostProps) {
  if (!notice) {
    return null;
  }

  return createPortal(
    <div className={`toast is-${notice.kind}`} role="status" aria-live="polite">
      {notice.text}
    </div>,
    document.body,
  );
}