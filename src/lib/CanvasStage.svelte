<script lang="ts">
  import { onMount } from 'svelte';
  import Konva from 'konva';
  import { floorPlanStore, type Component, type LayerType } from './stores/floorPlanStore.svelte';

  let container: HTMLDivElement;
  let stage: Konva.Stage;
  let layer: Konva.Layer;
  let tr: Konva.Transformer;

  const config = $derived(floorPlanStore.config);
  const floorData = $derived(floorPlanStore.currentFloor); // Reactive floor state
  const SCALE = $derived(config.scale);
  const VIRTUAL_WIDTH = 550;
  const VIRTUAL_HEIGHT = 1600;

  const PLOT = $derived({
    x: 100,
    y: 120,
    w: config.plot.width * SCALE,
    h: config.plot.height * SCALE
  });

  const C = $derived(config.colors);

  onMount(() => {
    initCanvas();
    const ro = new ResizeObserver(() => fitStage());
    ro.observe(container);
    return () => { ro.disconnect(); stage?.destroy(); };
  });

  $effect(() => {
    if (layer && floorData) {
      layer.destroyChildren();
      // Re-add transformer since layer was cleared
      layer.add(tr);
      draw();
    }
  });

  // Watch selection changes
  $effect(() => {
    if (!tr || !stage) return;
    const selectedId = floorPlanStore.selectedComponentId;
    if (selectedId) {
      const node = stage.findOne(`#${selectedId}`);
      if (node) {
        tr.nodes([node]);
        tr.getLayer()?.batchDraw();
      } else {
        tr.nodes([]);
      }
    } else {
      tr.nodes([]);
      tr.getLayer()?.batchDraw();
    }
  });


  function initCanvas() {
    stage = new Konva.Stage({ container, width: VIRTUAL_WIDTH, height: VIRTUAL_HEIGHT, draggable: true });
    layer = new Konva.Layer();
    stage.add(layer);

    // Initialize transformer
    tr = new Konva.Transformer({
      anchorSize: 8,
      borderDash: [4, 4],
      borderStroke: '#3b82f6',
      anchorStroke: '#3b82f6',
      anchorFill: '#ffffff',
      rotateEnabled: true,
      enabledAnchors: ['top-left', 'top-right', 'bottom-left', 'bottom-right']
    });
    layer.add(tr);

    // Stage Selection Logic
    stage.on('click tap', (e: any) => {
      if (e.target === stage || e.target.name() === 'background') {
        floorPlanStore.selectComponent(null);
        return;
      }
      // If clicked on a component group or shape
      const id = e.target.id() || e.target.getParent()?.id();
      if (id) {
        floorPlanStore.selectComponent(id);
      }
    });

    stage.on('wheel', (e) => {
      e.evt.preventDefault();
      const old = stage.scaleX();
      const ptr = stage.getPointerPosition();
      if (!ptr) return;
      const mp = { x: (ptr.x - stage.x()) / old, y: (ptr.y - stage.y()) / old };
      const dir = e.evt.deltaY > 0 ? -1 : 1;
      let ns = dir > 0 ? old * 1.1 : old / 1.1;
      ns = Math.max(0.15, Math.min(6, ns));
      stage.scale({ x: ns, y: ns });
      stage.position({ x: ptr.x - mp.x * ns, y: ptr.y - mp.y * ns });
    });

    // Handle drag end for components
    layer.on('dragend', (e) => {
      const id = e.target.id();
      if (id && floorPlanStore.currentFloor.components.find(c => c.id === id)) {
        // Calculate new position in meters
        const newX = (e.target.x() - PLOT.x) / SCALE;
        const newY = (e.target.y() - PLOT.y) / SCALE;
        floorPlanStore.updateComponent(id, { x: newX, y: newY });
      }
    });

    // Handle transform end
    layer.on('transformend', (e) => {
      const node = e.target;
      const id = node.id();
      const scaleX = node.scaleX();
      const scaleY = node.scaleY();

      // Reset scale to 1 and update width/height
      node.scaleX(1);
      node.scaleY(1);

      const comp = floorPlanStore.currentFloor.components.find(c => c.id === id);
      if (comp) {
        const newWidth = (node.width() * scaleX) / SCALE;
        const newHeight = (node.height() * scaleY) / SCALE;
        const newRot = node.rotation();
        const newX = (node.x() - PLOT.x) / SCALE;
        const newY = (node.y() - PLOT.y) / SCALE; // Origin might change

        floorPlanStore.updateComponent(id, {
          x: newX, y: newY,
          width: newWidth, height: newHeight,
          rotation: newRot
        });
      }
    });

    draw();
    fitStage();
  }

  function fitStage() {
    if (!container || !stage) return;
    const cw = container.offsetWidth, ch = container.offsetHeight;
    const sc = Math.min(cw / VIRTUAL_WIDTH, ch / VIRTUAL_HEIGHT, 1.2);
    stage.width(cw); stage.height(ch);
    layer.scale({ x: sc, y: sc });
    layer.position({ x: (cw - VIRTUAL_WIDTH * sc) / 2, y: (ch - VIRTUAL_HEIGHT * sc) / 2 });
    layer.batchDraw();
  }

  // ── Drag & Drop ──
  function handleDragOver(e: DragEvent) {
    e.preventDefault(); // Necessary to allow dropping
  }

  function handleDrop(e: DragEvent) {
    e.preventDefault();
    stage.setPointersPositions(e);
    const ptr = stage.getPointerPosition();
    if (!ptr) return;

    const type = e.dataTransfer?.getData('application/json');
    if (!type) return;

    // Convert from stage pixels to world meters (relative to plot origin PLOT.x/y)
    // Stage transform: x' = (world_x * scaleX + stageX)
    // world_x = (x' - stageX) / scaleX
    // But our internal logic is: Component X (meters) -> Render X (pixels) = (comp.x * SCALE + PLOT.x)
    // So we need to reverse:
    // 1. Get pointer stage coords: px, py
    // 2. Transform to layer coords (reverse stage pan/zoom): lx = (px - stage.x()) / stage.scaleX()
    // 3. Transform to plot relative meters: mx = (lx - PLOT.x) / SCALE

    const lx = (ptr.x - stage.x()) / stage.scaleX();
    const ly = (ptr.y - stage.y()) / stage.scaleX();

    const mx = (lx - PLOT.x) / SCALE; // meters x
    const my = (ly - PLOT.y) / SCALE; // meters y

    const id = crypto.randomUUID();
    let width = 1;
    let height = 1;
    let layer: LayerType = 'furniture';
    let rot = 0;

    // Defaults per type
    if (type === 'door') { width = 0.9; height = 0.2; layer= 'structure'; }
    if (type === 'sliding_door') { width = 1.5; height = 0.2; layer= 'structure'; }
    if (type === 'window') { width = 1.2; height = 0.2; layer='structure'; }
    if (type === 'wall') { width = 3; height = config.wallThickness; layer='structure'; }
    if (type === 'motorcycle') { width = 0.6; height = 1.8; layer='furniture'; }
    if (type === 'car') { width = 1.8; height = 4.2; layer='furniture'; }
    if (type === 'furniture') { width = 1; height = 1; layer='furniture'; }

    floorPlanStore.addComponent({
      id,
      type,
      x: mx,
      y: my,
      width,
      height,
      rotation: rot,
      layer,
      properties: { note: 'New' }
    });

    floorPlanStore.selectComponent(id);
  }

  function draw() {
    drawBackground();
    drawHeader();
    drawPlotOutline();
    drawGlobalDimensions();

    // Draw Components Layer by Layer
    // Order: Zones -> Structure -> Furniture -> Annotations
    const layers: LayerType[] = ['zones', 'structure', 'furniture', 'annotations'];

    layers.forEach(layerName => {
      const comps = floorData.components.filter(c => c.layer === layerName);
      comps.forEach(comp => drawComponent(comp));
    });

    drawFooter();
    drawCompass(); // on top

    // Ensure transformer is on top
    tr.moveToTop();
    layer.batchDraw();
  }

  function drawComponent(comp: Component) {
    const cx = PLOT.x + comp.x * SCALE;
    const cy = PLOT.y + comp.y * SCALE;
    const cw = (comp.width || 0) * SCALE;
    const ch = (comp.height || 0) * SCALE;

    const group = new Konva.Group({
      id: comp.id,
      x: cx,
      y: cy,
      width: cw,
      height: ch,
      rotation: comp.rotation || 0,
      draggable: !comp.locked && !['zone', 'text', 'dimension'].includes(comp.type)
    });

    // Content based on type
    switch (comp.type) {
      case 'zone':
        group.add(new Konva.Rect({
          width: cw, height: ch,
          fill: comp.properties.color || C.zone_fill,
          stroke: C.blueprint_line, strokeWidth: 0.8, dash: [4, 4]
        }));
        // Label
        const zName = comp.properties.name || '';
        const zSub = comp.properties.subtitle;
        group.add(new Konva.Text({
          x: 4, y: 4, text: zName,
          fontSize: 10, fontFamily: 'Consolas', fill: C.blueprint_text, fontStyle: 'bold'
        }));
        if (zSub) {
           group.add(new Konva.Text({
            x: 4, y: 18, text: zSub,
            fontSize: 8, fontFamily: 'Consolas', fill: C.blueprint_text, opacity: 0.6
          }));
        }
        // Zones are mostly static backgrounds, dragging them is weird usually, but let's allow it if user unlocks
        group.draggable(!comp.locked);
        break;

      case 'wall':
        // Wall logic: If x1,y1,x2,y2 exist in props, use them relative to 0,0
        // BUT our store migration normalized components to x,y,width,height
        // Draw standard wall rect
        group.add(new Konva.Rect({
          width: cw, height: ch,
          fill: C.wall_fill, stroke: C.blueprint_line, strokeWidth: 1.2
        }));
        break;

      case 'furniture':
      case 'motorcycle':
      case 'car':
        // Outline
        group.add(new Konva.Rect({
          width: cw, height: ch,
          stroke: C.accent, strokeWidth: 1, fill: 'transparent',
          cornerRadius: 4, dash: [4, 2]
        }));
        // Icon/Text
        let icon = comp.type === 'motorcycle' ? '🏍️' : comp.type === 'car' ? '🚗' : '🪑';
        group.add(new Konva.Text({
          width: cw, height: ch, text: icon,
          fontSize: Math.min(cw, ch) / 2, align: 'center', verticalAlign: 'middle',
          opacity: 0.6
        }));
        break;

      case 'stairs':
        // Special renderer for stairs from properties.data
        if (comp.properties.data) {
           // We need to render the sub-components relative to (0,0) of the group
           // The original data had absolute coordinates.
           // Since comp.x/y is 0, we can just use the original coordinates relative to PLOT
           // wait, if comp.x is 0, then cx = PLOT.x.
           // Components inside stairs had x/y relative to 0,0 of floor.
           // So we draw them directly.
           // BUT, to make the whole stair group draggable, we should find bounding box?
           // For now, let's just render them as children.
           const sData = comp.properties.data;
           sData.components.forEach((part: any) => {
             const px = part.x * SCALE;
             const py = part.y * SCALE;
             const pw = part.width * SCALE;
             const ph = part.height * SCALE;

             // Part shape
             group.add(new Konva.Rect({
               x: px, y: py, width: pw, height: ph,
               stroke: C.blueprint_line, strokeWidth: 1,
               fill: part.id === 'landing' ? 'rgba(135, 206, 235, 0.15)' : 'rgba(135, 206, 235, 0.05)'
             }));

             // Steps lines
             if (part.steps) {
               if (part.orientation === 'vertical') {
                 const stepH = ph / part.steps;
                 for(let i=0; i<=part.steps; i++) {
                   group.add(new Konva.Line({ points: [px, py + i*stepH, px+pw, py + i*stepH], stroke: C.blueprint_line, strokeWidth: 0.5 }));
                 }
               } else {
                 const stepW = pw / part.steps;
                 for(let i=0; i<=part.steps; i++) {
                   group.add(new Konva.Line({ points: [px + i*stepW, py, px+i*stepW, py+ph], stroke: C.blueprint_line, strokeWidth: 0.5 }));
                 }
               }
             }
           });
        }
        break;

      case 'door':
      case 'sliding_door':
      case 'garage_door':
      case 'pedestrian_door':
        // Draw Generic Door with swing
        group.add(new Konva.Rect({
          width: cw, height: ch, stroke: 'transparent' // Hit area
        }));
        // Opening
        group.add(new Konva.Line({
          points: [0, 0, cw, 0],
          stroke: comp.type.includes('garage') ? C.highlight : C.accent,
          strokeWidth: comp.type.includes('garage') ? 6 : 4
        }));
        // Swing/Arc
        if (comp.type === 'pedestrian_door' || comp.type === 'door') {
           group.add(new Konva.Arc({
             x: 0, y: 0, innerRadius: 0, outerRadius: cw, angle: 90,
             stroke: C.accent, strokeWidth: 1, opacity: 0.5
           }));
           group.add(new Konva.Line({ points: [0,0, 0,cw], stroke: C.accent, strokeWidth: 2 }));
        }
        break;

      case 'dimension':
        const props = comp.properties;
        // x,y is "from". props has "toX, toY"
        // Draw dimension line from (0,0) to relative (toX-x, toY-y)
        // Wait, dimension components are "annotations", maybe not grouped?
        // Let's rely on absolute coords for now?
        // Better: Group is at x,y. Draw to relative target.
        const dx = (props.toX - comp.x) * SCALE;
        const dy = (props.toY - comp.y) * SCALE;

        group.add(new Konva.Line({
          points: [0, 0, dx, dy],
          stroke: C.blueprint_line, strokeWidth: 0.8
        }));
        // Markers
        // Text center
        group.add(new Konva.Text({
          x: dx/2 - 10, y: dy/2 - 10,
          text: props.label,
          fontSize: 10, fontFamily: 'Consolas', fill: C.blueprint_text
        }));
        break;

      default:
        // Generic fallback
        group.add(new Konva.Rect({
          width: cw, height: ch,
          stroke: 'red', strokeWidth: 1
        }));
    }

    layer.add(group);
  }

  // ── Background & Grid ──
  function drawBackground() {
    layer.add(new Konva.Rect({
      name: 'background',
      x: -600, y: -600, width: VIRTUAL_WIDTH + 1200, height: VIRTUAL_HEIGHT + 1200, fill: C.blueprint_bg
    }));
    // Major grid
    for (let x = -600; x < VIRTUAL_WIDTH + 600; x += 50) {
      layer.add(new Konva.Line({ points: [x, -600, x, VIRTUAL_HEIGHT + 600], stroke: C.blueprint_line, strokeWidth: 0.3, opacity: 0.2 }));
    }
    for (let y = -600; y < VIRTUAL_HEIGHT + 600; y += 50) {
      layer.add(new Konva.Line({ points: [-600, y, VIRTUAL_WIDTH + 600, y], stroke: C.blueprint_line, strokeWidth: 0.3, opacity: 0.2 }));
    }
  }

  // ── Header ──
  function drawHeader() {
    layer.add(new Konva.Text({
      x: PLOT.x, y: 25, text: floorData.name,
      fontSize: 22, fontFamily: 'Consolas, monospace', fill: C.blueprint_text, fontStyle: 'bold'
    }));
    layer.add(new Konva.Text({
      x: PLOT.x, y: 52, text: floorData.subtitle || '',
      fontSize: 11, fontFamily: 'Consolas, monospace', fill: C.blueprint_text, opacity: 0.65
    }));
  }

  // ── Plot outline ──
  function drawPlotOutline() {
    const wt = config.wallThickness * SCALE;
    layer.add(new Konva.Rect({ x: PLOT.x - wt, y: PLOT.y - wt, width: PLOT.w + wt * 2, height: wt, fill: C.wall_fill, stroke: C.blueprint_line, strokeWidth: 1.5 }));
    layer.add(new Konva.Rect({ x: PLOT.x - wt, y: PLOT.y + PLOT.h, width: PLOT.w + wt * 2, height: wt, fill: C.wall_fill, stroke: C.blueprint_line, strokeWidth: 1.5 }));
    layer.add(new Konva.Rect({ x: PLOT.x - wt, y: PLOT.y, width: wt, height: PLOT.h, fill: C.wall_fill, stroke: C.blueprint_line, strokeWidth: 1.5 }));
    layer.add(new Konva.Rect({ x: PLOT.x + PLOT.w, y: PLOT.y, width: wt, height: PLOT.h, fill: C.wall_fill, stroke: C.blueprint_line, strokeWidth: 1.5 }));
  }

  // ── Global Dimensions ──
  function drawGlobalDimensions() {
    // We already have dims in components now, but we can keep these global plot dims
    dimLine(PLOT.x, PLOT.y - 35, PLOT.x + PLOT.w, PLOT.y - 35, `${config.plot.width}m`);
    dimLineV(PLOT.x + PLOT.w + 35, PLOT.y, PLOT.x + PLOT.w + 35, PLOT.y + PLOT.h, `${config.plot.height}m`);
  }

  function drawFooter() {
     // Concise footer
     layer.add(new Konva.Text({
       x: PLOT.x, y: PLOT.y + PLOT.h + 20,
       text: `${floorData.id.toUpperCase()} | Scale 1:${config.scale}`,
       fontSize: 10, fill: C.blueprint_text, opacity: 0.5
     }));
  }

  function drawCompass() {
    const cx = PLOT.x + PLOT.w + 60;
    const cy = PLOT.y + PLOT.h - 30;
    layer.add(new Konva.Circle({ x: cx, y: cy, radius: 18, stroke: C.blueprint_line, strokeWidth: 1, opacity: 0.6 }));
    layer.add(new Konva.Arrow({ points: [cx, cy + 10, cx, cy - 12], pointerLength: 5, pointerWidth: 4, fill: C.blueprint_text, stroke: C.blueprint_text, strokeWidth: 1.5, opacity: 0.7 }));
    layer.add(new Konva.Text({ x: cx - 4, y: cy - 28, text: 'N', fontSize: 12, fill: C.blueprint_text, fontFamily: 'Consolas', fontStyle: 'bold' }));
  }

  // Helpers
  function dimLine(x1: number, y1: number, x2: number, y2: number, label: string) {
    layer.add(new Konva.Line({ points: [x1, y1, x2, y2], stroke: C.blueprint_line, strokeWidth: 0.8 }));
    layer.add(new Konva.Text({ x: (x1 + x2) / 2 - 12, y: y1 - 14, text: label, fontSize: 10, fontFamily: 'Consolas', fill: C.blueprint_text }));
  }
  function dimLineV(x1: number, y1: number, x2: number, y2: number, label: string) {
    layer.add(new Konva.Line({ points: [x1, y1, x2, y2], stroke: C.blueprint_line, strokeWidth: 0.8 }));
    layer.add(new Konva.Text({ x: x1 + 8, y: (y1 + y2) / 2 - 5, text: label, fontSize: 10, fontFamily: 'Consolas', fill: C.blueprint_text }));
  }
