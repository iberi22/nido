import { floorPlanStore, type FloorState } from '../stores/floorPlanStore.svelte';

export interface ValidationIssue {
  floor: string;
  message: string;
  severity: 'error' | 'warning';
}

export class DesignValidator {
  static validate(): ValidationIssue[] {
    const issues: ValidationIssue[] = [];
    const norms = floorPlanStore.norms;
    const config = floorPlanStore.config;

    // 1. Check Global Config
    if (config.wallThickness < 0.10) {
      issues.push({
        floor: 'Global',
        message: `El espesor de muros (${config.wallThickness}m) es muy bajo. Mínimo recomendado 0.10m.`,
        severity: 'warning'
      });
    }

    // 2. Check each floor
    Object.values(floorPlanStore.floors).forEach(floor => {
      this.validateFloor(floor, norms, issues);
    });

    return issues;
  }

  private static validateFloor(floor: FloorState, norms: any, issues: ValidationIssue[]) {
    const components = floor.components;

    // Check Garage Norms
    const garages = components.filter(c => c.type === 'garage' || c.type === 'car');
    if (garages.length > 0) {
      // Find the zone or component defining garage
      // In our data, garage is a zone usually.
      const garageZone = components.find(c => c.type === 'zone' && c.properties.type === 'garage');

      if (garageZone) {
         if (garageZone.width && garageZone.width < norms.POT_garage.minWidth_m) {
           issues.push({
             floor: floor.name,
             message: `El garaje tiene un ancho de ${garageZone.width}m. La norma POT exige mínimo ${norms.POT_garage.minWidth_m}m.`,
             severity: 'error'
           });
         }
      }
    }

    // Check Stairs Norms (NSR-10)
    const stairs = components.filter(c => c.type === 'stairs');
    stairs.forEach(stair => {
       const data = stair.properties.data;
       if (data && data.components) {
         data.components.forEach((part: any) => {
           if (part.width && part.width < norms.NSR10_stairs.minWidth_m) {
             issues.push({
               floor: floor.name,
               message: `Tramo de escalera con ancho ${part.width}m. La norma NSR-10 exige mínimo ${norms.NSR10_stairs.minWidth_m}m.`,
               severity: 'error'
             });
           }
         });
       }
    });

    // Check Door Sizes
    const doors = components.filter(c => c.type.includes('door'));
    doors.forEach(door => {
      if (door.width && door.width < 0.7) {
        issues.push({
          floor: floor.name,
          message: `Puerta detectada con ancho ${door.width}m. Se recomienda mínimo 0.70m para acceso.`,
          severity: 'warning'
        });
      }
    });
  }
}
