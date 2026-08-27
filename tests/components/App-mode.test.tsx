import { render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../src/WoodworkingShopApp', () => ({
  default: () => <header aria-label="WoodworkingShop">WoodworkingShop</header>,
}));

import App from '../../src/App';

beforeEach(() => {
  const values = new Map<string, string>();
  const storage: Storage = {
    get length() {
      return values.size;
    },
    clear: () => values.clear(),
    getItem: (key) => values.get(key) ?? null,
    key: (index) => [...values.keys()][index] ?? null,
    removeItem: (key) => values.delete(key),
    setItem: (key, value) => values.set(key, value),
  };
  Object.defineProperty(globalThis, 'localStorage', {
    configurable: true,
    value: storage,
  });
  Object.defineProperty(window, 'localStorage', { configurable: true, value: storage });
});

afterEach(() => {
  window.history.replaceState({}, '', '/');
});

describe('App product modes', () => {
  it('opens the Tiferet carpentry website by default', async () => {
    window.history.replaceState({}, '', '/');
    render(<App />);
    expect(await screen.findByRole('heading', { name: /נגרות מדויקת/ }, { timeout: 5000 })).toBeInTheDocument();
  });

  it('keeps the original WoodworkingShop available in workshop mode', async () => {
    window.history.replaceState({}, '', '/?app=workshop');
    render(<App />);
    expect(await screen.findByRole('banner', { name: 'WoodworkingShop' }, { timeout: 5000 })).toBeInTheDocument();
  });
});
