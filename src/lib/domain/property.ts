import type { FloorPlanConfig, FloorState } from '../stores/floorPlanStore.svelte';

export interface Property {
  project: {
    name: string;
    location?: string;
    estrato?: number;
    maxPisos?: number;
    norma?: string;
  };
  config: FloorPlanConfig;
  norms?: Record<string, any>;
  floors: Record<string, FloorState>;
}
