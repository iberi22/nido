<script lang="ts">
  import { Rect, Text, Group, Line } from 'svelte-konva';

  let { PLOT, SCALE, floorNumber = 2 } = $props<{
    PLOT: { x: number; y: number; width: number; height: number };
    SCALE: number;
    floorNumber: number;
  }>();

  const wallThickness = 7.5;

  // Pasillo ancho al frente, se reduce hacia atrás
  let corridorFront = $derived({ width: PLOT.width, depth: 3 * SCALE }); // 3m de fondo
  let corridorBack = $derived({ width: 2 * SCALE, depth: 8 * SCALE }); // 2m ancho, 8m fondo

  // Apartamentos pequeños al frente (después del pasillo ancho)
  let smallAptWidth = $derived((PLOT.width - corridorBack.width) / 2);
  let smallAptDepth = $derived(6 * SCALE);

  // Apartamento grande al fondo (ocupa todo el ancho 6m)
  let largeAptWidth = $derived(PLOT.width);
  let largeAptDepth = $derived(8 * SCALE);
</script>

<!-- Título del piso -->
<Text config={{
  x: PLOT.x + 10, y: PLOT.y - 25,
  text: `PISO ${floorNumber} - APARTAMENTOS`, fontSize: 14, fill: '#2563eb', fontStyle: 'bold'
}} />

<!-- Pasillo ancho frontal (6m de ancho) -->
<Rect config={{
  x: PLOT.x, y: PLOT.y,
  width: corridorFront.width, height: corridorFront.depth,
  fill: '#fef3c7', stroke: '#f59e0b', strokeWidth: 2
}} />
<Text config={{
  x: PLOT.x + PLOT.width / 2, y: PLOT.y + corridorFront.depth / 2,
  text: 'PASILLO AMPLIO (6m)', fontSize: 14, fill: '#b45309',
  align: 'center', offsetX: 70, offsetY: 8
}} />

<!-- Pasillo lateral que conecta (2m ancho) -->
<Rect config={{
  x: PLOT.x + PLOT.width / 2 - corridorBack.width / 2,
  y: PLOT.y + corridorFront.depth,
  width: corridorBack.width,
  height: corridorBack.depth,
  fill: '#fef3c7', stroke: '#f59e0b', strokeWidth: 1
}} />

<!-- Apartamento pequeño izquierdo -->
<Rect config={{
  x: PLOT.x,
  y: PLOT.y + corridorFront.depth,
  width: smallAptWidth,
  height: smallAptDepth,
  fill: '#dbeafe', stroke: '#3b82f6', strokeWidth: 2
}} />
<Text config={{
  x: PLOT.x + 15, y: PLOT.y + corridorFront.depth + 20,
  text: `APT ${floorNumber}A`, fontSize: 12, fill: '#1e40af', fontStyle: 'bold'
}} />
<Text config={{
  x: PLOT.x + 15, y: PLOT.y + corridorFront.depth + 40,
  text: 'Compacto', fontSize: 10, fill: '#64748b'
}} />

<!-- Apartamento pequeño derecho -->
<Rect config={{
  x: PLOT.x + PLOT.width / 2 + corridorBack.width / 2,
  y: PLOT.y + corridorFront.depth,
  width: smallAptWidth,
  height: smallAptDepth,
  fill: '#dbeafe', stroke: '#3b82f6', strokeWidth: 2
}} />
<Text config={{
  x: PLOT.x + PLOT.width / 2 + corridorBack.width / 2 + 15,
  y: PLOT.y + corridorFront.depth + 20,
  text: `APT ${floorNumber}B`, fontSize: 12, fill: '#1e40af', fontStyle: 'bold'
}} />
<Text config={{
  x: PLOT.x + PLOT.width / 2 + corridorBack.width / 2 + 15,
  y: PLOT.y + corridorFront.depth + 40,
  text: 'Compacto', fontSize: 10, fill: '#64748b'
}} />

<!-- Apartamento grande al fondo (6m de ancho) -->
<Rect config={{
  x: PLOT.x,
  y: PLOT.y + corridorFront.depth + corridorBack.depth,
  width: largeAptWidth,
  height: largeAptDepth,
  fill: '#c7d2fe', stroke: '#6366f1', strokeWidth: 2
}} />
<Text config={{
  x: PLOT.x + PLOT.width / 2,
  y: PLOT.y + corridorFront.depth + corridorBack.depth + 40,
  text: `APT ${floorNumber}C - GRANDE`, fontSize: 16, fill: '#4338ca', fontStyle: 'bold',
  align: 'center', offsetX: 80
}} />
<Text config={{
  x: PLOT.x + PLOT.width / 2,
  y: PLOT.y + corridorFront.depth + corridorBack.depth + 65,
  text: '6m de ancho completo', fontSize: 12, fill: '#64748b',
  align: 'center', offsetX: 60
}} />

<!-- Patio trasero -->
<Rect config={{
  x: PLOT.x + 10,
  y: PLOT.y + PLOT.height - 100 - 10,
  width: PLOT.width - 20,
  height: 100,
  fill: '#dcfce7', stroke: '#22c55e', strokeWidth: 2
}} />
<Text config={{
  x: PLOT.x + PLOT.width / 2,
  y: PLOT.y + PLOT.height - 70,
  text: '🌿 PATIO (2m)', fontSize: 12, fill: '#166534',
  align: 'center', offsetX: 40
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
