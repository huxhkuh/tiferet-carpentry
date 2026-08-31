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
  const onDimensionsChange = vi.fn();
  const onAppearanceChange = vi.fn();
  const onSnapToGrid = vi.fn();
  const onSnapToWall = vi.fn();
  const onHide = vi.fn();
  render(
    <FurnitureEditor
      item={{ ...ITEM, ...overrides }}
      onPositionChange={onPositionChange}
      onRotationChange={onRotationChange}
      onDimensionsChange={onDimensionsChange}
      onAppearanceChange={onAppearanceChange}
      onSnapToGrid={onSnapToGrid}
      onSnapToWall={onSnapToWall}
      onHide={onHide}
    />,
  );
  return {
    onPositionChange,
    onRotationChange,
    onDimensionsChange,
    onAppearanceChange,
    onSnapToGrid,
    onSnapToWall,
    onHide,
  };
}

describe('FurnitureEditor', () => {
  it('renders a quiet RTL editor for the selected furniture item', () => {
    renderEditor();

    expect(screen.getByRole('region', { name: 'עריכת מיטת יחיד' })).toHaveAttribute('dir', 'rtl');
    expect(screen.getByRole('heading', { name: 'עריכת מיטת יחיד' })).toBeVisible();
    expect(screen.getByRole('spinbutton', { name: 'מיקום X בס״מ' })).toHaveValue(370);
    expect(screen.getByRole('spinbutton', { name: 'מיקום Y בס״מ' })).toHaveValue(112);
    expect(screen.getByRole('spinbutton', { name: 'סיבוב במעלות' })).toHaveValue(90);
    expect(screen.getByRole('spinbutton', { name: 'רוחב בס״מ' })).toHaveValue(80);
    expect(screen.getByRole('spinbutton', { name: 'עומק בס״מ' })).toHaveValue(195);
    expect(screen.getByRole('spinbutton', { name: 'גובה בס״מ' })).toHaveValue(90);
    expect(screen.getByRole('combobox', { name: 'חומר' })).toBeVisible();
    expect(screen.getByRole('combobox', { name: 'סגנון' })).toBeVisible();
    expect(screen.getByLabelText('צבע ראשי')).toBeVisible();
    expect(screen.getByRole('button', { name: 'הזז למעלה 10 ס״מ' })).toBeEnabled();
    expect(screen.getByRole('button', { name: 'הצמד לרשת של 5 ס״מ' })).toBeEnabled();
    expect(screen.getByRole('button', { name: 'הצמד לקיר הקרוב' })).toBeEnabled();
    expect(screen.getByRole('button', { name: 'הסתר פריט' })).toBeEnabled();
  });

  it('reports dimension edits in millimetres while preserving untouched dimensions', () => {
    const { onDimensionsChange } = renderEditor();

    fireEvent.change(screen.getByRole('spinbutton', { name: 'רוחב בס״מ' }), { target: { value: '105' } });
    fireEvent.change(screen.getByRole('spinbutton', { name: 'עומק בס״מ' }), { target: { value: '210' } });
    fireEvent.change(screen.getByRole('spinbutton', { name: 'גובה בס״מ' }), { target: { value: '98' } });

    expect(onDimensionsChange).toHaveBeenNthCalledWith(1, 1_050, ITEM.depth, ITEM.height);
    expect(onDimensionsChange).toHaveBeenNthCalledWith(2, ITEM.width, 2_100, ITEM.height);
    expect(onDimensionsChange).toHaveBeenNthCalledWith(3, ITEM.width, ITEM.depth, 980);
  });

  it('reports appearance and snap actions', () => {
    const { onAppearanceChange, onSnapToGrid, onSnapToWall } = renderEditor();

    fireEvent.change(screen.getByLabelText('צבע ראשי'), { target: { value: '#123456' } });
    fireEvent.change(screen.getByRole('combobox', { name: 'חומר' }), { target: { value: 'fabric' } });
    fireEvent.change(screen.getByRole('combobox', { name: 'סגנון' }), { target: { value: 'soft' } });
    fireEvent.click(screen.getByRole('button', { name: 'הצמד לרשת של 5 ס״מ' }));
    fireEvent.click(screen.getByRole('button', { name: 'הצמד לקיר הקרוב' }));

    expect(onAppearanceChange).toHaveBeenNthCalledWith(1, { color: '#123456' });
    expect(onAppearanceChange).toHaveBeenNthCalledWith(2, { material: 'fabric' });
    expect(onAppearanceChange).toHaveBeenNthCalledWith(3, { style: 'soft' });
    expect(onSnapToGrid).toHaveBeenCalledOnce();
    expect(onSnapToWall).toHaveBeenCalledOnce();
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
