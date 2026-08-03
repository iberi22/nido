// Property and Item Types
// Part of NIDO floor plan designer & home administration domain models.

export interface Item {
  id: string;
  roomId: string;
  name: string;
  category: string;
  value: number;
  warrantyUntil?: string; // ISO-8601 Date String
  photo?: string;
  qr?: string;
}

export interface Property {
  id: string;
  name: string;
  items?: Item[];
}
