import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { SummaryPage } from '../../src/site/pages/SummaryPage';
import { DEFAULT_CONFIG } from '../../src/engine/materials';
import { TIFERET_5_1 } from '../../src/apartment/data/tiferet';
import type { SavedDesignV2 } from '../../src/apartment/types';

const savedDesign: SavedDesignV2 = {
  schemaVersion: 2,
  id: 'summary-design',
  apartmentId: TIFERET_5_1.id,
  name: 'חלופה בהירה',
  updatedAt: '2026-08-27T10:00:00.000Z',
  placements: [
    {
      id: 'summary-cabinet',
      apartmentId: TIFERET_5_1.id,
      roomId: 'bedroom',
      wallId: 'bed-e',
      distanceFromWallStart: 0,
      elevation: 0,
      orientation: Math.PI,
      width: 1_800,
      height: 2_400,
      depth: 600,
      cabinetConfig: {
        ...DEFAULT_CONFIG,
        furnitureType: 'wardrobe',
        width: 1_800,
        height: 2_400,
        depth: 600,
        lang: 'he',
      },
    },
  ],
  furnitureOverrides: [],
  visibility: { hiddenObjectIds: [], hiddenCategories: [] },
  furniturePalette: 'light',
  cameraByRoom: {},
};

describe('Tiferet design summary', () => {
  beforeEach(() => {
    const values = new Map<string, string>();
    const storage = {
      clear: vi.fn(() => values.clear()),
      getItem: vi.fn((key: string) => values.get(key) ?? null),
      removeItem: vi.fn((key: string) => values.delete(key)),
      setItem: vi.fn((key: string, value: string) => values.set(key, value)),
    };
    Object.defineProperty(window, 'localStorage', { configurable: true, value: storage });
    Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: storage });
    window.localStorage.setItem('tiferet:design:5-1', JSON.stringify(savedDesign));
  });

  it('shows a useful carpentry specification instead of dimensions alone', () => {
    render(<SummaryPage navigate={vi.fn()} />);

    expect(screen.getByText('חלופה בהירה')).toBeVisible();
    expect(screen.getByText('ארון בגדים')).toBeVisible();
    expect(screen.getByText('פנלפלק 17 מ"מ')).toBeVisible();
    expect(screen.getByText('דלת חלקה · ידית קווית')).toBeVisible();
    expect(screen.getByText('2 דלתות · 4 מדפים · 0 מגירות')).toBeVisible();
    expect(screen.getByText('ערכת ריהוט בהירה')).toBeVisible();
    expect(screen.getByRole('button', { name: 'הדפסת הסיכום' })).toBeEnabled();
  });
});
