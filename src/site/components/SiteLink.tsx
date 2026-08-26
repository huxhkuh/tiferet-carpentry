import type { MouseEvent, ReactNode } from 'react';
import type { SiteRoute } from '../router';
import { sitePath } from '../router';
import type { NavigateSite } from '../types';

interface SiteLinkProps {
  children: ReactNode;
  className?: string;
  navigate: NavigateSite;
  route: SiteRoute;
  ariaCurrent?: 'page';
  onNavigate?: () => void;
}

export function SiteLink({ children, className, navigate, route, ariaCurrent, onNavigate }: SiteLinkProps) {
  const onClick = (event: MouseEvent<HTMLAnchorElement>) => {
    if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    onNavigate?.();
    navigate(route);
  };

  return (
    <a href={sitePath(route)} onClick={onClick} className={className} aria-current={ariaCurrent}>
      {children}
    </a>
  );
}
