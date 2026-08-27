import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { FurnitureEditor } from '../../src/apartment/components/FurnitureEditor';
import type { FurniturePlacement } from '../../src/apartment/types';

const ITEM: FurniturePlacement = {
  id: 'bedroom-bed-a',
  roomId: 'bedroom',
  kind: 'single-bed',
  label: 'מיטת יחיד',
  x: 3_700,
  y: 1_120,
  width: 800,
  depth: 1_950,
  height: 900,
  elevation: 0,
  rotation: Math.PI / 2,
};

function renderEditor(overrides: Partial<FurniturePlacement> = {}) {
  const onPositionChange = vi.fn();
  const onRotationChange = vi.fn();
  const onHide = vi.fn();
  render(
    <FurnitureEditor
      item={{ ...ITEM, ...overrides }}
      onPositionChange={onPositionChange}
      onRotationChange={onRotationChange}
      onHide={onHide}
    />,
  );
  return { onPositionChange, onRotationChange, onHide };
}

describe('FurnitureEditor', () => {
  it('renders a quiet RTL editor for the selected furniture item', () => {
    renderEditor();

    expect(screen.getByRole('region', { name: 'עריכת מיטת יחיד' })).toHaveAttribute('dir', 'rtl');
    expect(screen.getByRole('heading', { name: 'עריכת מיטת יחיד' })).toBeVisible();
    expect(screen.getByRole('spinbutton', { name: 'מיקום X בס״מ' })).toHaveValue(370);
    expect(screen.getByRole('spinbutton', { name: 'מיקום Y בס״מ' })).toHaveValue(112);
    expect(screen.getByRole('spinbutton', { name: 'סיבוב במעלות' })).toHaveValue(90);
    expect(screen.getByRole('button', { name: 'הזז למעלה 10 ס״מ' })).toBeEnabled();
    expect(screen.getByRole('button', { name: 'הסתר פריט' })).toBeEnabled();
  });

  it('reports position edits in millimetres while preserving the untouched axis', () => {
    const { onPositionChange } = renderEditor();

    fireEvent.change(screen.getByRole('spinbutton', { name: 'מיקום X בס״מ' }), { target: { value: '385' } });
    fireEvent.change(screen.getByRole('spinbutton', { name: 'מיקום Y בס״מ' }), { target: { value: '124' } });

    expect(onPositionChange).toHaveBeenNthCalledWith(1, 3_850, 1_120);
    expect(onPositionChange).toHaveBeenNthCalledWith(2, 3_700, 1_240);
  });

  it('reports rotation edits in radians from degree controls', () => {
    const { onRotationChange } = renderEditor({ rotation: 0 });

    fireEvent.change(screen.getByRole('spinbutton', { name: 'סיבוב במעלות' }), { target: { value: '45' } });
    fireEvent.click(screen.getByRole('button', { name: 'סובב ימינה 90°' }));
    fireEvent.click(screen.getByRole('button', { name: 'סובב שמאלה 90°' }));

    expect(onRotationChange).toHaveBeenNthCalledWith(1, Math.PI / 4);
    expect(onRotationChange).toHaveBeenNthCalledWith(2, Math.PI / 2);
    expect(onRotationChange).toHaveBeenNthCalledWith(3, -Math.PI / 2);
  });

  it('nudges the item by 10 centimetres per direction and can hide it', () => {
    const { onPositionChange, onHide } = renderEditor();

    fireEvent.click(screen.getByRole('button', { name: 'הזז למעלה 10 ס״מ' }));
    fireEvent.click(screen.getByRole('button', { name: 'הזז למטה 10 ס״מ' }));
    fireEvent.click(screen.getByRole('button', { name: 'הזז ימינה 10 ס״מ' }));
    fireEvent.click(screen.getByRole('button', { name: 'הזז שמאלה 10 ס״מ' }));
    fireEvent.click(screen.getByRole('button', { name: 'הסתר פריט' }));

    expect(onPositionChange).toHaveBeenNthCalledWith(1, 3_700, 1_020);
    expect(onPositionChange).toHaveBeenNthCalledWith(2, 3_700, 1_220);
    expect(onPositionChange).toHaveBeenNthCalledWith(3, 3_800, 1_120);
    expect(onPositionChange).toHaveBeenNthCalledWith(4, 3_600, 1_120);
    expect(onHide).toHaveBeenCalledOnce();
  });
});
