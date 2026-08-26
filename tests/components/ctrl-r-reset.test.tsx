/**
 * Sprint 66 — Ctrl+R keyboard shortcut resets cabinet config to defaults.
 */

import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, beforeAll, beforeEach } from 'vitest';
import WoodworkingShopApp from '../../src/WoodworkingShopApp';
import { useCabinetStore } from '../../src/store/cabinet-store';
import { DEFAULT_CONFIG } from '../../src/engine/materials';

// Provide a minimal localStorage polyfill for the jsdom environment used in these tests
beforeAll(() => {
  if (typeof window !== 'undefined' && !window.localStorage) {
    const store: Record<string, string> = {};
    Object.defineProperty(window, 'localStorage', {
      value: {
        getItem: (k: string) => store[k] ?? null,
        setItem: (k: string, v: string) => {
          store[k] = v;
        },
        removeItem: (k: string) => {
          delete store[k];
        },
        clear: () => {
          Object.keys(store).forEach((k) => delete store[k]);
        },
      },
      writable: true,
    });
  }
});

describe('Ctrl+R reset shortcut — Sprint 66', () => {
  beforeEach(() => {
    window.history.replaceState({}, '', '/?app=workshop');
    useCabinetStore.getState().resetConfig();
  });

  it('Ctrl+R fires without throwing', async () => {
    render(<WoodworkingShopApp />);
    expect(() => {
      fireEvent.keyDown(window, { key: 'r', ctrlKey: true });
    }).not.toThrow();
    await waitFor(() => {
      expect(useCabinetStore.getState().config.width).toBe(DEFAULT_CONFIG.width);
    });
  }, 15000);

  it('Ctrl+R resets a modified config back to defaults', async () => {
    useCabinetStore.getState().setConfig({ width: 1800 });
    render(<WoodworkingShopApp />);
    fireEvent.keyDown(window, { key: 'r', ctrlKey: true });
    await waitFor(() => {
      expect(useCabinetStore.getState().config.width).toBe(DEFAULT_CONFIG.width);
    });
  });

  it('Ctrl+R with capital R also resets', () => {
    useCabinetStore.getState().setConfig({ width: 1800 });
    render(<WoodworkingShopApp />);
    fireEvent.keyDown(window, { key: 'R', ctrlKey: true });
    expect(useCabinetStore.getState().config.width).toBe(DEFAULT_CONFIG.width);
  });

  it('Ctrl+R entry appears in ShortcutsModal', async () => {
    render(<WoodworkingShopApp />);
    // Open shortcuts modal with ?
    fireEvent.keyDown(window, { key: '?' });
    // The modal should list Ctrl + R
    expect(await screen.findByText('Ctrl + R')).toBeInTheDocument();
  });
});
