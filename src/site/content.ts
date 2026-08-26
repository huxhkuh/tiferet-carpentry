import type { StaticSiteRouteId } from './router';

export interface SiteNavItem {
  label: string;
  routeId: Exclude<StaticSiteRouteId, 'not-found'>;
}

export const SITE_NAV_ITEMS: readonly SiteNavItem[] = [
  { label: 'דף הבית', routeId: 'home' },
  { label: 'הדירה שלי', routeId: 'my-apartment' },
  { label: 'פרויקטים', routeId: 'inspiration' },
  { label: 'תהליך העבודה', routeId: 'process' },
  { label: 'חומרים', routeId: 'materials' },
  { label: 'אודות', routeId: 'about' },
  { label: 'צור קשר', routeId: 'contact' },
];

export const PROCESS_STEPS = [
  { number: '01', title: 'בוחרים דירה', text: 'מזהים את הבניין, הקומה והדירה מתוך פרויקט תפארת.' },
  { number: '02', title: 'בוחרים חלל', text: 'נכנסים לחדר ומסמנים את הקיר שעליו תתוכנן הנגרות.' },
  { number: '03', title: 'מעצבים נגרות', text: 'משנים מידות, חלוקה, חזיתות, חומר, גוון וידיות.' },
  { number: '04', title: 'שומרים ומסכמים', text: 'שומרים את התכנון ומכינים מפרט להמשך מדידה מקצועית.' },
] as const;

export const SPACE_CATEGORIES = [
  { id: 'kitchen', title: 'מטבחים', text: 'מערכי אחסון ועבודה המתוכננים לפי חלל המטבח.', variant: 'kitchen' },
  { id: 'wardrobe', title: 'חדרי ארונות', text: 'חלוקה פנימית מדויקת לבגדים, מגירות ותלייה.', variant: 'wardrobe' },
  {
    id: 'bedroom',
    title: 'ארונות חדרי שינה',
    text: 'פתרונות שקטים בגובה מלא, בהתאמה לקיר ולפתחים.',
    variant: 'closet',
  },
  { id: 'children', title: 'חדרי ילדים', text: 'אחסון, שולחן וספרייה בתוך מערכת אחת גמישה.', variant: 'children' },
  { id: 'media', title: 'יחידות מדיה', text: 'חזית נקייה, מעבר תשתיות ואחסון נגיש.', variant: 'media' },
  { id: 'niches', title: 'אחסון ונישות', text: 'ניצול מקומות מורכבים באמצעות נגרות מותאמת.', variant: 'niche' },
] as const;

export const MATERIAL_LIBRARY = [
  { name: 'אגוז אמריקאי', detail: 'פורניר טבעי', color: '#6b4e3d', grain: true },
  { name: 'אלון בהיר', detail: 'פורניר בגמר מט', color: '#b79a76', grain: true },
  { name: 'לבן אבן', detail: 'חזית צבועה', color: '#e6e0d7', grain: false },
  { name: 'פחם רך', detail: 'חזית צבועה', color: '#343432', grain: false },
  { name: 'זכוכית מעושנת', detail: 'מסגרת מתכת', color: '#77746f', grain: false },
  { name: 'אבן חמה', detail: 'משטח עבודה', color: '#c8bcae', grain: false },
] as const;

export const FULL_PROCESS_STEPS = [
  ...PROCESS_STEPS,
  { number: '05', title: 'מדידה והצעה', text: 'איש מקצוע מאמת את המידות בדירה בפועל לפני הצעה מחייבת.' },
  { number: '06', title: 'ייצור', text: 'המפרט המאושר עובר לתכנון ייצור, חיתוך והרכבה.' },
  { number: '07', title: 'התקנה', text: 'הנגרות מותקנת בדירה ומותאמת לתנאי השטח הסופיים.' },
] as const;
