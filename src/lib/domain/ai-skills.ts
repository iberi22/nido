import { floorPlanStore, type LayerType } from '../stores/floorPlanStore.svelte';
import { isOverdue } from './maintenance';
import { summarizeByMonth, summarizeByCategory } from './costs';
import type { Item } from './property';

export interface SkillParameter {
  type: string;
  description: string;
  enum?: string[];
}

export interface SkillDefinition {
  name: string;
  description: string;
  parameters: {
    type: 'object';
    properties: Record<string, SkillParameter>;
    required: string[];
  };
}

export const SKILLS: SkillDefinition[] = [
  {
    name: 'addWall',
    description: 'Adds a wall to the floor plan. A wall is a rectangle.',
    parameters: {
      type: 'object',
      properties: {
        x: { type: 'number', description: 'X coordinate in meters (center)' },
        y: { type: 'number', description: 'Y coordinate in meters (center)' },
        width: { type: 'number', description: 'Width/Length of the wall in meters' },
        height: { type: 'number', description: 'Thickness/Height of the wall in meters' },
        rotation: { type: 'number', description: 'Rotation in degrees' }
      },
      required: ['x', 'y', 'width', 'height']
    }
  },
  {
    name: 'addComponent',
    description: 'Adds a component (furniture, door, window) to the floor plan',
    parameters: {
      type: 'object',
      properties: {
        type: {
          type: 'string',
          description: 'Type of component',
          enum: ['furniture', 'door', 'window', 'sliding_door', 'motorcycle', 'car']
        },
        x: { type: 'number', description: 'X coordinate in meters' },
        y: { type: 'number', description: 'Y coordinate in meters' },
        width: { type: 'number', description: 'Width in meters' },
        height: { type: 'number', description: 'Height in meters' },
        rotation: { type: 'number', description: 'Rotation in degrees' }
      },
      required: ['type', 'x', 'y']
    }
  },
  {
    name: 'toggleLayer',
    description: 'Toggles the visibility of a layer',
    parameters: {
      type: 'object',
      properties: {
        layer: {
          type: 'string',
          description: 'Layer name',
          enum: ['structure', 'furniture', 'zones', 'annotations', 'grid']
        }
      },
      required: ['layer']
    }
  },
  {
    name: 'clearFloor',
    description: 'Removes all components from the current floor',
    parameters: {
      type: 'object',
      properties: {},
      required: []
    }
  },
  {
    name: 'validateDesign',
    description: 'Checks the design against architectural norms and returns a list of issues.',
    parameters: { type: 'object', properties: {}, required: [] }
  },
  {
    name: 'getDesignJson',
    description: 'Returns the full design as a JSON string.',
    parameters: { type: 'object', properties: {}, required: [] }
  },
  {
    name: 'loadDesignJson',
    description: 'Loads a design from a JSON string.',
    parameters: {
      type: 'object',
      properties: { json: { type: 'string', description: 'The JSON string of the design' } },
      required: ['json']
    }
  },
  {
    name: 'skillMaintenanceAdvice',
    description: 'Retrieves advice on maintenance tasks, overdue schedules, and work orders.',
    parameters: { type: 'object', properties: {}, required: [] }
  },
  {
    name: 'skillInventoryLookup',
    description: 'Searches for items in the inventory by name or category.',
    parameters: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'Search query for item name or category' }
      },
      required: []
    }
  },
  {
    name: 'skillCostSummary',
    description: 'Provides a cost summary of expenses and income, optionally filtered by period (YYYY-MM).',
    parameters: {
      type: 'object',
      properties: {
        period: { type: 'string', description: 'The month to filter (YYYY-MM)' }
      },
      required: []
    }
  }
];