</script>

<div class="canvas-wrapper"
     ondrop={handleDrop}
     ondragover={handleDragOver}
     role="application">
  <div class="canvas-toolbar">
    <button onclick={() => floorPlanStore.zoomIn()}>🔍+</button>
    <button onclick={() => floorPlanStore.zoomOut()}>🔍−</button>
    <button onclick={() => floorPlanStore.resetZoom()}>🔄</button>
    <span class="zoom-level">{floorPlanStore.zoom}%</span>
    <span class="floor-name">{floorData.name}</span>
  </div>
  <div bind:this={container} class="konva-container"></div>
</div>

<style>
  .canvas-wrapper {
    flex: 1;
    display: flex;
    flex-direction: column;
    background: #1e3a5f;
    overflow: hidden;
    min-height: 0;
  }
  .canvas-toolbar {
    display: flex;
    gap: 8px;
    padding: 10px 16px;
    background: #0f2744;
    border-bottom: 1px solid #2d5a87;
    align-items: center;
  }
  .canvas-toolbar button {
    padding: 8px 14px;
    border: 1px solid #2d5a87;
    border-radius: 6px;
    background: #1e3a5f;
    color: #87ceeb;
    cursor: pointer;
    font-size: 14px;
    transition: all 0.2s;
  }
  .canvas-toolbar button:hover { background: #2d5a87; border-color: #87ceeb; }
  .zoom-level {
    margin-left: 12px; font-weight: 600; color: #87ceeb;
    font-size: 14px; font-family: 'Consolas', monospace;
  }
  .floor-name {
    margin-left: auto; color: #e0f4ff; font-size: 12px;
    font-weight: bold; font-family: 'Consolas', monospace;
  }
  .konva-container { flex: 1; min-height: 0; width: 100%; }
</style>
