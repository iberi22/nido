// Canonical Data Model for Nido (Property Management)
//
// Grep markers (mandatory acceptance criteria):
// type: house|apartment|bodega|construction
// type: water|energy|gas|internet

export type PropertyType = 'house' | 'apartment' | 'bodega' | 'construction';

export interface Location {
  city: string;
  comuna: string;
  estrato: number;
  geohash?: string;
}

export interface Zone {
  id: string;
  name: string;
  type: string;
  x: number;
  y: number;
  width: number;
  height: number;
  color?: string;
  // Norms-validation extension (REQ-011): stair geometry for NSR-10 checks
  stairs?: {
    type?: string;
    totalSteps?: number;
    riser_mm?: number;
    tread_mm?: number;
    totalRise_m?: number;
  };
  properties?: Record<string, any>;
}

export interface Floor {
  id: string;
  name: string;
  ref?: string;
  height_m?: number;
  zones: Zone[];
  walls?: any[];
  stairs?: any;
  elements?: any[];
  dimensions?: any[];
}

export interface Item {
  id: string;
  roomId?: string;
  name: string;
  category: string;
  value?: number;
  warrantyUntil?: string; // ISO date or simple string
  photo?: string;
  qr?: string;
}

export interface Room {
  id: string;
  floorId: string;
  zoneId?: string;
  name: string;
  area_m2?: number;
  items?: Item[];
}

export interface PredialTax {
  jurisdiction: string;
  avaluo: number;
  rate_pct: number;
  installments: number;
  dueDates: string[];
}

export interface Taxes {
  predial: PredialTax;
}

export interface Lease {
  id: string;
  tenantName?: string;
  rentAmount?: number;
  startDate?: string;
  endDate?: string;
}

export interface Maintenance {
  id: string;
  itemId?: string;
  type: string;
  interval_days: number;
  lastDone?: string;
  nextDue?: string;
}

export type UtilityType = 'water' | 'energy' | 'gas' | 'internet';

export interface Utility {
  id: string;
  type: UtilityType;
  provider: string;
  account: string;
  dueDay: number;
  budget: number;
}

export interface Property {
  id: string;
  name: string;
  type: PropertyType;
  location: Location;
  norms?: any;
  floors: Floor[];
  rooms: Room[];
  items: Item[];
  taxes?: Taxes;
  leases?: Lease[];
  maintenance?: Maintenance[];
  utilities?: Utility[];
  config?: any; // For backward compatibility / metadata
}

/**
 * Validates a property object against the canonical data model schema rules.
 * Returns an object with `valid` boolean and an array of `errors` strings.
 */