function newId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `skill-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function asNumber(value: unknown): number | undefined {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.trim() !== '') {
    const n = Number(value);
    if (Number.isFinite(n)) return n;
  }
  return undefined;
}

function asString(value: unknown): string | undefined {
  if (typeof value === 'string' && value.length > 0) return value;
  return undefined;
}

function requireNumbers(
  params: Record<string, unknown>,
  keys: string[]
): { ok: true; values: Record<string, number> } | { ok: false; message: string } {
  const values: Record<string, number> = {};
  for (const key of keys) {
    const n = asNumber(params[key]);
    if (n === undefined) {
      return { ok: false, message: `Missing or invalid parameter: ${key}` };
    }
    values[key] = n;
  }
  return { ok: true, values };
}

/**
 * Executes a maintenance advice analysis based on the provided context.
 */
export function skillMaintenanceAdvice(context?: any): { ok: boolean; message: string } {
  const ctx = context || {};
  const schedules: any[] = ctx.schedules || [];
  const property = ctx.property;
  const workOrders = property?.workOrders || ctx.workOrders || [];

  const overdueCount = schedules.filter((s: any) => {
    if (!s || !s.nextDue) return false;
    try {
      const scheduleObj = {
        ...s,
        lastDone: s.lastDone instanceof Date ? s.lastDone : new Date(s.lastDone),
        nextDue: s.nextDue instanceof Date ? s.nextDue : new Date(s.nextDue)
      };
      return isOverdue(scheduleObj);
    } catch {
      return false;
    }
  }).length;

  const openWorkOrders = workOrders.filter((wo: any) => wo && (wo.status === 'open' || wo.status === 'in_progress'));

  let msg = `Maintenance Advice:\n`;
  msg += `- Overdue schedules: ${overdueCount}\n`;
  msg += `- Open/In-Progress work orders: ${openWorkOrders.length}`;

  if (openWorkOrders.length > 0) {
    msg += `\nOpen orders:\n` + openWorkOrders.map((wo: any) => `* ${wo.notes} (assigned to ${wo.assignee})`).join('\n');
  }

  return { ok: true, message: msg };
}

/**
 * Searches the property inventory for items matching the search query.
 */
export function skillInventoryLookup(query?: string, context?: any): { ok: boolean; message: string } {
  const ctx = context || {};
  const items: Item[] = ctx.items || ctx.property?.items || [];
  if (items.length === 0) {
    return { ok: true, message: 'Inventory is empty' };
  }

  const q = (query || '').toLowerCase().trim();
  const matched = q
    ? items.filter(item => {
        const nameMatch = item.name ? item.name.toLowerCase().includes(q) : false;
        const catMatch = item.category ? item.category.toLowerCase().includes(q) : false;
        return nameMatch || catMatch;
      })
    : items;

  if (matched.length === 0) {
    return { ok: true, message: `No items found matching "${query}"` };
  }

  let msg = `Inventory Lookup (found ${matched.length} items):\n`;
  msg += matched.map(item => `- ${item.name} [${item.category}]` + (item.value ? ` - Value: $${item.value}` : '')).join('\n');

  return { ok: true, message: msg };
}

/**
 * Summarizes transaction data based on the provided period and context.
 */
export function skillCostSummary(period?: string, context?: any): { ok: boolean; message: string } {
  const ctx = context || {};
  const transactions: any[] = ctx.transactions || [];
  if (transactions.length === 0) {
    return { ok: true, message: 'No transactions recorded' };
  }

  const p = (period || '').trim();

  if (/^\d{4}-\d{2}$/.test(p)) {
    const monthly = summarizeByMonth(transactions);
    const data = monthly[p];
    if (!data) {
      return { ok: true, message: `No transaction data found for period "${p}"` };
    }
    return {
      ok: true,
      message: `Cost Summary for ${p}:\n- Expenses: $${data.expense.toFixed(2)}\n- Income: $${data.income.toFixed(2)}\n- Net: $${data.net.toFixed(2)}`
    };
  }

  const monthly = summarizeByMonth(transactions);
  const categories = summarizeByCategory(transactions);

  let msg = `Overall Cost Summary:\n`;
  msg += `By Month:\n`;
  for (const [m, data] of Object.entries(monthly)) {
    msg += `- ${m}: Expense: $${data.expense.toFixed(2)} | Income: $${data.income.toFixed(2)} | Net: $${data.net.toFixed(2)}\n`;
  }
  msg += `\nBy Category:\n`;
  for (const [c, data] of Object.entries(categories)) {
    msg += `- ${c}: Expense: $${data.expense.toFixed(2)} | Income: $${data.income.toFixed(2)}\n`;
  }

  return { ok: true, message: msg.trim() };
}

/**
 * Execute a named AI skill against floorPlanStore.
 * Returns ok/message for toast feedback.
 */
export function executeSkill(
  name: string,
  params: Record<string, unknown>,
  context?: any
): { ok: boolean; message: string } {
  switch (name) {
    case 'addWall': {
      const required = requireNumbers(params, ['x', 'y', 'width', 'height']);
      if (!required.ok) return required;
      const rotation = asNumber(params.rotation) ?? 0;
      floorPlanStore.addComponent({
        id: newId(),
        type: 'wall',
        x: required.values.x,
        y: required.values.y,
        width: required.values.width,
        height: required.values.height,
        rotation,
        layer: 'structure',
        properties: {}
      });
      return { ok: true, message: 'Wall added' };
    }

    case 'addComponent': {
      const type = asString(params.type);
      if (!type) {
        return { ok: false, message: 'Missing or invalid parameter: type' };
      }
      const required = requireNumbers(params, ['x', 'y']);
      if (!required.ok) return required;
      const width = asNumber(params.width) ?? 1;
      const height = asNumber(params.height) ?? 1;
      const rotation = asNumber(params.rotation) ?? 0;
      let layer: LayerType = 'furniture';
      if (['door', 'window', 'sliding_door'].includes(type)) layer = 'structure';

      floorPlanStore.addComponent({
        id: newId(),
        type,
        x: required.values.x,
        y: required.values.y,
        width,
        height,
        rotation,
        layer,
        properties: {}
      });
      return { ok: true, message: `Component "${type}" added` };
    }

    case 'clearFloor': {
      const floor = floorPlanStore.currentFloor;
      if (!floor) {
        return { ok: false, message: 'No current floor' };
      }
      floor.components = [];
      return { ok: true, message: 'Floor cleared' };
    }

    case 'skillMaintenanceAdvice':
    case 'maintenanceAdvice': {
      return skillMaintenanceAdvice(context);
    }

    case 'skillInventoryLookup':
    case 'inventoryLookup': {
      const query = asString(params.query || params.q) || '';
      return skillInventoryLookup(query, context);
    }

    case 'skillCostSummary':
    case 'costSummary': {
      const period = asString(params.period || params.month) || '';
      return skillCostSummary(period, context);
    }

    case 'toggleLayer':
    case 'validateDesign':
    case 'getDesignJson':
    case 'loadDesignJson':
      return { ok: false, message: `Skill "${name}" is not available yet` };

    default:
      return { ok: false, message: `Unknown skill: ${name}` };
  }
}

/**
 * Parse a command string like "addWall x=2 y=3 width=5 height=0.15"
 * into skill name + params.
 */
export function parseSkillCommand(text: string): {
  name: string;
  params: Record<string, unknown>;
} | null {
  const trimmed = text.trim();
  if (!trimmed) return null;
  const tokens = trimmed.split(/\s+/);
  const name = tokens[0];
  if (!name) return null;
  const params: Record<string, unknown> = {};
  for (const token of tokens.slice(1)) {
    const eq = token.indexOf('=');
    if (eq <= 0) continue;
    const key = token.slice(0, eq);
    const raw = token.slice(eq + 1);
    const num = Number(raw);
    params[key] = raw !== '' && Number.isFinite(num) ? num : raw;
  }
  return { name, params };
}
