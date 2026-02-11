<script lang="ts">
  import { onMount } from 'svelte';
  import Konva from 'konva';
  import { floorPlanStore } from './stores/floorPlanStore.svelte';

  let container: HTMLDivElement;
  let stage: Konva.Stage;
  let layer: Konva.Layer;

  const config = $derived(floorPlanStore.config);
  const floorData = $derived(floorPlanStore.currentData);
  const SCALE = $derived(config.scale);
  const VIRTUAL_WIDTH = 550;
  const VIRTUAL_HEIGHT = 1600;

  const PLOT = $derived({
    x: 100,
    y: 120,
    w: config.plot.width * SCALE,
    h: config.plot.height * SCALE
  });

  // Colors shorthand
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
      draw();
    }
  });

  function initCanvas() {
    stage = new Konva.Stage({ container, width: VIRTUAL_WIDTH, height: VIRTUAL_HEIGHT, draggable: true });
    layer = new Konva.Layer();
    stage.add(layer);

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

  // ── Main draw ──
  function draw() {
    drawBackground();
    drawHeader();
    drawPlotOutline();
    drawGlobalDimensions();
    drawZones();
    drawWalls();
    drawStairs();
    drawElements();
    drawDimensions();
    drawCompass();
    drawFooter();
    layer.batchDraw();
  }

  // ── Background & Grid ──
  function drawBackground() {
    layer.add(new Konva.Rect({ x: -600, y: -600, width: VIRTUAL_WIDTH + 1200, height: VIRTUAL_HEIGHT + 1200, fill: C.blueprint_bg }));
    // Major grid
    for (let x = -600; x < VIRTUAL_WIDTH + 600; x += 50) {
      layer.add(new Konva.Line({ points: [x, -600, x, VIRTUAL_HEIGHT + 600], stroke: C.blueprint_line, strokeWidth: 0.3, opacity: 0.2 }));
    }
    for (let y = -600; y < VIRTUAL_HEIGHT + 600; y += 50) {
      layer.add(new Konva.Line({ points: [-600, y, VIRTUAL_WIDTH + 600, y], stroke: C.blueprint_line, strokeWidth: 0.3, opacity: 0.2 }));
    }
    // Minor grid
    for (let x = -600; x < VIRTUAL_WIDTH + 600; x += 25) {
      layer.add(new Konva.Line({ points: [x, -600, x, VIRTUAL_HEIGHT + 600], stroke: C.blueprint_line, strokeWidth: 0.15, opacity: 0.08 }));
    }
    for (let y = -600; y < VIRTUAL_HEIGHT + 600; y += 25) {
      layer.add(new Konva.Line({ points: [-600, y, VIRTUAL_WIDTH + 600, y], stroke: C.blueprint_line, strokeWidth: 0.15, opacity: 0.08 }));
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
    // Norm info line
    layer.add(new Konva.Text({
      x: PLOT.x, y: 72, text: `NSR-10 | POT Cali | Muro: ${config.wallThickness * 100}cm | Escala 1:${config.scale}`,
      fontSize: 9, fontFamily: 'Consolas, monospace', fill: C.accent, opacity: 0.8
    }));
  }

  // ── Plot outline ──
  function drawPlotOutline() {
    const wt = config.wallThickness * SCALE;
    // Outer walls as thick filled rectangles
    // Top wall
    layer.add(new Konva.Rect({ x: PLOT.x - wt, y: PLOT.y - wt, width: PLOT.w + wt * 2, height: wt, fill: C.wall_fill, stroke: C.blueprint_line, strokeWidth: 1.5 }));
    // Bottom wall
    layer.add(new Konva.Rect({ x: PLOT.x - wt, y: PLOT.y + PLOT.h, width: PLOT.w + wt * 2, height: wt, fill: C.wall_fill, stroke: C.blueprint_line, strokeWidth: 1.5 }));
    // Left wall
    layer.add(new Konva.Rect({ x: PLOT.x - wt, y: PLOT.y, width: wt, height: PLOT.h, fill: C.wall_fill, stroke: C.blueprint_line, strokeWidth: 1.5 }));
    // Right wall
    layer.add(new Konva.Rect({ x: PLOT.x + PLOT.w, y: PLOT.y, width: wt, height: PLOT.h, fill: C.wall_fill, stroke: C.blueprint_line, strokeWidth: 1.5 }));
  }

  // ── Global Dimensions ──
  function drawGlobalDimensions() {
    // Top: total width
    dimLine(PLOT.x, PLOT.y - 35, PLOT.x + PLOT.w, PLOT.y - 35, `${config.plot.width}m`);
    // Right: total height
    dimLineV(PLOT.x + PLOT.w + 35, PLOT.y, PLOT.x + PLOT.w + 35, PLOT.y + PLOT.h, `${config.plot.height}m`);
  }

  // ── Zones ──
  function drawZones() {
    floorData.zones?.forEach(z => {
      const zx = PLOT.x + z.x * SCALE;
      const zy = PLOT.y + z.y * SCALE;
      const zw = z.width * SCALE;
      const zh = z.height * SCALE;

      // Zone fill
      layer.add(new Konva.Rect({
        x: zx, y: zy, width: zw, height: zh,
        stroke: C.blueprint_line, strokeWidth: 0.8,
        fill: z.color || C.zone_fill,
        dash: [4, 4]
      }));

      // Zone label (centered)
      const lines = z.name.split('\n');
      lines.forEach((line: string, i: number) => {
        layer.add(new Konva.Text({
          x: zx + 8, y: zy + 12 + i * 14,
          text: line, fontSize: 10, fontFamily: 'Consolas, monospace',
          fill: C.blueprint_text, fontStyle: 'bold', width: zw - 16
        }));
      });
      if (z.subtitle) {
        layer.add(new Konva.Text({
          x: zx + 8, y: zy + 12 + lines.length * 14 + 4,
          text: z.subtitle, fontSize: 8, fontFamily: 'Consolas, monospace',
          fill: C.blueprint_text, opacity: 0.55, width: zw - 16
        }));
      }

      // Local dimension (only if zone is narrower than plot)
      if (z.width < config.plot.width && z.width >= 1) {
        dimLine(zx, zy + zh + 12, zx + zw, zy + zh + 12, `${z.width}m`);
      }
    });
  }

  // ── Internal Walls ──
  function drawWalls() {
    const wt = config.wallThickness * SCALE;
    const walls = (floorData as any).walls;
    if (!walls) return;

    walls.forEach((w: any) => {
      const x1 = PLOT.x + w.x1 * SCALE;
      const y1 = PLOT.y + w.y1 * SCALE;
      const x2 = PLOT.x + w.x2 * SCALE;
      const y2 = PLOT.y + w.y2 * SCALE;

      const isVertical = x1 === x2;
      if (isVertical) {
        layer.add(new Konva.Rect({
          x: x1 - wt / 2, y: Math.min(y1, y2),
          width: wt, height: Math.abs(y2 - y1),
          fill: C.wall_fill, stroke: C.blueprint_line, strokeWidth: 1.2
        }));
      } else {
        layer.add(new Konva.Rect({
          x: Math.min(x1, x2), y: y1 - wt / 2,
          width: Math.abs(x2 - x1), height: wt,
          fill: C.wall_fill, stroke: C.blueprint_line, strokeWidth: 1.2
        }));
      }
    });
  }

  // ── L-Shaped Staircase (Component-based) ──
  function drawStairs() {
    const stairs = (floorData as any).stairs;
    if (!stairs?.components) return;

    stairs.components.forEach((comp: any) => {
      const cx = PLOT.x + comp.x * SCALE;
      const cy = PLOT.y + comp.y * SCALE;
      const cw = comp.width * SCALE;
      const ch = comp.height * SCALE;

      if (comp.id === 'landing') {
        // Landing - highlighted rectangle
        layer.add(new Konva.Rect({
          x: cx, y: cy, width: cw, height: ch,
          stroke: C.blueprint_line, strokeWidth: 1.5,
          fill: 'rgba(135, 206, 235, 0.15)'
        }));
        if (comp.label) {
          layer.add(new Konva.Text({
            x: cx + 4, y: cy + ch / 2 - 5,
            text: comp.label, fontSize: 8, fontFamily: 'Consolas, monospace',
            fill: C.blueprint_text, opacity: 0.6
          }));
        }
        return;
      }

      // Stair run outline
      layer.add(new Konva.Rect({
        x: cx, y: cy, width: cw, height: ch,
        stroke: C.blueprint_line, strokeWidth: 1.2,
        fill: 'rgba(135, 206, 235, 0.05)'
      }));

      const steps = comp.steps || 0;
      if (comp.orientation === 'vertical' && steps > 0) {
        // Vertical run: horizontal step lines
        const stepH = ch / steps;
        for (let i = 0; i <= steps; i++) {
          layer.add(new Konva.Line({
            points: [cx, cy + i * stepH, cx + cw, cy + i * stepH],
            stroke: C.blueprint_line, strokeWidth: 0.8
          }));
        }
        // Direction arrow
        if (comp.arrowDir === 'up') {
          layer.add(new Konva.Arrow({
            points: [cx + cw / 2, cy + ch - 12, cx + cw / 2, cy + 12],
            pointerLength: 8, pointerWidth: 6,
            fill: C.accent, stroke: C.accent, strokeWidth: 1.5, opacity: 0.55
          }));
        }
      } else if (comp.orientation === 'horizontal' && steps > 0) {
        // Horizontal run: vertical step lines
        const stepW = cw / steps;
        for (let i = 0; i <= steps; i++) {
          layer.add(new Konva.Line({
            points: [cx + i * stepW, cy, cx + i * stepW, cy + ch],
            stroke: C.blueprint_line, strokeWidth: 0.8
          }));
        }
        // Direction arrow
        if (comp.arrowDir === 'right') {
          layer.add(new Konva.Arrow({
            points: [cx + 8, cy + ch / 2, cx + cw - 8, cy + ch / 2],
            pointerLength: 7, pointerWidth: 5,
            fill: C.accent, stroke: C.accent, strokeWidth: 1.2, opacity: 0.5
          }));
        }
      }
    });

    // Overall staircase label (REMOVED due to clutter)
    /*
    const first = stairs.components[0];
    const label_x = PLOT.x + first.x * SCALE;
    const label_y = PLOT.y + (first.y + first.height) * SCALE + 8;
    layer.add(new Konva.Text({
      x: label_x, y: label_y,
      text: `▲ ESCALERA EN L (${stairs.totalSteps} pasos)`,
      fontSize: 8, fontFamily: 'Consolas, monospace',
      fill: C.accent, opacity: 0.7
    }));
    */
  }

  // ── Elements (car, doors, etc.) ──
  function drawElements() {
    floorData.elements?.forEach(el => {
      const ex = PLOT.x + el.x * SCALE;
      const ey = PLOT.y + el.y * SCALE;

      if (el.type === 'garage_door' && el.width) {
        const dw = el.width * SCALE;
        // Thick garage door opening
        layer.add(new Konva.Line({
          points: [ex, ey, ex + dw, ey],
          stroke: C.highlight, strokeWidth: 6
        }));
        // Basculante arc (half-circle upward)
        layer.add(new Konva.Arc({
          x: ex + dw / 2, y: ey,
          innerRadius: 0, outerRadius: dw / 2,
          angle: 180, rotation: 0,
          stroke: C.highlight, strokeWidth: 0.8, opacity: 0.3, dash: [4, 3]
        }));
        // Garage label (REMOVED due to clutter with zone title)
        /*
        layer.add(new Konva.Text({
          x: ex, y: ey + 10, text: '▼ GARAJE',
          fontSize: 9, fontFamily: 'Consolas, monospace', fill: C.highlight, align: 'center', width: dw
        }));
        */
      }

      if (el.type === 'pedestrian_door' && el.width) {
        const dw = el.width * SCALE;
        // Door opening
        layer.add(new Konva.Line({
          points: [ex, ey, ex + dw, ey],
          stroke: C.accent, strokeWidth: 5
        }));
        // Door swing arc (90° from hinge on left side)
        layer.add(new Konva.Arc({
          x: ex, y: ey,
          innerRadius: 0, outerRadius: dw,
          angle: 90, rotation: 0,
          stroke: C.accent, strokeWidth: 0.8, opacity: 0.5
        }));
        // Door leaf line
        layer.add(new Konva.Line({
          points: [ex, ey, ex, ey + dw],
          stroke: C.accent, strokeWidth: 1, opacity: 0.5
        }));
        /*
        layer.add(new Konva.Text({
          x: ex, y: ey + 10, text: '▼ ENTRADA',
          fontSize: 9, fontFamily: 'Consolas, monospace', fill: C.accent
        }));
        */
      }

      if (el.type === 'sliding_door' && el.width) {
        const dw = el.width * SCALE;
        // Sliding door: two overlapping panels
        layer.add(new Konva.Line({
          points: [ex, ey, ex + dw, ey],
          stroke: C.accent, strokeWidth: 5
        }));
        // Double arrow for sliding
        layer.add(new Konva.Arrow({
          points: [ex + dw / 2, ey + 12, ex + dw - 5, ey + 12],
          pointerLength: 4, pointerWidth: 3,
          fill: C.accent, stroke: C.accent, strokeWidth: 0.8, opacity: 0.6
        }));
        layer.add(new Konva.Arrow({
          points: [ex + dw / 2, ey + 12, ex + 5, ey + 12],
          pointerLength: 4, pointerWidth: 3,
          fill: C.accent, stroke: C.accent, strokeWidth: 0.8, opacity: 0.6
        }));
        /*
        layer.add(new Konva.Text({
          x: ex - 5, y: ey + 8, text: 'CORREDIZA',
          fontSize: 7, fontFamily: 'Consolas, monospace', fill: C.accent, opacity: 0.7
        }));
        */
      }

      if (el.type === 'car' && el.width && el.height) {
        const cw = el.width * SCALE;
        const ch = el.height * SCALE;
        // Car body
        layer.add(new Konva.Rect({
          x: ex, y: ey, width: cw, height: ch,
          stroke: C.blueprint_line, strokeWidth: 0.8,
          fill: 'transparent', cornerRadius: 8,
          dash: [6, 3], opacity: 0.45
        }));
        // Windshield + rear window
        layer.add(new Konva.Line({ points: [ex + 10, ey + 18, ex + cw - 10, ey + 18], stroke: C.blueprint_line, strokeWidth: 0.5, opacity: 0.35 }));
        layer.add(new Konva.Line({ points: [ex + 10, ey + ch - 22, ex + cw - 10, ey + ch - 22], stroke: C.blueprint_line, strokeWidth: 0.5, opacity: 0.35 }));
        // Wheels
        [ey + 32, ey + ch - 32].forEach(wy => {
          [ex + 14, ex + cw - 14].forEach(wx => {
            layer.add(new Konva.Circle({ x: wx, y: wy, radius: 8, stroke: C.blueprint_line, strokeWidth: 0.6, opacity: 0.35 }));
          });
        });
        layer.add(new Konva.Text({ x: ex, y: ey + ch / 2 - 5, width: cw, text: '🚗', fontSize: 16, align: 'center', opacity: 0.35 }));
      }

      if (el.type === 'motorcycle' && el.width && el.height) {
        const mw = el.width * SCALE;
        const mh = el.height * SCALE;
        // Motorcycle body outline
        layer.add(new Konva.Rect({
          x: ex, y: ey, width: mw, height: mh,
          stroke: C.accent, strokeWidth: 0.7,
          fill: 'transparent', cornerRadius: 4,
          dash: [4, 2], opacity: 0.5
        }));
        // Front wheel
        layer.add(new Konva.Circle({
          x: ex + mw / 2, y: ey + 10,
          radius: Math.min(mw, 18) / 2.5,
          stroke: C.accent, strokeWidth: 0.6, opacity: 0.45
        }));
        // Rear wheel
        layer.add(new Konva.Circle({
          x: ex + mw / 2, y: ey + mh - 10,
          radius: Math.min(mw, 18) / 2.5,
          stroke: C.accent, strokeWidth: 0.6, opacity: 0.45
        }));
        // Handlebar (horizontal line at front)
        layer.add(new Konva.Line({
          points: [ex + 4, ey + 5, ex + mw - 4, ey + 5],
          stroke: C.accent, strokeWidth: 0.8, opacity: 0.4
        }));
        // Moto emoji centered
        layer.add(new Konva.Text({
          x: ex, y: ey + mh / 2 - 6, width: mw,
          text: '🏍️', fontSize: 12, align: 'center', opacity: 0.4
        }));
      }
    });
  }

  // ── Compass ──
  function drawCompass() {
    const cx = PLOT.x + PLOT.w + 60;
    const cy = PLOT.y + PLOT.h - 30;
    // Circle
    layer.add(new Konva.Circle({ x: cx, y: cy, radius: 18, stroke: C.blueprint_line, strokeWidth: 1, opacity: 0.6 }));
    // N arrow
    layer.add(new Konva.Arrow({
      points: [cx, cy + 10, cx, cy - 12],
      pointerLength: 5, pointerWidth: 4,
      fill: C.blueprint_text, stroke: C.blueprint_text, strokeWidth: 1.5, opacity: 0.7
    }));
    layer.add(new Konva.Text({ x: cx - 4, y: cy - 28, text: 'N', fontSize: 12, fill: C.blueprint_text, fontFamily: 'Consolas', fontStyle: 'bold' }));
  }

  // ── Footer ──
  function drawFooter() {
    const fy = PLOT.y + PLOT.h + 60;
    // Title block border
    layer.add(new Konva.Rect({
      x: PLOT.x, y: fy, width: PLOT.w, height: 50,
      stroke: C.blueprint_line, strokeWidth: 1, fill: 'rgba(30, 58, 95, 0.8)'
    }));
    layer.add(new Konva.Text({
      x: PLOT.x + 10, y: fy + 8,
      text: floorData.name,
      fontSize: 12, fontFamily: 'Consolas', fill: C.blueprint_text, fontStyle: 'bold'
    }));
    layer.add(new Konva.Text({
      x: PLOT.x + 10, y: fy + 25,
      text: `${floorData.subtitle || ''} | Escala 1:${config.scale} | Muro ${config.wallThickness * 100}cm`,
      fontSize: 9, fontFamily: 'Consolas', fill: C.blueprint_text, opacity: 0.7
    }));
    layer.add(new Konva.Text({
      x: PLOT.x + PLOT.w - 100, y: fy + 8,
      text: `Barrio Santa Elena\nComuna 10 - Estrato 3`,
      fontSize: 8, fontFamily: 'Consolas', fill: C.accent, opacity: 0.8
    }));
  }

  // ── Per-floor Dimension Annotations ──
  function drawDimensions() {
    const dims = (floorData as any).dimensions;
    if (!dims) return;

    dims.forEach((d: any) => {
      const x1 = PLOT.x + d.from[0] * SCALE;
      const y1 = PLOT.y + d.from[1] * SCALE;
      const x2 = PLOT.x + d.to[0] * SCALE;
      const y2 = PLOT.y + d.to[1] * SCALE;

      const isVertical = d.from[0] === d.to[0];
      if (isVertical) {
        dimLineV(x1 + (d.side === 'right' ? 25 : -25), y1, x2 + (d.side === 'right' ? 25 : -25), y2, d.label);
      } else {
        dimLine(x1, y1 + (d.side === 'bottom' ? 18 : -18), x2, y2 + (d.side === 'bottom' ? 18 : -18), d.label);
      }
    });
  }

  // ── Dimension Helpers ──
  function dimLine(x1: number, y1: number, x2: number, y2: number, label: string) {
    // Horizontal dimension
    layer.add(new Konva.Line({ points: [x1, y1, x2, y2], stroke: C.blueprint_line, strokeWidth: 0.8 }));
    layer.add(new Konva.Line({ points: [x1, y1 - 4, x1, y1 + 4], stroke: C.blueprint_line, strokeWidth: 0.8 }));
    layer.add(new Konva.Line({ points: [x2, y1 - 4, x2, y1 + 4], stroke: C.blueprint_line, strokeWidth: 0.8 }));
    layer.add(new Konva.Text({
      x: (x1 + x2) / 2 - 12, y: y1 - 14,
      text: label, fontSize: 10, fontFamily: 'Consolas', fill: C.blueprint_text
    }));
  }

  function dimLineV(x1: number, y1: number, x2: number, y2: number, label: string) {
    // Vertical dimension
    layer.add(new Konva.Line({ points: [x1, y1, x2, y2], stroke: C.blueprint_line, strokeWidth: 0.8 }));
    layer.add(new Konva.Line({ points: [x1 - 4, y1, x1 + 4, y1], stroke: C.blueprint_line, strokeWidth: 0.8 }));
    layer.add(new Konva.Line({ points: [x1 - 4, y2, x1 + 4, y2], stroke: C.blueprint_line, strokeWidth: 0.8 }));
    layer.add(new Konva.Text({
      x: x1 + 8, y: (y1 + y2) / 2 - 5,
      text: label, fontSize: 10, fontFamily: 'Consolas', fill: C.blueprint_text
    }));
  }
</script>

<div class="canvas-wrapper">
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
