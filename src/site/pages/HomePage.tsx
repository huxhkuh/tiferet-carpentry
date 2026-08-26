import type { CSSProperties } from 'react';
import { TIFERET_5_1 } from '../../apartment/data/tiferet';
import { ApartmentThumbnail } from '../../apartment/components/ApartmentThumbnail';
import { MATERIAL_LIBRARY, PROCESS_STEPS, SPACE_CATEGORIES } from '../content';
import type { NavigateSite } from '../types';
import { CabinetArtwork, HeroCabinetScene, WardrobeElevation } from '../components/CabinetArtwork';
import { DiamondMark } from '../components/DiamondMark';
import { SectionHeading } from '../components/SectionHeading';
import { SiteLink } from '../components/SiteLink';

export function HomePage({ navigate }: { navigate: NavigateSite }) {
  return (
    <>
      <section className="ng-hero" aria-labelledby="home-hero-title">
        <div className="ng-hero__visual">
          <HeroCabinetScene />
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
        {[
          ['שירות אישי', 'ליווי מסודר לאורך כל התהליך'],
          ['ייצור מדויק', 'מידות וחלוקה לפי החלל'],
          ['תכנון קפדני', 'חשיבה על כל פרט ושימוש'],
          ['חומרים מובחרים', 'מבחר גוונים וגימורים'],
        ].map(([title, text], index) => (
          <article key={title}>
            <span className="ng-value-icon" aria-hidden="true">
              {String(index + 1).padStart(2, '0')}
            </span>
            <div>
              <h2>{title}</h2>
              <p>{text}</p>
            </div>
          </article>
        ))}
      </section>

      <section className="ng-section ng-apartment-intro">
        <div className="ng-apartment-intro__copy">
          <SectionHeading eyebrow="מתוכנן לפרויקט" title="הבית כבר מתוכנן. עכשיו מתכננים את הנגרות שמתאימה לו.">
            <p>המערכת מכירה את דירה 5‑1, את החדרים, הקירות והמידות מתוך תכנית המכר הרשמית.</p>
          </SectionHeading>
          <ul className="ng-quiet-list">
            <li>בחירת חדר וקיר מתוך התכנית</li>
            <li>הצבת ארון בקנה מידה</li>
            <li>עריכת מידות, חזיתות, חומר וידיות</li>
            <li>תצוגה נקייה, מקור מלא והדמיית 3D</li>
          </ul>
          <SiteLink route={{ id: 'apartments' }} navigate={navigate} className="ng-button">
            בחרו את הדירה שלכם
          </SiteLink>
        </div>
        <div className="ng-plan-frame">
          <div className="ng-plan-frame__meta">
            <span>תכלת</span>
            <span>קומה 5</span>
            <span>דירה 5‑1</span>
          </div>
          <ApartmentThumbnail apartment={TIFERET_5_1} />
          <div className="ng-plan-frame__scale">קנ״מ תכנוני • מידות בס״מ</div>
        </div>
      </section>

      <section className="ng-section ng-process-preview">
        <SectionHeading eyebrow="תהליך העבודה" title="ארבעה צעדים מתכנית לדירה">
          <p>מסלול ברור שמחבר בין נתוני הדירה לבין החלטות הנגרות.</p>
        </SectionHeading>
        <ol className="ng-process-line">
          {PROCESS_STEPS.map((step) => (
            <li key={step.number}>
              <span>{step.number}</span>
              <DiamondMark />
              <h3>{step.title}</h3>
              <p>{step.text}</p>
            </li>
          ))}
        </ol>
        <SiteLink route={{ id: 'process' }} navigate={navigate} className="ng-text-link">
          לכל שלבי התהליך <span aria-hidden="true">←</span>
        </SiteLink>
      </section>

      <section className="ng-section ng-spaces">
        <SectionHeading eyebrow="חללים ופתרונות" title="נגרות שנולדת מתוך השימוש">
          <p>כל מערכת מתחילה במה שהחדר צריך לעשות, ורק אחר כך מקבלת חומר, חלוקה ואופי.</p>
        </SectionHeading>
        <div className="ng-spaces-grid">
          {SPACE_CATEGORIES.map((space, index) => (
            <article key={space.id} className={index === 0 || index === 3 ? 'is-wide' : ''}>
              <CabinetArtwork variant={space.variant} />
              <div>
                <p className="ng-index">{String(index + 1).padStart(2, '0')}</p>
                <h3>{space.title}</h3>
                <p>{space.text}</p>
                <SiteLink route={{ id: 'inspiration' }} navigate={navigate} className="ng-text-link">
                  לפרויקטים <span aria-hidden="true">←</span>
                </SiteLink>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="ng-material-showcase">
        <div className="ng-material-showcase__art">
          <WardrobeElevation />
        </div>
        <div className="ng-material-showcase__copy">
          <SectionHeading eyebrow="חומר וגימור" title="פלטה שקטה. חומר שמרגישים.">
            <p>אגוז, אלון, חזיתות צבועות, זכוכית ואבן—במערכת צבעים חמה ומדויקת.</p>
          </SectionHeading>
          <div className="ng-material-swatches">
            {MATERIAL_LIBRARY.map((material) => (
              <div key={material.name}>
                <span
                  style={{ '--material-color': material.color } as CSSProperties}
                  className={material.grain ? 'has-grain' : ''}
                />
                <strong>{material.name}</strong>
                <small>{material.detail}</small>
              </div>
            ))}
          </div>
          <SiteLink route={{ id: 'materials' }} navigate={navigate} className="ng-button ng-button--outline">
            לספריית החומרים
          </SiteLink>
        </div>
      </section>

      <section className="ng-precision-section">
        <p className="ng-eyebrow">
          <DiamondMark light /> נגרות בהתאמה לדירה
        </p>
        <h2>
          דיוק.
          <br />
          חומר.
          <br />
          תכנון.
        </h2>
        <div className="ng-precision-section__copy">
          <p>השרטוט וההדמיה עוזרים לקבל החלטות מוקדם, להבין את הפרופורציות ולשמור על מפרט עקבי.</p>
          <p>לפני ייצור, כל תכנון עובר מדידה מקצועית והתאמה לתנאי הדירה בפועל.</p>
        </div>
      </section>

      <section className="ng-final-cta">
        <DiamondMark />
        <h2>
          הבית שלכם כבר בתכנון.
          <br />
          עכשיו תכננו את הנגרות.
        </h2>
        <SiteLink route={{ id: 'apartments' }} navigate={navigate} className="ng-button">
          להתחלת תכנון
        </SiteLink>
      </section>
    </>
  );
}
