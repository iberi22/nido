// Building norms validation engine (NSR-10 / POT rules)
import type { Zone, Property } from './property';

export interface Violation {
  ruleId: string;
  zoneId: string;
  severity: 'pass' | 'warn' | 'fail';
  message: string;
  fixHint: string;
}

export interface ValidationResult {
  pass: boolean;
  severity: 'pass' | 'warn' | 'fail';
  message: string;
  fixHint: string;
}

export interface Rule {
  id: string;
  name: string;
  validate: (zone: Zone) => ValidationResult | null;
}

export function validateStairs(zone: Zone): ValidationResult {
  const riser = zone.stairs?.riser_mm ?? zone.properties?.riser_mm ?? zone.properties?.riser ?? zone.properties?.data?.riser_mm ?? 174;
  const tread = zone.stairs?.tread_mm ?? zone.properties?.tread_mm ?? zone.properties?.tread ?? zone.properties?.data?.tread_mm ?? 280;

  const formulaValue = 2 * riser + tread;
  const errors: string[] = [];
  const hints: string[] = [];

  if (riser < 100 || riser > 180) {
    errors.push(`Riser height of ${riser}mm is out of the allowed NSR-10 range [100, 180]mm.`);
    hints.push(`Adjust riser to be between 100mm and 180mm.`);
  }

  if (tread < 280) {
    errors.push(`Tread width of ${tread}mm is below the minimum allowed NSR-10 limit of 280mm.`);
    hints.push(`Increase tread to at least 280mm.`);
  }

  if (formulaValue < 620 || formulaValue > 640) {
    errors.push(`Stair dimension formula (2R + H = ${formulaValue}mm) is outside the allowed NSR-10 range [620, 640]mm.`);
    hints.push(`Adjust riser or tread so that 2R + H is between 620mm and 640mm.`);
  }

  if (errors.length > 0) {
    return {
      pass: false,
      severity: 'fail',
      message: errors.join(' '),
      fixHint: hints.join(' ')
    };
  }

  return {
    pass: true,
    severity: 'pass',
    message: 'Stairs comply with NSR-10 norms.',
    fixHint: ''
  };
}

export function validateGarage(zone: Zone): ValidationResult {
  const width = zone.width ?? zone.properties?.width ?? 0;
  const depth = zone.height ?? zone.properties?.height ?? zone.properties?.depth ?? 0;
  const accessWidth = zone.properties?.accessWidth_independent_m ?? zone.properties?.accessWidth ?? zone.properties?.independentAccessWidth ?? 3.20;

  const errors: string[] = [];
  const hints: string[] = [];

  if (width < 2.60) {
    errors.push(`Garage width of ${width.toFixed(2)}m is below the minimum POT limit of 2.60m.`);
    hints.push(`Increase garage width to at least 2.60m.`);
  }

  if (depth < 5.00) {
    errors.push(`Garage depth of ${depth.toFixed(2)}m is below the minimum POT limit of 5.00m.`);
    hints.push(`Increase garage depth to at least 5.00m.`);
  }

  if (accessWidth < 3.20) {
    errors.push(`Garage independent access width of ${accessWidth.toFixed(2)}m is below the minimum POT limit of 3.20m.`);
    hints.push(`Increase independent access width to at least 3.20m.`);
  }

  if (errors.length > 0) {
    return {
      pass: false,
      severity: 'fail',
      message: errors.join(' '),
      fixHint: hints.join(' ')
    };
  }

  return {
    pass: true,
    severity: 'pass',
    message: 'Garage complies with POT norms.',
    fixHint: ''
  };
}

function getFloorsFromProperty(property: any): any[] {
  if (!property) return [];
  if (Array.isArray(property.floors)) {
    return property.floors;
  }
  if (property.floors && typeof property.floors === 'object') {
    return Object.values(property.floors);
  }
  if (Array.isArray(property)) {
    return property;
  }
  return [];
}

function getZonesFromFloor(floor: any): Zone[] {
  const zones: Zone[] = [];

  // 1. If floor has raw 'zones' array (like house-data.json)
  if (Array.isArray(floor.zones)) {
    for (const z of floor.zones) {
      const isStaircase = z.type === 'staircase' || z.type === 'stairs' || z.id === 'entrance';
      const zoneStairs = isStaircase ? floor.stairs : undefined;

      let accessWidth: number | undefined;
      if (z.type === 'garage' && Array.isArray(floor.elements)) {
        const garageDoor = floor.elements.find((el: any) => el.type === 'garage_door' || (el.type === 'door' && el.width));
        if (garageDoor) {
          accessWidth = garageDoor.width;
        }
      }

      zones.push({
        id: z.id || 'unknown-zone',
        name: z.name || '',
        type: z.type || '',
        x: z.x,
        y: z.y,
        width: z.width,
        height: z.height,
        color: z.color,
        stairs: zoneStairs,
        properties: {
          ...z,
          ...(accessWidth !== undefined ? { accessWidth_independent_m: accessWidth } : {})
        }
      });
    }
  }

  // 2. If floor has 'components' (like floorPlanStore.svelte.ts state)
  if (Array.isArray(floor.components)) {
    const stairsComp = floor.components.find((c: any) => c.type === 'stairs');
    const stairsData = stairsComp?.properties?.data;
    const garageDoorComp = floor.components.find((c: any) => c.type === 'garage_door');

    for (const comp of floor.components) {
      if (comp.type === 'zone') {
        const zoneType = comp.properties?.type || comp.id || '';
        const isStairs = zoneType === 'staircase' || zoneType === 'stairs' || comp.id === 'entrance';

        let accessWidth: number | undefined;
        if (zoneType === 'garage' || comp.id === 'garage') {
          if (garageDoorComp) {
            accessWidth = garageDoorComp.width;
          }
        }

        zones.push({
          id: comp.id || 'unknown-zone',
          name: comp.properties?.name || comp.id || '',
          type: comp.properties?.type || (comp.id === 'garage' ? 'garage' : comp.id === 'entrance' ? 'staircase' : 'zone'),
          x: comp.x,
          y: comp.y,
          width: comp.width,
          height: comp.height,
          color: comp.properties?.color,
          stairs: isStairs ? (stairsData || floor.stairs) : undefined,
          properties: {
            ...comp.properties,
            ...comp,
            ...(accessWidth !== undefined ? { accessWidth_independent_m: accessWidth } : {})
          }
        });
      }
    }
  }

  return zones;
}

export function validateProperty(property: Property): Violation[] {
  const violations: Violation[] = [];
  const floors = getFloorsFromProperty(property);

  for (const floor of floors) {
    const zones = getZonesFromFloor(floor);
    for (const zone of zones) {
      for (const rule of RULES) {
        const result = rule.validate(zone);
        if (result) {
          violations.push({
            ruleId: rule.id,
            zoneId: zone.id,
            severity: result.severity,
            message: result.message,
            fixHint: result.fixHint
          });
        }
      }
    }
  }

  return violations;
}

export const RULES: Rule[] = [
  {
    id: 'NSR10_stairs',
    name: 'NSR-10 Stairs Regulation',
    validate: (zone: Zone) => {
      if (zone.type === 'staircase' || zone.type === 'stairs' || zone.stairs) {
        return validateStairs(zone);
      }
      return null;
    }
  },
  {
    id: 'POT_garage',
    name: 'POT Garage Regulation',
    validate: (zone: Zone) => {
      if (zone.type === 'garage') {
        return validateGarage(zone);
      }
      return null;
    }
  }
];
