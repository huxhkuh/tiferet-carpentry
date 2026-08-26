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
        <p>השאירו פרטים לתיעוד מקומי של הבקשה. חיבור לשירות שליחה יתווסף רק לאחר שיוגדר ערוץ עסקי מאושר.</p>
      </div>
      <section className="ng-contact-layout">
        <form
          onSubmit={(event) => {
            event.preventDefault();
            setNotice('הטופס הושלם במכשיר זה, אך טרם מחובר לשירות שליחה.');
          }}
        >
          <label>
            שם מלא
            <input name="name" autoComplete="name" required />
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
            <input name="apartment" defaultValue="תכלת • קומה 5 • דירה 5‑1" />
          </label>
          <label className="is-wide">
            איך נוכל לעזור?
            <textarea name="message" rows={5} required />
          </label>
          <button type="submit" className="ng-button">
            בדיקת פרטי הבקשה
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
