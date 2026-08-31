import { useEffect, useMemo, useRef, useState } from 'react';
import '../index.css';
import { MATERIALS } from '../engine/materials';
import type { CabinetConfig, DoorStyle, FurnitureType, HandleStyle } from '../engine/types';
import type {
  Apartment,
  CabinetPlacement,
  DesignVisibility,
  FurnitureOverride,
  FurnitureKind,
  FurniturePalette,
  FurniturePlacement,
  RoomCameraOrbit,
  SavedDesignV2,
  SceneObjectCategory,
} from './types';
import { TIFERET_5_1, TIFERET_PROJECT } from './data/tiferet';
import { createCabinetPlacement, deriveCabinet, updateCabinetPlacement } from './cabinet/adapter';
import { validatePlacement, wallLength } from './geometry/placement';
import { findCabinetFurnitureCollision, validateFurnitureMove } from './geometry/scene-collision';
import { analyzeArchitecturalPdf, type ArchitecturalPdfImportDraft } from './import/pdf-import';
import {
  clearDesign,
  deserializeDesign,
  restoreDesign,
  SAVED_DESIGN_SCHEMA_VERSION,
  saveDesign,
  serializeDesign,
} from './persistence/design';
import {
  addDesignVersion,
  createDesignLibrary,
  removeDesignVersion,
  restoreDesignLibrary,
  saveDesignLibrary,
  selectDesignVersion,
} from './persistence/design-library';
import type { SavedDesignLibrary } from './persistence/design-library';
import {
  applyFurnitureOverrides,
  createDefaultVisibility,
  isSceneObjectVisible,
  sceneCategoryForFurniture,
  toggleObjectVisibility,
  toggleSceneCategory,
  upsertFurnitureOverride,
} from './planner/design-state';
import { ApartmentThumbnail } from './components/ApartmentThumbnail';
import { FurnitureEditor } from './components/FurnitureEditor';
import { FurnitureCatalogPanel } from './components/FurnitureCatalogPanel';
import { FullSourcePlan } from './components/FullSourcePlan';
import { Plan2D } from './components/Plan2D';
import { Room3D } from './components/Room3D';
import { SceneLayersPanel } from './components/SceneLayersPanel';
import { SourceComparisonPlan } from './components/SourceComparisonPlan';
import { DesignLibraryPanel } from './components/DesignLibraryPanel';
import {
  getImplementedApartmentSourcePlans,
  getSourceInventorySummary,
  TIFERET_SOURCE_INVENTORY,
} from './data/tiferet-source-inventory';
import { apartmentSourceLabel } from './source/display';
import { BrandMark } from '../site/components/BrandMark';
import { placeFurnitureInRoom } from './furniture/catalog';

const LEGACY_STORAGE_KEY = 'tiferet:design:5-1';
const DEFAULT_BUILDING = TIFERET_PROJECT.buildings[0];
const DEFAULT_FLOOR = DEFAULT_BUILDING?.floors[0];
const DEFAULT_APARTMENT = DEFAULT_FLOOR?.apartments[0] ?? TIFERET_5_1;
const SOURCE_INVENTORY_SUMMARY = getSourceInventorySummary(TIFERET_SOURCE_INVENTORY);
const IMPLEMENTED_SOURCE_PLAN_COUNT = getImplementedApartmentSourcePlans(TIFERET_SOURCE_INVENTORY).length;
const UNRESOLVED_APARTMENT_SOURCE_COUNT =
  TIFERET_SOURCE_INVENTORY.apartmentPlans.length - IMPLEMENTED_SOURCE_PLAN_COUNT;
const PANEL_MATERIALS = MATERIALS.filter((material) => material.category === 'panel').slice(0, 12);
const FURNITURE_CATEGORIES: readonly SceneObjectCategory[] = [
  'beds',
  'kitchen',
  'bathroom',
  'living',
  'work',
  'utility',
  'decor',
];
type NumericField = 'width' | 'height' | 'depth' | 'shelfCount' | 'drawerCount' | 'doorCount' | 'distanceFromWallStart';

interface DesignSnapshot {
  placements: CabinetPlacement[];
  addedFurniture: FurniturePlacement[];
  furnitureOverrides: FurnitureOverride[];
  visibility: DesignVisibility;
  furniturePalette: FurniturePalette;
}

interface DesignHistory {
  past: DesignSnapshot[];
  future: DesignSnapshot[];
}
let placementSequence = 0;
let designSequence = 0;
let furnitureSequence = 0;

function designStorageKey(apartmentId: string): string {
  return apartmentId === TIFERET_5_1.id ? LEGACY_STORAGE_KEY : `tiferet:design:${apartmentId}`;
}

function loadSavedDesign(apartmentId: string): SavedDesignV2 | null {
  if (typeof localStorage === 'undefined') return null;
  return restoreDesign(localStorage, designStorageKey(apartmentId), apartmentId);
}

function designLibraryStorageKey(apartmentId: string): string {
  return `tiferet:design-library:${apartmentId}`;
}

function loadDesignLibrary(apartmentId: string): SavedDesignLibrary {
  if (typeof localStorage === 'undefined') return createDesignLibrary(apartmentId);
  return (
    restoreDesignLibrary(localStorage, designLibraryStorageKey(apartmentId), apartmentId) ??
    createDesignLibrary(apartmentId)
  );
}

function createUniqueId(prefix: string, occupiedIds: readonly string[], nextSequence: () => number): string {
  const occupied = new Set(occupiedIds);
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    const randomId = crypto.randomUUID();
    if (!occupied.has(randomId)) return randomId;
  }
  let candidate: string;
  do {
    candidate = `${prefix}-${nextSequence()}`;
  } while (occupied.has(candidate));
  return candidate;
}

function createPlacementId(existingPlacements: readonly CabinetPlacement[]): string {
  return createUniqueId(
    'tiferet-placement',
    existingPlacements.map((placement) => placement.id),
    () => ++placementSequence,
  );
}

function createDesignVersionId(existingDesigns: readonly SavedDesignV2[]): string {
  return createUniqueId(
    'tiferet-design',
    existingDesigns.map((design) => design.id),
    () => ++designSequence,
  );
}

function createFurnitureId(existingFurniture: readonly FurniturePlacement[]): string {
  return createUniqueId(
    'tiferet-furniture',
    existingFurniture.map((item) => item.id),
    () => ++furnitureSequence,
  );
}

