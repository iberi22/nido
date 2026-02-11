// Floor Plan Store - Svelte 5 Runes
import houseData from '../data/house-data.json';

// --- New Component Architecture ---

export type LayerType = 'structure' | 'furniture' | 'zones' | 'annotations' | 'grid';

export interface Component {
  id: string;
  type: string; // 'wall', 'window', 'door', 'furniture', 'zone', 'stairs', 'text', 'dimension'
  x: number;
  y: number;
  width?: number;
  height?: number;
  rotation?: number;
  layer: LayerType;
  properties: Record<string, any>; // Flexible storage for specific props (color, label, points, etc.)
  locked?: boolean;
}

export interface FloorState {
  id: string; // 'ground', 'second', etc.
  name: string;
  subtitle?: string;
  height_m?: number;
  components: Component[];
}

export interface FloorPlanConfig {
  wallThickness: number;
  scale: number;
  plot: { width: number; height: number; margin: number };
  colors: Record<string, string>;
}

export class FloorPlanStore {
  // State
  currentFloorId = $state<string>('ground');
  currentTool = $state<string>('select');
  zoom = $state(100);
  selectedComponentId = $state<string | null>(null);

  // Data
  config: FloorPlanConfig = houseData.config;
  project = houseData.project;
  norms = houseData.norms;

  // Floors map (reactive)
  floors = $state<Record<string, FloorState>>({});

  constructor() {
    this.initData();
  }

  // Initialize from static JSON (Migration Logic)
  private initData() {
    const rawFloors = houseData.floors as Record<string, any>;

    Object.keys(rawFloors).forEach(key => {
      const floorData = rawFloors[key];
      // Resolve reference if needed (like 'third' ref 'second')
      const sourceData = floorData.ref && rawFloors[floorData.ref]
        ? { ...JSON.parse(JSON.stringify(rawFloors[floorData.ref])), ...floorData }
        : floorData;

      this.floors[key] = {
        id: key,
        name: sourceData.name,
        subtitle: sourceData.subtitle,
        height_m: sourceData.height_m,
        components: this.migrateFloorDataToComponents(sourceData)
      };
    });
  }

  private migrateFloorDataToComponents(source: any): Component[] {
    const components: Component[] = [];
    const SCALE = this.config.scale;

    // 1. Zones -> Components
    source.zones?.forEach((z: any) => {
      components.push({
        id: z.id || crypto.randomUUID(),
        type: 'zone',
        x: z.x, y: z.y, // Keep internal coordinates (will be scaled by renderer or here?)
        // NOTE: The previous renderer multiplied by SCALE at render time.
        // To make the editor consistent, we should store RAW units (meters) and scale in renderer,
        // OR store SCALED units (pixels).
        // Decision: Store RAW METERS in Component state to respect "CAD" precision,
        // renderers apply config.scale.
        width: z.width,
        height: z.height,
        rotation: 0,
        layer: 'zones',
        properties: {
          name: z.name,
          subtitle: z.subtitle,
          color: z.color || this.config.colors.zone_fill
        },
        locked: true // Zones usually locked background
      });
    });

    // 2. Walls -> Components
    source.walls?.forEach((w: any, i: number) => {
      // Wall defined by x1,y1 -> x2,y2
      components.push({
        id: w.id || `wall-${i}-${crypto.randomUUID()}`,
        type: 'wall',
        x: Math.min(w.x1, w.x2),
        y: Math.min(w.y1, w.y2),
        width: Math.abs(w.x2 - w.x1) || this.config.wallThickness, // Vertical wall width is thickness
        height: Math.abs(w.y2 - w.y1) || this.config.wallThickness, // Horizontal wall height is thickness
        layer: 'structure',
        rotation: 0,
        properties: {
          x1: w.x1, y1: w.y1, x2: w.x2, y2: w.y2, // Keep original points for now
          thickness: this.config.wallThickness,
          note: w.note
        }
      });
    });

    // 3. Elements -> Components (Furniture / Doors)
    source.elements?.forEach((el: any, i: number) => {
      let layer: LayerType = 'structure';
      if (['car', 'motorcycle', 'furniture'].includes(el.type)) layer = 'furniture';

      components.push({
        id: `el-${i}-${crypto.randomUUID()}`,
        type: el.type,
        x: el.x,
        y: el.y,
        width: el.width,
        height: el.height || (el.width ? el.width : 0), // Fallback
        rotation: el.rotation || 0,
        layer: layer,
        properties: {
          note: el.note,
          ...el // spread other props
        }
      });
    });

    // 4. Stairs -> Component
    if (source.stairs) {
      components.push({
        id: 'stairs-main',
        type: 'stairs',
        x: 0, y: 0, // Stairs usually have absolute positioning in their sub-components
        layer: 'structure',
        properties: {
          data: source.stairs // Keep raw data for custom renderer
        }
      });
    }

    // 5. Dimensions -> Components (Annotations)
    source.dimensions?.forEach((d: any, i: number) => {
      components.push({
        id: `dim-${i}`,
        type: 'dimension',
        x: d.from[0], y: d.from[1],
        layer: 'annotations',
        properties: {
          toX: d.to[0], toY: d.to[1],
          label: d.label,
          side: d.side,
          note: d.note
        }
      });
    });

    return components;
  }

  // --- Actions ---

  get currentFloor() {
    return this.floors[this.currentFloorId];
  }

  setFloor(id: string) {
    if (this.floors[id]) this.currentFloorId = id;
  }

  setTool(tool: string) {
    this.currentTool = tool;
    if (tool !== 'select') this.selectedComponentId = null;
  }

  selectComponent(id: string | null) {
    this.selectedComponentId = id;
  }

  updateComponent(id: string, updates: Partial<Component>) {
    const floor = this.currentFloor;
    const index = floor.components.findIndex(c => c.id === id);
    if (index !== -1) {
      // Create new reference for reactivity if needed, or structuredClone
      const comp = floor.components[index];
      floor.components[index] = { ...comp, ...updates };

      // If updating x/y/rotation, ensures numeric consistency
    }
  }

  addComponent(component: Component) {
    this.currentFloor.components.push(component);
  }

  deleteComponent(id: string) {
    const floor = this.currentFloor;
    floor.components = floor.components.filter(c => c.id !== id);
    if (this.selectedComponentId === id) this.selectedComponentId = null;
  }

  // Zoom controls
  zoomIn() { this.zoom = Math.min(this.zoom + 10, 300); }
  zoomOut() { this.zoom = Math.max(this.zoom - 10, 20); }
  resetZoom() { this.zoom = 100; }
}

export const floorPlanStore = new FloorPlanStore();
