// Floor Plan Store - Svelte 5 Runes
import houseData from '../data/house-data.json';

export interface Zone {
  id: string;
  name: string;
  subtitle?: string;
  x: number;
  y: number;
  width: number;
  height: number;
  type: string;
  color?: string;
}

export interface Wall {
  id: string;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  note?: string;
}

export interface StairsData {
  type: string;
  x: number;
  y: number;
  run1: { direction: string; width: number; length: number; steps: number };
  landing: { x: number; y: number; width: number; height: number };
  run2: { direction: string; width: number; length: number; steps: number };
  riser_mm?: number;
  tread_mm?: number;
}

export interface FloorElement {
  type: string;
  x: number;
  y: number;
  width?: number;
  height?: number;
  note?: string;
}

export interface FloorData {
  name: string;
  subtitle?: string;
  height_m?: number;
  zones: Zone[];
  walls?: Wall[];
  stairs?: StairsData;
  elements: FloorElement[];
  dimensions?: any[];
  ref?: string;
}

export interface FloorPlanConfig {
  wallThickness: number;
  scale: number;
  plot: { width: number; height: number; margin: number };
  colors: Record<string, string>;
}

export class FloorPlanStore {
  currentFloor = $state<'ground' | 'second' | 'third' | 'roof'>('ground');
  currentTool = $state('select');
  zoom = $state(100);
  selectedElementId = $state<string | null>(null);

  config: FloorPlanConfig = houseData.config;
  project = houseData.project;
  norms = houseData.norms;
  floors: Record<string, FloorData> = {} as any;

  constructor() {
    // Deep copy floors and resolve references
    const rawFloors = houseData.floors as Record<string, any>;
    Object.keys(rawFloors).forEach(key => {
      const floor = rawFloors[key];
      if (floor.ref && rawFloors[floor.ref]) {
        this.floors[key] = {
          ...JSON.parse(JSON.stringify(rawFloors[floor.ref])),
          name: floor.name,
          subtitle: floor.subtitle
        };
      } else {
        this.floors[key] = JSON.parse(JSON.stringify(floor));
      }
    });
  }

  setFloor(floor: any) { this.currentFloor = floor; }
  setTool(tool: string) { this.currentTool = tool; }
  zoomIn() { this.zoom = Math.min(this.zoom + 10, 300); }
  zoomOut() { this.zoom = Math.max(this.zoom - 10, 20); }
  resetZoom() { this.zoom = 100; }
  selectElement(id: string | null) { this.selectedElementId = id; }

  get currentData(): FloorData {
    return this.floors[this.currentFloor];
  }
}

export const floorPlanStore = new FloorPlanStore();
