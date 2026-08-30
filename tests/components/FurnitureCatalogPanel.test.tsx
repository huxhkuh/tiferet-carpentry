import { fireEvent, render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { FurnitureCatalogPanel } from '../../src/apartment/components/FurnitureCatalogPanel';
import { FURNITURE_CATALOG } from '../../src/apartment/furniture/catalog';

describe('FurnitureCatalogPanel', () => {
  it('exposes every furniture catalogue definition as an add action', () => {
    render(<FurnitureCatalogPanel roomName="חדר בדיקה" onAdd={vi.fn()} onClose={vi.fn()} />);
    const dialog = screen.getByRole('dialog', { name: 'קטלוג ריהוט' });

    for (const item of Object.values(FURNITURE_CATALOG)) {
      expect(within(dialog).getByRole('button', { name: `הוסף ${item.label}` })).toBeEnabled();
    }
    expect(within(dialog).getAllByRole('button', { name: /^הוסף / })).toHaveLength(
      Object.keys(FURNITURE_CATALOG).length,
    );
  });

  it('filters by category and reports the chosen furniture kind', () => {
    const onAdd = vi.fn();
    render(<FurnitureCatalogPanel roomName="סלון" onAdd={onAdd} onClose={vi.fn()} />);

    fireEvent.click(screen.getByRole('tab', { name: 'מטבח' }));
    expect(screen.getByRole('button', { name: 'הוסף מקרר' })).toBeVisible();
    expect(screen.queryByRole('button', { name: 'הוסף מיטה זוגית' })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'הוסף מקרר' }));

    expect(onAdd).toHaveBeenCalledWith('refrigerator');
  });

  it('closes from both the close action and Escape', () => {
    const onClose = vi.fn();
    render(<FurnitureCatalogPanel roomName="מטבח" onAdd={vi.fn()} onClose={onClose} />);

    fireEvent.keyDown(window, { key: 'Escape' });
    fireEvent.click(screen.getByRole('button', { name: 'סגירת קטלוג ריהוט' }));

    expect(onClose).toHaveBeenCalledTimes(2);
  });
});