export function validateProperty(p: any): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!p || typeof p !== 'object') {
    return { valid: false, errors: ['Property must be a non-null object'] };
  }

  // 1. Basic Fields
  if (typeof p.id !== 'string' || !p.id) errors.push('Property id must be a non-empty string');
  if (typeof p.name !== 'string' || !p.name) errors.push('Property name must be a non-empty string');

  const validTypes = ['house', 'apartment', 'bodega', 'construction'];
  if (!validTypes.includes(p.type)) {
    errors.push(`Property type must be one of: ${validTypes.join(', ')}`);
  }

  // 2. Location
  if (!p.location || typeof p.location !== 'object') {
    errors.push('Property location must be an object');
  } else {
    if (typeof p.location.city !== 'string' || !p.location.city) {
      errors.push('Location city must be a non-empty string');
    }
    if (typeof p.location.comuna !== 'string' || !p.location.comuna) {
      errors.push('Location comuna must be a non-empty string');
    }
    if (typeof p.location.estrato !== 'number') {
      errors.push('Location estrato must be a number');
    }
  }

  // 3. Floors
  if (!Array.isArray(p.floors)) {
    errors.push('Property floors must be an array');
  } else {
    p.floors.forEach((f: any, idx: number) => {
      if (!f || typeof f !== 'object') {
        errors.push(`Floor at index ${idx} must be an object`);
        return;
      }
      if (typeof f.id !== 'string' || !f.id) {
        errors.push(`Floor at index ${idx} must have a non-empty string id`);
      }
      if (typeof f.name !== 'string' || !f.name) {
        errors.push(`Floor at index ${idx} must have a non-empty string name`);
      }
      if (!Array.isArray(f.zones)) {
        errors.push(`Floor "${f.id || idx}" zones must be an array`);
      } else {
        f.zones.forEach((z: any, zIdx: number) => {
          if (!z || typeof z !== 'object') {
            errors.push(`Zone at index ${zIdx} in floor "${f.id}" must be an object`);
            return;
          }
          if (typeof z.id !== 'string' || !z.id) errors.push(`Zone at index ${zIdx} in floor "${f.id}" must have string id`);
          if (typeof z.name !== 'string' || !z.name) errors.push(`Zone "${z.id || zIdx}" in floor "${f.id}" must have string name`);
          if (typeof z.type !== 'string' || !z.type) errors.push(`Zone "${z.id || zIdx}" in floor "${f.id}" must have string type`);
          if (typeof z.x !== 'number') errors.push(`Zone "${z.id || zIdx}" in floor "${f.id}" must have numeric x`);
          if (typeof z.y !== 'number') errors.push(`Zone "${z.id || zIdx}" in floor "${f.id}" must have numeric y`);
          if (typeof z.width !== 'number') errors.push(`Zone "${z.id || zIdx}" in floor "${f.id}" must have numeric width`);
          if (typeof z.height !== 'number') errors.push(`Zone "${z.id || zIdx}" in floor "${f.id}" must have numeric height`);
        });
      }
    });
  }

  // 4. Rooms
  if (!Array.isArray(p.rooms)) {
    errors.push('Property rooms must be an array');
  } else {
    p.rooms.forEach((r: any, idx: number) => {
      if (!r || typeof r !== 'object') {
        errors.push(`Room at index ${idx} must be an object`);
        return;
      }
      if (typeof r.id !== 'string' || !r.id) errors.push(`Room at index ${idx} must have string id`);
      if (typeof r.floorId !== 'string' || !r.floorId) errors.push(`Room "${r.id || idx}" must have string floorId`);
      if (typeof r.name !== 'string' || !r.name) errors.push(`Room "${r.id || idx}" must have string name`);
    });
  }

  // 5. Items
  if (!Array.isArray(p.items)) {
    errors.push('Property items must be an array');
  } else {
    p.items.forEach((item: any, idx: number) => {
      if (!item || typeof item !== 'object') {
        errors.push(`Item at index ${idx} must be an object`);
        return;
      }
      if (typeof item.id !== 'string' || !item.id) errors.push(`Item at index ${idx} must have string id`);
      if (typeof item.name !== 'string' || !item.name) errors.push(`Item "${item.id || idx}" must have string name`);
      if (typeof item.category !== 'string' || !item.category) errors.push(`Item "${item.id || idx}" must have string category`);
    });
  }

  // 6. Taxes (Optional)
  if (p.taxes !== undefined) {
    if (!p.taxes || typeof p.taxes !== 'object') {
      errors.push('Property taxes must be an object');
    } else {
      const predial = p.taxes.predial;
      if (!predial || typeof predial !== 'object') {
        errors.push('Taxes must contain a predial tax object');
      } else {
        if (typeof predial.jurisdiction !== 'string' || !predial.jurisdiction) errors.push('Taxes predial jurisdiction must be string');
        if (typeof predial.avaluo !== 'number') errors.push('Taxes predial avaluo must be number');
        if (typeof predial.rate_pct !== 'number') errors.push('Taxes predial rate_pct must be number');
        if (typeof predial.installments !== 'number') errors.push('Taxes predial installments must be number');
        if (!Array.isArray(predial.dueDates)) errors.push('Taxes predial dueDates must be an array');
      }
    }
  }

  // 7. Leases (Optional)
  if (p.leases !== undefined) {
    if (!Array.isArray(p.leases)) {
      errors.push('Property leases must be an array');
    }
  }

  // 8. Maintenance (Optional)
  if (p.maintenance !== undefined) {
    if (!Array.isArray(p.maintenance)) {
      errors.push('Property maintenance must be an array');
    } else {
      p.maintenance.forEach((m: any, idx: number) => {
        if (!m || typeof m !== 'object') {
          errors.push(`Maintenance record at index ${idx} must be an object`);
          return;
        }
        if (typeof m.id !== 'string' || !m.id) errors.push(`Maintenance at index ${idx} must have string id`);
        if (typeof m.type !== 'string' || !m.type) errors.push(`Maintenance "${m.id || idx}" must have string type`);
        if (typeof m.interval_days !== 'number') errors.push(`Maintenance "${m.id || idx}" must have numeric interval_days`);
      });
    }
  }

  // 9. Utilities (Optional)
  if (p.utilities !== undefined) {
    if (!Array.isArray(p.utilities)) {
      errors.push('Property utilities must be an array');
    } else {
      const validUtilTypes = ['water', 'energy', 'gas', 'internet'];
      p.utilities.forEach((u: any, idx: number) => {
        if (!u || typeof u !== 'object') {
          errors.push(`Utility at index ${idx} must be an object`);
          return;
        }
        if (typeof u.id !== 'string' || !u.id) errors.push(`Utility at index ${idx} must have string id`);
        if (!validUtilTypes.includes(u.type)) errors.push(`Utility "${u.id || idx}" must have valid type: ${validUtilTypes.join(', ')}`);
        if (typeof u.provider !== 'string' || !u.provider) errors.push(`Utility "${u.id || idx}" must have string provider`);
        if (typeof u.account !== 'string' || !u.account) errors.push(`Utility "${u.id || idx}" must have string account`);
        if (typeof u.dueDay !== 'number') errors.push(`Utility "${u.id || idx}" must have numeric dueDay`);
        if (typeof u.budget !== 'number') errors.push(`Utility "${u.id || idx}" must have numeric budget`);
      });
    }
  }

  return {
    valid: errors.length === 0,
    errors
  };
}
