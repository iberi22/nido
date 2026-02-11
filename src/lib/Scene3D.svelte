<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import * as THREE from 'three';
  // @ts-ignore
  import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
  import { floorPlanStore } from './stores/floorPlanStore.svelte';

  let container: HTMLDivElement;
  let canvas: HTMLCanvasElement;

  // Three.js variables
  let scene: THREE.Scene;
  let camera: THREE.PerspectiveCamera;
  let renderer: THREE.WebGLRenderer;
  let controls: OrbitControls;
  let animationId: number;

  // Configuration from store (synced with JSON)
  const CONFIG = $derived({
    terrain: {
      width: floorPlanStore.config.plot.width,
      depth: floorPlanStore.config.plot.height,
      patio: 2
    },
    colors: {
      ground: 0x1a1a2e,
      wall: 0xe0f2fe,
      floor1: 0x374151,
      floor2: 0xfef3c7,
    }
  });

  // Watch for changes and rebuild scene
  $effect(() => {
    if (scene && CONFIG) {
      // Clear previous structure (implement a clear function or rebuild)
      // For now, simplify or just let it be static if no changes expected in runtime
    }
  });

  onMount(() => {
    init();
    animate();

    // Handle resize
    const resizeObserver = new ResizeObserver(() => {
      if (container && camera && renderer) {
        const width = container.clientWidth;
        const height = container.clientHeight;
        camera.aspect = width / height;
        camera.updateProjectionMatrix();
        renderer.setSize(width, height);
      }
    });
    resizeObserver.observe(container);

    return () => {
      cancelAnimationFrame(animationId);
      resizeObserver.disconnect();
      if (renderer) renderer.dispose();
      // Clean up scene...
    };
  });

  function init() {
    // Scene
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0xf1f5f9); // Light slate background
    scene.fog = new THREE.Fog(0xf1f5f9, 20, 100);

    // Camera
    const width = container.clientWidth;
    const height = container.clientHeight;
    camera = new THREE.PerspectiveCamera(60, width / height, 0.1, 1000);
    camera.position.set(15, 20, 25);

    // Renderer
    renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
    renderer.setSize(width, height);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    // Controls
    controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;

    // Lights
    setupLighting();

    // Build static structure
    createStructure();

    // Subscribe to store for dynamic elements (future implementation)
    // For now, render the static request layout
  }

  function setupLighting() {
    const ambient = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambient);

    const sun = new THREE.DirectionalLight(0xffffff, 1);
    sun.position.set(20, 40, 20);
    sun.castShadow = true;
    sun.shadow.mapSize.width = 2048;
    sun.shadow.mapSize.height = 2048;
    scene.add(sun);
  }

  function createStructure() {
    // Helper to create box
    const createBox = (w: number, h: number, d: number, x: number, y: number, z: number, color: number) => {
      const geom = new THREE.BoxGeometry(w, h, d);
      const mat = new THREE.MeshStandardMaterial({ color, roughness: 0.7 });
      const mesh = new THREE.Mesh(geom, mat);
      mesh.position.set(x, y, z);
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      scene.add(mesh);
      return mesh;
    };

    const { width, depth, patio } = CONFIG.terrain;

    // Piso 1 (Altura 4m)
    const h1 = 4;
    // Floor
    createBox(width, 0.2, depth - patio, 0, 0.1, (depth - patio)/2 - depth/2, CONFIG.colors.floor1);
    // Walls
    // Left
    createBox(0.2, h1, depth, -width/2, h1/2, 0, CONFIG.colors.wall);
    // Right
    createBox(0.2, h1, depth, width/2, h1/2, 0, CONFIG.colors.wall);
    // Back (patio separation)
    createBox(width, h1, 0.2, 0, h1/2, depth/2 - patio, CONFIG.colors.wall);
    // Internal: Parking / Entrance divider (at 2.5m from left)
    // 2.5m from -3 is -0.5
    createBox(0.1, h1, 6, -0.5, h1/2, -depth/2 + 3, CONFIG.colors.wall); // 6m deep divider

    // Piso 2 (Altura 2.8m)
    const h2 = 2.8;
    const y2 = h1;
    // Floor
    createBox(width, 0.2, depth - patio, 0, y2 + 0.1, (depth - patio)/2 - depth/2, CONFIG.colors.floor2);
    // Walls
    createBox(0.2, h2, depth, -width/2, y2 + h2/2, 0, CONFIG.colors.wall);
    createBox(0.2, h2, depth, width/2, y2 + h2/2, 0, CONFIG.colors.wall);

    // Piso 3 (Altura 2.8m)
    const h3 = 2.8;
    const y3 = y2 + h2;
    // Floor
    createBox(width, 0.2, depth - patio, 0, y3 + 0.1, (depth - patio)/2 - depth/2, CONFIG.colors.floor2);
    // Walls
    createBox(0.2, h3, depth, -width/2, y3 + h3/2, 0, CONFIG.colors.wall);
    createBox(0.2, h3, depth, width/2, y3 + h3/2, 0, CONFIG.colors.wall);

    // Roof (Terraza)
    const y4 = y3 + h3;
    createBox(width, 0.2, depth, 0, y4 + 0.1, 0, 0xdcfce7); // Greenish roof floor
  }

  function animate() {
    animationId = requestAnimationFrame(animate);
    controls.update();
    renderer.render(scene, camera);
  }
</script>

<div bind:this={container} class="scene-container">
  <canvas bind:this={canvas}></canvas>

  <div class="controls-overlay">
    <div class="control-group">
      <h4>Controles 3D</h4>
      <p>🖱️ Click Izq + Arrastrar: Orbitar</p>
      <p>🖱️ Click Der + Arrastrar: Mover</p>
      <p>🖱️ Rueda: Zoom</p>
    </div>
  </div>
</div>

<style>
  .scene-container {
    width: 100%;
    height: 100%;
    position: relative;
    overflow: hidden;
  }

  canvas {
    display: block;
    width: 100%;
    height: 100%;
  }

  .controls-overlay {
    position: absolute;
    bottom: 20px;
    right: 20px;
    background: rgba(255, 255, 255, 0.9);
    padding: 15px;
    border-radius: 8px;
    box-shadow: 0 4px 6px rgba(0,0,0,0.1);
    pointer-events: none;
  }

  .control-group h4 {
    margin: 0 0 8px 0;
    color: #1e293b;
  }

  .control-group p {
    margin: 4px 0;
    font-size: 12px;
    color: #64748b;
  }
</style>
