import { useEffect, useRef, type RefObject } from 'react';

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';
const dialogs: HTMLElement[] = [];
let originalOverflow = '';

/** Initial focus, keyboard containment, scroll locking and focus restoration. */
export function useFocusTrap(
  containerRef: RefObject<HTMLElement | null>,
  active: boolean,
  onEscape?: () => void,
): void {
  const escapeRef = useRef(onEscape);
  useEffect(() => {
    escapeRef.current = onEscape;
  }, [onEscape]);
  useEffect(() => {
    const dialog = containerRef.current;
    if (!active || !dialog) return;
    const previous = document.activeElement;
    const tabIndex = dialog.getAttribute('tabindex');
    dialog.tabIndex = -1;
    if (!dialogs.length) originalOverflow = document.body.style.overflow;
    dialogs.push(dialog);
    document.body.style.overflow = 'hidden';
    const isTop = () => dialogs.at(-1) === dialog;
    const focusable = () =>
      Array.from(dialog.querySelectorAll<HTMLElement>(FOCUSABLE)).filter((element) => {
        const style = getComputedStyle(element);
        return (
          !element.closest('[hidden], [inert], [aria-hidden="true"]') &&
          style.display !== 'none' &&
          style.visibility !== 'hidden'
        );
      });
    (focusable()[0] ?? dialog).focus();
    const keydown = (event: KeyboardEvent) => {
      if (!isTop()) return;
      if (event.key === 'Escape') {
        event.preventDefault();
        event.stopPropagation();
        escapeRef.current?.();
      }
      if (event.key !== 'Tab') return;
      const items = focusable();
      const first = items[0] ?? dialog,
        last = items.at(-1) ?? dialog;
      if (
        !dialog.contains(document.activeElement) ||
        (event.shiftKey && document.activeElement === first) ||
        (!event.shiftKey && (document.activeElement === last || document.activeElement === dialog))
      ) {
        event.preventDefault();
        (event.shiftKey ? last : first).focus();
      }
    };
    const focusin = (event: FocusEvent) => {
      if (isTop() && event.target instanceof Node && !dialog.contains(event.target)) (focusable()[0] ?? dialog).focus();
    };
    window.addEventListener('keydown', keydown, true);
    document.addEventListener('focusin', focusin);
    return () => {
      const top = isTop();
      const index = dialogs.lastIndexOf(dialog);
      if (index >= 0) dialogs.splice(index, 1);
      if (!dialogs.length) document.body.style.overflow = originalOverflow;
      window.removeEventListener('keydown', keydown, true);
      document.removeEventListener('focusin', focusin);
      if (tabIndex === null) dialog.removeAttribute('tabindex');
      else dialog.setAttribute('tabindex', tabIndex);
      if (top && previous instanceof HTMLElement && previous.isConnected) previous.focus();
    };
  }, [active, containerRef]);
}
