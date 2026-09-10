import { useEffect, useState } from 'react';
import {
  browserDesignStorage,
  savePlanningDocument,
  preserveUnsavedDraft,
  type PlanningDocument,
} from '../persistence/planning-document';

export function useDraftPersistence(document: PlanningDocument): 'saved' | 'pending' | 'error' {
  const [persisted, setPersisted] = useState<PlanningDocument | null>(null);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    const persist = () => {
      try {
        savePlanningDocument(browserDesignStorage(), document);
        setPersisted(document);
        setFailed(false);
        return true;
      } catch {
        preserveUnsavedDraft(document);
        setFailed(true);
        return false;
      }
    };
    const timer = window.setTimeout(persist, 150);
    const beforeUnload = (event: BeforeUnloadEvent) => {
      if (!persist()) {
        event.preventDefault();
        event.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', beforeUnload);
    window.addEventListener('popstate', persist);
    window.addEventListener('pagehide', persist);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener('beforeunload', beforeUnload);
      window.removeEventListener('popstate', persist);
      window.removeEventListener('pagehide', persist);
    };
  }, [document]);
  return failed ? 'error' : persisted === document ? 'saved' : 'pending';
}
