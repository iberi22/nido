import { describe, test, expect } from 'vitest';
import type { Property, Item } from '../../src/lib/domain/property';
import {
  addItem,
  updateItem,
  removeItem,
  listItemsByRoom,
  totalValueByRoom,
  totalValueByProperty,
  isWarrantyExpiring,
  warrantyStatus
} from '../../src/lib/domain/inventory';

describe('Inventory Domain Service Unit Tests', () => {
  const mockProperty: Property = {
    id: 'prop-1',
    name: 'Cozy Apartment',
    items: [
      {
        id: 'item-1',
        roomId: 'room-1',
        name: 'Refrigerator',
        category: 'Appliances',
        value: 1200,
        warrantyUntil: '2026-12-31'
      },
      {
        id: 'item-2',
        roomId: 'room-1',
        name: 'Microwave',
        category: 'Appliances',
        value: 150
      },
      {
        id: 'item-3',
        roomId: 'room-2',
        name: 'Sofa',
        category: 'Furniture',
        value: 800
      }
    ]
  };

  test('addItem adds a new item to the property and generates an ID if missing', () => {
    const newItem: Omit<Item, 'id'> = {
      roomId: 'room-2',
      name: 'Coffee Table',
      category: 'Furniture',
      value: 200
    };

    const updated = addItem(mockProperty, newItem);
    expect(updated.items).toHaveLength(4);
    const added = updated.items?.[3];
    expect(added).toBeDefined();
    expect(added?.name).toBe('Coffee Table');
    expect(added?.id).toBeDefined();
    expect(typeof added?.id).toBe('string');
  });

  test('updateItem updates properties of an existing item', () => {
    const updated = updateItem(mockProperty, 'item-1', { value: 1100, name: 'Fridge' });
    const target = updated.items?.find(i => i.id === 'item-1');
    expect(target?.value).toBe(1100);
    expect(target?.name).toBe('Fridge');
    // Ensure others didn't change
    const other = updated.items?.find(i => i.id === 'item-2');
    expect(other?.value).toBe(150);
  });

  test('removeItem deletes an item by ID', () => {
    const updated = removeItem(mockProperty, 'item-2');
    expect(updated.items).toHaveLength(2);
    expect(updated.items?.some(i => i.id === 'item-2')).toBe(false);
  });

  test('listItemsByRoom returns only items in the given room', () => {
    const room1Items = listItemsByRoom(mockProperty, 'room-1');
    expect(room1Items).toHaveLength(2);
    expect(room1Items.every(i => i.roomId === 'room-1')).toBe(true);

    const emptyRoomItems = listItemsByRoom(mockProperty, 'non-existent');
    expect(emptyRoomItems).toHaveLength(0);
  });

  test('totalValueByRoom calculates the sum of item values in a room', () => {
    const val1 = totalValueByRoom(mockProperty, 'room-1');
    expect(val1).toBe(1350); // Refrigerator (1200) + Microwave (150)

    const val2 = totalValueByRoom(mockProperty, 'room-2');
    expect(val2).toBe(800); // Sofa (800)
  });

  test('totalValueByProperty calculates the sum of all item values', () => {
    const total = totalValueByProperty(mockProperty);
    expect(total).toBe(2150);
  });

  test('isWarrantyExpiring correctly evaluates relative to current date', () => {
    const now = new Date();

    // Future date: expiring in 15 days
    const expFuture = new Date();
    expFuture.setDate(now.getDate() + 15);
    const itemSoon: Item = {
      id: 'i-soon',
      roomId: 'r1',
      name: 'Test',
      category: 'Cat',
      value: 100,
      warrantyUntil: expFuture.toISOString()
    };

    // Far future date: expiring in 45 days
    const expFar = new Date();
    expFar.setDate(now.getDate() + 45);
    const itemFar: Item = {
      id: 'i-far',
      roomId: 'r1',
      name: 'Test',
      category: 'Cat',
      value: 100,
      warrantyUntil: expFar.toISOString()
    };

    expect(isWarrantyExpiring(itemSoon, 30)).toBe(true);
    expect(isWarrantyExpiring(itemFar, 30)).toBe(false);
  });

  test('warrantyStatus handles ok, soon, and expired cases correctly', () => {
    const now = new Date();

    // Expired item
    const pastDate = new Date();
    pastDate.setDate(now.getDate() - 5);
    const itemExpired: Item = {
      id: 'i-exp',
      roomId: 'r1',
      name: 'Test',
      category: 'Cat',
      value: 100,
      warrantyUntil: pastDate.toISOString()
    };

    // Expiring soon item (within 30 days)
    const soonDate = new Date();
    soonDate.setDate(now.getDate() + 10);
    const itemSoon: Item = {
      id: 'i-soon',
      roomId: 'r1',
      name: 'Test',
      category: 'Cat',
      value: 100,
      warrantyUntil: soonDate.toISOString()
    };

    // Good item
    const farDate = new Date();
    farDate.setDate(now.getDate() + 100);
    const itemOk: Item = {
      id: 'i-ok',
      roomId: 'r1',
      name: 'Test',
      category: 'Cat',
      value: 100,
      warrantyUntil: farDate.toISOString()
    };

    // No warranty item
    const itemNoWarranty: Item = {
      id: 'i-none',
      roomId: 'r1',
      name: 'Test',
      category: 'Cat',
      value: 100
    };

    expect(warrantyStatus(itemExpired)).toBe('expired');
    expect(warrantyStatus(itemSoon)).toBe('soon');
    expect(warrantyStatus(itemOk)).toBe('ok');
    expect(warrantyStatus(itemNoWarranty)).toBe('ok');
  });
});
