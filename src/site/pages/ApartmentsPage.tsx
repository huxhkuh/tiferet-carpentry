import { useState } from 'react';
import { ApartmentThumbnail } from '../../apartment/components/ApartmentThumbnail';
import { TIFERET_5_1 } from '../../apartment/data/tiferet';
import {
  getImplementedApartmentSourcePlans,
  getSourceInventorySummary,
  TIFERET_SOURCE_INVENTORY,
} from '../../apartment/data/tiferet-source-inventory';
import type { TiferetSourcePlan } from '../../apartment/data/tiferet-source-inventory';
import {
  getSourceBuildings,
  getSourceFloors,
  getSourcePlans,
  sourcePlanDriveUrl,
} from '../../apartment/source/catalog';
import { apartmentSourceLabel } from '../../apartment/source/display';
import { DiamondMark } from '../components/DiamondMark';
import { SiteLink } from '../components/SiteLink';
import type { NavigateSite } from '../types';

const SOURCE_INVENTORY_SUMMARY = getSourceInventorySummary(TIFERET_SOURCE_INVENTORY);
const SOURCE_APARTMENT_PLAN_COUNT = TIFERET_SOURCE_INVENTORY.apartmentPlans.length;
const IMPLEMENTED_SOURCE_PLAN_COUNT = getImplementedApartmentSourcePlans(TIFERET_SOURCE_INVENTORY).length;
const SOURCE_BUILDINGS = getSourceBuildings(TIFERET_SOURCE_INVENTORY);

function requireDefaultSourcePlan(): TiferetSourcePlan {
  const plan = TIFERET_SOURCE_INVENTORY.apartmentPlans.find(
    (candidate) => candidate.buildingId === 'techelet' && candidate.sheet === '5-1',
  );
  if (!plan) throw new Error('The audited Tiferet 5-1 source plan is missing from the inventory.');
  return plan;
}

const DEFAULT_SOURCE_PLAN = requireDefaultSourcePlan();

function sourcePlanOptionLabel(plan: TiferetSourcePlan): string {
  if (plan.id === DEFAULT_SOURCE_PLAN.id) return apartmentSourceLabel(TIFERET_5_1);
  return `גיליון ${plan.sheet}`;
}

