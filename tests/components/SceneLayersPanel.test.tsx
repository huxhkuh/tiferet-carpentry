import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { SceneLayersPanel } from '../../src/apartment/components/SceneLayersPanel';

describe('SceneLayersPanel', () => {
  it('presents the spatial layers as accessible pressed controls', () => {
    render(
      <SceneLayersPanel
        visibility={{ hiddenObjectIds: [], hiddenCategories: ['decor'] }}
        onToggleCategory={vi.fn()}
        onShowAll={vi.fn()}
      />,
    );

    expect(screen.getByRole('button', { name: 'שכבת ארונות ונגרות' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: 'שכבת עיצוב והלבשה' })).toHaveAttribute('aria-pressed', 'false');
    expect(screen.getByRole('group', { name: 'שכבות התכנון' })).toBeVisible();
  });

  it('reports layer toggles and a complete visibility reset', () => {
    const onToggleCategory = vi.fn();
    const onShowAll = vi.fn();
    render(
      <SceneLayersPanel
        visibility={{ hiddenObjectIds: ['bed-a'], hiddenCategories: [] }}
        onToggleCategory={onToggleCategory}
        onShowAll={onShowAll}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'שכבת מיטות ושינה' }));
    fireEvent.click(screen.getByRole('button', { name: 'הצג את כל הפריטים' }));

    expect(onToggleCategory).toHaveBeenCalledWith('beds');
    expect(onShowAll).toHaveBeenCalledOnce();
    expect(screen.getByText('פריט מוסתר אחד')).toBeVisible();
  });
});
