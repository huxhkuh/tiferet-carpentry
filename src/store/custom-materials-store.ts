import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Material } from '../engine/types';
import { isMaterial, MATERIALS } from '../engine/materials';

function assertCustomMaterial(material: Material): void {
  if (!isMaterial(material) || MATERIALS.some((item) => item.key === material.key))
    throw new TypeError('Invalid custom material');
}

interface CustomMaterialsState {
  materials: Material[];
  addMaterial: (m: Material) => void;
  removeMaterial: (key: string) => void;
  updateMaterial: (key: string, patch: Partial<Material>) => void;
}

export const useCustomMaterialsStore = create<CustomMaterialsState>()(
  persist(
    (set) => ({
      materials: [],
      addMaterial: (m) => {
        assertCustomMaterial(m);
        set((s) => {
          if (s.materials.some((item) => item.key === m.key)) throw new TypeError('Duplicate custom material key');
          return { materials: [...s.materials, m] };
        });
      },
      removeMaterial: (key) => set((s) => ({ materials: s.materials.filter((m) => m.key !== key) })),
      updateMaterial: (key, patch) =>
        set((s) => ({
          materials: s.materials.map((m) => {
            if (m.key !== key) return m;
            const updated = { ...m, ...patch, key };
            assertCustomMaterial(updated);
            return updated;
          }),
        })),
    }),
    {
      name: 'custom-materials',
      merge: (persisted: unknown, current) => {
        if (
          typeof persisted !== 'object' ||
          persisted === null ||
          !('materials' in persisted) ||
          !Array.isArray(persisted.materials)
        )
          return current;
        const keys = new Set(MATERIALS.map((material) => material.key));
        const materials = persisted.materials
          .filter((material: unknown): material is Material => {
            if (!isMaterial(material) || keys.has(material.key)) return false;
            keys.add(material.key);
            return true;
          })
          .slice(0, 100);
        return { ...current, materials };
      },
    },
  ),
);

export function getCustomPanelMaterials(): Material[] {
  return useCustomMaterialsStore.getState().materials.filter((m) => m.category === 'panel');
}

export function getCustomBackMaterials(): Material[] {
  return useCustomMaterialsStore.getState().materials.filter((m) => m.category === 'back');
}
