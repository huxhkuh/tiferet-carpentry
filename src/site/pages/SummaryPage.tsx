import { useMemo } from 'react';
import { ApartmentThumbnail } from '../../apartment/components/ApartmentThumbnail';
import { TIFERET_5_1 } from '../../apartment/data/tiferet';
import { restoreDesign } from '../../apartment/persistence/design';
import type { NavigateSite } from '../types';
import { DiamondMark } from '../components/DiamondMark';
import { SiteLink } from '../components/SiteLink';

const STORAGE_KEY = 'tiferet:design:5-1';

export function SummaryPage({ navigate }: { navigate: NavigateSite }) {
  const savedDesign = useMemo(
    () => (typeof localStorage === 'undefined' ? null : restoreDesign(localStorage, STORAGE_KEY, TIFERET_5_1.id)),
    [],
  );
  const placements = savedDesign?.placements ?? [];

  return (
    <div className="ng-page ng-spec-page">
      <div className="ng-page-hero">
        <p className="ng-eyebrow">
          <DiamondMark /> מפרט תכנוני
        </p>
        <h1>סיכום התכנון</h1>
        <p>דירה 5‑1 • תכלת • קומה 5</p>
      </div>
      <section className="ng-spec-sheet">
        <div className="ng-spec-sheet__plan">
          <ApartmentThumbnail apartment={TIFERET_5_1} />
        </div>
        <div className="ng-spec-sheet__details">
          <div className="ng-spec-number">TIF–5‑1</div>
          <h2>{placements.length ? `${placements.length} פריטי נגרות בתכנון` : 'עדיין לא נשמרו פריטי נגרות'}</h2>
          {placements.length ? (
            <ol className="ng-spec-list">
              {placements.map((placement, index) => {
                const room = TIFERET_5_1.rooms.find((item) => item.id === placement.roomId);
                return (
                  <li key={placement.id}>
                    <span>{String(index + 1).padStart(2, '0')}</span>
                    <div>
                      <strong>{room?.name ?? 'חלל'}</strong>
                      <p>
                        {placement.width / 10} × {placement.height / 10} × {placement.depth / 10} ס״מ
                      </p>
                    </div>
                  </li>
                );
              })}
            </ol>
          ) : (
            <p className="ng-empty-copy">היכנסו לדירה, בחרו חדר וקיר, הוסיפו ארון ושמרו את התכנון.</p>
          )}
          <div className="ng-price-placeholder">
            <span>מחיר משוער</span>
            <strong>יתווסף לאחר מדידה ומפרט מאושר</strong>
          </div>
          <div className="ng-spec-actions">
            <SiteLink route={{ id: 'my-apartment' }} navigate={navigate} className="ng-button">
              חזרה לתכנון
            </SiteLink>
            <SiteLink route={{ id: 'contact' }} navigate={navigate} className="ng-button ng-button--outline">
              בקשת ייעוץ
            </SiteLink>
          </div>
        </div>
      </section>
      <p className="ng-measurement-disclaimer">
        לפני ייצור או הזמנה יש לבצע מדידה מקצועית בדירה בפועל. הסיכום אינו הצעת מחיר מחייבת.
      </p>
    </div>
  );
}
