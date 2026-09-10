import { useMemo } from 'react';
import { Plan2D } from '../../apartment/components/Plan2D';
import { TIFERET_5_1 } from '../../apartment/data/tiferet';
import { browserDesignStorage, restorePlanningDocument } from '../../apartment/persistence/planning-document';
import {
  applyFurnitureOverrides,
  isSceneObjectVisible,
  sceneCategoryForFurniture,
} from '../../apartment/planner/design-state';
import type { Apartment } from '../../apartment/types';
import { apartmentSourceLabel } from '../../apartment/source/display';
import type { FurniturePalette } from '../../apartment/types';
import { getMaterial } from '../../engine/materials';
import { generateParts } from '../../engine/parts';
import type { DoorStyle, FurnitureType, HandleStyle } from '../../engine/types';
import { DiamondMark } from '../components/DiamondMark';
import { SiteLink } from '../components/SiteLink';
import type { NavigateSite } from '../types';

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

export function SummaryPage({ navigate, apartment = TIFERET_5_1 }: { navigate: NavigateSite; apartment?: Apartment }) {
  const savedDesign = useMemo(() => restorePlanningDocument(browserDesignStorage(), apartment).draft, [apartment]);
  const placements = savedDesign?.placements ?? [];
  const furniture = applyFurnitureOverrides(
    [...(apartment.furniture ?? []), ...(savedDesign?.addedFurniture ?? [])],
    savedDesign?.furnitureOverrides ?? [],
  );
  return (
    <div className="ng-page ng-spec-page">
      <div className="ng-page-hero">
        <p className="ng-eyebrow">
          <DiamondMark /> מפרט תכנוני
        </p>
        <h1>סיכום התכנון</h1>
        <p>
          {apartmentSourceLabel(apartment)} • {apartment.source.building} • קומה {apartment.source.floor}
        </p>
      </div>
      <section className="ng-spec-sheet">
        <div className="ng-spec-sheet__plan">
          <Plan2D
            apartment={apartment}
            placements={placements}
            furniture={furniture}
            visibility={savedDesign?.visibility}
            furniturePalette={savedDesign?.furniturePalette}
            roomId={null}
            wallId={null}
            activePlacementId={null}
            onRoom={(roomId) => navigate({ id: 'design', roomId, apartmentId: apartment.id })}
            onWall={() => {}}
            onPlacement={() => {}}
          />
        </div>
        <div className="ng-spec-sheet__details">
          <div className="ng-spec-number">{apartment.name}</div>
          {savedDesign && <p className="ng-eyebrow">{savedDesign.name}</p>}
          {savedDesign?.metadata?.customerName && <p>שם הלקוח: {savedDesign.metadata.customerName}</p>}
          {savedDesign?.metadata?.notes && <p className="whitespace-pre-wrap">הערות: {savedDesign.metadata.notes}</p>}
          <h2>{placements.length ? `${placements.length} פריטי נגרות בתכנון` : 'עדיין לא נשמרו פריטי נגרות'}</h2>
          {savedDesign && <p className="ng-spec-palette">ערכת ריהוט {PALETTE_LABELS[savedDesign.furniturePalette]}</p>}
          {placements.length ? (
            <ol className="ng-spec-list">
              {placements.map((placement, index) => {
                const room = apartment.rooms.find((item) => item.id === placement.roomId);
                const config = placement.cabinetConfig;
                const parts = generateParts(config);
                const quantity = (names: string[]) =>
                  parts.filter((part) => names.includes(part.name.en)).reduce((sum, part) => sum + part.qty, 0);
                return (
                  <li key={placement.id}>
                    <span>{String(index + 1).padStart(2, '0')}</span>
                    <div className="ng-spec-item-copy">
                      <strong>{FURNITURE_LABELS[config.furnitureType]}</strong>
                      <p>
                        {room?.name ?? 'חלל'} · מרחק מתחילת הקיר: {placement.distanceFromWallStart / 10} ס״מ · גובה
                        הצבה: {placement.elevation / 10} ס״מ
                      </p>
                      {savedDesign && !isSceneObjectVisible(savedDesign.visibility, placement.id, 'cabinetry') && (
                        <p>מוסתר בתצוגה; נשאר במפרט</p>
                      )}
                      <p className="ng-spec-measurement">
                        {placement.width / 10} × {placement.height / 10} × {placement.depth / 10} ס״מ
                      </p>
                      <dl className="ng-spec-detail-grid">
                        <div>
                          <dt>חומר</dt>
                          <dd>{getMaterial(config.carcassMaterial, config.materialCatalog).name.he}</dd>
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
                            {quantity(['Door', 'Glass Door'])} דלתות · {quantity(['Adjustable Shelf', 'Fixed Shelf'])}{' '}
                            מדפים ·{' '}
                            {parts
                              .filter((part) => /^Drawer \d+ Front$/.test(part.name.en))
                              .reduce((sum, part) => sum + part.qty, 0)}{' '}
                            מגירות
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
          <h2>ריהוט בחדרים — {furniture.length} פריטים</h2>
          <ol className="ng-spec-list">
            {furniture.map((item) => (
              <li key={item.id}>
                <div>
                  <strong>{item.label}</strong>
                  <p>
                    {apartment.rooms.find((room) => room.id === item.roomId)?.name} · {item.width / 10} ×{' '}
                    {item.depth / 10} × {item.height / 10} ס״מ
                  </p>
                  <p>
                    מרכז: {Math.round(item.x / 10)}, {Math.round(item.y / 10)} ס״מ · סיבוב:{' '}
                    {Math.round((item.rotation * 180) / Math.PI)}° · גובה הצבה: {item.elevation / 10} ס״מ
                  </p>
                  <p>
                    {savedDesign?.addedFurniture?.some((added) => added.id === item.id)
                      ? 'נוסף לתכנון'
                      : 'ריהוט מתוכנית המקור'}
                    {savedDesign?.furnitureOverrides.some((override) => override.id === item.id) ? ' · נערך' : ''}
                  </p>
                  {savedDesign &&
                    !isSceneObjectVisible(savedDesign.visibility, item.id, sceneCategoryForFurniture(item.kind)) && (
                      <p>מוסתר בתצוגה; נשאר במפרט</p>
                    )}
                </div>
              </li>
            ))}
          </ol>
          {savedDesign && (
            <p>
              עודכן: {new Date(savedDesign.updatedAt).toLocaleString('he-IL')} · גרסה: {savedDesign.id}
            </p>
          )}
          {(apartment.source.unresolvedFields ?? []).length > 0 && (
            <div>
              <h2>פרטים לאימות</h2>
              <ul>
                {apartment.source.unresolvedFields?.map((field) => (
                  <li key={field}>{field}</li>
                ))}
              </ul>
            </div>
          )}
          <div className="ng-price-placeholder">
            <span>מחיר משוער</span>
            <strong>יתווסף לאחר מדידה ומפרט מאושר</strong>
          </div>
          <div className="ng-spec-actions">
            <SiteLink
              route={{ id: 'my-apartment', apartmentId: apartment.id }}
              navigate={navigate}
              className="ng-button"
            >
              חזרה לתכנון
            </SiteLink>
            <button type="button" onClick={() => window.print()} className="ng-button ng-button--outline">
              הדפסת הסיכום
            </button>
            <SiteLink
              route={{ id: 'contact', apartmentId: apartment.id }}
              navigate={navigate}
              className="ng-button ng-button--outline"
            >
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
