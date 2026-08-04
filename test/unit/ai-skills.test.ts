import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/svelte';
import {
  executeSkill,
  skillMaintenanceAdvice,
  skillInventoryLookup,
  skillCostSummary
} from '../../src/lib/domain/ai-skills';
import { floorPlanStore } from '../../src/lib/stores/floorPlanStore.svelte';
import type { Schedule } from '../../src/lib/domain/maintenance';
import type { Transaction } from '../../src/lib/domain/costs';
import type { Item } from '../../src/lib/domain/property';

describe('AI skills registry + executeSkill', () => {
  beforeEach(() => {
    // Ensure a current floor exists with a clean components list for assertions
    const floor = floorPlanStore.currentFloor;
    if (floor) {
      floor.components = floor.components.filter((c) => c.type !== 'wall' && c.type !== 'door');
    }
  });

  // 1. Original tests updated for guards (no .toBe(false))
  it('executeSkill addWall adds a wall component', () => {
    const before = floorPlanStore.currentFloor?.components.length ?? 0;
    const result = executeSkill('addWall', { x: 2, y: 3, width: 5, height: 0.15 });
    expect(result.ok).toBe(true);
    expect(result.message).toMatch(/wall/i);
    const comps = floorPlanStore.currentFloor.components;
    expect(comps.length).toBe(before + 1);
    const wall = comps[comps.length - 1];
    expect(wall.type).toBe('wall');
    expect(wall.x).toBe(2);
    expect(wall.y).toBe(3);
    expect(wall.width).toBe(5);
    expect(wall.height).toBe(0.15);
    expect(wall.layer).toBe('structure');
  });

  it('executeSkill with unknown skill returns ok false', () => {
    const result = executeSkill('notARealSkill', {});
    expect(result.ok).toEqual(false);
    expect(result.message).toMatch(/unknown/i);
  });

  it('executeSkill addComponent adds a door', () => {
    const before = floorPlanStore.currentFloor?.components.length ?? 0;
    const result = executeSkill('addComponent', { type: 'door', x: 1, y: 2, width: 0.9, height: 0.15 });
    expect(result.ok).toBe(true);
    const comps = floorPlanStore.currentFloor.components;
    expect(comps.length).toBe(before + 1);
    const door = comps[comps.length - 1];
    expect(door.type).toBe('door');
    expect(door.x).toBe(1);
    expect(door.y).toBe(2);
    expect(door.layer).toBe('structure');
  });

  // 2. New data-aware skill tests (direct function calls)
  it('skillMaintenanceAdvice returns correct summary from context', () => {
    const overdueSchedule: Schedule = {
      id: 's1',
      itemId: 'item1',
      type: 'preventive',
      interval_days: 30,
      lastDone: new Date(Date.now() - 40 * 24 * 60 * 60 * 1000),
      nextDue: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000) // overdue
    };
    const currentSchedule: Schedule = {
      id: 's2',
      itemId: 'item2',
      type: 'preventive',
      interval_days: 30,
      lastDone: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
      nextDue: new Date(Date.now() + 25 * 24 * 60 * 60 * 1000) // active
    };
    const openWorkOrder = {
      id: 'wo1',
      scheduleId: 's1',
      itemId: 'item1',
      status: 'open' as const,
      assignee: 'Juan',
      notes: 'Fix the leaky pipe',
      createdAt: new Date()
    };

    const context = {
      schedules: [overdueSchedule, currentSchedule],
      workOrders: [openWorkOrder]
    };

    const res = skillMaintenanceAdvice(context);
    expect(res.ok).toBe(true);
    expect(res.message).toContain('Overdue schedules: 1');
    expect(res.message).toContain('Open/In-Progress work orders: 1');
    expect(res.message).toContain('Fix the leaky pipe');
  });

  it('skillMaintenanceAdvice handles empty context safely', () => {
    const res = skillMaintenanceAdvice({});
    expect(res.ok).toBe(true);
    expect(res.message).toContain('Overdue schedules: 0');
    expect(res.message).toContain('Open/In-Progress work orders: 0');
  });

  it('skillInventoryLookup matches items correctly', () => {
    const items: Item[] = [
      { id: 'item1', name: 'Leaky Pipe', category: 'Plumbing', value: 120 },
      { id: 'item2', name: 'Smart TV', category: 'Electronics', value: 850 }
    ];

    const context = { items };

    // Search existing
    const res1 = skillInventoryLookup('tv', context);
    expect(res1.ok).toBe(true);
    expect(res1.message).toContain('Smart TV');
    expect(res1.message).not.toContain('Leaky Pipe');

    // Search empty query (should return all)
    const res2 = skillInventoryLookup('', context);
    expect(res2.ok).toBe(true);
    expect(res2.message).toContain('Smart TV');
    expect(res2.message).toContain('Leaky Pipe');
  });

  it('skillInventoryLookup returns message for no matching items', () => {
    const items: Item[] = [
      { id: 'item1', name: 'Leaky Pipe', category: 'Plumbing', value: 120 }
    ];
    const context = { items };
    const res = skillInventoryLookup('fridge', context);
    expect(res.ok).toBe(true);
    expect(res.message).toContain('No items found matching "fridge"');
  });

  it('skillCostSummary returns monthly summary and category breakdown', () => {
    const transactions: Transaction[] = [
      { id: 't1', type: 'expense', category: 'Plumbing', amount: 150, date: '2026-08-01' },
      { id: 't2', type: 'income', category: 'Rent', amount: 1200, date: '2026-08-02' }
    ];
    const context = { transactions };

    const res = skillCostSummary('', context);
    expect(res.ok).toBe(true);
    expect(res.message).toContain('Overall Cost Summary');
    expect(res.message).toContain('2026-08');
    expect(res.message).toContain('Plumbing: Expense: $150.00');
  });

  it('skillCostSummary filters by period when specified', () => {
    const transactions: Transaction[] = [
      { id: 't1', type: 'expense', category: 'Plumbing', amount: 150, date: '2026-08-01' },
      { id: 't2', type: 'income', category: 'Rent', amount: 1200, date: '2026-08-02' },
      { id: 't3', type: 'expense', category: 'Electronics', amount: 800, date: '2026-07-15' }
    ];
    const context = { transactions };

    const res = skillCostSummary('2026-08', context);
    expect(res.ok).toBe(true);
    expect(res.message).toContain('Cost Summary for 2026-08');
    expect(res.message).toContain('Expenses: $150.00');
    expect(res.message).toContain('Net: $1050.00');
    expect(res.message).not.toContain('800'); // July expense should not be in August summary
  });

  // 3. executeSkill wiring tests for the new skills
  it('executeSkill routes maintenanceAdvice correctly', () => {
    const context = {
      schedules: [],
      workOrders: []
    };
    const res = executeSkill('maintenanceAdvice', {}, context);
    expect(res.ok).toBe(true);
    expect(res.message).toContain('Maintenance Advice');
  });

  it('executeSkill routes inventoryLookup correctly', () => {
    const items: Item[] = [
      { id: 'item1', name: 'Toaster', category: 'Appliances', value: 50 }
    ];
    const res = executeSkill('inventoryLookup', { query: 'toaster' }, { items });
    expect(res.ok).toBe(true);
    expect(res.message).toContain('Toaster');
  });

  it('executeSkill routes costSummary correctly', () => {
    const transactions: Transaction[] = [
      { id: 't1', type: 'expense', category: 'Food', amount: 20, date: '2026-08-03' }
    ];
    const res = executeSkill('costSummary', { period: '2026-08' }, { transactions });
    expect(res.ok).toBe(true);
    expect(res.message).toContain('Cost Summary for 2026-08');
  });

  // 4. AIChat Component rendering and stable API smoke test
  it('AIChat smoke: renders Input + Button', async () => {
    const { default: AIChat } = await import('../../src/lib/AIChat.svelte');
    render(AIChat, { props: { context: {} } });
    expect(screen.getByLabelText(/command/i)).toBeTruthy();
    expect(screen.getByRole('button', { name: /send/i })).toBeTruthy();
  });
});
