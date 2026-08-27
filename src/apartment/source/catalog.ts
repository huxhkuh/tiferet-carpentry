import type { TiferetSourceInventory, TiferetSourcePlan } from '../data/tiferet-source-inventory';

export interface SourceBuildingOption {
  id: TiferetSourcePlan['buildingId'];
  name: string;
}

export function getSourceBuildings(inventory: TiferetSourceInventory): SourceBuildingOption[] {
  return inventory.apartmentPlans.reduce<SourceBuildingOption[]>((buildings, plan) => {
    if (buildings.some((building) => building.id === plan.buildingId)) return buildings;
    return [...buildings, { id: plan.buildingId, name: plan.buildingName }];
  }, []);
}

export function getSourceFloors(
  inventory: TiferetSourceInventory,
  buildingId: TiferetSourcePlan['buildingId'],
): number[] {
  const floors = new Set(
    inventory.apartmentPlans.filter((plan) => plan.buildingId === buildingId).map((plan) => plan.floor),
  );
  return [...floors].sort((left, right) => left - right);
}

export function getSourcePlans(
  inventory: TiferetSourceInventory,
  buildingId: TiferetSourcePlan['buildingId'],
  floor: number,
): TiferetSourcePlan[] {
  return inventory.apartmentPlans
    .filter((plan) => plan.buildingId === buildingId && plan.floor === floor)
    .sort((left, right) => left.sheet.localeCompare(right.sheet, 'he', { numeric: true }));
}

export function sourcePlanDriveUrl(plan: TiferetSourcePlan): string {
  return `https://drive.google.com/file/d/${plan.fileId}/view`;
}
