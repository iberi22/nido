# PLANNING.md

## High-Level Vision
A robust, parameterized floor plan designer web application. It aims to provide tools for designing multi-story floor plans with a focus on an intuitive UI, structural details (like walls, zones, and stairs), and seamless transitions between 2D editing and 3D visualization.

## Architecture
- **Frontend Framework:** Svelte 5 (using Runes for state management).
- **Build Tool:** Vite (v8 Beta).
- **2D Canvas Rendering:** Konva.js (`konva`, `svelte-konva`).
- **3D Visualization:** Three.js.
- **UI Components & Styling:** `shadcn-svelte` integrated with Tailwind CSS (v4).
- **State Management:** Reactive stores using Svelte 5's `$state` and `$derived` runes (`floorPlanStore.svelte.ts`).
- **Data Model:** Centralized JSON configuration (`house-data.json`) defining the project constraints, plot size, layers, and components.

## Tech Stack & Tools
- Svelte 5
- TypeScript
- Vite
- Tailwind CSS
- shadcn-svelte
- Konva
- Three.js

## UI/UX Constraints & Design Language
- **Theme:** Dark theme by default for the surrounding interface (using `zinc` colors from Tailwind and shadcn).
- **Design Canvas:** Must preserve a "blueprint" style (blue tones, specific grid, and accents) for contrast and clarity against the dark UI.
- **Tooling Interface:** Intuitive sidebars and toolbars utilizing drag-and-drop interactions to populate the canvas. Grouped tools and clear hierarchy.

## Future Milestones
1. Refine the 3D viewer (Scene3D.svelte) to accurately reflect the 2D layout.
2. Implement JSON export functionality for the floor plan data.
3. Advance structural features (e.g., dynamic wall joining, snap-to-grid enhancements).
