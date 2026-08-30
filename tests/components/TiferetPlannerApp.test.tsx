import { fireEvent, render, screen, within } from '@testing-library/react';
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
    expect(screen.getByRole('img', { name: 'נגרות — תפארת' })).toHaveClass('shrink-0');
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
    expect(screen.getByRole('option', { name: 'דירה 23-א · גיליון 5-1' })).toBeInTheDocument();
    expect(screen.getByRole('img', { name: 'תצוגה מקדימה של דירה 5-1' })).toBeVisible();
    expect(screen.getAllByTestId(/^thumbnail-wall-mass-/)).toHaveLength(48);
  });

  it('shows the audited source inventory without presenting unresolved PDFs as implemented clean models', () => {
    render(<PlannerApp />);

    expect(screen.getByText('179 קבצי PDF נסרקו מהמקור')).toBeVisible();
    expect(screen.getByText('98 תוכניות דירה טרם שוחזרו לגאומטריה אדריכלית')).toBeVisible();
    expect(
      screen.getByText('דירה 23-א · גיליון 5-1 זמינה כמודל עבודה; האימות האדריכלי המלא עדיין בהמתנה'),
    ).toBeVisible();
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

    expect(screen.getByTestId('planner-canvas')).toHaveClass('lg:sticky', 'lg:top-32', 'lg:h-[calc(100vh-8rem)]');
  });

  it('מציג את עורך הפריט לפני רשימת החדרים במסך צר', () => {
    render(<PlannerApp initialStarted initialRoomId="bedroom" />);

    expect(screen.getByTestId('planner-context-panel')).toHaveClass('order-2', 'lg:order-3');
    expect(screen.getByTestId('planner-room-panel')).toHaveClass('order-3', 'lg:order-1');
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

  it('בוחר רהיט, מזיז אותו בגריד ומאפשר להסתיר ולשחזר אותו', () => {
    render(<PlannerApp />);

    fireEvent.click(screen.getByRole('button', { name: /התחל לתכנן/ }));
    fireEvent.click(screen.getByTestId('room-select-bedroom'));
    fireEvent.click(screen.getByTestId('furniture-bedroom-bed-a'));

    expect(screen.getByRole('heading', { name: 'עריכת מיטת יחיד' })).toBeVisible();
    expect(screen.getByLabelText(/מיקום X/)).toHaveValue(370);
    fireEvent.click(screen.getByRole('button', { name: 'הזז ימינה 10 ס״מ' }));
    expect(screen.getByLabelText(/מיקום X/)).toHaveValue(380);

    fireEvent.click(screen.getByRole('button', { name: 'הסתר פריט' }));
    expect(screen.queryByTestId('furniture-bedroom-bed-a')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'הצג את כל הפריטים' }));
    expect(screen.getByTestId('furniture-bedroom-bed-a')).toBeVisible();
  });

  it('שומר ומשחזר מיקום ריהוט ושכבות תצוגה כחלק מהתכנון', () => {
    const view = render(<PlannerApp />);

    fireEvent.click(screen.getByRole('button', { name: /התחל לתכנן/ }));
    fireEvent.click(screen.getByTestId('room-select-bedroom'));
    fireEvent.click(screen.getByTestId('furniture-bedroom-bed-a'));
    fireEvent.click(screen.getByRole('button', { name: 'הזז ימינה 10 ס״מ' }));
    fireEvent.click(screen.getByRole('button', { name: 'שכבת עיצוב והלבשה' }));
    fireEvent.click(screen.getByRole('button', { name: 'שמור תכנון' }));

    const serialized = window.localStorage.getItem('tiferet:design:5-1');
    expect(serialized).toContain('"schemaVersion":2');
    expect(serialized).toContain('"id":"bedroom-bed-a","x":3800');
    expect(serialized).toContain('"hiddenCategories":["decor"]');

    view.unmount();
    render(<PlannerApp />);
    fireEvent.click(screen.getByRole('button', { name: /התחל לתכנן/ }));
    fireEvent.click(screen.getByTestId('room-select-bedroom'));
    fireEvent.click(screen.getByTestId('furniture-bedroom-bed-a'));

    expect(screen.getByLabelText(/מיקום X/)).toHaveValue(380);
    expect(screen.getByRole('button', { name: 'שכבת עיצוב והלבשה' })).toHaveAttribute('aria-pressed', 'false');
  });

  it('מבטל ומבצע מחדש שינוי מרחבי בלי לאבד את הפריט הנבחר', () => {
    render(<PlannerApp />);
    fireEvent.click(screen.getByRole('button', { name: /התחל לתכנן/ }));
    fireEvent.click(screen.getByTestId('room-select-bedroom'));
    fireEvent.click(screen.getByTestId('furniture-bedroom-bed-a'));

    expect(screen.getByRole('button', { name: 'בטל שינוי' })).toBeDisabled();
    fireEvent.click(screen.getByRole('button', { name: 'הזז ימינה 10 ס״מ' }));
    expect(screen.getByLabelText(/מיקום X/)).toHaveValue(380);
    fireEvent.click(screen.getByRole('button', { name: 'בטל שינוי' }));
    expect(screen.getByLabelText(/מיקום X/)).toHaveValue(370);
    fireEvent.click(screen.getByRole('button', { name: 'בצע שוב' }));
    expect(screen.getByLabelText(/מיקום X/)).toHaveValue(380);
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

  it('lets users reduce clean-plan clutter by toggling door swings, dimensions and labels', () => {
    render(<PlannerApp />);
    fireEvent.click(screen.getByRole('button', { name: /התחל לתכנן/ }));

    const doors = screen.getByRole('switch', { name: 'הצג קשתות דלת' });
    const dimensions = screen.getByRole('switch', { name: 'הצג מידות' });
    const labels = screen.getByRole('switch', { name: 'הצג שמות חדרים' });
    expect(doors).toHaveAttribute('aria-checked', 'true');
    expect(dimensions).toHaveAttribute('aria-checked', 'true');
    expect(labels).toHaveAttribute('aria-checked', 'true');
    expect(screen.getAllByTestId(/^door-swing-/).length).toBeGreaterThan(0);
    expect(screen.getByTestId('room-dimensions-safe-room')).toHaveAttribute('data-measurement-origin', 'explicit');
    const cleanPlan = screen.getByRole('group', { name: 'תכנית דירה 5-1' });
    expect(within(cleanPlan).getByText('ממ״ד')).toBeVisible();

    fireEvent.click(doors);
    fireEvent.click(dimensions);
    fireEvent.click(labels);

    expect(screen.queryByTestId(/^door-swing-/)).not.toBeInTheDocument();
    expect(screen.queryByTestId('room-dimensions-safe-room')).not.toBeInTheDocument();
    expect(within(cleanPlan).queryByText('ממ״ד')).not.toBeInTheDocument();
  });

  it('opens a calibrated source overlay for line-by-line geometry inspection', () => {
    render(<PlannerApp initialStarted initialRoomId="bedroom" />);

    fireEvent.click(screen.getByRole('button', { name: 'בדיקת חפיפה' }));

    expect(screen.getByRole('img', { name: 'השוואת תוכנית 5-1 למודל הנקי' })).toBeVisible();
    expect(screen.getAllByTestId(/^source-overlay-wall-mass-/)).toHaveLength(48);
    expect(screen.getByLabelText('שקיפות שכבת המודל')).toBeVisible();
  });

  it('adds, edits, saves, restores, and resets a wardrobe placement', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    const view = render(<PlannerApp />);

    fireEvent.click(screen.getByRole('button', { name: /התחל לתכנן/ }));
    fireEvent.click(screen.getByTestId('room-select-bedroom'));
    fireEvent.click(screen.getByTestId('wall-select-bed-e'));
    fireEvent.click(screen.getByRole('button', { name: /הוסף ארון/ }));
    fireEvent.change(await screen.findByLabelText(/רוחב/), { target: { value: '200' } });
    fireEvent.click(screen.getByRole('button', { name: 'שמור תכנון' }));

    expect(screen.getByRole('status')).toHaveTextContent('נשמר');
    expect(window.localStorage.getItem('tiferet:design:5-1')).toContain('"width":2000');

    view.unmount();
    render(<PlannerApp />);
    fireEvent.click(screen.getByRole('button', { name: /התחל לתכנן/ }));
    expect(screen.getByText('ארון אחד בתכנון')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'אפס תכנון' }));
    expect(screen.getByText('0 ארונות בתכנון')).toBeInTheDocument();
    expect(window.localStorage.getItem('tiferet:design:5-1')).toBeNull();
  });

  it('שומר כמה גרסאות בשם ומציג אותן בספריית התכנון', () => {
    render(<PlannerApp initialStarted initialRoomId="bedroom" />);

    fireEvent.click(screen.getByRole('button', { name: 'גרסאות ושיתוף' }));
    fireEvent.change(screen.getByLabelText('שם הגרסה'), { target: { value: 'חלופה חמה' } });
    fireEvent.click(screen.getByRole('button', { name: 'שמור כגרסה חדשה' }));

    expect(screen.getByText('חלופה חמה')).toBeVisible();
    expect(window.localStorage.getItem('tiferet:design-library:tiferet-techelet-5-1')).toContain('חלופה חמה');

    fireEvent.change(screen.getByLabelText('שם הגרסה'), { target: { value: 'חלופה בהירה' } });
    fireEvent.click(screen.getByRole('button', { name: 'שמור כגרסה חדשה' }));

    expect(screen.getByText('חלופה בהירה')).toBeVisible();
    expect(screen.getAllByRole('button', { name: /טען גרסה/ })).toHaveLength(2);
    expect(screen.getByRole('button', { name: 'ייצוא גרסה פעילה ל‑JSON' })).toBeEnabled();
    expect(screen.getByLabelText('ייבוא תכנון JSON')).toHaveAttribute('accept', 'application/json,.json');
  });

  it('מציע ייבוא PDF אדריכלי ומציג תקציר ראיות לאחר בחירת קובץ', async () => {
    render(<PlannerApp initialStarted initialRoomId="bedroom" />);

    fireEvent.click(screen.getByRole('button', { name: 'גרסאות ושיתוף' }));

    const pdfImport = screen.getByLabelText('ייבוא PDF אדריכלי');
    expect(pdfImport).toHaveAttribute('accept', 'application/pdf,.pdf');

    const pdf = new File(
      [
        `%PDF-1.7
1 0 obj << /Type /Page /Contents 2 0 R >> endobj
2 0 obj << /Length 64 >>
stream
0 0 m 200 0 l 200 100 l 0 100 l h S
BT (חדר 300/250) Tj ET
endstream
endobj
%%EOF`,
      ],
      'apartment.pdf',
      { type: 'application/pdf' },
    );
    fireEvent.change(pdfImport, { target: { files: [pdf] } });

    expect(await screen.findByText('טיוטת ייבוא מוכנה')).toBeVisible();
    expect(screen.getByText('apartment.pdf')).toBeVisible();
    expect(screen.getByText(/קווי וקטור/)).toBeVisible();
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
