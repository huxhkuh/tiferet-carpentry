import { useMemo } from 'react';
import { ApartmentThumbnail } from '../../apartment/components/ApartmentThumbnail';
import { TIFERET_5_1 } from '../../apartment/data/tiferet';
import { restoreDesign } from '../../apartment/persistence/design';
import { apartmentSourceLabel } from '../../apartment/source/display';
import type { FurniturePalette } from '../../apartment/types';
import { MATERIALS } from '../../engine/materials';
import type { DoorStyle, FurnitureType, HandleStyle } from '../../engine/types';
import { DiamondMark } from '../components/DiamondMark';
import { SiteLink } from '../components/SiteLink';
import type { NavigateSite } from '../types';

const STORAGE_KEY = 'tiferet:design:5-1';

const FURNITURE_LABELS: Readonly<Record<FurnitureType, string>> = {
  cabinet: 'ארון אחסון',
  bookshelf: 'ספרייה',
  desk: 'שולחן נגרות',
  wardrobe: 'ארון בגדים',
  panel: 'חיפוי קיר',
};

const DOOR_LABELS: Readonly<Record<DoorStyle, string>> = {
  flat: 'דלת חלקה',
  shaker: 'דלת מסגרת',
  glass: 'דלת זכוכית',
  none: 'ללא דלתות',
};

const HANDLE_LABELS: Readonly<Record<HandleStyle, string>> = {
  bar: 'ידית קווית',
  knob: 'ידית כפתור',
  cup: 'ידית קונכייה',
  none: 'פתיחה ללא ידית',
};

const PALETTE_LABELS: Readonly<Record<FurniturePalette, string>> = {
  warm: 'חמה',
  light: 'בהירה',
  sage: 'מרווה',
};

function materialLabel(materialKey: string): string {
  return MATERIALS.find((material) => material.key === materialKey)?.name.he ?? materialKey;
}

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
        <p>{apartmentSourceLabel(TIFERET_5_1)} • תכלת • קומה 5</p>
      </div>
      <section className="ng-spec-sheet">
        <div className="ng-spec-sheet__plan">
          <ApartmentThumbnail apartment={TIFERET_5_1} />
        </div>
        <div className="ng-spec-sheet__details">
          <div className="ng-spec-number">TIF–5‑1</div>
          {savedDesign && <p className="ng-eyebrow">{savedDesign.name}</p>}
          <h2>{placements.length ? `${placements.length} פריטי נגרות בתכנון` : 'עדיין לא נשמרו פריטי נגרות'}</h2>
          {savedDesign && <p className="ng-spec-palette">ערכת ריהוט {PALETTE_LABELS[savedDesign.furniturePalette]}</p>}
          {placements.length ? (
            <ol className="ng-spec-list">
              {placements.map((placement, index) => {
                const room = TIFERET_5_1.rooms.find((item) => item.id === placement.roomId);
                const config = placement.cabinetConfig;
                return (
                  <li key={placement.id}>
                    <span>{String(index + 1).padStart(2, '0')}</span>
                    <div className="ng-spec-item-copy">
                      <strong>{FURNITURE_LABELS[config.furnitureType]}</strong>
                      <p>{room?.name ?? 'חלל'}</p>
                      <p className="ng-spec-measurement">
                        {placement.width / 10} × {placement.height / 10} × {placement.depth / 10} ס״מ
                      </p>
                      <dl className="ng-spec-detail-grid">
                        <div>
                          <dt>חומר</dt>
                          <dd>{materialLabel(config.carcassMaterial)}</dd>
                        </div>
                        <div>
                          <dt>חזית</dt>
                          <dd>
                            {DOOR_LABELS[config.doorStyle]} · {HANDLE_LABELS[config.handleStyle]}
                          </dd>
                        </div>
                        <div>
                          <dt>חלוקה</dt>
                          <dd>
                            {config.doorCount} דלתות · {config.shelfCount} מדפים · {config.drawerCount} מגירות
                          </dd>
                        </div>
                      </dl>
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
            <button type="button" onClick={() => window.print()} className="ng-button ng-button--outline">
              הדפסת הסיכום
            </button>
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
