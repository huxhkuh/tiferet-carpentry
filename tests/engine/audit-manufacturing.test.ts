import { describe, expect, it } from 'vitest';
import { DEFAULT_CONFIG, getMaterial } from '../../src/engine/materials';
import { generateParts } from '../../src/engine/parts';
import { buildPartInstances } from '../../src/engine/part-instances';
import { computeDimensions } from '../../src/engine/dimensions';
import { optimizeCutSheets } from '../../src/engine/cut-optimizer';
import { estimateCost } from '../../src/engine/cost-estimator';
import { applyGrainConstraints } from '../../src/engine/grain-constraint';
import { generateGltfContent } from '../../src/engine/export/gltf-export';
import { cutSheetToGcode } from '../../src/utils/gcode-export';
import { generateHardware } from '../../src/engine/hardware';
import { validateConfig } from '../../src/engine/validation';

describe('manufacturing audit regressions', () => {
  it('keeps linear stock and duplicate fasteners out of sheet and cost quantities', () => {
    const config = { ...DEFAULT_CONFIG, furnitureType: 'wardrobe' as const, shelfCentreSupports: 1 };
    const parts = generateParts(config);
    const hardware = generateHardware(config);
    expect(parts.some((part) => part.name.en === 'Hanging Rail')).toBe(false);
    expect(hardware.find((item) => item.id === 'H25')?.qty).toBe(2);
    expect(hardware.find((item) => item.id === 'H26')?.qty).toBe(4);
    expect(hardware.find((item) => item.id === 'H03')?.qty).toBe(config.shelfCount * 8);
    expect(hardware.some((item) => item.id === 'H19' || item.id === 'H18')).toBe(false);
    expect(estimateCost(optimizeCutSheets(parts), hardware, 1000).hardwareItems.some((item) => item.id === 'H16')).toBe(
      false,
    );
  });
  it('preserves custom shelf levels and rejects physical intersections', () => {
    const config = {
      ...DEFAULT_CONFIG,
      shelfCount: 2,
      shelfSpacing: 'custom' as const,
      customShelfPositions: [500, 500],
    };
    const shelves = buildPartInstances(config).filter((instance) => instance.part.name.en === 'Adjustable Shelf');
    expect(shelves[0].center[1]).toBe(shelves[1].center[1]);
    expect(validateConfig(config).some((issue) => issue.code === 'SHELF_PHYSICAL_OVERLAP')).toBe(true);
  });
  it('assembles every cut part above the floor, with divided shelves clearing the centre support', () => {
    const config = { ...DEFAULT_CONFIG, shelfCentreSupports: 1, drawerCount: 1 };
    const parts = generateParts(config);
    const instances = buildPartInstances(config, parts);
    expect(instances).toHaveLength(parts.reduce((sum, part) => sum + part.qty, 0));
    for (const instance of instances) {
      expect([...instance.size].sort((a, b) => a - b)).toEqual(
        [instance.part.length, instance.part.width, instance.part.thickness].sort((a, b) => a - b),
      );
      expect(instance.center[1] - instance.size[1] / 2).toBeGreaterThanOrEqual(-1e-8);
      expect(instance.center[1] + instance.size[1] / 2).toBeLessThanOrEqual(config.height + 1e-8);
    }
    const divider = instances.find((instance) => instance.part.name.en === 'Centre Support')!;
    for (const shelf of instances.filter((instance) => instance.part.name.en.includes('Shelf'))) {
      expect(Math.abs(shelf.center[0] - divider.center[0]) + 1e-8).toBeGreaterThanOrEqual(
        (shelf.size[0] + divider.size[0]) / 2,
      );
    }
    const gltf = JSON.parse(generateGltfContent(config, parts, 'assembled').content);
    expect(gltf.nodes[0].translation).toEqual(instances[0].center.map((value) => value / 1000));
  });

  it('carries a custom 19 mm material through dimensions, cut sheets and cost', () => {
    const material = { ...getMaterial('plywood-17'), key: 'private-19', thickness: 19, pricePerSheet: 345 };
    const config = { ...DEFAULT_CONFIG, carcassMaterial: material.key, materialCatalog: [material] };
    expect(computeDimensions(config).internalWidth).toBe(config.width - 38);
    const parts = generateParts(config);
    const optimization = optimizeCutSheets(parts, 6);
    const sheet = optimization.sheets.find((item) => item.material === material.key)!;
    expect(sheet.materialDefinition).toEqual(material);
    expect(
      estimateCost(optimization, [], 0).sheetCosts.find((item) => item.material === material.key)?.pricePerSheet,
    ).toBe(345);
  });

  it('applies a width grain constraint exactly once before nesting', () => {
    const part = {
      ...generateParts(DEFAULT_CONFIG)[0],
      length: 600,
      width: 250,
      qty: 1,
      grainConstraint: 'along-width' as const,
    };
    const once = applyGrainConstraints([part]);
    expect(applyGrainConstraints(once)).toEqual(once);
    const placement = optimizeCutSheets([part], 6).sheets[0].parts[0];
    expect([placement.width, placement.length]).toEqual([600, 250]);
    expect(part.length).toBe(600);
  });

  it('excludes an unquoted foreign currency and unknown hardware from the ILS subtotal', () => {
    const material = { ...getMaterial('plywood-17'), key: 'foreign', currencyCode: 'EUR' };
    const config = { ...DEFAULT_CONFIG, carcassMaterial: material.key, materialCatalog: [material] };
    const result = estimateCost(optimizeCutSheets(generateParts(config)), [{ id: 'unpriced', qty: 2 }], 0);
    expect(result.missingPrices).toEqual(expect.arrayContaining(['foreign', 'unpriced']));
    expect(result.sheetCosts.find((item) => item.material === 'foreign')?.priceMissing).toBe(true);
  });

  it('rejects a saw layout whose tool sweep would damage its neighbour', () => {
    const sheet = optimizeCutSheets(generateParts(DEFAULT_CONFIG), 3).sheets.find((item) => item.parts.length > 1)!;
    expect(() => cutSheetToGcode(sheet, { toolDiameter: 6 })).toThrow('Re-optimize');
    const cnc = optimizeCutSheets(generateParts(DEFAULT_CONFIG), 6).sheets[0];
    expect(cutSheetToGcode(cnc)).toContain('holding tab');
  });
});