export function ApartmentsPage({ navigate }: { navigate: NavigateSite }) {
  const [buildingId, setBuildingId] = useState<TiferetSourcePlan['buildingId']>(DEFAULT_SOURCE_PLAN.buildingId);
  const [floorNumber, setFloorNumber] = useState(DEFAULT_SOURCE_PLAN.floor);
  const [selectedSourcePlanId, setSelectedSourcePlanId] = useState(DEFAULT_SOURCE_PLAN.id);
  const floors = getSourceFloors(TIFERET_SOURCE_INVENTORY, buildingId);
  const sourcePlans = getSourcePlans(TIFERET_SOURCE_INVENTORY, buildingId, floorNumber);
  const selectedSourcePlan =
    sourcePlans.find((plan) => plan.id === selectedSourcePlanId) ?? sourcePlans[0] ?? DEFAULT_SOURCE_PLAN;
  const hasWorkingModel = selectedSourcePlan.modelStatus === 'partially-modeled';

  const selectFirstPlan = (nextBuildingId: TiferetSourcePlan['buildingId'], nextFloor: number) => {
    const nextPlan = getSourcePlans(TIFERET_SOURCE_INVENTORY, nextBuildingId, nextFloor)[0];
    setSelectedSourcePlanId(nextPlan?.id ?? DEFAULT_SOURCE_PLAN.id);
  };

  const handleBuildingChange = (value: string) => {
    const nextBuildingId: TiferetSourcePlan['buildingId'] = value === 'argaman' ? 'argaman' : 'techelet';
    const nextFloor = getSourceFloors(TIFERET_SOURCE_INVENTORY, nextBuildingId)[0] ?? DEFAULT_SOURCE_PLAN.floor;
    setBuildingId(nextBuildingId);
    setFloorNumber(nextFloor);
    selectFirstPlan(nextBuildingId, nextFloor);
  };

  const handleFloorChange = (nextFloor: number) => {
    setFloorNumber(nextFloor);
    selectFirstPlan(buildingId, nextFloor);
  };

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
            <select
              id="ng-site-building"
              value={buildingId}
              onChange={(event) => handleBuildingChange(event.target.value)}
            >
              {SOURCE_BUILDINGS.map((building) => (
                <option key={building.id} value={building.id}>
                  {building.name}
                </option>
              ))}
            </select>
          </label>
          <label htmlFor="ng-site-floor">
            קומה
            <select
              id="ng-site-floor"
              value={floorNumber}
              onChange={(event) => handleFloorChange(Number(event.target.value))}
            >
              {floors.map((floor) => (
                <option key={floor} value={floor}>
                  קומה {floor}
                </option>
              ))}
            </select>
          </label>
          <label htmlFor="ng-site-apartment">
            דירה
            <select
              id="ng-site-apartment"
              value={selectedSourcePlan.id}
              onChange={(event) => setSelectedSourcePlanId(event.target.value)}
            >
              {sourcePlans.map((plan) => (
                <option key={plan.id} value={plan.id}>
                  {sourcePlanOptionLabel(plan)}
                </option>
              ))}
            </select>
          </label>
        </div>
        {hasWorkingModel ? (
          <article className="ng-apartment-card is-selected">
            <div className="ng-apartment-card__plan">
              <ApartmentThumbnail apartment={TIFERET_5_1} />
            </div>
            <div className="ng-apartment-card__details">
              <p className="ng-eyebrow">
                <DiamondMark /> תכלת • קומה 5
              </p>
              <h2>{apartmentSourceLabel(TIFERET_5_1)}</h2>
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
                  <dd>נקייה, מקור, חפיפה ו‑3D</dd>
                </div>
              </dl>
              <SiteLink route={{ id: 'my-apartment' }} navigate={navigate} className="ng-button">
                בחרו דירה
              </SiteLink>
            </div>
          </article>
        ) : (
          <article className="ng-apartment-card ng-apartment-card--source is-selected">
            <div className="ng-apartment-card__plan ng-apartment-card__plan--source">
              <div
                className="ng-source-document"
                role="img"
                aria-label={`מסמך תוכנית מקור ${selectedSourcePlan.sheet}`}
              >
                <span className="ng-source-document__page" aria-hidden="true">
                  <i />
                  <i />
                  <i />
                  <b />
                </span>
                <p>PDF רשמי ב‑Google Drive</p>
                <strong>גיליון {selectedSourcePlan.sheet}</strong>
                <small>המקור נשמר ללא שינוי וזמין לפתיחה בחלון חדש</small>
              </div>
            </div>
            <div className="ng-apartment-card__details">
              <p className="ng-eyebrow">
                <DiamondMark /> {selectedSourcePlan.buildingName} • קומה {selectedSourcePlan.floor}
              </p>
              <h2>גיליון {selectedSourcePlan.sheet}</h2>
              <p className="ng-apartment-type">מקור נקלט · מודל נקי טרם אומת</p>
              <dl>
                <div>
                  <dt>מצב</dt>
                  <dd>תוכנית מקור זמינה לצפייה</dd>
                </div>
                <div>
                  <dt>גודל קובץ</dt>
                  <dd>{Math.round(selectedSourcePlan.fileSizeBytes / 1024)} KB</dd>
                </div>
                <div>
                  <dt>מודל תכנון</dt>
                  <dd>ממתין לשחזור ולאימות אדריכלי</dd>
                </div>
              </dl>
              <a className="ng-button" href={sourcePlanDriveUrl(selectedSourcePlan)} target="_blank" rel="noreferrer">
                פתח תוכנית מקור
              </a>
              <p className="ng-source-catalog-path">{selectedSourcePlan.sourcePath}</p>
            </div>
          </article>
        )}
        <div className="ng-data-note" role="note">
          <span>{SOURCE_INVENTORY_SUMMARY.totalSourcePdfs} קבצי PDF נסרקו</span>
          <span>{SOURCE_APARTMENT_PLAN_COUNT} תוכניות דירה אותרו</span>
          <span>
            {IMPLEMENTED_SOURCE_PLAN_COUNT === 1
              ? `${apartmentSourceLabel(TIFERET_5_1)} זמינה כמודל עבודה חלקי; היא עדיין אינה מסומנת כמאומתת`
              : ''}
          </span>
        </div>
      </section>
    </div>
  );
}
