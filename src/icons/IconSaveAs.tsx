export function IconSaveAs() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      {/* 文档外框（带折角） */}
      <path d="M13.5 3H6a1 1 0 00-1 1v16a1 1 0 001 1h12a1 1 0 001-1V9.5z" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
      {/* 封面折角 */}
      <path d="M13.5 3v6.5H20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
      {/* 内部加号 */}
      <path d="M9 14.5h6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <path d="M12 11.5v6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}
