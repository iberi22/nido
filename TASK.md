# TASK.md

## Current Tasks
- [ ] Review 3D implementation (`Scene3D.svelte`) to ensure compatibility with recent UI changes.
- [ ] Wire up the "Exportar JSON" button to actually download the current state of `floorPlanStore`.

## Backlog / Future Tasks
- [ ] Improve snap-to-grid and alignment guides in the 2D Konva editor.
- [ ] Add ability to dynamically join/intersect walls.
- [ ] Implement global undo/redo functionality in `floorPlanStore`.
- [ ] Provide more library items (windows, doors variants, specific furniture).
- [ ] Integrate local storage or a backend database to persist projects.

## Completed Tasks
- [x] Create foundational Svelte 5 stores with `Runes` (`floorPlanStore.svelte.ts`).
- [x] Build initial 2D canvas editor using Konva.
- [x] Configure Tailwind CSS v4 in the Vite project.
- [x] Integrate `shadcn-svelte` (Tabs, Cards, Buttons, Inputs, Labels, Badges, ScrollArea, Tooltip, Sheet).
- [x] Implement a dark theme for the overall UI layout (`App.svelte`).
- [x] Redesign `FloorSelector.svelte` and `Toolbar.svelte` to use shadcn components.
- [x] Maintain "blueprint" blue aesthetics exclusively on the Konva canvas.
- [x] Create project tracking files (`PLANNING.md` and `TASK.md`).
