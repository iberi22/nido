// Floor Plan Store - Svelte 5 Runes
import houseData from '../data/house-data.json';
import type { Property, Floor, Zone, Room, Item, Taxes, Lease, Maintenance, Utility } from '../domain/property';

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
  initialLoadDone = $state(false);
  dbLoadPromise: Promise<void> | null = null;

  // Canonical Property reactive state
  property = $state<Property>({
    id: 'casa-3-pisos-cali',
    name: 'Casa 3 Pisos - Barrio Santa Elena',
    type: 'house',
    location: { city: 'Cali', comuna: 'Comuna 10', estrato: 3, geohash: 'd0ybf91z' },
    floors: [],
    rooms: [],
    items: [],
    taxes: {
      predial: {
        jurisdiction: 'Cali',
        avaluo: 150000000,
        rate_pct: 0.008,
        installments: 4,
        dueDates: ['2026-03-31', '2026-06-30', '2026-09-30', '2026-12-31']
      }
    },
    leases: [],
    maintenance: [],
    utilities: []
  });

  // Data
  config = $state<FloorPlanConfig>({
    wallThickness: 0.15,
    scale: 50,
    plot: { width: 6, height: 26, margin: 100 },
    colors: {}
  });

  norms = $state<any>({});

  project = $derived({
    name: this.property.name,
    location: `${this.property.location.city}, Colombia - ${this.property.location.comuna}`,
    estrato: this.property.location.estrato,
    maxPisos: 5,
    norma: "NSR-10 / POT Acuerdo 069-2000"
  });

  // Floors map (reactive)
  floors = $state<Record<string, FloorState>>({});

  constructor() {
    this.initPersistence();
    this.setupAutoSave();
  }

  // Offline Persistence Initializer
  private initPersistence() {
    if (typeof window !== 'undefined' && window.localStorage) {
      const cached = window.localStorage.getItem('nido_property');
      if (cached) {
        try {
          const parsed = JSON.parse(cached);
          this.loadProperty(parsed);
        } catch (e) {
          console.error('Failed to load cached property from localStorage', e);
          this.loadFromSeed();
        }
      } else {
        this.loadFromSeed();
      }
    } else {
      this.loadFromSeed();
    }

    this.dbLoadPromise = (async () => {
      if (typeof window !== 'undefined' && window.indexedDB) {
        try {
          const saved = await this.loadFromIndexedDB();
          if (saved) {
            this.loadProperty(saved);
          }
        } catch (err) {
          console.error('Failed to load property from IndexedDB:', err);
        }
      }
      this.initialLoadDone = true;
    })();
  }

  private saveTimeout: any = null;

  private setupAutoSave() {
    if (typeof window !== 'undefined') {
      $effect.root(() => {
        $effect(() => {
          if (!this.initialLoadDone) return;

          // Track reactive fields
          const _floors = $state.snapshot(this.floors);
          const _config = $state.snapshot(this.config);
          const _norms = $state.snapshot(this.norms);
          const _rooms = $state.snapshot(this.property.rooms);
          const _items = $state.snapshot(this.property.items);
          const _leases = $state.snapshot(this.property.leases);
          const _maint = $state.snapshot(this.property.maintenance);
          const _util = $state.snapshot(this.property.utilities);
          const _taxes = $state.snapshot(this.property.taxes);
          const _name = this.property.name;

          if (this.saveTimeout) {
            clearTimeout(this.saveTimeout);
          }
          this.saveTimeout = setTimeout(() => {
            this.saveProperty();
          }, 300);
        });
      });
    }
  }

  // Load fallback seed data
  private loadFromSeed() {
    // houseData is typed as the migrated property seed structure
    const seed = houseData as unknown as Property;
    this.loadProperty(seed);
  }

  // Initialize from property array
  private initData() {
    this.floors = {};
    const rawFloors = this.property.floors;

    rawFloors.forEach(floorData => {
      const key = floorData.id;
      // Resolve reference if needed (like 'third' ref 'second')
      const sourceData = floorData.ref
        ? { ...JSON.parse(JSON.stringify(rawFloors.find(f => f.id === floorData.ref))), ...floorData }
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
        x: z.x, y: z.y,
        width: z.width,
        height: z.height,
        rotation: 0,
        layer: 'zones',
        properties: {
          name: z.name,
          subtitle: z.subtitle,
          color: z.color || this.config.colors.zone_fill,
          type: z.type
        },
        locked: true // Zones usually locked background
      });
    });

    // 2. Walls -> Components
    source.walls?.forEach((w: any, i: number) => {
      components.push({
        id: w.id || `wall-${i}-${crypto.randomUUID()}`,
        type: 'wall',
        x: Math.min(w.x1, w.x2),
        y: Math.min(w.y1, w.y2),
        width: Math.abs(w.x2 - w.x1) || this.config.wallThickness,
        height: Math.abs(w.y2 - w.y1) || this.config.wallThickness,
        layer: 'structure',
        rotation: 0,
        properties: {
          x1: w.x1, y1: w.y1, x2: w.x2, y2: w.y2,
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
        height: el.height || (el.width ? el.width : 0),
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
        x: 0, y: 0,
        layer: 'structure',
        properties: {
          data: source.stairs
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

  // --- Canonical Property Load/Save & Offline Persistence ---

  loadProperty(prop: Property) {
    this.property = prop;
    if (prop.config) {
      this.config = prop.config;
    }
    if (prop.norms) {
      this.norms = prop.norms;
    }
    this.initData();
  }

  saveProperty(): Property {
    // Sync current components from floors record back to property.floors before saving
    this.property.floors = this.property.floors.map(floor => {
      const liveFloor = this.floors[floor.id];
      if (liveFloor) {
        return {
          ...floor,
          zones: liveFloor.components
            .filter(c => c.type === 'zone')
            .map(c => ({
              id: c.id,
              name: c.properties.name,
              subtitle: c.properties.subtitle,
              x: c.x, y: c.y, width: c.width || 0, height: c.height || 0,
              type: c.properties.type || 'zone',
              color: c.properties.color
            })),
          walls: liveFloor.components
            .filter(c => c.type === 'wall')
            .map(c => ({
              id: c.id,
              x1: c.properties.x1 ?? c.x,
              y1: c.properties.y1 ?? c.y,
              x2: c.properties.x2 ?? (c.x + (c.width || 0)),
              y2: c.properties.y2 ?? (c.y + (c.height || 0)),
              note: c.properties.note
            })),
          elements: liveFloor.components
            .filter(c => ['door', 'sliding_door', 'garage_door', 'pedestrian_door', 'car', 'motorcycle', 'furniture'].includes(c.type) || c.layer === 'furniture')
            .map(c => ({
              type: c.type,
              x: c.x, y: c.y,
              width: c.width || 0, height: c.height || 0,
              rotation: c.rotation || 0,
              note: c.properties.note
            })),
          stairs: liveFloor.components.find(c => c.type === 'stairs')?.properties.data || floor.stairs,
          dimensions: liveFloor.components
            .filter(c => c.type === 'dimension')
            .map(c => ({
              from: [c.x, c.y],
              to: [c.properties.toX ?? c.x, c.properties.toY ?? c.y],
              label: c.properties.label,
              side: c.properties.side,
              note: c.properties.note
            }))
        };
      }
      return floor;
    });

    // Keep config & norms synced in canonical property
    this.property.config = this.config;
    this.property.norms = this.norms;

    // LocalStorage sync
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.setItem('nido_property', JSON.stringify(this.property));
    }

    this.saveToIndexedDB(this.property);

    return this.property;
  }

  async loadFromIndexedDB(): Promise<Property | null> {
    if (typeof window === 'undefined' || !window.indexedDB) {
      return null;
    }
    return new Promise((resolve) => {
      try {
        const request = window.indexedDB.open('NidoOfflineDB', 1);
        request.onupgradeneeded = (e: any) => {
          const db = e.target.result;
          if (!db.objectStoreNames.contains('AppState')) {
            db.createObjectStore('AppState');
          }
          if (!db.objectStoreNames.contains('properties')) {
            db.createObjectStore('properties', { keyPath: 'id' });
          }
        };
        request.onsuccess = (e: any) => {
          const db = e.target.result;
          if (!db.objectStoreNames.contains('properties')) {
            resolve(null);
            return;
          }
          const transaction = db.transaction('properties', 'readonly');
          const store = transaction.objectStore('properties');
          const getReq = store.get(this.property.id);
          getReq.onsuccess = () => {
            resolve(getReq.result || null);
          };
          getReq.onerror = () => {
            resolve(null);
          };
        };
        request.onerror = () => {
          resolve(null);
        };
      } catch (err) {
        resolve(null);
      }
    });
  }

  async saveToIndexedDB(prop: Property): Promise<void> {
    if (typeof window === 'undefined' || !window.indexedDB) {
      return;
    }
    return new Promise((resolve) => {
      try {
        const request = window.indexedDB.open('NidoOfflineDB', 1);
        request.onupgradeneeded = (e: any) => {
          const db = e.target.result;
          if (!db.objectStoreNames.contains('AppState')) {
            db.createObjectStore('AppState');
          }
          if (!db.objectStoreNames.contains('properties')) {
            db.createObjectStore('properties', { keyPath: 'id' });
          }
        };
        request.onsuccess = (e: any) => {
          const db = e.target.result;
          const transaction = db.transaction('properties', 'readwrite');
          const store = transaction.objectStore('properties');
          store.put(prop);
          resolve();
        };
        request.onerror = () => {
          resolve();
        };
      } catch (err) {
        resolve();
      }
    });
  }

  // --- CRUD Collections for Canonical Data Model ---

  // Rooms CRUD
  addRoom(room: Room) {
    if (!this.property.rooms) this.property.rooms = [];
    this.property.rooms.push(room);
  }

  updateRoom(id: string, updates: Partial<Room>) {
    const room = this.property.rooms?.find(r => r.id === id);
    if (room) {
      Object.assign(room, updates);
    }
  }

  removeRoom(id: string) {
    if (this.property.rooms) {
      this.property.rooms = this.property.rooms.filter(r => r.id !== id);
    }
  }

  // Items CRUD
  addItem(item: Item) {
    if (!this.property.items) this.property.items = [];
    this.property.items.push(item);
  }

  updateItem(id: string, updates: Partial<Item>) {
    const item = this.property.items?.find(i => i.id === id);
    if (item) {
      Object.assign(item, updates);
    }
  }

  removeItem(id: string) {
    if (this.property.items) {
      this.property.items = this.property.items.filter(i => i.id !== id);
    }
  }

  // Taxes CRUD
  updateTaxes(updates: Taxes) {
    this.property.taxes = updates;
  }

  // Leases CRUD
  addLease(lease: Lease) {
    if (!this.property.leases) this.property.leases = [];
    this.property.leases.push(lease);
  }

  updateLease(id: string, updates: Partial<Lease>) {
    const lease = this.property.leases?.find(l => l.id === id);
    if (lease) {
      Object.assign(lease, updates);
    }
  }

  removeLease(id: string) {
    if (this.property.leases) {
      this.property.leases = this.property.leases.filter(l => l.id !== id);
    }
  }

  // Maintenance CRUD
  addMaintenance(maint: Maintenance) {
    if (!this.property.maintenance) this.property.maintenance = [];
    this.property.maintenance.push(maint);
  }

  updateMaintenance(id: string, updates: Partial<Maintenance>) {
    const maint = this.property.maintenance?.find(m => m.id === id);
    if (maint) {
      Object.assign(maint, updates);
    }
  }

  removeMaintenance(id: string) {
    if (this.property.maintenance) {
      this.property.maintenance = this.property.maintenance.filter(m => m.id !== id);
    }
  }

  // Utilities CRUD
  addUtility(utility: Utility) {
    if (!this.property.utilities) this.property.utilities = [];
    this.property.utilities.push(utility);
  }

  updateUtility(id: string, updates: Partial<Utility>) {
    const util = this.property.utilities?.find(u => u.id === id);
    if (util) {
      Object.assign(util, updates);
    }
  }

  removeUtility(id: string) {
    if (this.property.utilities) {
      this.property.utilities = this.property.utilities.filter(u => u.id !== id);
    }
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
      const comp = floor.components[index];
      floor.components[index] = { ...comp, ...updates };
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

if (typeof window !== 'undefined') {
  (window as any).floorPlanStore = floorPlanStore;
}
