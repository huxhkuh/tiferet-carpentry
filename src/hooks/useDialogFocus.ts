import { useRef } from 'react';
import { useFocusTrap } from './useFocusTrap';

/** Shared modal lifecycle; nested dialogs use the same focus stack. */
export function useDialogFocus<T extends HTMLElement>(open: boolean, onClose: () => void) {
  const ref = useRef<T>(null);
  useFocusTrap(ref, open, onClose);
  return ref;
}
