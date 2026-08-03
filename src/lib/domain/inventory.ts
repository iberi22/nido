import type { Item, Property } from './property';

/**
 * Adds an item to the property inventory.
 * Returns a new Property object with the added item.
 */
export function addItem(property: Property, item: Omit<Item, 'id'> & { id?: string }): Property {
  const items = property.items ? [...property.items] : [];
  const newItem: Item = {
    ...item,
    id: item.id || (typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2))
  };
  return {
    ...property,
    items: [...items, newItem]
  };
}

/**
 * Updates an existing item in the property inventory.
 * Returns a new Property object with the updated item.
 */
export function updateItem(property: Property, itemId: string, updates: Partial<Omit<Item, 'id'>>): Property {
  const items = property.items ? [...property.items] : [];
  const updatedItems = items.map(item => {
    if (item.id === itemId) {
      return { ...item, ...updates };
    }
    return item;
  });
  return {
    ...property,
    items: updatedItems
  };
}

/**
 * Removes an item from the property inventory.
 * Returns a new Property object without the removed item.
 */
export function removeItem(property: Property, itemId: string): Property {
  const items = property.items ? [...property.items] : [];
  return {
    ...property,
    items: items.filter(item => item.id !== itemId)
  };
}

/**
 * Lists all items in a specific room.
 */
export function listItemsByRoom(property: Property, roomId: string): Item[] {
  const items = property.items || [];
  return items.filter(item => item.roomId === roomId);
}

/**
 * Calculates total value of items in a specific room.
 */
export function totalValueByRoom(property: Property, roomId: string): number {
  const roomItems = listItemsByRoom(property, roomId);
  return roomItems.reduce((sum, item) => sum + (item.value || 0), 0);
}

/**
 * Calculates total value of all items in the property.
 */
export function totalValueByProperty(property: Property): number {
  const items = property.items || [];
  return items.reduce((sum, item) => sum + (item.value || 0), 0);
}

/**
 * Checks if a warranty is expiring soon (within `days` from now).
 */
export function isWarrantyExpiring(item: Item, days: number): boolean {
  if (!item.warrantyUntil) return false;
  const warrantyDate = new Date(item.warrantyUntil);
  if (isNaN(warrantyDate.getTime())) return false;

  const now = new Date();
  const diffTime = warrantyDate.getTime() - now.getTime();
  const diffDays = diffTime / (1000 * 60 * 60 * 24);

  return diffDays >= 0 && diffDays <= days;
}

/**
 * Gets the warranty status of an item.
 * Returns 'expired', 'soon' (within 30 days), or 'ok'.
 */
export function warrantyStatus(item: Item): 'ok' | 'soon' | 'expired' {
  if (!item.warrantyUntil) return 'ok';
  const warrantyDate = new Date(item.warrantyUntil);
  if (isNaN(warrantyDate.getTime())) return 'ok';

  const now = new Date();
  if (warrantyDate.getTime() < now.getTime()) {
    return 'expired';
  }

  // standard threshold is 30 days
  if (isWarrantyExpiring(item, 30)) {
    return 'soon';
  }

  return 'ok';
}

// Offline-first sync operation definition
export interface SyncOperation {
  id: string;
  action: 'add' | 'update' | 'remove';
  itemId: string;
  payload?: any;
  timestamp: number;
}

/**
 * Offline-first sync queue manager.
 */
export class SyncQueue {
  private queue: SyncOperation[] = [];

  enqueue(action: 'add' | 'update' | 'remove', itemId: string, payload?: any): void {
    const id = typeof crypto !== 'undefined' && crypto.randomUUID
      ? crypto.randomUUID()
      : Math.random().toString(36).substring(2);
    this.queue.push({
      id,
      action,
      itemId,
      payload,
      timestamp: Date.now()
    });
  }

  getQueue(): SyncOperation[] {
    return [...this.queue];
  }

  clear(): void {
    this.queue = [];
  }

  async process(syncFn: (op: SyncOperation) => Promise<boolean>): Promise<{ success: boolean; processedCount: number }> {
    let processedCount = 0;
    const remaining: SyncOperation[] = [];

    for (const op of this.queue) {
      try {
        const success = await syncFn(op);
        if (success) {
          processedCount++;
        } else {
          remaining.push(op);
        }
      } catch (err) {
        remaining.push(op);
      }
    }

    this.queue = remaining;
    return {
      success: remaining.length === 0,
      processedCount
    };
  }
}
