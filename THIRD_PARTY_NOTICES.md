# Third-Party Notices

## WoodworkingShop

This application extends the existing WoodworkingShop React/TypeScript project and reuses its
parametric `CabinetConfig`, default configuration, material catalogue, build tooling, and visual
design infrastructure. WoodworkingShop is distributed under the MIT License; see `LICENSE`.

## openPlan3D

Source project: **laanlabs/openPlan3D** (<https://github.com/laanlabs/openPlan3D>).

- License: MIT.
- Copyright: (c) 2026 theLodgeStudio.
- Source consulted: `src/lib/utils/furnitureCatalog.ts` and documented room/door/material concepts.
- Local adaptation: `src/apartment/furniture/catalog.ts`.
- Adaptation status: the compact catalogue metadata pattern was adapted; names, Hebrew copy,
  dimensions, palettes and Tiferet placement data were substantially rewritten. No Svelte files,
  renderers, assets or application directories were copied.

## Blueprint3D

Source project: **furnishup/blueprint3d** (<https://github.com/furnishup/blueprint3d>).

- License: MIT.
- Copyright: (c) 2015 FurnishUp Inc.
- Source consulted: `src/items/item.ts`, specifically the rotated item-corner calculation.
- Local adaptation: `src/apartment/furniture/geometry.ts`.
- Adaptation status: the four-corner rotation technique was adapted and rewritten as a pure,
  immutable millimetre-domain TypeScript function. No models, assets or application directories
  were copied.

## Casita

Source project: **rohitguta2432/casita** (<https://github.com/rohitguta2432/casita>).

- License: MIT.
- Copyright: (c) 2026 Rohit Raj.
- Source consulted: `src/pieces.jsx`, specifically its approach of composing low-poly furniture
  from small box primitives.
- Local adaptation: `src/apartment/three/furniture.ts`.
- Adaptation status: the composition technique was adapted; all local models, dimensions,
  colours, transforms and WebGL integration were substantially rewritten. No 3D assets or source
  directories were copied.

### MIT license text for the adaptations above

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and
associated documentation files (the "Software"), to deal in the Software without restriction,
including without limitation the rights to use, copy, modify, merge, publish, distribute,
sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The applicable copyright notice listed in each section above and this permission notice shall be
included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT
NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND
NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT
OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.

## Tiferet sales-plan PDF provenance

The apartment 5-1 model is based on the official Google Drive file:

- File: `טיפוס שני - Sheet - 5-1 - פרויקט תפארת - רמלה.pdf`
- Google Drive file ID: `1RTrFsQ1eBTVzudl3wC0Ocv5DirPh6tBq`
- Size reported by Drive: 127,934 bytes
- Local inspection SHA-256: `2165ED6217A04A5A56AC00B5B3DBF0AC477F6224884CFD1A513FCF6B478F6DBE`
- PDF inspection: one page, 2268 x 1193 PDF points, vector data present
  (`pdfplumber` reported 4,027 lines, 392 rectangles, 20 curves, 6,243 text characters).

The current MVP uses a semi-automatic millimetre model: vector objects, positioned labels, page
geometry, and dimensional annotations were inspected automatically; room polygons, joins, and
openings were then normalized manually against the rendered sales plan. Complete source metadata
and the modelling method are stored on the apartment definition. A local copy is included at
`public/tiferet/sheet-5-1-original.pdf` solely as the authorized source-reference view for this
project. The sales plan is not open-source, remains the property of its respective rights holder,
and is not covered by the MIT notices above.
