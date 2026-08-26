import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../src/apartment/PlannerApp', () => ({
  PlannerApp: ({ initialRoomId }: { initialRoomId?: string | null }) => (
    <section aria-label="מתכנן הנגרות הקיים" data-room={initialRoomId ?? ''} />
  ),
}));

import { TiferetSite } from '../../src/site/TiferetSite';

afterEach(() => {
  window.history.replaceState({}, '', '/');
});

describe('Tiferet carpentry website', () => {
  it('presents the premium Hebrew homepage with primary navigation and planning CTA', () => {
    window.history.replaceState({}, '', '/tiferet-carpentry/');
    render(<TiferetSite onOpenWorkshop={vi.fn()} />);

    expect(screen.getByRole('banner')).toBeInTheDocument();
    expect(screen.getByRole('img', { name: 'נגרות — תפארת' })).toBeInTheDocument();
    expect(screen.getByRole('navigation', { name: 'ניווט ראשי' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'נגרות מדויקת. בתים מעוררי השראה.' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'התחילו לתכנן' })).toBeInTheDocument();
    expect(screen.getByText('הבית כבר מתוכנן. עכשיו מתכננים את הנגרות שמתאימה לו.')).toBeInTheDocument();
  });

  it('navigates to apartment selection without reloading the SPA', async () => {
    const user = userEvent.setup();
    window.history.replaceState({}, '', '/tiferet-carpentry/');
    render(<TiferetSite onOpenWorkshop={vi.fn()} />);

    await user.click(screen.getByRole('link', { name: 'התחילו לתכנן' }));

    expect(window.location.pathname).toBe('/tiferet-carpentry/apartments');
    expect(screen.getByRole('heading', { name: 'בחרו את דירת תפארת שלכם' })).toBeInTheDocument();
  });

  it.each([
    ['/tiferet-carpentry/apartments', 'בחרו את דירת תפארת שלכם'],
    ['/tiferet-carpentry/my-apartment', 'הדירה שלכם, במרכז התכנון'],
    ['/tiferet-carpentry/summary', 'סיכום התכנון'],
    ['/tiferet-carpentry/inspiration', 'גלריית נגרות והשראה'],
    ['/tiferet-carpentry/materials', 'ספריית החומרים'],
    ['/tiferet-carpentry/process', 'מהדירה ועד ההתקנה'],
    ['/tiferet-carpentry/about', 'נגרות שתוכננה לתפארת'],
    ['/tiferet-carpentry/contact', 'בואו נדבר על הבית שלכם'],
  ])('renders the page for %s', (path, heading) => {
    window.history.replaceState({}, '', path);
    render(<TiferetSite onOpenWorkshop={vi.fn()} />);
    expect(screen.getByRole('heading', { name: heading })).toBeInTheDocument();
  });

  it('opens the existing planner for the room encoded in the URL', () => {
    window.history.replaceState({}, '', '/tiferet-carpentry/design/bedroom');
    render(<TiferetSite onOpenWorkshop={vi.fn()} />);
    expect(screen.getByRole('region', { name: 'מתכנן הנגרות הקיים' })).toHaveAttribute('data-room', 'bedroom');
  });

  it('offers an accessible mobile navigation panel', async () => {
    const user = userEvent.setup();
    window.history.replaceState({}, '', '/tiferet-carpentry/');
    render(<TiferetSite onOpenWorkshop={vi.fn()} />);

    await user.click(screen.getByRole('button', { name: 'פתיחת תפריט' }));

    expect(screen.getByRole('dialog', { name: 'תפריט האתר' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'סגירת תפריט' })).toBeInTheDocument();
  });

  it('keeps the professional WoodworkingShop entry point available', async () => {
    const onOpenWorkshop = vi.fn();
    const user = userEvent.setup();
    window.history.replaceState({}, '', '/tiferet-carpentry/');
    render(<TiferetSite onOpenWorkshop={onOpenWorkshop} />);

    await user.click(screen.getByRole('button', { name: 'כניסה לנגרייה המקצועית' }));
    expect(onOpenWorkshop).toHaveBeenCalledOnce();
  });
});
