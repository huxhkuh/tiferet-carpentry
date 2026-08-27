import { describe, expect, it } from 'vitest';
import {
  modelPlanPointToSourcePlanPoint,
  sourcePlanPoint,
  TIFERET_SOURCE_PLAN_BOUNDS,
} from '../../src/apartment/data/tiferet-source-plan';

describe('Tiferet source-plan calibration', () => {
  it.each([
    [627.96, 402.12],
    [815.04, 568.8],
    [970.92, 395.88],
    [1_175.04, 979.8],
  ])('round trips a source anchor at %s,%s through the millimetre model', (sourceX, sourceY) => {
    const millimetrePoint = sourcePlanPoint(sourceX, sourceY);

    expect(modelPlanPointToSourcePlanPoint(millimetrePoint)).toEqual({ x: sourceX, y: sourceY });
  });

  it('keeps the complete calibrated crop inside the official PDF page', () => {
    expect(TIFERET_SOURCE_PLAN_BOUNDS).toEqual({
      x0: 610.92,
      x1: 1_192.08,
      top: 220.2,
      bottom: 991.2,
    });
    expect(TIFERET_SOURCE_PLAN_BOUNDS.x1).toBeLessThan(2_268);
    expect(TIFERET_SOURCE_PLAN_BOUNDS.bottom).toBeLessThan(1_193);
  });
});
