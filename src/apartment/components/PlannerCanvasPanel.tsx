import { resizeFurniture } from '../furniture/transform';

import { FullSourcePlan } from '../components/FullSourcePlan';
import { Plan2D } from '../components/Plan2D';
import { Room3D } from '../components/Room3D';

import { SourceComparisonPlan } from '../components/SourceComparisonPlan';

import type { PlannerController } from '../planner/use-planner-controller';
export function PlannerCanvasPanel({ controller }: { controller: PlannerController }) {
  const {
    view,
    setView,
    apartment,
    roomId,
    setRoomId,
    wallId,
    setWallId,
    placements,
    visibility,
    furniturePalette,
    cameraByRoom,
    setCameraByRoom,
    cleanPlanLayers,
    setActivePlacementId,
    setActiveFurnitureId,
    setEditError,
    furniture,
    visiblePlacements,
    sceneApartment,
    showFurniture,
    active,
    activeFurniture,
    recordHistory,
    commitFurnitureUpdate,
    updateFurniture,
  } = controller;
  return (
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
            setActivePlacementId([...placements].reverse().find((placement) => placement.wallId === id)?.id ?? null);
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
          onFurnitureResizeStart={() => recordHistory()}
          onFurnitureResize={(id, width, depth) => {
            const item = furniture.find((candidate) => candidate.id === id);
            if (!item) return;
            commitFurnitureUpdate(item, resizeFurniture(item, { width, depth }), false);
          }}
        />
      ) : view === 'overlay' ? (
        <SourceComparisonPlan apartment={apartment} />
      ) : view === 'full' ? (
        <FullSourcePlan />
      ) : (
        <Room3D
          onFallback2D={() => setView('clean')}
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
          onObjectSelect={(id) => {
            const cabinet = placements.find((item) => item.id === id);
            if (cabinet) {
              setActivePlacementId(id);
              setActiveFurnitureId(null);
              setRoomId(cabinet.roomId);
              setWallId(cabinet.wallId);
              return;
            }
            const item = furniture.find((candidate) => candidate.id === id);
            setActiveFurnitureId(id);
            setActivePlacementId(null);
            setRoomId(item?.roomId ?? roomId);
            setWallId(null);
            setEditError('');
          }}
        />
      )}
    </section>
  );
}
