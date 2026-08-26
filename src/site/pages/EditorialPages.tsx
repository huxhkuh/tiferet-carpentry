import { useState, type CSSProperties } from 'react';
import { FULL_PROCESS_STEPS, MATERIAL_LIBRARY, SPACE_CATEGORIES } from '../content';
import type { NavigateSite } from '../types';
import { CabinetArtwork } from '../components/CabinetArtwork';
import { DiamondMark } from '../components/DiamondMark';
import { SectionHeading } from '../components/SectionHeading';
import { SiteLink } from '../components/SiteLink';

export function InspirationPage({ navigate }: { navigate: NavigateSite }) {
  const [filter, setFilter] = useState('הכול');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const filters = ['הכול', 'מטבחים', 'ארונות', 'חדרי ילדים', 'יחידות מדיה'];
  const selected = SPACE_CATEGORIES.find((item) => item.id === selectedId);

  return (
    <div className="ng-page">
      <div className="ng-page-hero">
        <p className="ng-eyebrow">
          <DiamondMark /> פרויקטים ורעיונות
        </p>
        <h1>גלריית נגרות והשראה</h1>
        <p>שש משפחות פתרון המדגימות את השפה החומרית והמערכתית של האתר.</p>
      </div>
      <section className="ng-gallery-section">
        <div className="ng-filter-row" role="group" aria-label="סינון גלריה">
          {filters.map((item) => (
            <button key={item} type="button" aria-pressed={filter === item} onClick={() => setFilter(item)}>
              {item}
            </button>
          ))}
        </div>
        <div className="ng-editorial-gallery">
          {SPACE_CATEGORIES.map((space, index) => (
            <button
              key={space.id}
              type="button"
              className={index === 0 || index === 4 ? 'is-large' : ''}
              onClick={() => setSelectedId(space.id)}
            >
              <CabinetArtwork variant={space.variant} />
              <span>
                <small>{String(index + 1).padStart(2, '0')}</small>
                <strong>{space.title}</strong>
                <i aria-hidden="true">↗</i>
              </span>
            </button>
          ))}
        </div>
      </section>
      {selected ? (
        <div className="ng-gallery-dialog" role="dialog" aria-modal="true" aria-label={selected.title}>
          <button type="button" aria-label="סגירת הפרויקט" onClick={() => setSelectedId(null)}>
            ×
          </button>
          <CabinetArtwork variant={selected.variant} />
          <div>
            <p className="ng-eyebrow">
              <DiamondMark /> השראה לחלל
            </p>
            <h2>{selected.title}</h2>
            <p>{selected.text}</p>
            <SiteLink route={{ id: 'apartments' }} navigate={navigate} className="ng-button">
              עצבו משהו דומה
            </SiteLink>
          </div>
        </div>
      ) : null}
    </div>
  );
}

export function MaterialsPage({ navigate }: { navigate: NavigateSite }) {
  return (
    <div className="ng-page">
      <div className="ng-page-hero ng-page-hero--material">
        <p className="ng-eyebrow">
          <DiamondMark /> דוגמאות וגימורים
        </p>
        <h1>ספריית החומרים</h1>
        <p>בחירה מצומצמת ומדויקת של עץ, חזיתות, אבן, זכוכית, פרזול ותאורה.</p>
      </div>
      <section className="ng-material-library">
        {MATERIAL_LIBRARY.map((material, index) => (
          <article key={material.name}>
            <div
              className={material.grain ? 'has-grain' : ''}
              style={{ '--material-color': material.color } as CSSProperties}
            >
              <span>{String(index + 1).padStart(2, '0')}</span>
            </div>
            <h2>{material.name}</h2>
            <p>{material.detail}</p>
          </article>
        ))}
      </section>
      <section className="ng-hardware-band">
        <SectionHeading eyebrow="הפרטים הקטנים" title="ידיות, פרזול ותאורה">
          <p>הדוגמאות באתר ממחישות שפה אפשרית. המפרט הסופי ייקבע בהתאם לזמינות, לשימוש ולתקציב.</p>
        </SectionHeading>
        <div className="ng-hardware-icons" aria-label="סוגי אבזור">
          {['ידית קווית', 'ידית כפתור', 'פתיחה אינטגרלית', 'מסילה שקטה', 'תאורת מדף'].map((item, index) => (
            <div key={item}>
              <span aria-hidden="true">{index + 1}</span>
              <strong>{item}</strong>
            </div>
          ))}
        </div>
        <SiteLink route={{ id: 'apartments' }} navigate={navigate} className="ng-button">
          התחילו לתכנן
        </SiteLink>
      </section>
    </div>
  );
}

export function ProcessPage({ navigate }: { navigate: NavigateSite }) {
  return (
    <div className="ng-page">
      <div className="ng-page-hero">
        <p className="ng-eyebrow">
          <DiamondMark /> תהליך מסודר
        </p>
        <h1>מהדירה ועד ההתקנה</h1>
        <p>התכנון הדיגיטלי הוא תחילת השיחה—המדידה, המפרט והייצור הופכים אותו לנגרות אמיתית.</p>
      </div>
      <section className="ng-process-page">
        <ol>
          {FULL_PROCESS_STEPS.map((step) => (
            <li key={step.number}>
              <span>{step.number}</span>
              <div>
                <h2>{step.title}</h2>
                <p>{step.text}</p>
              </div>
              <DiamondMark />
            </li>
          ))}
        </ol>
        <aside>
          <h2>נקודת הבקרה החשובה</h2>
          <p>תכנית המכר אינה תחליף למדידת שטח. לפני ייצור נבדקים פתחים, סטיות, חיפויים, פנלים ותשתיות.</p>
        </aside>
      </section>
      <section className="ng-final-cta">
        <h2>מוכנים להתחיל מהדירה שלכם?</h2>
        <SiteLink route={{ id: 'apartments' }} navigate={navigate} className="ng-button">
          לבחירת דירה
        </SiteLink>
      </section>
    </div>
  );
}

export function AboutPage({ navigate }: { navigate: NavigateSite }) {
  return (
    <div className="ng-page">
      <div className="ng-page-hero ng-page-hero--about">
        <p className="ng-eyebrow">
          <DiamondMark /> נגרות לבתי הפרויקט
        </p>
        <h1>נגרות שתוכננה לתפארת</h1>
        <p>פלטפורמת תכנון שמחברת בין תכנית הדירה, צורכי הבית והאפשרויות של נגרות מותאמת.</p>
      </div>
      <section className="ng-about-grid">
        <div>
          <p className="ng-large-quote">“מתחילים מהחלל האמיתי, לא מארון גנרי.”</p>
        </div>
        <div>
          <h2>הקשר לדירה</h2>
          <p>המערכת מכירה את החדרים והקירות של דגם 5‑1 ומאפשרת לתכנן על גבי המודל.</p>
        </div>
        <div>
          <h2>שפה חומרית</h2>
          <p>החלטות על חלוקה, חזיתות וגוון מוצגות בתוך הקשר מרחבי ולא כקטלוג מנותק.</p>
        </div>
        <div>
          <h2>מעבר נכון לייצור</h2>
          <p>התכנון נשמר כמפרט ראשוני. לפני התחייבות נדרשות מדידה מקצועית ובדיקת יצרן.</p>
        </div>
      </section>
      <section className="ng-final-cta">
        <h2>הכירו את הדירה שלכם מחדש.</h2>
        <SiteLink route={{ id: 'my-apartment' }} navigate={navigate} className="ng-button">
          לדירה שלי
        </SiteLink>
      </section>
    </div>
  );
}
