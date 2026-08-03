import { describe, it, expect } from 'vitest';
import { buildDXF, buildPDF } from '../../src/lib/domain/export';
import type { Property } from '../../src/lib/domain/property';

const mockProperty: Property = {
  project: {
    name: 'Test Project',
    location: 'Test Location',
    estrato: 3,
    maxPisos: 5,
    norma: 'Test Norma'
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
  floors: {
    ground: {
      id: 'ground',
      name: 'GROUND FLOOR',
      subtitle: 'SUBTITLE',
      components: [
        {
          id: 'wall-1',
          type: 'wall',
          x: 0,
          y: 0,
          layer: 'structure',
          properties: {
            x1: 0,
            y1: 0,
            x2: 0,
            y2: 6,
            thickness: 0.15
          }
        },
        {
          id: 'zone-1',
          type: 'zone',
          x: 0,
          y: 0,
          width: 3,
          height: 6,
          layer: 'zones',
          properties: {
            name: 'Living Room'
          }
        },
        {
          id: 'dim-1',
          type: 'dimension',
          x: 0,
          y: -0.2,
          layer: 'annotations',
          properties: {
            toX: 3,
            toY: -0.2,
            label: '3.0m'
          }
        }
      ]
    }
  }
};

describe('CAD Export Unit Tests', () => {
  it('buildDXF generates valid DXF structure with defined layers and entities', () => {
    const dxfString = buildDXF(mockProperty);

    // Check DXF headers / structures
    expect(dxfString).toContain('0\nSECTION');
    expect(dxfString).toContain('2\nHEADER');
    expect(dxfString).toContain('2\nTABLES');
    expect(dxfString).toContain('2\nENTITIES');

    // Check Layer definitions
    expect(dxfString).toContain('2\nwalls');
    expect(dxfString).toContain('2\nzones');
    expect(dxfString).toContain('2\nlabels');
    expect(dxfString).toContain('2\ndimensions');

    // Check elements
    expect(dxfString).toContain('Living Room');
    expect(dxfString).toContain('3.0m');
  });

  it('buildPDF creates a valid jsPDF document with pages and metadata', () => {
    const doc = buildPDF(mockProperty, { scale: 50, paperSize: 'a2' });

    expect(doc).toBeDefined();
    // Check internal details
    const output = doc.output();
    expect(output).toContain('%PDF-'); // Check standard PDF header
    expect(doc.getNumberOfPages()).toBe(1);
  });
});
