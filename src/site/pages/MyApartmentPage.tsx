import { ApartmentThumbnail } from '../../apartment/components/ApartmentThumbnail';
import type { Apartment } from '../../apartment/types';
import { apartmentSourceLabel } from '../../apartment/source/display';
import { TIFERET_5_1 } from '../../apartment/data/tiferet';
import type { NavigateSite } from '../types';
import { DiamondMark } from '../components/DiamondMark';
import { SiteLink } from '../components/SiteLink';

export function MyApartmentPage({
  navigate,
  apartment = TIFERET_5_1,
}: {
  navigate: NavigateSite;
  apartment?: Apartment;
}) {
  return (
    <div className="ng-page">
      <div className="ng-page-hero">
        <p className="ng-eyebrow">
          <DiamondMark /> {apartmentSourceLabel(apartment)}
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
          <ApartmentThumbnail apartment={apartment} />
        </div>
        <aside className="ng-room-index">
          <div className="ng-room-index__header">
            <p>חללים בדירה</p>
            <span>{apartment.rooms.length} חללים מזוהים</span>
          </div>
          <ol>
            {apartment.rooms.map((room, index) => (
              <li key={room.id}>
                <SiteLink route={{ id: 'design', roomId: room.id, apartmentId: apartment.id }} navigate={navigate}>
                  <span>{String(index + 1).padStart(2, '0')}</span>
                  <strong>{room.name}</strong>
                  <i aria-hidden="true">←</i>
                </SiteLink>
              </li>
            ))}
          </ol>
          <SiteLink
            route={{ id: 'summary', apartmentId: apartment.id }}
            navigate={navigate}
            className="ng-button ng-button--outline"
          >
            לסיכום התכנון
          </SiteLink>
        </aside>
      </section>
    </div>
  );
}
