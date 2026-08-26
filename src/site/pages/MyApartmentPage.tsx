import { ApartmentThumbnail } from '../../apartment/components/ApartmentThumbnail';
import { TIFERET_5_1 } from '../../apartment/data/tiferet';
import type { NavigateSite } from '../types';
import { DiamondMark } from '../components/DiamondMark';
import { SiteLink } from '../components/SiteLink';

export function MyApartmentPage({ navigate }: { navigate: NavigateSite }) {
  return (
    <div className="ng-page">
      <div className="ng-page-hero">
        <p className="ng-eyebrow">
          <DiamondMark /> תכלת • קומה 5 • דירה 5‑1
        </p>
        <h1>הדירה שלכם, במרכז התכנון</h1>
        <p>בחרו חלל כדי להיכנס לתצוגה ממוקדת ולתכנן את הנגרות על גבי הקירות הידועים.</p>
      </div>
      <section className="ng-my-apartment">
        <div className="ng-my-apartment__plan">
          <div className="ng-plan-toolbar">
            <span>תכנית נקייה</span>
            <span>מידות במודל: מ״מ</span>
          </div>
          <ApartmentThumbnail apartment={TIFERET_5_1} />
        </div>
        <aside className="ng-room-index">
          <div className="ng-room-index__header">
            <p>חללים בדירה</p>
            <span>{TIFERET_5_1.rooms.length} חללים מזוהים</span>
          </div>
          <ol>
            {TIFERET_5_1.rooms.map((room, index) => (
              <li key={room.id}>
                <SiteLink route={{ id: 'design', roomId: room.id }} navigate={navigate}>
                  <span>{String(index + 1).padStart(2, '0')}</span>
                  <strong>{room.name}</strong>
                  <i aria-hidden="true">←</i>
                </SiteLink>
              </li>
            ))}
          </ol>
          <SiteLink route={{ id: 'summary' }} navigate={navigate} className="ng-button ng-button--outline">
            לסיכום התכנון
          </SiteLink>
        </aside>
      </section>
    </div>
  );
}
