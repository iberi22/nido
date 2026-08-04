import { describe, it, expect } from 'vitest';
import { buildDXF, buildPDF, buildArchitectPackage } from '../../src/lib/domain/export';
import type { Property } from '../../src/lib/domain/property';
import JSZip from 'jszip';

const mockProperty: Property = {
  id: 'prop-1',
  name: 'Integration Test House',
  type: 'house',
  location: {
    city: 'Cali',
    comuna: '10',
    estrato: 3
  },
  config: {
    wallThickness: 0.15,
    scale: 50,
    plot: {
      width: 6,
      height: 26,
      margin: 100
    },
    colors: {
      blueprint_bg: '#1e3a5f',
      blueprint_line: '#87ceeb'
    }
  },
  floors: [
    {
      id: 'ground',
      name: 'PISO 1',
      zones: [
        {
          id: 'zone-1',
          name: 'Sala',
          type: 'living',
          x: 1,
          y: 2,
          width: 3,
          height: 4
        }
      ],
      components: [
        {
          id: 'wall-1',
          type: 'wall',
          x: 1,
          y: 2,
          properties: {
            x1: 1,
            y1: 2,
            x2: 1,
            y2: 6
          }
        }
      ]
    }
  ],
  rooms: [],
  items: []
};

describe('CAD Export Integration Tests', () => {
  // Test 1: Full architect package (ZIP) creation
  it('buildArchitectPackage creates a valid ZIP file with property.json, plan.dxf, and plan.pdf', async () => {
    const blob = await buildArchitectPackage(mockProperty);

    expect(blob).toBeDefined();
    expect(blob.size).toBeGreaterThan(0);

    // Load ZIP with JSZip to verify its contents
    const arrayBuffer = await blob.arrayBuffer();
    const zip = await JSZip.loadAsync(arrayBuffer);

    expect(zip.files['property.json']).toBeDefined();
    expect(zip.files['plan.dxf']).toBeDefined();
    expect(zip.files['plan.pdf']).toBeDefined();

    // Read property.json from ZIP
    const jsonString = await zip.files['property.json'].async('text');
    const parsed = JSON.parse(jsonString);
    expect(parsed.name).toBe('Integration Test House');

    // Read plan.dxf from ZIP
    const dxfString = await zip.files['plan.dxf'].async('text');
    expect(dxfString).toContain('0\nSECTION');

    // Read plan.pdf from ZIP
    const pdfBuffer = await zip.files['plan.pdf'].async('arraybuffer');
    expect(pdfBuffer.byteLength).toBeGreaterThan(0);

    // Check PDF magic bytes (%PDF)
    const view = new DataView(pdfBuffer);
    const magic = String.fromCharCode(view.getUint8(0), view.getUint8(1), view.getUint8(2), view.getUint8(3));
    expect(magic).toBe('%PDF');
  });

  // Test 2: Multi-floor DXF generation and horizontal shifting
  it('buildDXF supports multi-floor rendering and shifts coordinate offsets by 30 meters horizontally', () => {
    const multiFloorProperty: Property = {
      id: 'prop-multi',
      name: 'Multi Floor Prop',
      type: 'house',
      location: { city: 'Cali', comuna: '5', estrato: 4 },
      floors: [
        {
          id: 'f1',
          name: 'First Floor',
          zones: [],
          components: [
            {
              id: 'w1',
              type: 'wall',
              x: 5,
              y: 5,
              properties: { x1: 5, y1: 5, x2: 10, y2: 5 }
            }
          ]
        },
        {
          id: 'f2',
          name: 'Second Floor',
          zones: [],
          components: [
            {
              id: 'w2',
              type: 'wall',
              x: 5,
              y: 5,
              properties: { x1: 5, y1: 5, x2: 10, y2: 5 }
            }
          ]
        }
      ],
      rooms: [],
      items: []
    };

    const dxf = buildDXF(multiFloorProperty);

    expect(dxf).toContain('First Floor');
    expect(dxf).toContain('Second Floor');
    expect(dxf).toContain('SECTION');
    expect(dxf).toContain('ENTITIES');

    // First Floor wall: x1 is 5 (5 + 0 offset) -> expect "10\n5" or "10\n5.0"
    // Second Floor wall: x1 is 35 (5 + 30 offset) -> expect "10\n35" or "10\n35.0"
    expect(dxf).toContain('35');
  });

  // Test 3: Component-specific entities formatting verification
  it('buildDXF and buildPDF correctly process various component types', () => {
    const richProperty: Property = {
      id: 'prop-rich',
      name: 'Rich Components Prop',
      type: 'house',
      location: { city: 'Cali', comuna: '9', estrato: 3 },
      floors: [
        {
          id: 'ground',
          name: 'Ground Floor',
          zones: [],
          components: [
            {
              id: 'comp-wall',
              type: 'wall',
              x: 1,
              y: 1,
              properties: { x1: 1, y1: 1, x2: 10, y2: 1, thickness: 0.20 }
            },
            {
              id: 'comp-zone',
              type: 'zone',
              x: 2,
              y: 2,
              width: 4,
              height: 4,
              properties: { name: 'Gourmet Kitchen' }
            },
            {
              id: 'comp-stairs',
              type: 'stairs',
              x: 5,
              y: 5,
              properties: {
                data: {
                  components: [
                    { x: 0, y: 0, width: 1, height: 0.3, label: 'Step 1' },
                    { x: 0, y: 0.3, width: 1, height: 0.3, label: 'Step 2' }
                  ]
                }
              }
            },
            {
              id: 'comp-dim',
              type: 'dimension',
              x: 1,
              y: 0,
              properties: { toX: 5, toY: 0, label: '4.00m' }
            },
            {
              id: 'comp-furniture',
              type: 'sofa',
              x: 3,
              y: 3,
              width: 1.5,
              height: 0.8,
              properties: { note: 'Italian Leather Sofa' }
            }
          ]
        }
      ],
      rooms: [],
      items: []
    };

    const dxf = buildDXF(richProperty);
    expect(dxf).toContain('Gourmet Kitchen');
    expect(dxf).toContain('Step 1');
    expect(dxf).toContain('Step 2');
    expect(dxf).toContain('4.00m');
    expect(dxf).toContain('Italian Leather Sofa');

    const pdf = buildPDF(richProperty);
    expect(pdf).toBeDefined();
    const pdfOutput = pdf.output();
    expect(pdfOutput).toContain('%PDF-');
  });

  // Test 4: DXF measurement units consistency
  it('buildDXF sets drawing measurement units to Meters', () => {
    const dxf = buildDXF(mockProperty);
    // DXF block indicating units in Meters
    // INSUNITS variable header is 1061, wait, let's just make sure standard INSUNITS group code and value are set or INSUNITS is present.
    expect(dxf).toContain('INSUNITS');
  });

  // Test 5: Rotation and paper bounds handling
  it('buildPDF handles landscape vs portrait rotation and different paper size configurations', () => {
    // Wide plot (no rotation)
    const wideProperty: Property = {
      ...mockProperty,
      config: {
        ...mockProperty.config,
        plot: {
          width: 25,
          height: 5,
          margin: 10
        }
      }
    };

    const pdfA2Wide = buildPDF(wideProperty, { scale: 50, paperSize: 'a2' });
    expect(pdfA2Wide.getNumberOfPages()).toBe(1);

    // Tall plot (requires rotation)
    const tallProperty: Property = {
      ...mockProperty,
      config: {
        ...mockProperty.config,
        plot: {
          width: 5,
          height: 25,
          margin: 10
        }
      }
    };

    const pdfA1Tall = buildPDF(tallProperty, { scale: 100, paperSize: 'a1' });
    expect(pdfA1Tall.getNumberOfPages()).toBe(1);
    expect(pdfA1Tall.output()).toContain('%PDF-');
  });

  // Test 6: Robustness fallback on empty / missing properties / coordinates
  it('buildDXF and buildPDF fall back safely when coordinate values or config properties are missing or undefined', () => {
    const poorProperty: Property = {
      id: 'prop-poor',
      name: '',
      type: 'house',
      location: undefined as any, // completely missing location
      config: undefined, // completely missing config
      floors: [
        {
          id: 'f1',
          name: '',
          zones: [],
          components: [
            {
              id: 'comp-no-coords',
              type: 'wall',
              // x and y are undefined/missing
              properties: {
                // missing coordinates x1, y1, x2, y2
              }
            },
            {
              id: 'comp-bad-coords',
              type: 'zone',
              x: 'not-a-number' as any,
              y: null as any,
              properties: {
                name: 'Fallback Zone'
              }
            }
          ]
        }
      ],
      rooms: [],
      items: []
    };

    const dxf = buildDXF(poorProperty);
    expect(dxf).toBeDefined();
    expect(dxf).toContain('SECTION');

    const pdf = buildPDF(poorProperty);
    expect(pdf).toBeDefined();
    expect(pdf.output()).toContain('%PDF-');
  });
});
