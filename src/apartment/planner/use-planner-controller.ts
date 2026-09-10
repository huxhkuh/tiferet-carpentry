import { useEffect, useMemo, useRef, useState } from 'react';
import { MATERIALS } from '../../engine/materials';
import type { CabinetConfig, DoorStyle, FurnitureType, HandleStyle } from '../../engine/types';
import type {
  Apartment,
  CabinetPlacement,
  DesignVisibility,
  FurnitureOverride,
  FurnitureKind,
  FurniturePalette,
  FurniturePlacement,
  RoomCameraOrbit,
  SavedDesignV3,
  SavedDesignMetadata,
  SceneObjectCategory,
} from '../types';
import { TIFERET_5_1, TIFERET_PROJECT } from '../data/tiferet';
import { createCabinetPlacement, deriveCabinet, updateCabinetPlacement } from '../cabinet/adapter';
import { validatePlacement } from '../geometry/placement';
import { validateCabinetInRoom, validateFurnitureMove } from '../geometry/scene-collision';
import { rotateFurniture } from '../furniture/transform';
import type { ArchitecturalPdfImportDraft } from '../import/pdf-import';
import { analyzePdfFile } from '../import/pdf-import-service';
import { deserializeDesign, SAVED_DESIGN_SCHEMA_VERSION } from '../persistence/design';
import { addDesignVersion, removeDesignVersion, selectDesignVersion } from '../persistence/design-library';
import {
  applyFurnitureOverrides,
  createDefaultVisibility,
  isSceneObjectVisible,
  sceneCategoryForFurniture,
  upsertFurnitureOverride,
} from '../planner/design-state';

import {
  getImplementedApartmentSourcePlans,
  getSourceInventorySummary,
  TIFERET_SOURCE_INVENTORY,
} from '../data/tiferet-source-inventory';

