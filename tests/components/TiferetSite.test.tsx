import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';

vi.mock('../../src/apartment/PlannerApp', () => ({
  PlannerApp: ({ initialRoomId }: { initialRoomId?: string | null }) => (
    <section aria-label="מתכנן הנגרות הקיים" data-room={initialRoomId ?? ''} />
  ),
}));

import { TiferetSite } from '../../src/site/TiferetSite';

beforeAll(async () => {
  await Promise.all([
    import('../../src/site/pages/ApartmentsPage'),
    import('../../src/site/pages/ContactPage'),
    import('../../src/site/pages/EditorialPages'),
    import('../../src/site/pages/HomeDetails'),
    import('../../src/site/pages/MyApartmentPage'),
    import('../../src/site/pages/NotFoundPage'),
    import('../../src/site/pages/SummaryPage'),
  ]);
});

afterEach(() => {
  window.history.replaceState({}, '', '/');
});

describe('Tiferet carpentry website', () => {
  it('presents the premium Hebrew homepage with primary navigation and planning CTA', async () => {
    window.history.replaceState({}, '', '/tiferet-carpentry/');
    render(<TiferetSite onOpenWorkshop={vi.fn()} />);

    expect(screen.getByRole('banner')).toBeInTheDocument();
    expect(screen.getByRole('img', { name: 'נגרות — תפארת' })).toBeInTheDocument();
    expect(screen.getByRole('navigation', { name: 'ניווט ראשי' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'נגרות מדויקת. בתים מעוררי השראה.' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'התחילו לתכנן' })).toBeInTheDocument();
    expect(await screen.findByText('הבית כבר מתוכנן. עכשיו מתכננים את הנגרות שמתאימה לו.')).toBeInTheDocument();
  });

  it('uses editorial photography instead of schematic artwork on the homepage', async () => {
    window.history.replaceState({}, '', '/tiferet-carpentry/');
    render(<TiferetSite onOpenWorkshop={vi.fn()} />);

    const hero = screen.getByRole('img', { name: 'נגרות קיר מותאמת בחדר שינה מואר' });
    expect(hero).toHaveAttribute('fetchpriority', 'high');
    expect(hero).toHaveAttribute('loading', 'eager');
    expect(hero).toHaveAttribute('width', '1800');
    expect(hero).toHaveAttribute('height', '1201');
    expect(hero.getAttribute('srcset')).toContain('hero-bedroom-cabinetry-720.jpg 720w');
    expect(hero.getAttribute('srcset')).toContain('hero-bedroom-cabinetry-1200.jpg 1200w');
    expect(screen.getByTestId('home-hero-image-webp-source')).toHaveAttribute(
      'srcset',
      expect.stringContaining('hero-bedroom-cabinetry-720.webp 720w'),
    );

    const spaceImages = await screen.findAllByTestId('space-editorial-image');
    expect(spaceImages).toHaveLength(6);
    expect(spaceImages.every((image) => image.getAttribute('loading') === 'lazy')).toBe(true);
  });

  it('presents the studio navigation context and architectural service icons', () => {
    window.history.replaceState({}, '', '/tiferet-carpentry/');
    render(<TiferetSite onOpenWorkshop={vi.fn()} />);

    expect(screen.getByText('סטודיו לנגרות מותאמת')).toBeInTheDocument();
    expect(screen.getByText('פרויקט תפארת · רמלה')).toBeInTheDocument();
    expect(screen.getAllByTestId('brand-service-icon')).toHaveLength(4);
  });

  it('navigates to apartment selection without reloading the SPA', async () => {
    const user = userEvent.setup();
    window.history.replaceState({}, '', '/tiferet-carpentry/');
    render(<TiferetSite onOpenWorkshop={vi.fn()} />);

    await user.click(screen.getByRole('link', { name: 'התחילו לתכנן' }));

    expect(window.location.pathname).toBe('/tiferet-carpentry/apartments');
    expect(
      await screen.findByRole('heading', { name: 'בחרו את דירת תפארת שלכם' }, { timeout: 5000 }),
    ).toBeInTheDocument();
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
  ])('renders the page for %s', async (path, heading) => {
    window.history.replaceState({}, '', path);
    render(<TiferetSite onOpenWorkshop={vi.fn()} />);
    expect(await screen.findByRole('heading', { name: heading })).toBeInTheDocument();
  });

  it('shows the audited source inventory on the apartment selection page', async () => {
    window.history.replaceState({}, '', '/tiferet-carpentry/apartments');
    render(<TiferetSite onOpenWorkshop={vi.fn()} />);

    expect(await screen.findByText('179 קבצי PDF נסרקו')).toBeInTheDocument();
    expect(screen.getByText('99 תוכניות דירה אותרו')).toBeInTheDocument();
    expect(
      screen.getByText('דירה 23-א · גיליון 5-1 זמינה כמודל עבודה חלקי; היא עדיין אינה מסומנת כמאומתת'),
    ).toBeInTheDocument();
  });

  it('lets users browse every inventoried apartment source without presenting it as a clean model', async () => {
    const user = userEvent.setup();
    window.history.replaceState({}, '', '/tiferet-carpentry/apartments');
    render(<TiferetSite onOpenWorkshop={vi.fn()} />);

    await user.selectOptions(await screen.findByLabelText('מתחם / בניין'), 'argaman');
    await user.selectOptions(screen.getByLabelText('קומה'), '1');

    const sourcePlan = screen.getByLabelText('דירה');
    const sourceOptions = within(sourcePlan).getAllByRole('option');
    expect(sourceOptions.length).toBeGreaterThan(1);
    await user.selectOptions(sourcePlan, sourceOptions[0]!);

    expect(screen.getByText('מקור נקלט · מודל נקי טרם אומת')).toBeVisible();
    expect(screen.getByRole('link', { name: 'פתח תוכנית מקור' })).toHaveAttribute(
      'href',
      expect.stringMatching(/^https:\/\/drive\.google\.com\/file\/d\//),
    );
    expect(screen.getByText('PDF רשמי ב‑Google Drive')).toBeVisible();
    expect(screen.queryByTitle(/תוכנית מקור/)).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'בחרו דירה' })).not.toBeInTheDocument();
  });

  it('opens the existing planner for the room encoded in the URL', async () => {
    window.history.replaceState({}, '', '/tiferet-carpentry/design/bedroom');
    render(<TiferetSite onOpenWorkshop={vi.fn()} />);
    expect(await screen.findByRole('region', { name: 'מתכנן הנגרות הקיים' })).toHaveAttribute('data-room', 'bedroom');
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
