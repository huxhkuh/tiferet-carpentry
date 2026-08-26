import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, beforeEach, vi } from 'vitest';
import { PlannerApp } from '../../src/apartment/PlannerApp';

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
  window.localStorage.clear();
});

describe('Tiferet planner UI', () => {
  it('uses the Hebrew site brand and returns to the apartment page from an embedded design route', () => {
    const onExit = vi.fn();
    render(<PlannerApp initialStarted initialRoomId="bedroom" onExit={onExit} />);

    expect(screen.getByText('נגרות תפארת')).toBeInTheDocument();
    expect(screen.queryByText('TIFERET HOME')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'חזרה לדירה שלי' }));
    expect(onExit).toHaveBeenCalledOnce();
  });

  it('renders project selectors from the Tiferet project model', () => {
    render(<PlannerApp />);

    expect(screen.getByRole('heading', { name: 'פרויקט תפארת' })).toBeInTheDocument();
    expect(screen.getByLabelText('מתחם / בניין')).toHaveValue('techelet');
    expect(screen.getByLabelText('קומה')).toHaveValue('5');
    expect(screen.getByLabelText('דירה')).toHaveValue('tiferet-techelet-5-1');
    expect(screen.getByRole('img', { name: 'תצוגה מקדימה של דירה 5-1' })).toBeVisible();
    expect(screen.getAllByTestId(/^thumbnail-wall-mass-/)).toHaveLength(48);
  });

  it('selects a room and wall with stable test ids and shows the wall length', () => {
    render(<PlannerApp />);

    fireEvent.click(screen.getByRole('button', { name: /התחל לתכנן/ }));
    fireEvent.click(screen.getByTestId('room-select-bedroom'));
    fireEvent.click(screen.getByTestId('wall-list-bed-e'));

    expect(screen.getByText('הקיר הנבחר: 300 ס״מ')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /הוסף ארון/ })).toBeEnabled();
  });

  it('keeps the planner canvas bounded to the desktop viewport while the editor scrolls', () => {
    render(<PlannerApp />);

    fireEvent.click(screen.getByRole('button', { name: /התחל לתכנן/ }));

    expect(screen.getByTestId('planner-canvas')).toHaveClass('lg:sticky', 'lg:h-[calc(100vh-5rem)]');
  });

  it('מציג ריהוט מלא כברירת מחדל ומאפשר להסתיר אותו', () => {
    render(<PlannerApp />);

    fireEvent.click(screen.getByRole('button', { name: /התחל לתכנן/ }));
    fireEvent.click(screen.getByTestId('room-select-bedroom'));

    const furnitureToggle = screen.getByRole('switch', { name: 'הצג ריהוט מלא' });
    expect(furnitureToggle).toHaveAttribute('aria-checked', 'true');
    expect(screen.getByTestId('furniture-bedroom-bed-a')).toBeVisible();
    expect(screen.getByTestId('furniture-bedroom-bed-b')).toBeVisible();

    fireEvent.click(furnitureToggle);

    expect(furnitureToggle).toHaveAttribute('aria-checked', 'false');
    expect(screen.queryByTestId('furniture-bedroom-bed-a')).not.toBeInTheDocument();
  });

  it('מציג ערכת מטבח מלאה בחדר המטבח', () => {
    render(<PlannerApp />);

    fireEvent.click(screen.getByRole('button', { name: /התחל לתכנן/ }));
    fireEvent.click(screen.getByTestId('room-select-kitchen'));

    expect(screen.getByTestId('furniture-kitchen-base-run')).toBeVisible();
    expect(screen.getByTestId('furniture-kitchen-wall-run')).toBeVisible();
    expect(screen.getByTestId('furniture-kitchen-fridge')).toBeVisible();
    expect(screen.getByTestId('furniture-kitchen-oven')).toBeVisible();
  });

  it('מציג גמרים כבחירת צבע חזותית בארון', () => {
    render(<PlannerApp />);

    fireEvent.click(screen.getByRole('button', { name: /התחל לתכנן/ }));
    fireEvent.click(screen.getByTestId('room-select-bedroom'));
    fireEvent.click(screen.getByTestId('wall-select-bed-e'));
    fireEvent.click(screen.getByRole('button', { name: /הוסף ארון/ }));

    const colorOptions = screen.getByRole('group', { name: 'בחירת צבע וגמר לארון' });
    expect(colorOptions).toBeVisible();
    expect(screen.getAllByRole('button', { name: /בחר גמר/ }).length).toBeGreaterThanOrEqual(5);

    fireEvent.click(screen.getByRole('button', { name: 'בחר גמר מלמין אגוז 18 מ״מ' }));
    expect(screen.getByLabelText('גמר')).toHaveValue('melamine-walnut-18');
  });

  it('switches between the interactive clean plan and the pixel-accurate complete source sheet', () => {
    render(<PlannerApp />);

    fireEvent.click(screen.getByRole('button', { name: /התחל לתכנן/ }));
    expect(screen.getByRole('button', { name: 'תצוגה נקייה' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('group', { name: 'תכנית דירה 5-1' })).toBeVisible();

    fireEvent.click(screen.getByRole('button', { name: 'תצוגה מלאה' }));

    const sourceSheet = screen.getByRole('img', { name: 'גיליון 5-1 המקורי במלואו' });
    expect(sourceSheet).toBeVisible();
    expect(sourceSheet).toHaveAttribute('src', '/tiferet/sheet-5-1-full.png');
    expect(sourceSheet).toHaveAttribute('width', '6300');
    expect(sourceSheet).toHaveAttribute('height', '3314');
    const actualPixels = screen.getByRole('button', { name: '100% — פיקסל מול פיקסל' });
    expect(actualPixels).toBeEnabled();
    fireEvent.click(actualPixels);
    expect(actualPixels).toHaveAttribute('aria-pressed', 'true');
    expect(sourceSheet).toHaveClass('max-w-none');
    expect(screen.getByText('תצוגת מקור מלאה')).toBeVisible();
  });

  it('adds, edits, saves, restores, and resets a wardrobe placement', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    const view = render(<PlannerApp />);

    fireEvent.click(screen.getByRole('button', { name: /התחל לתכנן/ }));
    fireEvent.click(screen.getByTestId('room-select-bedroom'));
    fireEvent.click(screen.getByTestId('wall-select-bed-e'));
    fireEvent.click(screen.getByRole('button', { name: /הוסף ארון/ }));
    fireEvent.change(await screen.findByLabelText(/רוחב/), { target: { value: '220' } });
    fireEvent.click(screen.getByRole('button', { name: 'שמור תכנון' }));

    expect(screen.getByRole('status')).toHaveTextContent('נשמר');
    expect(window.localStorage.getItem('tiferet:design:5-1')).toContain('"width":2200');

    view.unmount();
    render(<PlannerApp />);
    fireEvent.click(screen.getByRole('button', { name: /התחל לתכנן/ }));
    expect(screen.getByText('ארון אחד בתכנון')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'אפס תכנון' }));
    expect(screen.getByText('0 ארונות בתכנון')).toBeInTheDocument();
    expect(window.localStorage.getItem('tiferet:design:5-1')).toBeNull();
  });

  it('rejects an edit that would extend the wardrobe beyond the selected wall', async () => {
    render(<PlannerApp />);

    fireEvent.click(screen.getByRole('button', { name: /התחל לתכנן/ }));
    fireEvent.click(screen.getByTestId('room-select-bedroom'));
    fireEvent.click(screen.getByTestId('wall-select-bed-e'));
    fireEvent.click(screen.getByRole('button', { name: /הוסף ארון/ }));

    const width = await screen.findByLabelText('רוחב');
    fireEvent.change(width, { target: { value: '310' } });

    expect(await screen.findByRole('alert')).toHaveTextContent('רחב');
    expect(width).toHaveValue(180);
  });
});
