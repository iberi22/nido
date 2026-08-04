import Drawing from 'dxf-writer';
import { jsPDF } from 'jspdf';
import JSZip from 'jszip';
import type { Property } from './property';

/**
 * Builds a professional 2D DXF string for CAD interoperability.
 * Measurements are preserved in meters.
 */
export function buildDXF(property: Property): string {
  const drawing = new Drawing();
  drawing.setUnits('Meters');

  // Define Standard Layers
  drawing.addLayer('walls', Drawing.ACI.WHITE, 'CONTINUOUS');
  drawing.addLayer('zones', Drawing.ACI.CYAN, 'CONTINUOUS');
  drawing.addLayer('labels', Drawing.ACI.YELLOW, 'CONTINUOUS');
  drawing.addLayer('dimensions', Drawing.ACI.GREEN, 'CONTINUOUS');
  drawing.addLayer('furniture', Drawing.ACI.MAGENTA, 'CONTINUOUS');

  let floorIndex = 0;
  const floors = property.floors || {};
  const floorsRecord = Array.isArray(floors)
    ? Object.fromEntries(floors.map((f, i) => [String(i), f]))
    : (floors as Record<string, any>);

  for (const floorId of Object.keys(floorsRecord)) {
    const floor = floorsRecord[floorId];
    if (!floor || !floor.components) continue;

    // Lay out floors side-by-side to avoid overlap in CAD
    // Each floor is shifted by 30 meters horizontally
    const offsetX = floorIndex * 30.0;
    floorIndex++;

    // Draw Floor Header text
    drawing.setActiveLayer('labels');
    drawing.drawText(offsetX, -2.0, 1.0, 0, floor.name || floorId.toUpperCase(), 'left', 'middle');
    if (floor.subtitle) {
      drawing.drawText(offsetX, -3.2, 0.5, 0, floor.subtitle, 'left', 'middle');
    }

    // Process Floor Components
    for (const comp of floor.components) {
      if (!comp) continue;

      const props = comp.properties || {};

      switch (comp.type) {
        case 'wall': {
          drawing.setActiveLayer('walls');
          const cx = typeof comp.x === 'number' ? comp.x : 0;
          const cy = typeof comp.y === 'number' ? comp.y : 0;
          const x1 = (typeof props.x1 === 'number' ? props.x1 : cx) + offsetX;
          const y1 = typeof props.y1 === 'number' ? props.y1 : cy;
          const x2 = (typeof props.x2 === 'number' ? props.x2 : cx + (comp.width || 0.15)) + offsetX;
          const y2 = typeof props.y2 === 'number' ? props.y2 : cy + (comp.height || 0.15);
          drawing.drawLine(x1, y1, x2, y2);
          break;
        }

        case 'zone': {
          drawing.setActiveLayer('zones');
          const cx = typeof comp.x === 'number' ? comp.x : 0;
          const cy = typeof comp.y === 'number' ? comp.y : 0;
          const x1 = cx + offsetX;
          const y1 = cy;
          const w = comp.width || 1.0;
          const h = comp.height || 1.0;
          drawing.drawRect(x1, y1, x1 + w, y1 + h);

          // Center Label
          const cx_lbl = x1 + w / 2;
          const cy_lbl = y1 + h / 2;
          drawing.setActiveLayer('labels');
          drawing.drawText(cx_lbl, cy_lbl, 0.35, 0, props.name || '', 'center', 'middle');
          break;
        }

        case 'stairs': {
          drawing.setActiveLayer('walls');
          const cx = typeof comp.x === 'number' ? comp.x : 0;
          const cy = typeof comp.y === 'number' ? comp.y : 0;
          const stairData = props.data || {};
          const subComponents = stairData.components || [];
          for (const sub of subComponents) {
            const sx = cx + (sub.x || 0) + offsetX;
            const sy = cy + (sub.y || 0);
            const sw = sub.width || 1.0;
            const sh = sub.height || 1.0;
            drawing.drawRect(sx, sy, sx + sw, sy + sh);

            if (sub.label) {
              drawing.setActiveLayer('labels');
              drawing.drawText(sx + sw / 2, sy + sh / 2, 0.25, 0, sub.label, 'center', 'middle');
            }
          }
          break;
        }

        case 'dimension': {
          drawing.setActiveLayer('dimensions');
          const cx = typeof comp.x === 'number' ? comp.x : 0;
          const cy = typeof comp.y === 'number' ? comp.y : 0;
          const x1 = cx + offsetX;
          const y1 = cy;
          const toX = (typeof props.toX === 'number' ? props.toX : cx) + offsetX;
          const toY = typeof props.toY === 'number' ? props.toY : cy;
          drawing.drawLine(x1, y1, toX, toY);

          // Midpoint Label
          const mx = (x1 + toX) / 2;
          const my = (y1 + toY) / 2;
          drawing.setActiveLayer('labels');
          drawing.drawText(mx, my, 0.3, 0, props.label || '', 'center', 'middle');
          break;
        }

        default: {
          // Furniture, Doors, Vehicles, etc.
          drawing.setActiveLayer('furniture');
          const cx = typeof comp.x === 'number' ? comp.x : 0;
          const cy = typeof comp.y === 'number' ? comp.y : 0;
          const x1 = cx + offsetX;
          const y1 = cy;
          const w = comp.width || 0.5;
          const h = comp.height || 0.5;
          drawing.drawRect(x1, y1, x1 + w, y1 + h);

          if (props.note) {
            drawing.setActiveLayer('labels');
            drawing.drawText(x1 + w / 2, y1 + h / 2, 0.2, 0, props.note, 'center', 'middle');
          }
          break;
        }
      }
    }
  }

  return drawing.toDxfString();
}

