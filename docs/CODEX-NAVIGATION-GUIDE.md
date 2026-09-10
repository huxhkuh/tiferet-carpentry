# Codex navigation and capability guide

Updated 2026-09-10. Read `AGENTS.md` first. This guide describes the current code;
the roadmap also contains proposals and historical decisions.

## Surface ownership and acceptance evidence

| Surface                     | Entry and owner modules                                                                    | Source of truth                                               | Acceptance evidence                                               |
| --------------------------- | ------------------------------------------------------------------------------------------ | ------------------------------------------------------------- | ----------------------------------------------------------------- |
| Public Hebrew site          | `src/site/TiferetSite.tsx`, `site/pages/`                                                  | `site/router.ts`, apartment registry                          | `tests/e2e/tiferet-site.spec.ts`, `TiferetSite.test.tsx`          |
| Apartment selection         | `site/pages/ApartmentsPage.tsx`, `MyApartmentPage.tsx`                                     | `apartment/data/apartment-registry.ts`                        | `tiferet-pdf-import.spec.ts`, `tiferet-planner.spec.ts`           |
| Planner workspace           | `apartment/PlannerApp.tsx`, `components/Planner*.tsx`, `planner.css`                       | `planner/use-planner-controller.ts`                           | `TiferetPlannerApp.test.tsx`, `remediation.spec.ts`               |
| Draft and versions          | `planner/use-draft-persistence.ts`, `persistence/planning-document.ts`                     | Atomic document v1 containing design v3                       | `tests/apartment/planning-document.test.ts`, storage-blocked E2E  |
| Summary / portable JSON     | `site/pages/SummaryPage.tsx`, planner controller                                           | Current document, including geometry and library              | `TiferetSummaryPage.test.tsx`, mobile draft-to-summary E2E        |
| Input trust boundary        | `planning-document.ts`, `design-validation.ts`, `utils/project-validation.ts`              | Structural and cross-reference validators                     | `planning-document.test.ts`, `project-storage.test.ts`            |
| Architectural PDF           | `import/pdf-import-service.ts`, `workers/pdf-import.worker.ts`                             | `import/pdf-vector-parser.ts`, calibration and imported model | `pdf-vector-import.test.ts`, actual-PDF browser round trip        |
| Placement geometry          | `geometry/polygon.ts`, `wall-frame.ts`, `scene-collision.ts`                               | Millimetres; source-derived wall basis and height evidence    | `audit-geometry.test.ts`, `placement.test.ts`                     |
| Cabinet manufacturing model | `engine/dimensions.ts`, `parts.ts`, `hardware.ts`, `validation.ts`                         | Config with embedded custom material definitions              | `audit-manufacturing.test.ts`, engine suite                       |
| Assembled geometry          | `engine/part-instances.ts`, `preview/PartProjection.tsx`, `apartment/three/scene.ts`       | Generated part dimensions and instance transforms             | `audit-manufacturing.test.ts`, `Apartment3D.test.tsx`             |
| Room renderer               | `apartment/three/renderer.ts`, `picking.ts`, `components/Room3D.tsx`                       | Scene geometry, material classes, camera                      | Context-loss E2E, 3D component tests                              |
| Workshop state and workers  | `store/cabinet-store.ts`, `worker-schedule.ts`, `utils/worker-request.ts`                  | Latest requested calculation; pending/error state             | Store suite, `worker-request.test.ts`                             |
| Cut optimization and grain  | `engine/cut-optimizer.ts`, `grain-constraint.ts`                                           | Config/part grain constraints applied once                    | Manufacturing regression and optimizer suites                     |
| PDF / CAD / CAM             | `workers/pdf-export.worker.ts`, `utils/pdf-export.ts`, `gcode-export.ts`, `engine/export/` | Captured export snapshot; separate CNC program per sheet      | PDF budget/browser download, export fixtures, CNC rejection tests |
| Cost                        | `engine/cost-estimator.ts`, `configurator/CostEstimatePanel.tsx`                           | ILS sample/entered prices; missing-price flags                | Manufacturing regressions, cost suite                             |
| Offline operation           | `App.tsx`, `useSwUpdate.ts`, `vite.config.ts`                                              | Registered service worker and precache                        | Offline planner reload in `remediation.spec.ts`                   |
| Quality and delivery        | `scripts/parallel-quality.js`, `bundle-report.js`, `pages.yml`                             | Unchanged aggregate bundle/coverage thresholds                | Quality, unit/coverage, E2E and bench commands                    |

## State and units

- Apartment coordinates and cabinet dimensions are millimetres. The Hebrew planner inputs display centimetres.
- Cabinet overall height includes the plinth. Depth describes the carcass; fronts and back panel are modelled separately.
- `tiferet:document:v1:<apartment-id>` is authoritative. Legacy design/library keys are compatibility mirrors.
- Local persistence is device/browser specific. A portable JSON includes source geometry, current draft, metadata and versions.
- A failed storage write must leave the prior committed value intact and keep the live draft downloadable.
- Unknown ceiling, sill and fixture heights remain unknown. A model marked partial/imported is not an architectural verification.
- The built-in source overlay transform belongs to 5-1; do not apply it to another apartment.

## Compatibility APIs and experimental modules

Knip checks production reachability across the site, apartment planner and workshop. Three explicit entry points
are retained as public compatibility contracts: `apartment/geometry/placement.ts`, `apartment/types/index.ts`, and
`apartment/persistence/design-library.ts`. Their legacy exports are intentional; new UI code should use the
shared document and geometry implementations instead of starting another persistence or collision system.

`engine/index.ts` and plugin hooks expose reusable calculation APIs. An exported calculator is not automatically
a mounted product feature. New features need a named UI entry, persistent input contract, and acceptance test.
`VITE_ENABLE_WEBGL` controls the experimental workshop canvas; the apartment renderer is a separate mounted surface.

## Before claiming delivery

Run `npm run quality:fast`, `npm test`, `npm run test:coverage`, `npm run build`, `npm run bundle:check`,
`npm run bench:check`, `npm run dead:check`, and the relevant Playwright scenarios. Avoid running the same full
suite repeatedly unless changes/failures require it. Put local production builds in `$TEMP`; set `BUNDLE_DIST_DIR`
for both the Vite build and its budget report, including when a Git hook runs the build.
`VITEST_MAX_WORKERS=4` bounds local test concurrency without skipping tests.
Do not overwrite the Playwright output directory with parallel independent runs.

Review changed visual baselines before accepting them. Baselines are browser-specific and shared across OSes
using bundled fonts plus the existing five-percent rendering tolerance; Linux CI still needs its own execution.
Pages now runs the quality/unit/browser/bundle/performance gates before uploading a deployment artifact.
Editing the workflow does not mean it has run remotely.

For a review packet include the changed behavior, relevant source boundary, meaningful regression evidence,
known limits, and the exact files. See [the remediation record](audits/2026-09-09/REMEDIATION.he.md).
