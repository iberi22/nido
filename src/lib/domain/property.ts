export interface Zone {
  id: string;
  name: string;
  type: string;
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  color?: string;
  stairs?: {
    type?: string;
    totalSteps?: number;
    riser_mm?: number;
    tread_mm?: number;
    totalRise_m?: number;
  };
  properties?: Record<string, any>;
}

export interface Property {
  id?: string;
  name?: string;
  floors: Record<string, any> | any[];
}
