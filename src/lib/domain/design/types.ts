// Contracts for the lot/brief -> house design pipeline.
// Type-only: NO runtime imports (keeps property.ts <-> design free of cycles).

export interface Lot {
  polygon: [number, number][];
  frontEdge: number;
  area_m2?: number;
  setbacks?: { front: number; rear: number; left: number; right: number };
  source?: {
    kind: 'image' | 'pdf' | 'dimensions' | 'manual';
    assetId?: string;
    fileName?: string;
    page?: number;
    m_per_px?: number;
    calibration?: { p1: [number, number]; p2: [number, number]; distance_m: number };
  };
}

export interface RoofSpec {
  kind: 'flat_terrace' | 'gable' | 'shed';
  pitch_deg?: number;
  overhang_m?: number;
  parapet_m?: number;
}

export type BriefExtra =
  | 'study' | 'laundry' | 'patio' | 'terrace'
  | 'guest_room' | 'shop' | 'service_room' | 'storage';

export interface HouseBrief {
  v: 1;
  lang: 'es' | 'en';
  floors: number;
  bedrooms: number;
  masterSuite: boolean;
  bathrooms: number;
  halfBaths: number;
  garage: { cars: number; motorcycles: number };
  kitchen: 'open' | 'closed';
  extras: BriefExtra[];
  roof: 'flat_terrace' | 'gable' | 'shed';
  roofPitch_deg?: number;
  floorHeight_m: number;
  groundFloorHeight_m?: number;
  style: 'modern' | 'traditional' | 'minimal';
  notes?: string;
}

export interface RoomSpec {
  id: string;
  kind: string;
  targetArea: number;
  minSide: number;
  band: 'front' | 'social' | 'service' | 'private';
  floorPref?: number;
}

export interface PlannedRoom {
  id: string;
  kind: string;
  name?: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface PlannedFloor {
  id: string;
  name: string;
  index: number;
  height_m: number;
  elevation_m: number;
  slab_m: number;
  rooms: PlannedRoom[];
  roof?: RoofSpec;
}

export interface BuildingPlan {
  seed: number;
  strategy: string;
  footprint: { x: number; y: number; width: number; height: number };
  floors: PlannedFloor[];
  stair?: { x: number; y: number; width: number; height: number; riser_mm: number; tread_mm: number; totalSteps: number };
  diagnostics: string[];
}

export interface MeshPart {
  slot: string;
  kind: 'box' | 'prism' | 'extrude';
  dims: number[];
  transform: { position: [number, number, number]; rotationY?: number };
  ownerId?: string;
}

export interface MeshPlan {
  parts: MeshPart[];
  stats: { parts: number; drawCalls: number; triangles: number };
}