/**
 * Builds a vector-based, high-DPI PDF representation with a formal title block.
 */
export function buildPDF(
  property: Property,
  options?: { scale?: number; paperSize?: string }
): jsPDF {
  const scale = options?.scale || 50;
  const paperSize = options?.paperSize?.toLowerCase() || 'a2';
  const isA1 = paperSize === 'a1';

  // Standard dimensions in mm
  const pageWidth = isA1 ? 841 : 594;
  const pageHeight = isA1 ? 594 : 420;

  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: isA1 ? 'a1' : 'a2',
  });

  const floors = property.floors || {};
  const floorsRecord = Array.isArray(floors)
    ? Object.fromEntries(floors.map((f, i) => [String(i), f]))
    : (floors as Record<string, any>);
  const floorKeys = Object.keys(floorsRecord);

  floorKeys.forEach((floorId, idx) => {
    if (idx > 0) {
      doc.addPage(isA1 ? 'a1' : 'a2', 'landscape');
    }

    const floor = floorsRecord[floorId];
    if (!floor) return;

    // 1. Draw Blueprint Background (Dark navy)
    doc.setFillColor(30, 58, 95); // dark blue
    doc.rect(0, 0, pageWidth, pageHeight, 'F');

    // 2. Draw Plot & Floor Plan Elements
    const pw = property.config?.plot?.width || 6.0;
    const ph = property.config?.plot?.height || 26.0;

    // Scale Factor (mm per meter)
    const sf = 1000 / scale;

    // Check if we need to rotate drawing to fit sheet nicely
    const rotate = ph > pw;
    const drawW = rotate ? ph * sf : pw * sf;
    const drawH = rotate ? pw * sf : ph * sf;

    // Center offset
    const ox = (pageWidth - drawW) / 2;
    const oy = (pageHeight - drawH) / 2;

    const toPageCoords = (xm: number, ym: number): [number, number] => {
      if (rotate) {
        const rx = ym * sf;
        const ry = (pw - xm) * sf;
        return [ox + rx, oy + ry];
      }
      return [ox + xm * sf, oy + ym * sf];
    };

    // Draw Plot Boundary (dashed light cyan line)
    doc.setDrawColor(135, 206, 235); // sky blue
    doc.setLineWidth(0.4);
    // Draw boundary rect
    const [p1x, p1y] = toPageCoords(0, 0);
    const [p2x, p2y] = toPageCoords(pw, ph);
    const bx = Math.min(p1x, p2x);
    const by = Math.min(p1y, p2y);
    const bw = Math.abs(p1x - p2x);
    const bh = Math.abs(p1y - p2y);
    doc.rect(bx, by, bw, bh, 'D');

    // Draw Components
    const components = floor.components || [];
    for (const comp of components) {
      if (!comp) continue;

      const props = comp.properties || {};

      switch (comp.type) {
        case 'zone': {
          const x = typeof comp.x === 'number' ? comp.x : 0;
          const y = typeof comp.y === 'number' ? comp.y : 0;
          const w = comp.width || 1.0;
          const h = comp.height || 1.0;

          const [x1, y1] = toPageCoords(x, y);
          const [x2, y2] = toPageCoords(x + w, y + h);

          const rx = Math.min(x1, x2);
          const ry = Math.min(y1, y2);
          const rw = Math.abs(x1 - x2);
          const rh = Math.abs(y1 - y2);

          doc.setFillColor(25, 48, 80); // dark fill
          doc.rect(rx, ry, rw, rh, 'F');
          doc.setDrawColor(135, 206, 235);
          doc.setLineWidth(0.2);
          doc.rect(rx, ry, rw, rh, 'D');

          // Label
          const [cx, cy] = toPageCoords(x + w / 2, y + h / 2);
          doc.setFontSize(10);
          doc.setTextColor(135, 206, 235);
          doc.text(props.name || '', cx, cy, { align: 'center', baseline: 'middle' });
          break;
        }

        case 'wall': {
          const cx = typeof comp.x === 'number' ? comp.x : 0;
          const cy = typeof comp.y === 'number' ? comp.y : 0;
          const x1 = typeof props.x1 === 'number' ? props.x1 : cx;
          const y1 = typeof props.y1 === 'number' ? props.y1 : cy;
          const x2 = typeof props.x2 === 'number' ? props.x2 : cx + (comp.width || 0.15);
          const y2 = typeof props.y2 === 'number' ? props.y2 : cy + (comp.height || 0.15);

          const [wx1, wy1] = toPageCoords(x1, y1);
          const [wx2, wy2] = toPageCoords(x2, y2);

          const thickness = (props.thickness || property.config?.wallThickness || 0.15) * sf;
          doc.setLineWidth(thickness);
          doc.setDrawColor(255, 255, 255); // Solid white walls
          doc.line(wx1, wy1, wx2, wy2);
          break;
        }

        case 'stairs': {
          const cx = typeof comp.x === 'number' ? comp.x : 0;
          const cy = typeof comp.y === 'number' ? comp.y : 0;
          const stairData = props.data || {};
          const subComponents = stairData.components || [];
          for (const sub of subComponents) {
            const sx = cx + (sub.x || 0);
            const sy = cy + (sub.y || 0);
            const sw = sub.width || 1.0;
            const sh = sub.height || 1.0;

            const [sx1, sy1] = toPageCoords(sx, sy);
            const [sx2, sy2] = toPageCoords(sx + sw, sy + sh);

            const rx = Math.min(sx1, sx2);
            const ry = Math.min(sy1, sy2);
            const rw = Math.abs(sx1 - sx2);
            const rh = Math.abs(sy1 - sy2);

            doc.setFillColor(25, 48, 80);
            doc.setDrawColor(135, 206, 235);
            doc.setLineWidth(0.3);
            doc.rect(rx, ry, rw, rh, 'FD');

            if (sub.label) {
              const [scx, scy] = toPageCoords(sx + sw / 2, sy + sh / 2);
              doc.setFontSize(8);
              doc.setTextColor(224, 244, 255);
              doc.text(sub.label, scx, scy, { align: 'center', baseline: 'middle' });
            }
          }
          break;
        }

        case 'dimension': {
          const cx = typeof comp.x === 'number' ? comp.x : 0;
          const cy = typeof comp.y === 'number' ? comp.y : 0;
          const x1 = cx;
          const y1 = cy;
          const toX = typeof props.toX === 'number' ? props.toX : cx;
          const toY = typeof props.toY === 'number' ? props.toY : cy;

          const [dx1, dy1] = toPageCoords(x1, y1);
          const [dx2, dy2] = toPageCoords(toX, toY);

          doc.setLineWidth(0.3);
          doc.setDrawColor(77, 208, 225); // Cyan dimensions
          doc.line(dx1, dy1, dx2, dy2);

          // Midpoint Label
          const [dmx, dmy] = toPageCoords((x1 + toX) / 2, (y1 + toY) / 2);
          doc.setFontSize(8);
          doc.setTextColor(255, 213, 79); // Highlight yellow
          doc.text(props.label || '', dmx, dmy, { align: 'center', baseline: 'middle' });
          break;
        }

        default: {
          // Furniture, Doors, Vehicles, etc.
          const x = typeof comp.x === 'number' ? comp.x : 0;
          const y = typeof comp.y === 'number' ? comp.y : 0;
          const w = comp.width || 0.5;
          const h = comp.height || 0.5;

          const [fx1, fy1] = toPageCoords(x, y);
          const [fx2, fy2] = toPageCoords(x + w, y + h);

          const rx = Math.min(fx1, fx2);
          const ry = Math.min(fy1, fy2);
          const rw = Math.abs(fx1 - fx2);
          const rh = Math.abs(fy1 - fy2);

          doc.setDrawColor(77, 208, 225);
          doc.setLineWidth(0.2);
          doc.rect(rx, ry, rw, rh, 'D');

          if (props.note) {
            const [fcx, fcy] = toPageCoords(x + w / 2, y + h / 2);
            doc.setFontSize(7);
            doc.setTextColor(224, 244, 255);
            doc.text(props.note, fcx, fcy, { align: 'center', baseline: 'middle' });
          }
          break;
        }
      }
    }

    // 3. Draw Cajetín (Title Block) in bottom-right corner
    const tbW = 160;
    const tbH = 50;
    const tbX = pageWidth - tbW - 15;
    const tbY = pageHeight - tbH - 15;

    // Background and Border
    doc.setFillColor(25, 48, 80); // slightly darker background for Cajetín
    doc.setDrawColor(135, 206, 235);
    doc.setLineWidth(0.6);
    doc.rect(tbX, tbY, tbW, tbH, 'FD');

    // Horizontal Dividers
    doc.setLineWidth(0.3);
    doc.line(tbX, tbY + 22, tbX + tbW, tbY + 22);
    doc.line(tbX, tbY + 36, tbX + tbW, tbY + 36);

    // Vertical Divider
    doc.line(tbX + 80, tbY + 22, tbX + 80, tbY + tbH);

    // Title Block Text
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(13);
    doc.text(floor.name || 'PLANO TÉCNICO', tbX + 6, tbY + 10);

    doc.setFontSize(9);
    doc.setTextColor(135, 206, 235);
    doc.text(floor.subtitle || 'DISEÑO ARQUITECTÓNICO', tbX + 6, tbY + 17);

    // Project Details (Left Column)
    doc.setTextColor(224, 244, 255);
    doc.setFontSize(8);
    doc.text(`PROYECTO: ${property.name || 'NIDO'}`, tbX + 6, tbY + 28);
    doc.text(`UBICACIÓN: ${property.location?.city || 'COMUNA 10, CALI'}`, tbX + 6, tbY + 33);
    doc.text(`NORMA: ${property.norms?.building || property.norms || 'NSR-10'}`, tbX + 6, tbY + 42);
    doc.text(`ESTRATO: ${property.location?.estrato || 3} | PISOS MÁX: ${floorKeys.length}`, tbX + 6, tbY + 46);

    // Metadata (Right Column)
    doc.text(`ESCALA: 1:${scale}`, tbX + 86, tbY + 28);
    doc.text(`FECHA: ${new Date().toLocaleDateString()}`, tbX + 86, tbY + 33);
    doc.text(`DIBUJO: SISTEMA DE DISEÑO NIDO`, tbX + 86, tbY + 42);
    doc.text(`PROPIETARIO: NIDO COLLABORATION`, tbX + 86, tbY + 46);
  });

  return doc;
}

/**
 * Generates a ZIP archive (JSZip) containing property.json, plan.dxf, and plan.pdf.
 */
export async function buildArchitectPackage(property: Property): Promise<Blob> {
  const zip = new JSZip();

  // 1. Save property JSON
  zip.file('property.json', JSON.stringify(property, null, 2));

  // 2. Generate and save DXF
  const dxfContent = buildDXF(property);
  zip.file('plan.dxf', dxfContent);

  // 3. Generate and save PDF (300 dpi A2)
  const pdfDoc = buildPDF(property, { scale: 50, paperSize: 'a2' });
  const pdfBuffer = pdfDoc.output('arraybuffer');
  zip.file('plan.pdf', pdfBuffer);

  // 4. Return Blob
  return await zip.generateAsync({ type: 'blob' });
}

/**
 * Downloads a Blob directly to the client browser.
 */
export function downloadBlob(blob: Blob, filename: string): void {
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    return;
  }
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