import { placeFurnitureInRoom } from '../furniture/catalog';
import {
  browserDesignStorage,
  restorePlanningDocument,
  savePlanningDocument,
  serializePlanningDocument,
  deserializePlanningDocument,
} from '../persistence/planning-document';
import { useDraftPersistence } from '../planner/use-draft-persistence';
import { designValidationError } from '../planner/design-validation';
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
function createDesignVersionId(existingDesigns: readonly SavedDesignV3[]): string {
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
export function usePlannerController({
  onExit,
  initialStarted = false,
  initialRoomId = null,
  initialApartment,
  onSummary,
  onApartmentChange,
  initialDesignId,
  onRoomChange,
  onDesignChange,
}: {
  onExit?: () => void;
  initialStarted?: boolean;
  initialRoomId?: string | null;
  initialApartment?: Apartment;
  onSummary?: () => void;
  onApartmentChange?: (id: string) => void;
  initialDesignId?: string;
  onRoomChange?: (id: string) => void;
  onDesignChange?: (id: string) => void;
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
  const [roomId, setRoomIdState] = useState<string | null>(() =>
    startingApartment.rooms.some((room) => room.id === initialRoomId) ? initialRoomId : null,
  );
  const [mobilePanel, setMobilePanel] = useState<'rooms' | 'inspector' | null>(null);
  const [wallId, setWallIdState] = useState<string | null>(null);
  const setWallId = (id: string | null) => {
    setWallIdState(id);
    if (id) setMobilePanel('inspector');
  };
  const [seedDocument] = useState(() => restorePlanningDocument(browserDesignStorage(), startingApartment));
  const seedDesign =
    (initialDesignId ? seedDocument.library.designs.find((design) => design.id === initialDesignId) : undefined) ??
    seedDocument.draft;
  const [placements, setPlacements] = useState<CabinetPlacement[]>(seedDesign?.placements ?? []);
  const [addedFurniture, setAddedFurniture] = useState<FurniturePlacement[]>(seedDesign?.addedFurniture ?? []);
  const [furnitureOverrides, setFurnitureOverrides] = useState(seedDesign?.furnitureOverrides ?? []);
  const [visibility, setVisibility] = useState<DesignVisibility>(seedDesign?.visibility ?? createDefaultVisibility());
  const [furniturePalette, setFurniturePalette] = useState<FurniturePalette>(seedDesign?.furniturePalette ?? 'warm');
  const [cameraByRoom, setCameraByRoom] = useState<Record<string, RoomCameraOrbit>>(seedDesign?.cameraByRoom ?? {});
  const [designLibrary, setDesignLibrary] = useState(() =>
    initialDesignId && seedDocument.library.designs.some((design) => design.id === initialDesignId)
      ? selectDesignVersion(seedDocument.library, initialDesignId)
      : seedDocument.library,
  );
  const [designName, setDesignName] = useState(seedDesign?.name ?? `תכנון ${startingApartment.name}`);
  const [designMetadata, setDesignMetadata] = useState<SavedDesignMetadata>(seedDesign?.metadata ?? {});
  const [showDesignLibrary, setShowDesignLibrary] = useState(false);
  const [showFurnitureCatalog, setShowFurnitureCatalog] = useState(false);
  const [pdfImportDraft, setPdfImportDraft] = useState<ArchitecturalPdfImportDraft | null>(null);
  const [pdfImportState, setPdfImportState] = useState<'idle' | 'reading' | 'ready' | 'error'>('idle');
  const pdfImportRequest = useRef<AbortController | null>(null);
  useEffect(() => () => pdfImportRequest.current?.abort(), []);
  const [cleanPlanLayers, setCleanPlanLayers] = useState({
    doorSwings: true,
    dimensions: true,
    labels: true,
  });
  const historyRef = useRef<DesignHistory>({ past: [], future: [] });
  const [activePlacementId, setActivePlacementIdState] = useState<string | null>(null);
  const [activeFurnitureId, setActiveFurnitureIdState] = useState<string | null>(null);
  const setActivePlacementId = (id: string | null) => {
    setActivePlacementIdState(id);
    if (id) setMobilePanel('inspector');
  };
  const setActiveFurnitureId = (id: string | null) => {
    setActiveFurnitureIdState(id);
    if (id) setMobilePanel('inspector');
  };
  const [notice, setNotice] = useState('');
  const [editError, setEditError] = useState(
    initialDesignId && !seedDocument.library.designs.some((design) => design.id === initialDesignId)
      ? 'הגרסה שבקישור אינה זמינה במכשיר זה. הטיוטה המקומית מוצגת.'
      : '',
  );
  const setRoomId = (id: string | null) => {
    setRoomIdState(id);
    if (id && id !== roomId && apartment.rooms.some((room) => room.id === id)) onRoomChange?.(id);
  };
  useEffect(() => {
    if (initialRoomId && apartment.rooms.some((room) => room.id === initialRoomId)) setRoomIdState(initialRoomId);
  }, [initialRoomId, apartment]);
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
      ...visibility,
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
  const isObjectLocked = (id: string) => visibility.lockedObjectIds?.includes(id) ?? false;
  const toggleObjectLock = (id: string) => {
    if (!placements.some((item) => item.id === id) && !furniture.some((item) => item.id === id)) return;
    recordHistory();
    const locked = isObjectLocked(id);
    setVisibility((current) => ({
      ...current,
      lockedObjectIds: locked
        ? current.lockedObjectIds?.filter((candidate) => candidate !== id)
        : [...(current.lockedObjectIds ?? []), id],
    }));
    setEditError('');
    setNotice(locked ? 'הפריט שוחרר לעריכה' : 'הפריט ננעל. שחררו את הנעילה כדי לשנות או למחוק אותו');
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
    const saved = restorePlanningDocument(browserDesignStorage(), nextApartment);
    const savedDesign = saved.draft;
    const savedLibrary = saved.library;
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
    setDesignMetadata(savedDesign?.metadata ?? {});
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
        ...current,
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
    if (isObjectLocked(item.id)) return;
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
    if (!active || isObjectLocked(active.id)) return;
    recordHistory();
    setPlacements((items) => items.filter((item) => item.id !== active.id));
    setActivePlacementId(null);
    setNotice('הארון הוסר מהתכנון המקומי');
  };
  const updatePlacement = (configPatch: Partial<CabinetConfig>, distanceFromWallStart?: number) => {
    if (!active || !activeWall || !activeRoom || isObjectLocked(active.id)) return;
    try {
      let nextPlacement = updateCabinetPlacement(
        active,
        configPatch,
        activeWall,
        activeRoom,
        placements,
        apartment,
        furniture,
      );
      if (distanceFromWallStart !== undefined) {
        const placementError = validatePlacement(
          activeWall,
          nextPlacement.width,
          distanceFromWallStart,
          placements,
          active.id,
          { elevation: nextPlacement.elevation, height: nextPlacement.height },
        );
        if (placementError) throw new RangeError(placementError);
        nextPlacement = { ...nextPlacement, distanceFromWallStart };
      }
      const placementError = validateCabinetInRoom(
        apartment,
        activeRoom,
        activeWall,
        nextPlacement,
        placements,
        furniture,
      );
      if (placementError) throw new RangeError(placementError);
      recordHistory();
      setPlacements((items) => items.map((item) => (item.id === active.id ? nextPlacement : item)));
      setEditError('');
      setNotice('השינוי עודכן בתכנית');
    } catch (error) {
      setEditError(error instanceof Error ? error.message : 'לא ניתן לעדכן את הארון');
    }
  };
  const commitFurnitureUpdate = (
    item: FurniturePlacement,
    nextItem: FurniturePlacement,
    shouldRecordHistory = true,
  ) => {
    if (isObjectLocked(item.id)) return;
    const room = apartment.rooms.find((candidate) => candidate.id === item.roomId);
    if (!room) {
      setEditError('החדר של פריט הריהוט אינו קיים בתכנית');
      return;
    }
    const placementError = validateFurnitureMove(room, nextItem, placements, apartment, furniture);
    if (placementError) {
      setEditError(placementError);
      return;
    }
    if (shouldRecordHistory) recordHistory();
    setFurnitureOverrides((current) =>
      upsertFurnitureOverride(current, {
        id: item.id,
        x: nextItem.x,
        y: nextItem.y,
        rotation: nextItem.rotation,
        width: nextItem.width,
        depth: nextItem.depth,
        height: nextItem.height,
        elevation: nextItem.elevation,
        color: nextItem.color,
        accentColor: nextItem.accentColor,
        material: nextItem.material,
        style: nextItem.style,
      }),
    );
    setEditError('');
    setNotice(`${item.label} עודכן בתכנית`);
  };
  const updateFurniture = (
    item: FurniturePlacement,
    x: number,
    y: number,
    rotation: number,
    shouldRecordHistory = true,
  ) => {
    commitFurnitureUpdate(item, rotateFurniture({ ...item, x, y }, rotation), shouldRecordHistory);
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
  const createSavedDesign = (id: string, name: string): SavedDesignV3 => ({
    schemaVersion: SAVED_DESIGN_SCHEMA_VERSION,
    id,
    apartmentId: apartment.id,
    name,
    metadata: designMetadata,
    updatedAt: new Date().toISOString(),
    placements,
    addedFurniture,
    furnitureOverrides,
    visibility,
    furniturePalette,
    cameraByRoom,
  });
  const currentDocument = useMemo(
    () => ({
      schemaVersion: 1 as const,
      apartment,
      library: designLibrary,
      draft: {
        schemaVersion: SAVED_DESIGN_SCHEMA_VERSION,
        id: designLibrary.activeDesignId ?? 'draft',
        apartmentId: apartment.id,
        name: designName.trim() || 'תכנון ' + apartment.name,
        metadata: designMetadata,
        updatedAt: new Date().toISOString(),
        placements,
        addedFurniture,
        furnitureOverrides,
        visibility,
        furniturePalette,
        cameraByRoom,
      },
    }),
    [
      apartment,
      designLibrary,
      designName,
      designMetadata,
      placements,
      addedFurniture,
      furnitureOverrides,
      visibility,
      furniturePalette,
      cameraByRoom,
    ],
  );
  const draftStatus = useDraftPersistence(currentDocument);
  const getCurrentDesignError = () => designValidationError(apartment, currentDocument.draft);
  const leave = (navigate?: () => void) => {
    try {
      savePlanningDocument(browserDesignStorage(), currentDocument);
      navigate?.();
    } catch {
      setEditError('לא ניתן לשמור את הטיוטה. הורידו עותק לפני היציאה');
      setShowDesignLibrary(true);
    }
  };
  const applySavedDesign = (design: SavedDesignV3) => {
    historyRef.current = { past: [], future: [] };
    setPlacements(design.placements);
    setAddedFurniture(design.addedFurniture ?? []);
    setFurnitureOverrides(design.furnitureOverrides);
    setVisibility(design.visibility);
    setFurniturePalette(design.furniturePalette);
    setCameraByRoom(design.cameraByRoom);
    setDesignName(design.name);
    setDesignMetadata(design.metadata ?? {});
    setActivePlacementId(null);
    setActiveFurnitureId(null);
    setEditError('');
  };
  const persistDesignVersion = (design: SavedDesignV3): boolean => {
    try {
      const nextLibrary = addDesignVersion(designLibrary, design);
      savePlanningDocument(browserDesignStorage(), {
        schemaVersion: 1,
        apartment,
        draft: design,
        library: nextLibrary,
      });
      setDesignLibrary(nextLibrary);
      setDesignName(design.name);
      onDesignChange?.(design.id);
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
    const error = designValidationError(apartment, design);
    if (error) {
      setEditError(error);
      return;
    }
    try {
      savePlanningDocument(browserDesignStorage(), {
        schemaVersion: 1,
        apartment,
        draft: design,
        library: nextLibrary,
      });
    } catch {
      setEditError('לא ניתן לשמור את הגרסה שנבחרה');
      return;
    }
    applySavedDesign(design);
    setDesignLibrary(nextLibrary);
    setNotice(`הגרסה “${design.name}” נטענה`);
    onDesignChange?.(design.id);
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
      savePlanningDocument(browserDesignStorage(), {
        schemaVersion: 1,
        apartment,
        draft: deletedActiveDesign ? (nextActive ?? currentDocument.draft) : currentDocument.draft,
        library: nextLibrary,
      });
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
    const design = currentDocument.draft;
    if (typeof URL.createObjectURL !== 'function') {
      setEditError('אין גרסה פעילה לייצוא');
      return;
    }
    const objectUrl = URL.createObjectURL(
      new Blob([serializePlanningDocument(currentDocument)], { type: 'application/json' }),
    );
    const link = document.createElement('a');
    link.href = objectUrl;
    link.download = `tiferet-${apartment.source.sheet}-${design.id}.json`;
    link.click();
    URL.revokeObjectURL(objectUrl);
    setNotice('קובץ התכנון יוצא בהצלחה');
  };
  const importDesignVersion = async (file: File) => {
    try {
      if (file.size > 15 * 1024 * 1024) throw new Error('קובץ התכנון גדול מדי');
      const text = await file.text();
      const portable = deserializePlanningDocument(text);
      if (
        portable?.draft &&
        (portable.apartment.id !== apartment.id || JSON.stringify(portable.apartment) !== JSON.stringify(apartment))
      ) {
        const error = designValidationError(portable.apartment, portable.draft);
        if (error) {
          setEditError(error);
          return;
        }
        savePlanningDocument(browserDesignStorage(), currentDocument);
        savePlanningDocument(browserDesignStorage(), portable);
        if (onApartmentChange) onApartmentChange(portable.apartment.id);
        else activateApartment(portable.apartment);
        return;
      }
      const imported = portable?.draft ?? deserializeDesign(text);
      if (!imported || imported.apartmentId !== apartment.id) {
        setEditError('קובץ התכנון אינו תקין או שייך לדירה אחרת');
        return;
      }
      const design: SavedDesignV3 = {
        ...imported,
        id: createDesignVersionId(designLibrary.designs),
        name: `${imported.name} (מיובא)`,
        updatedAt: new Date().toISOString(),
      };
      const error = designValidationError(apartment, design);
      if (error) {
        setEditError(error);
        return;
      }
      if (!persistDesignVersion(design)) return;
      applySavedDesign(design);
      setNotice(`הגרסה “${design.name}” יובאה ונטענה`);
    } catch {
      setEditError('לא ניתן לקרוא את קובץ התכנון');
    }
  };
  const importArchitecturalPdf = async (file: File) => {
    pdfImportRequest.current?.abort();
    const request = new AbortController();
    pdfImportRequest.current = request;
    setPdfImportState('reading');
    setPdfImportDraft(null);
    setEditError('');
    try {
      const draft = await analyzePdfFile(file, request.signal);
      if (request.signal.aborted) return;
      setPdfImportDraft(draft);
      setPdfImportState('ready');
      setNotice(
        draft.status === 'draft-ready'
          ? 'ה-PDF נותח ונוצרה טיוטת ראיות לייבוא'
          : 'ה-PDF נקרא, אבל נדרש סבב בדיקה לפני בניית מודל דירה',
      );
    } catch (error) {
      if (request.signal.aborted) return;
      setPdfImportState('error');
      setEditError(error instanceof Error ? error.message : 'לא ניתן לקרוא את קובץ ה-PDF');
    }
  };

  return {
    cancelPdfImport: () => {
      pdfImportRequest.current?.abort();
      setPdfImportState('idle');
    },
    mobilePanel,
    setMobilePanel,
    designMetadata,
    setDesignMetadata,
    SOURCE_INVENTORY_SUMMARY,
    UNRESOLVED_APARTMENT_SOURCE_COUNT,
    PANEL_MATERIALS,
    started,
    setStarted,
    view,
    setView,
    setBuildingId,
    building,
    setFloorNumber,
    floor,
    apartment,
    roomId,
    setRoomId,
    wallId,
    setWallId,
    placements,
    setPlacements,
    addedFurniture,
    setAddedFurniture,
    setFurnitureOverrides,
    visibility,
    setVisibility,
    furniturePalette,
    setFurniturePalette,
    cameraByRoom,
    setCameraByRoom,
    designLibrary,
    designName,
    setDesignName,
    showDesignLibrary,
    setShowDesignLibrary,
    showFurnitureCatalog,
    setShowFurnitureCatalog,
    pdfImportDraft,
    pdfImportState,
    cleanPlanLayers,
    setCleanPlanLayers,
    historyRef,
    activePlacementId,
    setActivePlacementId,
    activeFurnitureId,
    setActiveFurnitureId,
    notice,
    setNotice,
    editError,
    setEditError,
    furniture,
    visiblePlacements,
    sceneApartment,
    showFurniture,
    selectedWall,
    selectedRoom,
    active,
    activeFurniture,
    activeDerivation,
    savedLabel,
    addedFurnitureLabel,
    recordHistory,
    isObjectLocked,
    toggleObjectLock,
    undo,
    redo,
    toggleAllFurniture,
    activateApartment,
    addFurniture,
    duplicateFurniture,
    deleteFurniture,
    addCabinet,
    deleteActivePlacement,
    commitFurnitureUpdate,
    updateFurniture,
    updateNumber,
    updateSelect,
    draftStatus,
    leave,
    save,
    saveAsNewVersion,
    loadDesignVersion,
    deleteDesignVersion,
    exportActiveDesign,
    importDesignVersion,
    importArchitecturalPdf,
    onExit,
    initialApartment,
    onSummary,
  };
}
export type PlannerController = ReturnType<typeof usePlannerController>;
