import type { ReactNode } from 'react';

interface IconButtonProps {
  tooltip: string;
  onClick?: () => void;
  disabled?: boolean;
  className?: string;
  children: ReactNode;
}

export function IconButton({ tooltip, onClick, disabled, className, children }: IconButtonProps) {
  return (
    <button
      className={`icon-button${className ? ` ${className}` : ''}`}
      type="button"
      data-tooltip={tooltip}
      aria-label={tooltip}
      disabled={disabled}
      onClick={onClick}
    >
      {children}
    </button>
  );
}

interface IconLinkProps {
  tooltip: string;
  href: string;
  target?: string;
  rel?: string;
  className?: string;
  children: ReactNode;
}

export function IconLink({ tooltip, href, target, rel, className, children }: IconLinkProps) {
  return (
    <a
      className={`icon-button${className ? ` ${className}` : ''}`}
      href={href}
      target={target}
      rel={rel}
      data-tooltip={tooltip}
      aria-label={tooltip}
    >
      {children}
    </a>
  );
}
