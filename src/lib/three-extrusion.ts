export interface ExtrudedItem {
  id: string;
  type: string;
  position: { x: number; y: number; z: number };
  dimensions: { width: number; height: number; depth: number };
  rotationY: number;
  color?: string;
  opacity?: number;
  label?: string;
  area_m2?: number;
}

export function parseColorToHexAndOpacity(colorStr: string): { color: number; opacity: number } {
  if (!colorStr) return { color: 0x3b82f6, opacity: 1.0 };
  colorStr = colorStr.trim();
  if (colorStr.startsWith('rgba') || colorStr.startsWith('rgb')) {
    const match = colorStr.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)/);
    if (match) {
      const r = parseInt(match[1]);
      const g = parseInt(match[2]);
      const b = parseInt(match[3]);
      const a = match[4] ? parseFloat(match[4]) : 1.0;
      const colorHex = (r << 16) + (g << 8) + b;
      return { color: colorHex, opacity: a };
    }
  }
  if (colorStr.startsWith('#')) {
    const hex = colorStr.replace('#', '');
    let parsedHex = 0x3b82f6;
    if (hex.length === 3) {
      const r = parseInt(hex[0] + hex[0], 16);
      const g = parseInt(hex[1] + hex[1], 16);
      const b = parseInt(hex[2] + hex[2], 16);
      parsedHex = (r << 16) + (g << 8) + b;
    } else if (hex.length === 6) {
      parsedHex = parseInt(hex, 16);
    }
    return { color: parsedHex, opacity: 1.0 };
  }
  const namedColors: Record<string, number> = {
    white: 0xffffff,
    black: 0x000000,
    red: 0xff0000,
    green: 0x00ff00,
    blue: 0x0000ff,
    yellow: 0xffff00
  };
  if (namedColors[colorStr.toLowerCase()] !== undefined) {
    return { color: namedColors[colorStr.toLowerCase()], opacity: 1.0 };
  }
  return { color: 0x3b82f6, opacity: 1.0 };
}

export function buildExtrusion(
  components: any[],
  floorHeight: number,
  plotWidth: number,
  plotHeight: number,
  wallThickness: number = 0.15
): ExtrudedItem[] {
  const items: ExtrudedItem[] = [];
  const offsetX = -plotWidth / 2;
  const offsetZ = -plotHeight / 2;

  if (!components || components.length === 0) {
    return [];
  }

  components.forEach((comp) => {
    const w = comp.width ?? 0;
    const h = comp.height ?? 0;

    if (comp.type === 'wall') {
      // Real wall segment from (x1, y1) to (x2, y2)
      // If endpoints are in properties, use them; otherwise construct them from comp.x, comp.y, w, h
      const x1 = comp.properties?.x1 !== undefined ? comp.properties.x1 : comp.x;
      const y1 = comp.properties?.y1 !== undefined ? comp.properties.y1 : comp.y;
      const x2 = comp.properties?.x2 !== undefined ? comp.properties.x2 : comp.x + w;
      const y2 = comp.properties?.y2 !== undefined ? comp.properties.y2 : comp.y + h;

      const length = Math.hypot(x2 - x1, y2 - y1);
      const angle = Math.atan2(y2 - y1, x2 - x1);
      const midX = (x1 + x2) / 2;
      const midY = (y1 + y2) / 2;
      const thickness = comp.properties?.thickness ?? wallThickness;

      items.push({
        id: comp.id,
        type: 'wall',
        position: {
          x: midX + offsetX,
          y: floorHeight / 2,
          z: midY + offsetZ
        },
        dimensions: {
          width: length,
          height: floorHeight,
          depth: thickness
        },
        rotationY: -angle,
        color: '#e2e8f0'
      });
    } else if (comp.type === 'zone') {
      const colorStr = comp.properties?.color || '';
      const { opacity } = parseColorToHexAndOpacity(colorStr);
      const area = w * h;

      items.push({
        id: comp.id,
        type: 'zone',
        position: {
          x: comp.x + w / 2 + offsetX,
          y: 0.025,
          z: comp.y + h / 2 + offsetZ
        },
        dimensions: {
          width: w,
          height: 0.05,
          depth: h
        },
        rotationY: 0,
        color: colorStr || 'rgba(59, 130, 246, 0.06)',
        opacity: opacity,
        label: comp.properties?.name || '',
        area_m2: area
      });
    } else if (['door', 'sliding_door', 'garage_door', 'pedestrian_door'].includes(comp.type)) {
      const doorHeight = comp.type === 'garage_door' ? 2.4 : 2.0;
      const color = comp.type === 'garage_door' ? '#0ea5e9' : '#78350f';

      items.push({
        id: comp.id,
        type: comp.type,
        position: {
          x: comp.x + w / 2 + offsetX,
          y: doorHeight / 2,
          z: comp.y + h / 2 + offsetZ
        },
        dimensions: {
          width: w,
          height: doorHeight,
          depth: h || wallThickness
        },
        rotationY: (comp.rotation || 0) * (Math.PI / 180),
        color: color,
        opacity: 0.85
      });
    } else if (['car', 'motorcycle', 'furniture'].includes(comp.type)) {
      const objHeight = comp.type === 'car' ? 1.4 : comp.type === 'motorcycle' ? 1.0 : 0.75;
      const color = comp.type === 'car' ? '#e11d48' : comp.type === 'motorcycle' ? '#2563eb' : '#059669';

      items.push({
        id: comp.id,
        type: comp.type,
        position: {
          x: comp.x + w / 2 + offsetX,
          y: objHeight / 2,
          z: comp.y + h / 2 + offsetZ
        },
        dimensions: {
          width: w,
          height: objHeight,
          depth: h
        },
        rotationY: (comp.rotation || 0) * (Math.PI / 180),
        color: color
      });
    }
  });

  return items;
}
