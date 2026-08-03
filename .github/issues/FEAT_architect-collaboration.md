---
title: "Professional Architect Export (DXF/PDF)"
labels:
  - enhancement
  - architect-tools
  - feature
assignees: []
---

## Description

Enable a professional feature to share the house design with architects, enabling
interoperability with CAD software (AutoCAD, Revit) and formal presentation of
floor plans. Maps to NIDO feature `export-cad` (REQ-017, US-104).

## Recommended Technical Approach

1. **DXF Export (Vector)**: Generate DXF files directly from the JSON model. This
   lets the architect import the plan without losing precision or scales. Use
   `dxf-writer` or a manual implementation of the DXF specification.
2. **Technical PDF**: Export a high-resolution PDF including an Architectural
   Title Block (Title, Scale 1:50, Date, Owner) matching the blueprint aesthetic
   already implemented.
3. **JSON Parametrization**: The JSON file serves as the "source model" for any
   later modification by the architect using compatible tools.

## Tasks

- [ ] Research and install `dxf-writer` or equivalent for Svelte.
- [ ] Implement `JSON -> DXF` mapper (Walls, Zones, Dimensions).
- [ ] Create the Title Block component for formal exports.
- [ ] Implement PDF export using `html2canvas` + `jsPDF` at high DPI (300dpi).
- [ ] Add "Generate Architect Package" button (ZIP with JSON, DXF and PDF).

## Acceptance Criteria

- The DXF file opens correctly in a CAD viewer preserving the measurements.
- The exported PDF keeps the scale and is legible at A1/A2 size.
- Wall width info (15cm) is included in the metadata.
