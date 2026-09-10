import { triggerDownload } from '../../utils/download';
import { useState } from 'react';
import { DiamondMark } from '../components/DiamondMark';

export function ContactPage() {
  const [notice, setNotice] = useState('');
  return (
    <div className="ng-page">
      <div className="ng-page-hero">
        <p className="ng-eyebrow">
          <DiamondMark /> יצירת קשר
        </p>
        <h1>בואו נדבר על הבית שלכם</h1>
        <p>מלאו את הפרטים והורידו בקשה שאפשר להעביר לאיש המקצוע שלכם. הפרטים נשארים אצלכם ואינם נשלחים מהאתר.</p>
      </div>
      <section className="ng-contact-layout">
        <form
          onSubmit={(event) => {
            event.preventDefault();
            const fields = new FormData(event.currentTarget);
            const id = crypto.randomUUID();
            const text = [
              'בקשת תכנון נגרות',
              `מספר בקשה: ${id}`,
              `תאריך: ${new Date().toISOString()}`,
              ...Array.from(fields.entries(), ([key, value]) => `${key}: ${String(value)}`),
            ].join('\n');
            triggerDownload(text, 'text/plain;charset=utf-8', `carpentry-request-${id}.txt`);
            setNotice('הבקשה מוכנה להורדה. העבירו את הקובץ לאיש המקצוע; הבקשה לא נשלחה מהאתר.');
          }}
        >
          <label>
            שם מלא
            <input name="name" autoComplete="name" maxLength={200} required />
          </label>
          <label>
            טלפון
            <input name="phone" type="tel" autoComplete="tel" required />
          </label>
          <label>
            דוא״ל
            <input name="email" type="email" autoComplete="email" />
          </label>
          <label>
            דירה / דגם
            <input name="apartment" placeholder="בניין, קומה ודירה — אם ידועים" />
          </label>
          <label className="is-wide">
            איך נוכל לעזור?
            <textarea name="message" rows={5} maxLength={10000} required />
          </label>
          <button type="submit" className="ng-button">
            הורדת בקשת תכנון
          </button>
          {notice ? (
            <p role="status" className="ng-form-notice">
              {notice}
            </p>
          ) : null}
        </form>
        <aside>
          <p className="ng-eyebrow">
            <DiamondMark /> לפני ששולחים
          </p>
          <h2>מה כדאי לציין?</h2>
          <ul>
            <li>החלל שתרצו לתכנן</li>
            <li>סוג הנגרות המבוקש</li>
            <li>העדפות חומר וגוון</li>
            <li>מועד קבלת הדירה, אם ידוע</li>
          </ul>
          <p className="ng-data-note">לא מוצגים טלפון, כתובת או שעות פעילות עד לקבלת פרטים עסקיים מאומתים.</p>
        </aside>
      </section>
    </div>
  );
}
