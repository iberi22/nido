import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, cleanup, tick } from '@testing-library/svelte';
import { floorPlanStore } from '../../src/lib/stores/floorPlanStore.svelte';
import NormsPanel from '../../src/lib/NormsPanel.svelte';

// Mock konva since we're rendering shell elements
vi.mock('konva', () => ({ default: {} }));

describe('NormsPanel component', () => {
  beforeEach(() => {
    cleanup();
    // Reset floorPlanStore config to a safe, compliant state before each test
    floorPlanStore.config.wallThickness = 0.15;
    floorPlanStore.currentFloorId = 'ground';
    // Clear any temporary zones/stairs modifications
    if (floorPlanStore.floors && floorPlanStore.floors.ground) {
      floorPlanStore.floors.ground.components = [
        {
          id: 'room-1',
          type: 'zone',
          x: 0,
          y: 0,
          width: 3.5,
          height: 4.0,
          layer: 'zones',
          properties: { name: 'SALA', type: 'room' }
        }
      ];
    }
  });

  it('renders compliant message when no violations exist', () => {
    const { getByTestId } = render(NormsPanel);
    const panel = getByTestId('norms-panel');
    expect(panel).toBeTruthy();

    const noViolations = getByTestId('no-violations');
    expect(noViolations).toBeTruthy();
    expect(noViolations.textContent).toContain('No violations on this floor');
  });

  it('computes and displays global wall thickness warning when below 0.10m', () => {
    // Set wall thickness to a violating value
    floorPlanStore.config.wallThickness = 0.08;

    const { getByTestId, queryByTestId, getAllByTestId } = render(NormsPanel);
    const panel = getByTestId('norms-panel');
    expect(panel).toBeTruthy();

    // Verify compliance message is not rendered
    const noViolations = queryByTestId('no-violations');
    expect(noViolations).toBeNull();

    // Verify warning is listed
    const items = getAllByTestId('violation-item');
    expect(items.length).toBeGreaterThanOrEqual(1);

    const firstViolationText = items[0].textContent;
    expect(firstViolationText).toContain('global_config_wall_thickness');
    expect(firstViolationText).toContain('Wall thickness');
    expect(firstViolationText).toContain('Increase wall thickness');
  });

  it('filters violations to show only active floor zones', async () => {
    // Set wall thickness to compliant
    floorPlanStore.config.wallThickness = 0.15;

    // Add a violating zone to active floor ('ground')
    floorPlanStore.floors.ground.components = [
      {
        id: 'ground-garage',
        type: 'zone',
        x: 0,
        y: 0,
        width: 2.0, // POT min width is 2.60m -> triggers violation
        height: 5.0,
        layer: 'zones',
        properties: { name: 'GARAJE', type: 'garage' }
      }
    ];

    const { getAllByTestId, queryAllByTestId } = render(NormsPanel);
    const items = getAllByTestId('violation-item');
    expect(items.length).toBeGreaterThanOrEqual(1);
    expect(items[0].textContent).toContain('POT_garage');
    expect(items[0].textContent).toContain('Garage width');

    // Switch floor to 'second' (which does not have ground-garage)
    cleanup();
    floorPlanStore.currentFloorId = 'second';

    // Rerender for the second floor
    const { queryAllByTestId: queryAllByTestId2 } = render(NormsPanel);
    const secondFloorItems = queryAllByTestId2('violation-item');
    // It should not show the first floor's garage violation on second floor
    const hasGarageViolationOnSecond = secondFloorItems.some(item => item.textContent?.includes('ground-garage'));
    expect(hasGarageViolationOnSecond).toEqual(false);
  });

  it('renders stair violations with rule details and fix hints', () => {
    // Setup a staircase component that violates NSR-10 stair width limits (width < 0.90m)
    floorPlanStore.floors.ground.components = [
      {
        id: 'stairs-zone',
        type: 'zone',
        x: 10,
        y: 10,
        width: 1.5,
        height: 1.5,
        layer: 'zones',
        properties: { name: 'INGRESO', type: 'staircase' }
      },
      {
        id: 'stairs-main',
        type: 'stairs',
        x: 10,
        y: 10,
        layer: 'structure',
        properties: {
          data: {
            type: 'L',
            totalSteps: 23,
            riser_mm: 174,
            tread_mm: 280,
            totalRise_m: 4.0,
            components: [
              {
                id: 'run1',
                width: 0.80, // Under 0.90m threshold
                height: 4.2
              }
            ]
          }
        }
      }
    ];

    const { getAllByTestId } = render(NormsPanel);
    const items = getAllByTestId('violation-item');
    expect(items.length).toBeGreaterThanOrEqual(1);

    const textContent = items[0].textContent || '';
    expect(textContent).toContain('NSR10_stairs');
    expect(textContent).toContain('width of 0.8m is below the minimum NSR-10 stairs limit');
    expect(textContent).toContain('Increase stair component');
  });
});
