<script lang="ts">
  import { floorPlanStore } from './stores/floorPlanStore.svelte';
  import { validateProperty } from './domain/norms';
  import { Card, Badge } from '@swal/ui';

  // Construct reactive Property representation from live floor plan store
  const liveProperty = $derived.by(() => {
    const prop = { ...floorPlanStore.property };
    prop.floors = prop.floors.map(floor => {
      const liveFloor = floorPlanStore.floors[floor.id];
      if (liveFloor) {
        return {
          ...floor,
          zones: liveFloor.components
            .filter(c => c.type === 'zone')
            .map(c => ({
              id: c.id,
              name: c.properties?.name || c.id,
              subtitle: c.properties?.subtitle,
              x: c.x,
              y: c.y,
              width: c.width || 0,
              height: c.height || 0,
              type: c.properties?.type || 'zone',
              color: c.properties?.color
            })),
          walls: liveFloor.components
            .filter(c => c.type === 'wall')
            .map(c => ({
              id: c.id,
              x1: c.properties?.x1 ?? c.x,
              y1: c.properties?.y1 ?? c.y,
              x2: c.properties?.x2 ?? (c.x + (c.width || 0)),
              y2: c.properties?.y2 ?? (c.y + (c.height || 0)),
              note: c.properties?.note
            })),
          elements: liveFloor.components
            .filter(c => ['door', 'sliding_door', 'garage_door', 'pedestrian_door', 'car', 'motorcycle', 'furniture'].includes(c.type) || c.layer === 'furniture')
            .map(c => ({
              type: c.type,
              x: c.x,
              y: c.y,
              width: c.width || 0,
              height: c.height || 0,
              rotation: c.rotation || 0,
              note: c.properties?.note
            })),
          stairs: liveFloor.components.find(c => c.type === 'stairs')?.properties?.data || floor.stairs,
          dimensions: liveFloor.components
            .filter(c => c.type === 'dimension')
            .map(c => ({
              from: [c.x, c.y],
              to: [c.properties?.toX ?? c.x, c.properties?.toY ?? c.y],
              label: c.properties?.label,
              side: c.properties?.side,
              note: c.properties?.note
            }))
        };
      }
      return floor;
    });

    prop.config = floorPlanStore.config;
    prop.norms = floorPlanStore.norms;
    return prop;
  });

  const violations = $derived(validateProperty(liveProperty));

  const activeFloorViolations = $derived.by(() => {
    const currentFloor = floorPlanStore.currentFloor;
    if (!currentFloor) return [];
    const zoneIds = currentFloor.components.filter(c => c.type === 'zone').map(c => c.id);
    return violations.filter(v => v.zoneId === 'global' || zoneIds.includes(v.zoneId));
  });
</script>

<div class="norms-panel" data-testid="norms-panel">
  <h3 class="panel-title">📐 Building Norms</h3>
  {#if activeFloorViolations.length === 0}
    <div class="no-violations" data-testid="no-violations" role="status" aria-live="polite">
      <Badge variant="success">Compliant</Badge>
      <span class="success-message">No violations on this floor. All layouts comply with NSR-10 and POT standards.</span>
    </div>
  {:else}
    <ul class="violation-list" data-testid="violations-list" aria-label="Active floor building norm violations">
      {#each activeFloorViolations as violation}
        <li class="violation-item" data-testid="violation-item" aria-live="polite">
          <div class="violation-header">
            <Badge variant={violation.severity === 'fail' ? 'danger' : 'warning'}>
              {violation.severity.toUpperCase()}
            </Badge>
            <span class="rule-id">{violation.ruleId}</span>
          </div>
          <p class="violation-msg">{violation.message}</p>
          {#if violation.fixHint}
            <p class="violation-hint">💡 {violation.fixHint}</p>
          {/if}
        </li>
      {/each}
    </ul>
  {/if}
</div>

<style>
  .norms-panel {
    display: flex;
    flex-direction: column;
    gap: 12px;
  }
  .panel-title {
    margin: 0;
    font-size: 13px;
    font-weight: 600;
    color: var(--swal-text, #f1f5f9);
    opacity: 0.85;
  }
  .no-violations {
    display: flex;
    flex-direction: column;
    gap: 8px;
    background: var(--swal-surface, rgba(15, 23, 42, 0.8));
    border: 1px solid var(--swal-border, rgba(255, 255, 255, 0.08));
    border-radius: 6px;
    padding: 10px;
  }
  .success-message {
    font-size: 11px;
    color: var(--swal-text-secondary, #94a3b8);
  }
  .violation-list {
    list-style: none;
    margin: 0;
    padding: 0;
    display: flex;
    flex-direction: column;
    gap: 8px;
  }
  .violation-item {
    background: var(--swal-surface, rgba(15, 23, 42, 0.8));
    border: 1px solid var(--swal-border, rgba(255, 255, 255, 0.08));
    border-radius: 6px;
    padding: 10px;
    display: flex;
    flex-direction: column;
    gap: 6px;
  }
  .violation-header {
    display: flex;
    align-items: center;
    gap: 8px;
  }
  .rule-id {
    font-size: 10px;
    font-family: monospace;
    color: var(--swal-text-secondary, #94a3b8);
  }
  .violation-msg {
    margin: 0;
    font-size: 11px;
    color: var(--swal-text, #f1f5f9);
  }
  .violation-hint {
    margin: 0;
    font-size: 11px;
    color: var(--swal-accent-orange, #fbbf24);
  }
</style>
