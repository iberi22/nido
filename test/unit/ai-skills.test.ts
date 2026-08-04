import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/svelte';
import { executeSkill } from '../../src/lib/domain/ai-skills';
import { floorPlanStore } from '../../src/lib/stores/floorPlanStore.svelte';

describe('AI skills registry + executeSkill', () => {
  beforeEach(() => {
    // Ensure a current floor exists with a clean components list for assertions
    const floor = floorPlanStore.currentFloor;
    if (floor) {
      floor.components = floor.components.filter((c) => c.type !== 'wall' && c.type !== 'door');
    }
  });

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
    expect(result.ok).toBe(false);
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

  it('AIChat smoke: renders Input + Button', async () => {
    const { default: AIChat } = await import('../../src/lib/AIChat.svelte');
    render(AIChat);
    expect(screen.getByLabelText(/command/i)).toBeTruthy();
    expect(screen.getByRole('button', { name: /send/i })).toBeTruthy();
  });
});