export function PlannerApp({
  onExit,
  initialStarted = false,
  initialRoomId = null,
  initialApartment,
  onSummary,
}: {
  onExit?: () => void;
  initialStarted?: boolean;
  initialRoomId?: string | null;
  initialApartment?: Apartment;
  onSummary?: () => void;
}) {
  const startingApartment = initialApartment ?? DEFAULT_APARTMENT;
  const [started, setStarted] = useState(initialStarted);
  const [view, setView] = useState<'clean' | 'overlay' | 'full' | '3d'>('clean');
  const [buildingId, setBuildingId] = useState(DEFAULT_BUILDING?.id ?? '');
  const building = TIFERET_PROJECT.buildings.find((item) => item.id === buildingId) ?? DEFAULT_BUILDING;
  const [floorNumber, setFloorNumber] = useState(DEFAULT_FLOOR?.number ?? 0);
  const floor = building?.floors.find((item) => item.number === floorNumber) ?? building?.floors[0];
  const [apartmentId, setApartmentId] = useState(startingApartment.id);
  const apartment =
    initialApartment ??
    floor?.apartments.find((item) => item.id === apartmentId) ??
    floor?.apartments[0] ??
    DEFAULT_APARTMENT;
  const [roomId, setRoomId] = useState<string | null>(() =>
    startingApartment.rooms.some((room) => room.id === initialRoomId) ? initialRoomId : null,
  );
  const [wallId, setWallId] = useState<string | null>(null);
  const [seedDesign] = useState(() => loadSavedDesign(startingApartment.id));
  const [placements, setPlacements] = useState<CabinetPlacement[]>(seedDesign?.placements ?? []);
  const [addedFurniture, setAddedFurniture] = useState<FurniturePlacement[]>(seedDesign?.addedFurniture ?? []);
  const [furnitureOverrides, setFurnitureOverrides] = useState(seedDesign?.furnitureOverrides ?? []);
  const [visibility, setVisibility] = useState<DesignVisibility>(seedDesign?.visibility ?? createDefaultVisibility());
  const [furniturePalette, setFurniturePalette] = useState<FurniturePalette>(seedDesign?.furniturePalette ?? 'warm');
  const [cameraByRoom, setCameraByRoom] = useState<Record<string, RoomCameraOrbit>>(seedDesign?.cameraByRoom ?? {});
  const [designLibrary, setDesignLibrary] = useState(() => loadDesignLibrary(startingApartment.id));
  const [designName, setDesignName] = useState(seedDesign?.name ?? `תכנון ${startingApartment.name}`);
  const [showDesignLibrary, setShowDesignLibrary] = useState(false);
  const [showFurnitureCatalog, setShowFurnitureCatalog] = useState(false);
  const [pdfImportDraft, setPdfImportDraft] = useState<ArchitecturalPdfImportDraft | null>(null);
  const [pdfImportState, setPdfImportState] = useState<'idle' | 'reading' | 'ready' | 'error'>('idle');
  const [cleanPlanLayers, setCleanPlanLayers] = useState({
    doorSwings: true,
    dimensions: true,
    labels: true,
  });
  const historyRef = useRef<DesignHistory>({ past: [], future: [] });
  const [activePlacementId, setActivePlacementId] = useState<string | null>(null);
  const [activeFurnitureId, setActiveFurnitureId] = useState<string | null>(null);
  const [notice, setNotice] = useState('');
  const [editError, setEditError] = useState('');
  const furniture = useMemo(
    () => applyFurnitureOverrides([...(apartment.furniture ?? []), ...addedFurniture], furnitureOverrides),
    [addedFurniture, apartment.furniture, furnitureOverrides],
  );
  const visibleFurniture = useMemo(
    () => furniture.filter((item) => isSceneObjectVisible(visibility, item.id, sceneCategoryForFurniture(item.kind))),
    [furniture, visibility],
  );
  const visiblePlacements = useMemo(
    () => placements.filter((placement) => isSceneObjectVisible(visibility, placement.id, 'cabinetry')),
    [placements, visibility],
  );
  const sceneApartment = useMemo(() => ({ ...apartment, furniture: visibleFurniture }), [apartment, visibleFurniture]);
  const showFurniture = FURNITURE_CATEGORIES.some((category) => !visibility.hiddenCategories.includes(category));
  const selectedWall = apartment.walls.find((wall) => wall.id === wallId);
  const selectedRoom = apartment.rooms.find((room) => room.id === roomId);
  const active = placements.find((placement) => placement.id === activePlacementId);
  const activeFurniture = furniture.find((item) => item.id === activeFurnitureId);
  const activeWall = active ? apartment.walls.find((wall) => wall.id === active.wallId) : undefined;
  const activeRoom = active ? apartment.rooms.find((room) => room.id === active.roomId) : undefined;
  const activeDerivation = useMemo(() => (active ? deriveCabinet(active.cabinetConfig) : null), [active]);
  useEffect(() => {
    document.documentElement.dir = 'rtl';
    document.documentElement.lang = 'he';
  }, []);
  const savedLabel = useMemo(
    () => (placements.length === 1 ? 'ארון אחד' : `${placements.length} ארונות`),
    [placements.length],
  );
  const addedFurnitureLabel = useMemo(
    () => (addedFurniture.length === 1 ? 'פריט ריהוט אחד נוסף' : `${addedFurniture.length} פריטי ריהוט נוספים`),
    [addedFurniture.length],
  );
  const designSnapshot = (): DesignSnapshot => ({
    placements: [...placements],
    addedFurniture: [...addedFurniture],
    furnitureOverrides: [...furnitureOverrides],
    visibility: {
      hiddenObjectIds: [...visibility.hiddenObjectIds],
      hiddenCategories: [...visibility.hiddenCategories],
    },
    furniturePalette,
  });
  const restoreSnapshot = (snapshot: DesignSnapshot) => {
    setPlacements(snapshot.placements);
    setAddedFurniture(snapshot.addedFurniture);
    setFurnitureOverrides(snapshot.furnitureOverrides);
    setVisibility(snapshot.visibility);
    setFurniturePalette(snapshot.furniturePalette);
    setEditError('');
  };
  const recordHistory = () => {
    historyRef.current = {
      past: [...historyRef.current.past, designSnapshot()].slice(-50),
      future: [],
    };
  };
  const undo = () => {
    const previous = historyRef.current.past.at(-1);
    if (!previous) return;
    historyRef.current = {
      past: historyRef.current.past.slice(0, -1),
      future: [designSnapshot(), ...historyRef.current.future].slice(0, 50),
    };
    restoreSnapshot(previous);
    setNotice('השינוי האחרון בוטל');
  };
  const redo = () => {
    const next = historyRef.current.future[0];
    if (!next) return;
    historyRef.current = {
      past: [...historyRef.current.past, designSnapshot()].slice(-50),
      future: historyRef.current.future.slice(1),
    };
    restoreSnapshot(next);
    setNotice('השינוי בוצע מחדש');
  };
  const toggleAllFurniture = () => {
    recordHistory();
    setVisibility((current) => {
      const hasVisibleFurniture = FURNITURE_CATEGORIES.some((category) => !current.hiddenCategories.includes(category));
      return {
        ...current,
        hiddenCategories: hasVisibleFurniture
          ? [...new Set([...current.hiddenCategories, ...FURNITURE_CATEGORIES])]
          : current.hiddenCategories.filter((category) => !FURNITURE_CATEGORIES.includes(category)),
      };
    });
    setActiveFurnitureId(null);
  };
  const activateApartment = (nextApartment: Apartment) => {
    const savedDesign = loadSavedDesign(nextApartment.id);
    const savedLibrary = loadDesignLibrary(nextApartment.id);
    historyRef.current = { past: [], future: [] };
    setApartmentId(nextApartment.id);
    setPlacements(savedDesign?.placements ?? []);
    setAddedFurniture(savedDesign?.addedFurniture ?? []);
    setFurnitureOverrides(savedDesign?.furnitureOverrides ?? []);
    setVisibility(savedDesign?.visibility ?? createDefaultVisibility());
    setFurniturePalette(savedDesign?.furniturePalette ?? 'warm');
    setCameraByRoom(savedDesign?.cameraByRoom ?? {});
    setDesignLibrary(savedLibrary);
    setDesignName(savedDesign?.name ?? `תכנון ${nextApartment.name}`);
    setShowDesignLibrary(false);
    setShowFurnitureCatalog(false);
    setPdfImportDraft(null);
    setPdfImportState('idle');
    setRoomId(null);
    setWallId(null);
    setActivePlacementId(null);
    setActiveFurnitureId(null);
    setEditError('');
    setNotice('');
  };
  const addFurniture = (kind: FurnitureKind) => {
    if (!selectedRoom) {
      setEditError('בחרו חדר לפני הוספת ריהוט');
      return;
    }
    try {
      const item = placeFurnitureInRoom({
        id: createFurnitureId(furniture),
        room: selectedRoom,
        kind,
        existingFurniture: furniture,
        placements,
        apartment,
      });
      recordHistory();
      setAddedFurniture((items) => [...items, item]);
      setVisibility((current) => ({
        hiddenObjectIds: current.hiddenObjectIds.filter((id) => id !== item.id),
        hiddenCategories: current.hiddenCategories.filter(
          (category) => category !== sceneCategoryForFurniture(item.kind),
        ),
      }));
      setActiveFurnitureId(item.id);
      setActivePlacementId(null);
      setShowFurnitureCatalog(false);
      setEditError('');
      setNotice(`${item.label} נוסף אל ${selectedRoom.name}`);
    } catch (error) {
      setEditError(error instanceof Error ? error.message : 'לא ניתן להוסיף את פריט הריהוט');
    }
  };
  const duplicateFurniture = (item: FurniturePlacement) => {
    const room = apartment.rooms.find((candidate) => candidate.id === item.roomId);
    if (!room) return;
    try {
      const duplicate = placeFurnitureInRoom({
        id: createFurnitureId(furniture),
        room,
        kind: item.kind,
        existingFurniture: furniture,
        placements,
        apartment,
        template: item,
      });
      recordHistory();
      setAddedFurniture((items) => [...items, duplicate]);
      setActiveFurnitureId(duplicate.id);
      setEditError('');
      setNotice(`${item.label} שוכפל במקום פנוי`);
    } catch (error) {
      setEditError(error instanceof Error ? error.message : 'לא ניתן לשכפל את הפריט');
    }
  };
  const deleteFurniture = (item: FurniturePlacement) => {
    if (!addedFurniture.some((candidate) => candidate.id === item.id)) return;
    recordHistory();
    setAddedFurniture((items) => items.filter((candidate) => candidate.id !== item.id));
    setFurnitureOverrides((items) => items.filter((override) => override.id !== item.id));
    setVisibility((current) => ({
      ...current,
      hiddenObjectIds: current.hiddenObjectIds.filter((id) => id !== item.id),
    }));
    setActiveFurnitureId(null);
    setEditError('');
    setNotice(`${item.label} נמחק מהתכנון`);
  };
  const addCabinet = () => {
    if (!selectedWall) return;
    const roomForPlacement = selectedRoom ?? apartment.rooms.find((room) => room.wallIds.includes(selectedWall.id));
    if (!roomForPlacement) {
      setEditError('בחרו חדר וקיר לפני הוספת ארון');
      return;
    }
    let placement: CabinetPlacement;
    try {
      placement = createCabinetPlacement({
        apartment,
        room: roomForPlacement,
        wall: selectedWall,
        cabinetConfig: { width: 1800, height: 2400, depth: 600 },
        existingPlacements: placements,
        furniture,
        id: createPlacementId(placements),
      });
    } catch (error) {
      setEditError(error instanceof Error ? error.message : 'לא ניתן למקם ארון בקיר הזה');
      return;
    }
    recordHistory();
    setPlacements((items) => [...items, placement]);
    setActivePlacementId(placement.id);
    setActiveFurnitureId(null);
    setEditError('');
    setNotice('הארון נוסף לקיר ונבחר לעריכה');
  };
  const deleteActivePlacement = () => {
    if (!active) return;
    recordHistory();
    setPlacements((items) => items.filter((item) => item.id !== active.id));
    setActivePlacementId(null);
    setNotice('הארון הוסר מהתכנון המקומי');
  };
  const updatePlacement = (configPatch: Partial<CabinetConfig>, distanceFromWallStart?: number) => {
    if (!active || !activeWall || !activeRoom) return;
    try {
      let nextPlacement = updateCabinetPlacement(active, configPatch, activeWall, activeRoom, placements);
      if (distanceFromWallStart !== undefined) {
        const placementError = validatePlacement(
          activeWall,
          nextPlacement.width,
          distanceFromWallStart,
          placements,
          active.id,
        );
        if (placementError) throw new RangeError(placementError);
        nextPlacement = { ...nextPlacement, distanceFromWallStart };
      }
      const furnitureCollision = findCabinetFurnitureCollision(
        activeRoom,
        activeWall,
        nextPlacement.distanceFromWallStart,
        nextPlacement.width,
        nextPlacement.depth,
        furniture,
      );
      if (furnitureCollision) {
        throw new RangeError('הארון חופף לריהוט בחדר. הזיזו את הריהוט או בחרו מיקום אחר');
      }
      recordHistory();
      setPlacements((items) => items.map((item) => (item.id === active.id ? nextPlacement : item)));
      setEditError('');
      setNotice('השינוי עודכן בתכנית');
    } catch (error) {
      setEditError(error instanceof Error ? error.message : 'לא ניתן לעדכן את הארון');
    }
  };
  const updateFurniture = (
    item: FurniturePlacement,
    x: number,
    y: number,
    rotation: number,
    shouldRecordHistory = true,
  ) => {
    const room = apartment.rooms.find((candidate) => candidate.id === item.roomId);
    if (!room) {
      setEditError('החדר של פריט הריהוט אינו קיים בתכנית');
      return;
    }
    const nextItem = { ...item, x, y, rotation };
    const placementError = validateFurnitureMove(room, nextItem, placements, apartment, furniture);
    if (placementError) {
      setEditError(placementError);
      return;
    }
    if (shouldRecordHistory) recordHistory();
    setFurnitureOverrides((current) => upsertFurnitureOverride(current, { id: item.id, x, y, rotation }));
    setEditError('');
    setNotice(`${item.label} עודכן בתכנית`);
  };
  const updateNumber = (key: NumericField, value: number) => {
    if (!active) return;
    if (key === 'distanceFromWallStart') {
      updatePlacement({}, value);
      return;
    }
    if (key === 'doorCount') {
      updatePlacement({ doorCount: value === 1 ? 1 : 2 });
      return;
    }
    if (key === 'drawerCount') {
      updatePlacement({ drawerCount: Math.max(0, Math.round(value)) });
      return;
    }
    if (key === 'shelfCount') {
      updatePlacement({ shelfCount: Math.max(0, Math.round(value)) });
      return;
    }
    if (key === 'width') {
      updatePlacement({ width: value });
      return;
    }
    if (key === 'height') {
      updatePlacement({ height: value });
      return;
    }
    updatePlacement({ depth: value });
  };
  const updateSelect = (
    key: 'furnitureType' | 'doorStyle' | 'handleStyle' | 'carcassMaterial',
    value: FurnitureType | DoorStyle | HandleStyle | string,
  ) => {
    if (!active) return;
    updatePlacement({ [key]: value });
  };
  const getCurrentDesignError = (): string | null => {
    const sourceFurnitureIds = new Set((apartment.furniture ?? []).map((item) => item.id));
    const invalidFurniture = addedFurniture
      .map((addedItem) => {
        if (sourceFurnitureIds.has(addedItem.id)) return 'מזהה הריהוט מתנגש בפריט קיים בדירה';
        const currentItem = furniture.find((item) => item.id === addedItem.id);
        if (!currentItem) return 'פריט הריהוט אינו קיים בתכנון הנוכחי';
        const room = apartment.rooms.find((candidate) => candidate.id === currentItem.roomId);
        if (!room) return 'החדר של פריט הריהוט אינו קיים בתכנית';
        return validateFurnitureMove(room, currentItem, placements, apartment, furniture);
      })
      .find((error) => error !== null);
    if (invalidFurniture) return invalidFurniture;
    const invalidPlacement = placements
      .map((placement) => {
        const wall = apartment.walls.find((item) => item.id === placement.wallId);
        if (!wall) return 'קיר ההצבה אינו קיים בדירה';
        const wallError = validatePlacement(
          wall,
          placement.width,
          placement.distanceFromWallStart,
          placements,
          placement.id,
        );
        if (wallError) return wallError;
        const room = apartment.rooms.find((candidate) => candidate.id === placement.roomId);
        if (!room) return 'החדר של הארון אינו קיים בדירה';
        return findCabinetFurnitureCollision(
          room,
          wall,
          placement.distanceFromWallStart,
          placement.width,
          placement.depth,
          furniture,
        )
          ? 'אחד הארונות חופף לריהוט בחדר'
          : null;
      })
      .find((error) => error !== null);
    return invalidPlacement ?? null;
  };
  const createSavedDesign = (id: string, name: string): SavedDesignV2 => ({
    schemaVersion: SAVED_DESIGN_SCHEMA_VERSION,
    id,
    apartmentId: apartment.id,
    name,
    updatedAt: new Date().toISOString(),
    placements,
    addedFurniture,
    furnitureOverrides,
    visibility,
    furniturePalette,
    cameraByRoom,
  });
  const applySavedDesign = (design: SavedDesignV2) => {
    historyRef.current = { past: [], future: [] };
    setPlacements(design.placements);
    setAddedFurniture(design.addedFurniture ?? []);
    setFurnitureOverrides(design.furnitureOverrides);
    setVisibility(design.visibility);
    setFurniturePalette(design.furniturePalette);
    setCameraByRoom(design.cameraByRoom);
    setDesignName(design.name);
    setActivePlacementId(null);
    setActiveFurnitureId(null);
    setEditError('');
  };
  const persistDesignVersion = (design: SavedDesignV2): boolean => {
    try {
      const nextLibrary = addDesignVersion(designLibrary, design);
      saveDesign(localStorage, designStorageKey(apartment.id), design);
      saveDesignLibrary(localStorage, designLibraryStorageKey(apartment.id), nextLibrary);
      setDesignLibrary(nextLibrary);
      setDesignName(design.name);
      return true;
    } catch {
      setEditError('לא ניתן לשמור את התכנון באחסון המקומי. בדקו שיש מקום פנוי ושהאחסון מאופשר');
      return false;
    }
  };
  const save = () => {
    const invalid = getCurrentDesignError();
    if (invalid) {
      setEditError(invalid);
      return;
    }
    const activeDesignId = designLibrary.activeDesignId ?? 'design-5-1';
    const nextName = designName.trim() || `תכנון ${apartment.name}`;
    if (!persistDesignVersion(createSavedDesign(activeDesignId, nextName))) return;
    setEditError('');
    setNotice('התכנון נשמר בהצלחה במכשיר זה');
  };
  const saveAsNewVersion = () => {
    const invalid = getCurrentDesignError();
    if (invalid) {
      setEditError(invalid);
      return;
    }
    const nextName = designName.trim();
    if (!nextName) {
      setEditError('הזינו שם לגרסה');
      return;
    }
    if (!persistDesignVersion(createSavedDesign(createDesignVersionId(designLibrary.designs), nextName))) return;
    setEditError('');
    setNotice(`הגרסה “${nextName}” נשמרה`);
  };
  const loadDesignVersion = (designId: string) => {
    const design = designLibrary.designs.find((candidate) => candidate.id === designId);
    if (!design) return;
    const nextLibrary = selectDesignVersion(designLibrary, designId);
    applySavedDesign(design);
    setDesignLibrary(nextLibrary);
    saveDesignLibrary(localStorage, designLibraryStorageKey(apartment.id), nextLibrary);
    saveDesign(localStorage, designStorageKey(apartment.id), design);
    setNotice(`הגרסה “${design.name}” נטענה`);
  };
  const deleteDesignVersion = (designId: string) => {
    const design = designLibrary.designs.find((candidate) => candidate.id === designId);
    if (!design || !window.confirm(`למחוק את הגרסה “${design.name}”?`)) return;
    const nextLibrary = removeDesignVersion(designLibrary, designId);
    const deletedActiveDesign = designLibrary.activeDesignId === designId;
    const nextActive = deletedActiveDesign
      ? nextLibrary.designs.find((candidate) => candidate.id === nextLibrary.activeDesignId)
      : undefined;
    try {
      saveDesignLibrary(localStorage, designLibraryStorageKey(apartment.id), nextLibrary);
      if (deletedActiveDesign) {
        if (nextActive) saveDesign(localStorage, designStorageKey(apartment.id), nextActive);
        else clearDesign(localStorage, designStorageKey(apartment.id));
      }
    } catch {
      setEditError('לא ניתן למחוק את הגרסה מהאחסון המקומי');
      return;
    }
    setDesignLibrary(nextLibrary);
    if (designLibrary.activeDesignId === designId) {
      if (nextActive) {
        applySavedDesign(nextActive);
      }
    }
    setEditError('');
    setNotice(`הגרסה “${design.name}” נמחקה`);
  };
  const exportActiveDesign = () => {
    const design = designLibrary.designs.find((candidate) => candidate.id === designLibrary.activeDesignId);
    if (!design || typeof URL.createObjectURL !== 'function') {
      setEditError('אין גרסה פעילה לייצוא');
      return;
    }
    const objectUrl = URL.createObjectURL(new Blob([serializeDesign(design)], { type: 'application/json' }));
    const link = document.createElement('a');
    link.href = objectUrl;
    link.download = `tiferet-${apartment.source.sheet}-${design.id}.json`;
    link.click();
    URL.revokeObjectURL(objectUrl);
    setNotice('קובץ התכנון יוצא בהצלחה');
  };
  const importDesignVersion = async (file: File) => {
    try {
      const imported = deserializeDesign(await file.text());
      if (!imported || imported.apartmentId !== apartment.id) {
        setEditError('קובץ התכנון אינו תקין או שייך לדירה אחרת');
        return;
      }
      const design: SavedDesignV2 = {
        ...imported,
        id: createDesignVersionId(designLibrary.designs),
        name: `${imported.name} (מיובא)`,
        updatedAt: new Date().toISOString(),
      };
      applySavedDesign(design);
      if (!persistDesignVersion(design)) return;
      setNotice(`הגרסה “${design.name}” יובאה ונטענה`);
    } catch {
      setEditError('לא ניתן לקרוא את קובץ התכנון');
    }
  };
  const importArchitecturalPdf = async (file: File) => {
    setPdfImportState('reading');
    setPdfImportDraft(null);
    setEditError('');
    try {
      const draft = await analyzeArchitecturalPdf(file);
      setPdfImportDraft(draft);
      setPdfImportState('ready');
      setNotice(
        draft.status === 'draft-ready'
          ? 'ה-PDF נותח ונוצרה טיוטת ראיות לייבוא'
          : 'ה-PDF נקרא, אבל נדרש סבב בדיקה לפני בניית מודל דירה',
      );
    } catch (error) {
      setPdfImportState('error');
      setEditError(error instanceof Error ? error.message : 'לא ניתן לקרוא את קובץ ה-PDF');
    }
  };
  if (!started)
    return (
      <main className="min-h-screen bg-[#f4f0e8] text-stone-800" dir="rtl">
        <header className="flex items-center justify-between border-b border-stone-300 px-6 py-4 md:px-16">
          <div className="flex items-center gap-3">
            <BrandMark compact />
            <div>
              <strong className="block text-xl tracking-wide text-[#5f402f]">נגרות תפארת</strong>
              <small className="text-xs text-stone-500">סטודיו לתכנון מותאם</small>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <span className="hidden text-sm text-stone-600 sm:inline">מתכננים בית. יוצרים בדיוק.</span>
            {onExit && (
              <button type="button" onClick={onExit} className="text-sm font-semibold text-stone-600 underline">
                חזרה לאתר
              </button>
            )}
          </div>
        </header>
        <section className="mx-auto grid max-w-6xl items-center gap-12 px-6 py-14 md:grid-cols-2 md:py-28">
          <div>
            <p className="mb-3 text-sm font-bold tracking-widest text-[#7b4f35]">פרויקט מגורים • רמלה</p>
            <h1 className="text-5xl leading-tight font-semibold md:text-7xl">{TIFERET_PROJECT.name}</h1>
            <p className="mt-6 max-w-lg text-lg leading-8 text-stone-600">
              תכננו את הנגרות בדירה החדשה, בקנה מידה ובחוויה חזותית פשוטה.
            </p>
            <div className="mt-10 grid gap-4 sm:grid-cols-3">
              <div className="text-sm text-stone-600">
                <label htmlFor="tiferet-building" className="block">
                  מתחם / בניין
                </label>
                <select
                  id="tiferet-building"
                  value={building?.id ?? ''}
                  onChange={(event) => {
                    const nextBuilding = TIFERET_PROJECT.buildings.find((item) => item.id === event.target.value);
                    const nextFloor = nextBuilding?.floors[0];
                    const nextApartment = nextFloor?.apartments[0];
                    if (!nextBuilding || !nextFloor || !nextApartment) return;
                    setBuildingId(nextBuilding.id);
                    setFloorNumber(nextFloor.number);
                    activateApartment(nextApartment);
                  }}
                  className="mt-2 w-full rounded-xl border border-stone-300 bg-white px-4 py-3 text-stone-800"
                >
                  {TIFERET_PROJECT.buildings.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="text-sm text-stone-600">
                <label htmlFor="tiferet-floor" className="block">
                  קומה
                </label>
                <select
                  id="tiferet-floor"
                  value={String(floor?.number ?? '')}
                  onChange={(event) => {
                    const nextFloor = building?.floors.find((item) => item.number === Number(event.target.value));
                    const nextApartment = nextFloor?.apartments[0];
                    if (!nextFloor || !nextApartment) return;
                    setFloorNumber(nextFloor.number);
                    activateApartment(nextApartment);
                  }}
                  className="mt-2 w-full rounded-xl border border-stone-300 bg-white px-4 py-3 text-stone-800"
                >
                  {building?.floors.map((item) => (
                    <option key={item.id} value={item.number}>
                      קומה {item.number}
                    </option>
                  ))}
                </select>
              </div>
              <div className="text-sm text-stone-600">
                <label htmlFor="tiferet-apartment" className="block">
                  דירה
                </label>
                <select
                  id="tiferet-apartment"
                  value={apartment.id}
                  onChange={(event) => {
                    const nextApartment = floor?.apartments.find((item) => item.id === event.target.value);
                    if (nextApartment) activateApartment(nextApartment);
                  }}
                  className="mt-2 w-full rounded-xl border border-stone-300 bg-white px-4 py-3 text-stone-800"
                >
                  {floor?.apartments.map((item) => (
                    <option key={item.id} value={item.id}>
                      {apartmentSourceLabel(item)}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="mt-5 grid gap-2 rounded-2xl border border-stone-300 bg-white/70 p-4 text-sm text-stone-700 sm:grid-cols-3">
              <p>
                <span className="font-bold text-stone-900">
                  {SOURCE_INVENTORY_SUMMARY.totalSourcePdfs} קבצי PDF נסרקו מהמקור
                </span>
              </p>
              <p>
                <span className="font-bold text-stone-900">
                  {UNRESOLVED_APARTMENT_SOURCE_COUNT} תוכניות דירה טרם שוחזרו לגאומטריה אדריכלית
                </span>
              </p>
              <p>
                <span className="font-bold text-stone-900">
                  {apartmentSourceLabel(apartment)} זמינה כמודל עבודה; האימות האדריכלי המלא עדיין בהמתנה
                </span>
              </p>
            </div>
            <button
              onClick={() => setStarted(true)}
              className="mt-8 rounded-xl bg-[#7b4f35] px-9 py-4 text-lg font-bold text-white shadow-lg hover:bg-[#653e28]"
            >
              התחל לתכנן ←
            </button>
          </div>
          <div className="relative hidden aspect-square rounded-[3rem] bg-[#d9c8ac] p-8 shadow-2xl md:block">
            <div className="h-full overflow-hidden rounded-[2rem] border-[14px] border-white/80 bg-[#eee6d7] p-4">
              <ApartmentThumbnail apartment={apartment} />
            </div>
            <span className="absolute right-10 bottom-8 rounded-full bg-white px-5 py-3 text-sm shadow">
              {apartmentSourceLabel(apartment)} • {building?.name}
            </span>
          </div>
        </section>
      </main>
    );
  return (
    <main className="min-h-screen bg-[#eeeae2] text-stone-800" dir="rtl">
      <header className="sticky top-0 z-30 flex flex-wrap items-center justify-between gap-2 border-b border-stone-200 bg-white/95 px-4 py-3 backdrop-blur md:px-8">
        <div className="flex items-center gap-3">
          <BrandMark compact />
          <div>
            <strong className="block text-lg text-[#5f402f]">נגרות תפארת</strong>
            <p className="text-xs text-stone-500">
              {initialApartment
                ? `${apartment.source.building} • קומה ${apartment.source.floor} • ${apartment.name}`
                : `${building?.name} • קומה ${floor?.number} • ${apartmentSourceLabel(apartment)}`}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap justify-end gap-2">
          <button
            type="button"
            onClick={() => setShowDesignLibrary(true)}
            className="rounded-xl border border-stone-300 bg-white px-4 py-2 font-bold text-stone-700"
          >
            גרסאות ושיתוף
          </button>
          <button onClick={save} className="rounded-xl bg-[#7b4f35] px-5 py-2 font-bold text-white">
            שמור תכנון
          </button>
          {onSummary && (
            <button
              onClick={onSummary}
              className="rounded-xl border border-[#7b4f35] px-4 py-2 font-bold text-[#6b4e3d]"
            >
              סיכום
            </button>
          )}
          {onExit && (
            <button onClick={onExit} className="rounded-xl border border-stone-300 px-4 py-2 font-bold text-stone-600">
              חזרה לדירה שלי
            </button>
          )}
        </div>
        <div className="flex w-full items-center justify-between gap-3 border-t border-stone-200 pt-2">
          <div
            className="overflow-x-auto rounded-xl bg-stone-100 p-1 whitespace-nowrap"
            role="group"
            aria-label="מצב תצוגה"
          >
            {!initialApartment && (
              <button
                type="button"
                aria-pressed={view === 'overlay'}
                onClick={() => setView('overlay')}
                className={`rounded-lg px-3 py-2 text-sm ${view === 'overlay' ? 'bg-white shadow' : ''}`}
              >
                בדיקת חפיפה
              </button>
            )}
            <button
              type="button"
              aria-pressed={view === 'clean'}
              onClick={() => setView('clean')}
              className={`rounded-lg px-3 py-2 text-sm ${view === 'clean' ? 'bg-white shadow' : ''}`}
            >
              תצוגה נקייה
            </button>
            {!initialApartment && (
              <button
                type="button"
                aria-pressed={view === 'full'}
                onClick={() => setView('full')}
                className={`rounded-lg px-3 py-2 text-sm ${view === 'full' ? 'bg-white shadow' : ''}`}
              >
                תצוגה מלאה
              </button>
            )}
            <button
              type="button"
              aria-pressed={view === '3d'}
              onClick={() => setView('3d')}
              className={`rounded-lg px-3 py-2 text-sm ${view === '3d' ? 'bg-white shadow' : ''}`}
            >
              הדמיית 3D
            </button>
          </div>
          <div
            className="flex shrink-0 rounded-xl border border-stone-200 bg-white p-1"
            role="group"
            aria-label="היסטוריית שינויים"
          >
            <button
              type="button"
              aria-label="בטל שינוי"
              title="בטל שינוי"
              disabled={historyRef.current.past.length === 0}
              onClick={undo}
              className="rounded-lg px-3 py-2 font-bold text-stone-700 hover:bg-stone-100 disabled:text-stone-300"
            >
              ↶
            </button>
            <button
              type="button"
              aria-label="בצע שוב"
              title="בצע שוב"
              disabled={historyRef.current.future.length === 0}
              onClick={redo}
              className="rounded-lg px-3 py-2 font-bold text-stone-700 hover:bg-stone-100 disabled:text-stone-300"
            >
              ↷
            </button>
          </div>
        </div>
      </header>
      {showDesignLibrary && (
        <DesignLibraryPanel
          library={designLibrary}
          designName={designName}
          onNameChange={setDesignName}
          onSaveAsNew={saveAsNewVersion}
          onLoad={loadDesignVersion}
          onDelete={deleteDesignVersion}
          onExport={exportActiveDesign}
          onImport={(file) => void importDesignVersion(file)}
          onImportPdf={(file) => void importArchitecturalPdf(file)}
          pdfImportDraft={pdfImportDraft}
          pdfImportState={pdfImportState}
          onClose={() => setShowDesignLibrary(false)}
        />
      )}
      {showFurnitureCatalog && selectedRoom && (
        <FurnitureCatalogPanel
          roomName={selectedRoom.name}
          onAdd={addFurniture}
          onClose={() => setShowFurnitureCatalog(false)}
        />
      )}
      <div
        className={`grid min-h-[calc(100vh-8rem)] ${view === 'full' || view === 'overlay' ? 'lg:grid-cols-1' : 'lg:grid-cols-[16rem_minmax(0,1fr)_19rem]'}`}
      >
        <aside
          className={`${view === 'full' || view === 'overlay' ? 'hidden' : ''} order-3 min-w-0 border-e border-stone-200 bg-white p-4 lg:order-1 lg:p-5`}
          data-testid="planner-room-panel"
        >
          <p className="text-xs font-bold tracking-widest text-[#7b4f35]">חדרים בדירה</p>
          <h2 className="mt-2 text-2xl font-semibold">בחרו חדר</h2>
          {roomId && (
            <button
              type="button"
              onClick={() => {
                setRoomId(null);
                setWallId(null);
                setActivePlacementId(null);
                setActiveFurnitureId(null);
              }}
              className="mt-3 text-sm font-semibold text-[#75472e] underline underline-offset-4"
            >
              הצג את כל הדירה
            </button>
          )}
          <div className="mt-4 flex gap-2 overflow-x-auto pb-2 lg:block lg:space-y-2 lg:overflow-visible">
            {apartment.rooms.map((room) => (
              <button
                key={room.id}
                type="button"
                data-testid={`room-select-${room.id}`}
                onClick={() => {
                  setRoomId(room.id);
                  setWallId(null);
                  setActivePlacementId(null);
                  setActiveFurnitureId(null);
                }}
                className={`w-auto shrink-0 rounded-xl px-4 py-3 text-start whitespace-nowrap lg:w-full ${room.id === roomId ? 'bg-[#efe4d6] font-bold text-[#75472e]' : 'hover:bg-stone-100'}`}
              >
                {room.name}
              </button>
            ))}
          </div>
          <div className="mt-6 rounded-2xl border border-stone-200 bg-stone-50 p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="font-bold text-stone-800">ריהוט והלבשה</p>
                <p className="text-xs leading-5 text-stone-500">מיטות, סלון, מטבח וחדרי רחצה</p>
              </div>
              <button
                type="button"
                role="switch"
                aria-label="הצג ריהוט מלא"
                aria-checked={showFurniture}
                onClick={toggleAllFurniture}
                className={`relative h-7 w-12 shrink-0 rounded-full transition ${showFurniture ? 'bg-[#7b4f35]' : 'bg-stone-300'}`}
              >
                <span
                  aria-hidden="true"
                  className={`absolute top-1 h-5 w-5 rounded-full bg-white shadow transition-all ${showFurniture ? 'start-6' : 'start-1'}`}
                />
              </button>
            </div>
            <button
              type="button"
              disabled={!selectedRoom}
              onClick={() => setShowFurnitureCatalog(true)}
              className="mt-4 w-full rounded-xl bg-[#7b4f35] px-4 py-3 font-bold text-white disabled:cursor-not-allowed disabled:bg-stone-300"
            >
              הוסף ריהוט
            </button>
            <div className="mt-4" role="group" aria-label="ערכת צבעים לריהוט">
              <p className="mb-2 text-xs font-semibold text-stone-600">אווירת צבע</p>
              <div className="grid grid-cols-3 gap-1">
                {(
                  [
                    ['warm', 'חם'],
                    ['light', 'בהיר'],
                    ['sage', 'מרווה'],
                  ] as const
                ).map(([palette, label]) => (
                  <button
                    key={palette}
                    type="button"
                    aria-pressed={furniturePalette === palette}
                    onClick={() => {
                      if (furniturePalette === palette) return;
                      recordHistory();
                      setFurniturePalette(palette);
                    }}
                    className={`rounded-lg px-2 py-2 text-xs font-bold ${furniturePalette === palette ? 'bg-stone-800 text-white' : 'border border-stone-200 bg-white text-stone-600'}`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
            <SceneLayersPanel
              visibility={visibility}
              onToggleCategory={(category) => {
                recordHistory();
                setVisibility((current) => toggleSceneCategory(current, category));
                if (activeFurniture && sceneCategoryForFurniture(activeFurniture.kind) === category) {
                  setActiveFurnitureId(null);
                }
              }}
              onShowAll={() => {
                recordHistory();
                setVisibility(createDefaultVisibility());
                setNotice('כל שכבות התכנון מוצגות');
              }}
            />
          </div>
          <div className="mt-4 rounded-2xl border border-stone-200 bg-white p-4">
            <p className="font-bold text-stone-800">שכבות שרטוט</p>
            <p className="mt-1 text-xs leading-5 text-stone-500">הציגו רק את המידע הדרוש בלי לשנות את מידות התוכנית.</p>
            <div className="mt-3 space-y-2">
              {(
                [
                  ['doorSwings', 'הצג קשתות דלת'],
                  ['dimensions', 'הצג מידות'],
                  ['labels', 'הצג שמות חדרים'],
                ] as const
              ).map(([layer, label]) => (
                <div key={layer} className="flex items-center justify-between gap-3 py-1">
                  <span className="text-sm text-stone-700">{label}</span>
                  <button
                    type="button"
                    role="switch"
                    aria-label={label}
                    aria-checked={cleanPlanLayers[layer]}
                    onClick={() => setCleanPlanLayers((current) => ({ ...current, [layer]: !current[layer] }))}
                    className={`relative h-7 w-12 shrink-0 rounded-full transition ${cleanPlanLayers[layer] ? 'bg-[#7b4f35]' : 'bg-stone-300'}`}
                  >
                    <span
                      aria-hidden="true"
                      className={`absolute top-1 h-5 w-5 rounded-full bg-white shadow transition-all ${cleanPlanLayers[layer] ? 'start-6' : 'start-1'}`}
                    />
                  </button>
                </div>
              ))}
            </div>
          </div>
          <div className="mt-8 border-t pt-5 text-sm text-stone-500">
            <p>{savedLabel} בתכנון</p>
            <p className="mt-1">{addedFurnitureLabel}</p>
            <button
              type="button"
              onClick={() => {
                if (!window.confirm(`לאפס את תכנון ${apartment.name} במכשיר הזה?`)) return;
                recordHistory();
                setPlacements([]);
                setAddedFurniture([]);
                setFurnitureOverrides([]);
                setVisibility(createDefaultVisibility());
                setFurniturePalette('warm');
                setCameraByRoom({});
                setActivePlacementId(null);
                setActiveFurnitureId(null);
                setShowFurnitureCatalog(false);
                localStorage.removeItem(designStorageKey(apartment.id));
                setEditError('');
                setNotice('התכנון אופס');
              }}
              className="mt-3 text-red-700 underline"
            >
              אפס תכנון
            </button>
          </div>
        </aside>
        <section
          data-testid="planner-canvas"
          className={`order-1 min-h-96 min-w-0 p-3 sm:p-4 lg:sticky lg:top-32 lg:order-2 lg:h-[calc(100vh-8rem)] lg:min-h-[32rem] lg:self-start ${view === 'full' || view === 'overlay' ? 'lg:p-4' : 'lg:p-7'}`}
        >
          {view === 'clean' ? (
            <Plan2D
              apartment={apartment}
              placements={placements}
              furniture={furniture}
              visibility={visibility}
              roomId={roomId}
              wallId={wallId}
              activePlacementId={active?.id ?? null}
              activeFurnitureId={activeFurniture?.id ?? null}
              showFurniture={showFurniture}
              showDoorSwings={cleanPlanLayers.doorSwings}
              showDimensions={cleanPlanLayers.dimensions}
              showLabels={cleanPlanLayers.labels}
              furniturePalette={furniturePalette}
              onRoom={(id) => {
                setRoomId(id);
                setWallId(null);
                setActivePlacementId(null);
                setActiveFurnitureId(null);
              }}
              onWall={(id) => {
                const room = apartment.rooms.find((item) => item.wallIds.includes(id));
                setRoomId(room?.id ?? null);
                setWallId(id);
                setActiveFurnitureId(null);
                setActivePlacementId(
                  [...placements].reverse().find((placement) => placement.wallId === id)?.id ?? null,
                );
              }}
              onPlacement={(id) => {
                const placement = placements.find((item) => item.id === id);
                setActivePlacementId(id);
                setActiveFurnitureId(null);
                setRoomId(placement?.roomId ?? null);
                setWallId(placement?.wallId ?? null);
              }}
              onFurniture={(id) => {
                const item = furniture.find((candidate) => candidate.id === id);
                setActiveFurnitureId(id);
                setActivePlacementId(null);
                setRoomId(item?.roomId ?? null);
                setWallId(null);
                setEditError('');
              }}
              onFurnitureMoveStart={() => recordHistory()}
              onFurnitureMove={(id, x, y) => {
                const item = furniture.find((candidate) => candidate.id === id);
                if (item) updateFurniture(item, x, y, item.rotation, false);
              }}
            />
          ) : view === 'overlay' ? (
            <SourceComparisonPlan apartment={apartment} />
          ) : view === 'full' ? (
            <FullSourcePlan />
          ) : (
            <Room3D
              apartment={sceneApartment}
              roomId={roomId}
              placements={visiblePlacements}
              showFurniture
              furniturePalette={furniturePalette}
              selectedObjectId={activeFurniture?.id ?? active?.id ?? null}
              initialCamera={roomId ? cameraByRoom[roomId] : undefined}
              onCameraChange={(cameraRoomId, camera) => {
                setCameraByRoom((current) => {
                  const savedCamera = current[cameraRoomId];
                  if (
                    savedCamera?.yaw === camera.yaw &&
                    savedCamera.pitch === camera.pitch &&
                    savedCamera.zoom === camera.zoom
                  ) {
                    return current;
                  }
                  return { ...current, [cameraRoomId]: camera };
                });
              }}
            />
          )}
        </section>
        <aside
          className={`${view === 'full' || view === 'overlay' ? 'hidden' : ''} order-2 min-w-0 border-s border-stone-200 bg-white p-4 lg:order-3 lg:p-5`}
          data-testid="planner-context-panel"
        >
          <p className="text-xs font-bold tracking-widest text-[#7b4f35]">
            {activeFurniture ? 'פריט נבחר' : (selectedRoom?.name ?? 'פרטי תכנון')}
          </p>
          <h2 className="mt-2 text-2xl font-semibold">
            {activeFurniture
              ? activeFurniture.label
              : selectedWall
                ? `הקיר הנבחר: ${Math.round(wallLength(selectedWall) / 10)} ס״מ`
                : 'בחרו קיר בתכנית'}
          </h2>
          {activeFurniture ? (
            <div className="mt-5">
              <FurnitureEditor
                item={activeFurniture}
                onPositionChange={(x, y) => updateFurniture(activeFurniture, x, y, activeFurniture.rotation)}
                onRotationChange={(rotation) =>
                  updateFurniture(activeFurniture, activeFurniture.x, activeFurniture.y, rotation)
                }
                onHide={() => {
                  recordHistory();
                  setVisibility((current) => toggleObjectVisibility(current, activeFurniture.id));
                  setActiveFurnitureId(null);
                  setNotice(`${activeFurniture.label} הוסתר. אפשר לשחזר אותו מפאנל השכבות`);
                }}
                onDuplicate={() => duplicateFurniture(activeFurniture)}
                onDelete={
                  addedFurniture.some((item) => item.id === activeFurniture.id)
                    ? () => deleteFurniture(activeFurniture)
                    : undefined
                }
              />
            </div>
          ) : null}
          {!activeFurniture && selectedRoom && (
            <div className="mt-4 grid grid-cols-2 gap-2" aria-label={`קירות ${selectedRoom.name}`}>
              {selectedRoom.wallIds.map((candidateWallId, index) => {
                const candidateWall = apartment.walls.find((wall) => wall.id === candidateWallId);
                if (!candidateWall) return null;
                return (
                  <button
                    key={candidateWall.id}
                    type="button"
                    data-testid={`wall-list-${candidateWall.id}`}
                    onClick={() => {
                      setWallId(candidateWall.id);
                      setActiveFurnitureId(null);
                      setActivePlacementId(
                        [...placements].reverse().find((placement) => placement.wallId === candidateWall.id)?.id ??
                          null,
                      );
                    }}
                    className={`rounded-lg border px-3 py-2 text-sm font-semibold ${candidateWall.id === wallId ? 'border-[#a86640] bg-[#f4e7da] text-[#75472e]' : 'border-stone-200 bg-stone-50 text-stone-600 hover:bg-stone-100'}`}
                  >
                    קיר {index + 1} · {Math.round(wallLength(candidateWall) / 10)} ס״מ
                  </button>
                );
              })}
            </div>
          )}
          {!activeFurniture && selectedWall && !active && (
            <button
              type="button"
              onClick={addCabinet}
              className="mt-6 w-full rounded-xl bg-[#7b4f35] py-4 font-bold text-white"
            >
              ＋ הוסף ארון
            </button>
          )}
          {!activeFurniture && selectedWall && active && (
            <button
              type="button"
              onClick={addCabinet}
              className="mt-6 w-full rounded-xl bg-[#7b4f35] py-3 font-bold text-white"
            >
              ＋ הוסף ארון לקיר הנבחר
            </button>
          )}
          {!activeFurniture && active && (
            <div className="mt-6 space-y-4">
              <h3 className="font-bold">הגדרת הארון</h3>
              {activeDerivation && (
                <p className="text-sm text-stone-500">
                  מחושב במנוע הנגרות המקצועי • {activeDerivation.parts.length} חלקי ייצור
                </p>
              )}
              <button
                type="button"
                onClick={deleteActivePlacement}
                className="w-full rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm font-bold text-red-700 hover:bg-red-100"
              >
                מחק ארון נבחר
              </button>
              <label className="block text-sm">
                סוג נגרות
                <select
                  value={active.cabinetConfig.furnitureType}
                  onChange={(event) => updateSelect('furnitureType', event.target.value as FurnitureType)}
                  className="mt-1 w-full rounded-lg border p-2"
                >
                  <option value="wardrobe">ארון קיר</option>
                  <option value="cabinet">ארון כללי</option>
                  <option value="bookshelf">ספרייה</option>
                </select>
              </label>
              {(
                [
                  ['width', 'רוחב', 60, 300],
                  ['height', 'גובה', 180, 280],
                  ['depth', 'עומק', 35, 80],
                  ['distanceFromWallStart', 'מרחק מתחילת הקיר', 0, 300],
                  ['shelfCount', 'מדפים', 0, 12],
                  ['drawerCount', 'מגירות', 0, 6],
                ] as const
              ).map(([key, label, min, max]) => (
                <label key={key} className="block text-sm text-stone-600">
                  {label} {['width', 'height', 'depth', 'distanceFromWallStart'].includes(key) ? '(ס״מ)' : ''}
                  <input
                    aria-label={label}
                    type="number"
                    min={min}
                    max={max}
                    value={
                      key === 'distanceFromWallStart'
                        ? active.distanceFromWallStart / 10
                        : ['width', 'height', 'depth'].includes(key)
                          ? active.cabinetConfig[key] / 10
                          : active.cabinetConfig[key]
                    }
                    onChange={(event) =>
                      updateNumber(
                        key,
                        ['width', 'height', 'depth', 'distanceFromWallStart'].includes(key)
                          ? Number(event.target.value) * 10
                          : Number(event.target.value),
                      )
                    }
                    className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2 text-lg"
                  />
                </label>
              ))}
              <label className="block text-sm">
                מספר דלתות
                <select
                  value={active.cabinetConfig.doorCount}
                  onChange={(event) => updateNumber('doorCount', Number(event.target.value))}
                  className="mt-1 w-full rounded-lg border p-2"
                >
                  <option value="1">דלת אחת</option>
                  <option value="2">שתי דלתות</option>
                </select>
              </label>
              <label className="block text-sm">
                סגנון דלת
                <select
                  value={active.cabinetConfig.doorStyle}
                  onChange={(event) => updateSelect('doorStyle', event.target.value as DoorStyle)}
                  className="mt-1 w-full rounded-lg border p-2"
                >
                  <option value="flat">חלק</option>
                  <option value="shaker">מסגרת</option>
                  <option value="glass">זכוכית</option>
                  <option value="none">פתוח</option>
                </select>
              </label>
              <label className="block text-sm">
                ידיות
                <select
                  value={active.cabinetConfig.handleStyle}
                  onChange={(event) => updateSelect('handleStyle', event.target.value as HandleStyle)}
                  className="mt-1 w-full rounded-lg border p-2"
                >
                  <option value="bar">ידית בר</option>
                  <option value="knob">כפתור</option>
                  <option value="cup">שקע</option>
                  <option value="none">ללא</option>
                </select>
              </label>
              <label className="block text-sm">
                גמר
                <select
                  value={active.cabinetConfig.carcassMaterial}
                  onChange={(event) => updateSelect('carcassMaterial', event.target.value)}
                  className="mt-1 w-full rounded-lg border p-2"
                >
                  {PANEL_MATERIALS.map((m) => (
                    <option key={m.key} value={m.key}>
                      {m.name.he}
                    </option>
                  ))}
                </select>
              </label>
              <div role="group" aria-label="בחירת צבע וגמר לארון">
                <p className="mb-2 text-sm text-stone-600">בחירת צבע חזותית</p>
                <div className="flex flex-wrap gap-2">
                  {PANEL_MATERIALS.map((material) => (
                    <button
                      key={material.key}
                      type="button"
                      aria-label={`בחר גמר ${material.name.he}`}
                      aria-pressed={active.cabinetConfig.carcassMaterial === material.key}
                      title={material.name.he}
                      onClick={() => updateSelect('carcassMaterial', material.key)}
                      className={`h-9 w-9 rounded-full border-2 shadow-sm transition hover:scale-105 ${active.cabinetConfig.carcassMaterial === material.key ? 'border-stone-900 ring-2 ring-amber-600 ring-offset-2' : 'border-white'}`}
                      style={{ backgroundColor: material.color }}
                    />
                  ))}
                </div>
              </div>
            </div>
          )}
          {editError && (
            <p role="alert" className="mt-5 rounded-lg bg-red-50 p-3 text-sm font-bold text-red-700">
              {editError}
            </p>
          )}
          {notice && (
            <p role="status" className="mt-5 rounded-xl bg-emerald-50 p-3 text-sm text-emerald-800">
              {notice}
            </p>
          )}
        </aside>
      </div>
      <footer className="border-t bg-[#39332e] px-6 py-3 text-center text-xs text-stone-200">
        המידות והתכנון באתר מיועדים להמחשה ולתכנון ראשוני בלבד. לפני ייצור והזמנת נגרות יש לבצע מדידה מקצועית בדירה
        בפועל.
      </footer>
    </main>
  );
}
