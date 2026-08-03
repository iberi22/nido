import { floorPlanStore, type LayerType } from '../stores/floorPlanStore.svelte';
import { DesignValidator } from '../utils/validator';
import { IOManager } from '../utils/io';

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
  }
];

export class SkillExecutor {
  static execute(skillName: string, args: any) {
    console.log(`Executing skill: ${skillName}`, args);

    switch (skillName) {
      case 'addWall':
        floorPlanStore.addComponent({
          id: crypto.randomUUID(),
          type: 'wall',
          x: args.x,
          y: args.y,
          width: args.width,
          height: args.height,
          rotation: args.rotation || 0,
          layer: 'structure',
          properties: {}
        });
        break;

      case 'addComponent':
        let layer: LayerType = 'furniture';
        if (['door', 'window', 'sliding_door'].includes(args.type)) layer = 'structure';

        floorPlanStore.addComponent({
          id: crypto.randomUUID(),
          type: args.type,
          x: args.x,
          y: args.y,
          width: args.width || 1,
          height: args.height || 1,
          rotation: args.rotation || 0,
          layer: layer,
          properties: {}
        });
        break;

      case 'toggleLayer':
        floorPlanStore.toggleLayer(args.layer as LayerType);
        break;

      case 'clearFloor':
         floorPlanStore.currentFloor.components = [];
         break;

      case 'validateDesign':
         const issues = DesignValidator.validate();
         return issues.length > 0 ? `Issues found: ${JSON.stringify(issues)}` : 'Design is valid.';

      case 'getDesignJson':
         return JSON.stringify({
             project: floorPlanStore.project,
             config: floorPlanStore.config,
             floors: floorPlanStore.floors
         });

      case 'loadDesignJson':
         try {
             const data = JSON.parse(args.json);
             if (data.project) floorPlanStore.project = data.project;
             if (data.config) floorPlanStore.config = data.config;
             if (data.norms) floorPlanStore.norms = data.norms;
             if (data.floors) floorPlanStore.floors = data.floors;
             return 'Design loaded successfully.';
         } catch (e) {
             return 'Error loading design JSON.';
         }

      default:
        console.warn(`Unknown skill: ${skillName}`);
        return `Error: Unknown skill ${skillName}`;
    }
    return `Executed ${skillName}`;
  }
}

// Expose to window for external agents
if (typeof window !== 'undefined') {
  (window as any).FloorPlanSkills = {
    definitions: SKILLS,
    execute: SkillExecutor.execute
  };
}
