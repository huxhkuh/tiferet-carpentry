import { useEffect, useRef, useState } from 'react';
import { SITE_NAV_ITEMS } from '../content';
import type { SiteRoute } from '../router';
import type { NavigateSite } from '../types';
import { BrandMark } from './BrandMark';
import { SiteLink } from './SiteLink';

export function SiteHeader({
  route,
  navigate,
  onOpenWorkshop,
}: {
  route: SiteRoute;
  navigate: NavigateSite;
  onOpenWorkshop: () => void;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menuOpen) return undefined;
    const previousBodyOverflow = document.body.style.overflow;
    const menuButton = menuButtonRef.current;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setMenuOpen(false);
        return;
      }
      if (event.key !== 'Tab') return;
      const focusable = Array.from(
        dialogRef.current?.querySelectorAll<HTMLElement>('a[href], button:not([disabled])') ?? [],
      ).filter((element) => element.getClientRects().length > 0);
      const first = focusable[0];
      const last = focusable.at(-1);
      if (!first || !last) return;
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    document.body.style.overflow = 'hidden';
    closeButtonRef.current?.focus();
    window.addEventListener('keydown', closeOnEscape);
    return () => {
      document.body.style.overflow = previousBodyOverflow;
      window.removeEventListener('keydown', closeOnEscape);
      menuButton?.focus();
    };
  }, [menuOpen]);

  const navigation = (mobile = false) => (
    <nav className={mobile ? 'ng-mobile-nav' : 'ng-desktop-nav'} aria-label={mobile ? 'ניווט נייד' : 'ניווט ראשי'}>
      {SITE_NAV_ITEMS.map((item, index) => (
        <SiteLink
          key={item.routeId}
          route={{ id: item.routeId }}
          navigate={navigate}
          onNavigate={mobile ? () => setMenuOpen(false) : undefined}
          ariaCurrent={route.id === item.routeId ? 'page' : undefined}
        >
          <span className="ng-nav-number" aria-hidden="true">
            {String(index + 1).padStart(2, '0')}
          </span>
          <span>{item.label}</span>
        </SiteLink>
      ))}
    </nav>
  );

  return (
    <>
      <header className="ng-site-header">
        <div className="ng-header-inner">
          <SiteLink route={{ id: 'home' }} navigate={navigate} className="ng-brand-link">
            <BrandMark compact />
            <span className="ng-brand-lockup">
              <strong>סטודיו לנגרות מותאמת</strong>
              <small>פרויקט תפארת · רמלה</small>
            </span>
          </SiteLink>
          {navigation()}
          <div className="ng-header-actions">
            <button type="button" className="ng-workshop-link" onClick={onOpenWorkshop}>
              כניסה לנגרייה המקצועית
            </button>
            <SiteLink route={{ id: 'apartments' }} navigate={navigate} className="ng-button ng-button--small">
              <span>תכנון דירה</span>
              <span aria-hidden="true">↙</span>
            </SiteLink>
            <button
              ref={menuButtonRef}
              type="button"
              className="ng-menu-button"
              aria-label="פתיחת תפריט"
              aria-expanded={menuOpen}
              onClick={() => setMenuOpen(true)}
            >
              <span />
              <span />
            </button>
          </div>
        </div>
      </header>
      {menuOpen ? (
        <div ref={dialogRef} className="ng-mobile-menu" role="dialog" aria-modal="true" aria-label="תפריט האתר">
          <div className="ng-mobile-menu__top">
            <BrandMark />
            <button ref={closeButtonRef} type="button" aria-label="סגירת תפריט" onClick={() => setMenuOpen(false)}>
              ×
            </button>
          </div>
          {navigation(true)}
          <button type="button" className="ng-workshop-link" onClick={onOpenWorkshop}>
            כניסה לנגרייה המקצועית
          </button>
        </div>
      ) : null}
    </>
  );
}
