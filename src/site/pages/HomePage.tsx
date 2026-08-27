import { lazy, Suspense } from 'react';
import type { NavigateSite } from '../types';
import { BrandServiceIcon } from '../components/BrandServiceIcon';
import { DiamondMark } from '../components/DiamondMark';
import { EditorialImage } from '../components/EditorialImage';
import { SiteLink } from '../components/SiteLink';

const HomeDetails = lazy(() => import('./HomeDetails').then((module) => ({ default: module.HomeDetails })));

export function HomePage({ navigate }: { navigate: NavigateSite }) {
  const serviceValues = [
    { icon: 'consultation', title: 'שירות אישי', text: 'ליווי מסודר לאורך כל התהליך' },
    { icon: 'craft', title: 'ייצור מדויק', text: 'מידות וחלוקה לפי החלל' },
    { icon: 'planning', title: 'תכנון קפדני', text: 'חשיבה על כל פרט ושימוש' },
    { icon: 'materials', title: 'חומרים מובחרים', text: 'מבחר גוונים וגימורים' },
  ] as const;
  return (
    <>
      <section className="ng-hero" aria-labelledby="home-hero-title">
        <div className="ng-hero__visual">
          <EditorialImage
            src="hero-bedroom-cabinetry.jpg"
            alt="נגרות קיר מותאמת בחדר שינה מואר"
            className="ng-hero-photo"
            testId="home-hero-image"
            eager
          />
          <div className="ng-hero__image-note" aria-hidden="true">
            <span>פרט נגרות / 01</span>
            <span>תכנון בהתאמה אישית</span>
          </div>
          <div className="ng-hero__measure" aria-hidden="true">
            <span>340</span>
            <i />
            <span>260</span>
          </div>
        </div>
        <div className="ng-hero__copy">
          <p className="ng-eyebrow">
            <DiamondMark light /> נגרות לבתי תפארת
          </p>
          <h1 id="home-hero-title" aria-label="נגרות מדויקת. בתים מעוררי השראה.">
            נגרות מדויקת.
            <br />
            בתים מעוררי השראה.
          </h1>
          <p>פתרונות נגרות בהתאמה אישית, משלב התכנון ועד הביצוע—מחוברים למידות הדירה, לפונקציה ולשפה שלכם.</p>
          <div className="ng-hero__actions">
            <SiteLink route={{ id: 'apartments' }} navigate={navigate} className="ng-button ng-button--light">
              התחילו לתכנן
            </SiteLink>
            <SiteLink route={{ id: 'inspiration' }} navigate={navigate} className="ng-text-link ng-text-link--light">
              גלו את האפשרויות <span aria-hidden="true">←</span>
            </SiteLink>
          </div>
        </div>
      </section>

      <section className="ng-value-strip" aria-label="עקרונות השירות">
        {serviceValues.map((value) => (
          <article key={value.title}>
            <span className="ng-value-icon">
              <BrandServiceIcon kind={value.icon} />
            </span>
            <div>
              <h2>{value.title}</h2>
              <p>{value.text}</p>
            </div>
          </article>
        ))}
      </section>

      <Suspense fallback={<div className="ng-home-details-loading" aria-busy="true" />}>
        <HomeDetails navigate={navigate} />
      </Suspense>
    </>
  );
}
