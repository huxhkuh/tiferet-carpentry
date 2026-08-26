import { useState } from 'react';
import { ApartmentThumbnail } from '../../apartment/components/ApartmentThumbnail';
import { TIFERET_5_1, TIFERET_PROJECT } from '../../apartment/data/tiferet';
import type { NavigateSite } from '../types';
import { DiamondMark } from '../components/DiamondMark';
import { SiteLink } from '../components/SiteLink';

export function ApartmentsPage({ navigate }: { navigate: NavigateSite }) {
  const building = TIFERET_PROJECT.buildings[0];
  const floor = building?.floors[0];
  const [selectedApartmentId, setSelectedApartmentId] = useState(TIFERET_5_1.id);

  return (
    <div className="ng-page">
      <div className="ng-page-hero ng-page-hero--plan">
        <p className="ng-eyebrow">
          <DiamondMark /> קטלוג דירות
        </p>
        <h1>בחרו את דירת תפארת שלכם</h1>
        <p>הבחירה מחברת את המתכנן לתכנית, לחדרים ולקירות המדויקים של הדירה.</p>
      </div>
      <section className="ng-apartment-catalog" aria-label="בחירת דירה">
        <div className="ng-selection-strip">
          <label htmlFor="ng-site-building">
            מתחם / בניין
            <select id="ng-site-building" value={building?.id ?? ''} disabled>
              <option value={building?.id}>{building?.name}</option>
            </select>
          </label>
          <label htmlFor="ng-site-floor">
            קומה
            <select id="ng-site-floor" value={String(floor?.number ?? '')} disabled>
              <option value={floor?.number}>קומה {floor?.number}</option>
            </select>
          </label>
          <label htmlFor="ng-site-apartment">
            דירה
            <select
              id="ng-site-apartment"
              value={selectedApartmentId}
              onChange={(event) => setSelectedApartmentId(event.target.value)}
            >
              {floor?.apartments.map((apartment) => (
                <option key={apartment.id} value={apartment.id}>
                  {apartment.name}
                </option>
              ))}
            </select>
          </label>
        </div>
        <article className="ng-apartment-card is-selected">
          <div className="ng-apartment-card__plan">
            <ApartmentThumbnail apartment={TIFERET_5_1} />
          </div>
          <div className="ng-apartment-card__details">
            <p className="ng-eyebrow">
              <DiamondMark /> תכלת • קומה 5
            </p>
            <h2>דירה 5‑1</h2>
            <p className="ng-apartment-type">טיפוס שני • 4 חדרים</p>
            <dl>
              <div>
                <dt>מקור</dt>
                <dd>תכנית מכר רשמית</dd>
              </div>
              <div>
                <dt>חדרים מזוהים</dt>
                <dd>{TIFERET_5_1.rooms.length}</dd>
              </div>
              <div>
                <dt>תצוגות</dt>
                <dd>נקייה, מקור ו‑3D</dd>
              </div>
            </dl>
            <SiteLink route={{ id: 'my-apartment' }} navigate={navigate} className="ng-button">
              בחרו דירה
            </SiteLink>
          </div>
        </article>
        <p className="ng-data-note">דגמי דירות נוספים יוצגו כאן רק לאחר קליטת תכניות המקור ואימות המידות.</p>
      </section>
    </div>
  );
}
