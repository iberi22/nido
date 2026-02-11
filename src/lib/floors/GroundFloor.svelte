<script lang="ts">
  import { Rect, Text, Group, Line } from 'svelte-konva';

  let { PLOT, SCALE } = $props<{
    PLOT: { x: number; y: number; width: number; height: number };
    SCALE: number;
  }>();

  // Layout del primer piso según requisitos
  let layout = $derived({
    parqueadero: { width: 2.5 * SCALE, depth: 6 * SCALE },
    entrada: { width: 3.5 * SCALE, depth: 6 * SCALE },
    bodega: { width: 6 * SCALE, depth: 17 * SCALE },
    patio: { width: 6 * SCALE, depth: 2 * SCALE }
  });

  const wallThickness = 7.5; // 15cm a escala 1:50
</script>

<!-- Parqueadero (2.5m × 6m) -->
<Rect config={{
  x: PLOT.x, y: PLOT.y,
  width: layout.parqueadero.width,
  height: layout.parqueadero.depth,
  fill: '#dcfce7', stroke: '#22c55e', strokeWidth: 2
}} />
<Text config={{
  x: PLOT.x + 20, y: PLOT.y + 40,
  text: 'PARQUEADERO', fontSize: 12, fill: '#166534', fontStyle: 'bold'
}} />
<Text config={{
  x: PLOT.x + 20, y: PLOT.y + 58,
  text: '2.5m × 6m', fontSize: 10, fill: '#22c55e'
}} />

<!-- Entrada + Escalera (3.5m × 6m) -->
<Rect config={{
  x: PLOT.x + layout.parqueadero.width, y: PLOT.y,
  width: layout.entrada.width,
  height: layout.entrada.depth,
  fill: '#fef3c7', stroke: '#f59e0b', strokeWidth: 2
}} />
<Text config={{
  x: PLOT.x + layout.parqueadero.width + 10, y: PLOT.y + 20,
  text: 'ENTRADA', fontSize: 12, fill: '#b45309', fontStyle: 'bold'
}} />

<!-- Escaleras (dentro de entrada) -->
{#each Array(6) as _, i}
  <Rect config={{
    x: PLOT.x + layout.parqueadero.width + 20,
    y: PLOT.y + 80 + i * 20,
    width: layout.entrada.width - 40,
    height: 15,
    fill: '#f59e0b', cornerRadius: 2
  }} />
{/each}
<Text config={{
  x: PLOT.x + layout.parqueadero.width + layout.entrada.width / 2,
  y: PLOT.y + 220,
  text: 'ESCALERAS', fontSize: 10, fill: '#b45309', align: 'center', offsetX: 30
}} />

<!-- Muro divisor entre entrada/parqueadero y bodega -->
<Line config={{
  points: [
    PLOT.x, PLOT.y + layout.parqueadero.depth,
    PLOT.x + PLOT.width, PLOT.y + layout.parqueadero.depth
  ],
  stroke: '#374151', strokeWidth: wallThickness
}} />

<!-- Bodega / Almacén (6m × ~17m) - SIN columnas centrales -->
<Rect config={{
  x: PLOT.x + wallThickness,
  y: PLOT.y + layout.parqueadero.depth + wallThickness,
  width: PLOT.width - wallThickness * 2,
  height: layout.bodega.depth,
  fill: '#e0f2fe', stroke: '#0ea5e9', strokeWidth: 1
}} />
<Text config={{
  x: PLOT.x + 30, y: PLOT.y + layout.parqueadero.depth + 60,
  text: 'BODEGA / ALMACÉN', fontSize: 16, fill: '#0369a1', fontStyle: 'bold'
}} />
<Text config={{
  x: PLOT.x + 30, y: PLOT.y + layout.parqueadero.depth + 85,
  text: '~100m² libre - SIN columnas centrales', fontSize: 12, fill: '#64748b'
}} />
<Text config={{
  x: PLOT.x + 30, y: PLOT.y + layout.parqueadero.depth + 105,
  text: 'Altura: 4m | Steel Frame recomendado', fontSize: 11, fill: '#94a3b8'
}} />

<!-- Patio trasero (6m × 2m) -->
<Rect config={{
  x: PLOT.x + 10,
  y: PLOT.y + PLOT.height - layout.patio.depth - 10,
  width: PLOT.width - 20,
  height: layout.patio.depth,
  fill: '#dcfce7', stroke: '#22c55e', strokeWidth: 2
}} />
<Text config={{
  x: PLOT.x + PLOT.width / 2,
  y: PLOT.y + PLOT.height - layout.patio.depth + 20,
  text: '🌿 PATIO - VENTILACIÓN (2m)', fontSize: 12, fill: '#166534',
  align: 'center', offsetX: 80
}} />

<!-- Muros perimetrales -->
<Line config={{
  points: [PLOT.x, PLOT.y, PLOT.x, PLOT.y + PLOT.height],
  stroke: '#374151', strokeWidth: wallThickness
}} />
<Line config={{
  points: [PLOT.x + PLOT.width, PLOT.y, PLOT.x + PLOT.width, PLOT.y + PLOT.height],
  stroke: '#374151', strokeWidth: wallThickness
}} />
<Line config={{
  points: [PLOT.x, PLOT.y + PLOT.height, PLOT.x + PLOT.width, PLOT.y + PLOT.height],
  stroke: '#374151', strokeWidth: wallThickness
}} />
