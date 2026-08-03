import { describe, it, expect } from 'vitest';
import { buildArchitectPackage } from '../../src/lib/domain/export';
import type { Property } from '../../src/lib/domain/property';
import JSZip from 'jszip';

const mockProperty: Property = {
  project: {
    name: 'Integration Test House',
    location: 'Cali, Colombia',
    estrato: 3,
    maxPisos: 3,
    norma: 'NSR-10'
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
      name: 'PISO 1',
      components: []
    }
  }
};

describe('CAD Export Integration Tests', () => {
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
    expect(parsed.project.name).toBe('Integration Test House');

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
});
