// Reactive wiring of the command layer to the app store. Every UI action and the chat
// go through sceneCommands.execute(); history is kept per floor.
import { floorPlanStore } from '../stores/floorPlanStore.svelte';
import type { SceneModel } from './apply';
import { CommandHistory, type ExecResult } from './history';
import type { Command } from './schema';

class SceneCommands {
  /** bumped on every history change so `canUndo`/`canRedo` are reactive */
  version = $state(0);
  private histories = new Map<string, CommandHistory>();

  get model(): SceneModel {
    const floor = floorPlanStore.currentFloor;
    return { components: floor ? $state.snapshot(floor.components) : [] };
  }

  private get history(): CommandHistory {
    const id = floorPlanStore.currentFloorId;
    let h = this.histories.get(id);
    if (!h) {
      h = new CommandHistory(
        {
          get: () => this.model,
          set: (m) => {
            const floor = floorPlanStore.currentFloor;
            if (floor) floor.components = m.components;
            if (
              floorPlanStore.selectedComponentId &&
              !m.components.some((c) => c.id === floorPlanStore.selectedComponentId)
            ) {
              floorPlanStore.selectComponent(null);
            }
          }
        },
        () => {
          this.version++;
        }
      );
      this.histories.set(id, h);
    }
    return h;
  }

  get canUndo(): boolean {
    void this.version;
    void floorPlanStore.currentFloorId;
    return this.history.canUndo;
  }

  get canRedo(): boolean {
    void this.version;
    void floorPlanStore.currentFloorId;
    return this.history.canRedo;
  }

  execute(cmd: Command | Command[]): ExecResult {
    return this.history.execute(cmd);
  }

  dryRun(cmd: Command | Command[]): ExecResult {
    return this.history.dryRun(cmd);
  }

  undo(): ExecResult {
    return this.history.undo();
  }

  redo(): ExecResult {
    return this.history.redo();
  }
}

export const sceneCommands = new SceneCommands();
