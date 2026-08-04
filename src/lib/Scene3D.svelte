<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { floorPlanStore } from './stores/floorPlanStore.svelte';

  let container: HTMLDivElement;
  let canvas: HTMLCanvasElement;

  // Lazy loaded Three.js and OrbitControls
  let THREE: any = $state(null);
  let OrbitControls: any = $state(null);

  // Three.js instances
  let scene: any;
  let camera: any;
  let renderer: any;
  let controls: any;
  let animationId: number;
  let floorGroup: any;

  // Robust RGBA or Hex color parser
  function parseColor(colorStr: string): { color: number; opacity: number } {
    if (!colorStr) return { color: 0x3b82f6, opacity: 1.0 };
    colorStr = colorStr.trim();
    if (colorStr.startsWith('rgba') || colorStr.startsWith('rgb')) {
      const match = colorStr.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)/);
      if (match) {
        const r = parseInt(match[1]);
        const g = parseInt(match[2]);
        const b = parseInt(match[3]);
        const a = match[4] ? parseFloat(match[4]) : 1.0;
        const colorHex = (r << 16) + (g << 8) + b;
        return { color: colorHex, opacity: a };
      }
    }
    try {
      const col = new THREE.Color(colorStr);
      return { color: col.getHex(), opacity: 1.0 };
    } catch {
      return { color: 0x3b82f6, opacity: 1.0 };
    }
  }

  // Trigger rebuild when three is loaded, config changes, or floor switches/updates
  $effect(() => {
    // Establish dependencies
    const _id = floorPlanStore.currentFloorId;
    const _floor = floorPlanStore.currentFloor;
    const _comps = floorPlanStore.currentFloor?.components;
    const _config = floorPlanStore.config;

    if (THREE && scene) {
      rebuildScene();
    }
  });

  let resizeObserver: ResizeObserver | null = null;

  onMount(() => {
    importDependencies().then(() => {
      init();
      animate();

      // Handle resize
      resizeObserver = new ResizeObserver(() => {
        if (container && camera && renderer) {
          const width = container.clientWidth;
          const height = container.clientHeight;
          camera.aspect = width / height;
          camera.updateProjectionMatrix();
          renderer.setSize(width, height);
        }
      });
      resizeObserver.observe(container);
    }).catch(err => {
      console.error('Failed to lazy load 3D dependencies:', err);
    });
  });

  onDestroy(() => {
    cancelAnimationFrame(animationId);
    if (resizeObserver) {
      resizeObserver.disconnect();
    }
    cleanupThree();
  });

  async function importDependencies() {
    THREE = await import('three');
    const { OrbitControls: OC } = await import('three/addons/controls/OrbitControls.js');
    OrbitControls = OC;
  }

  function init() {
    if (!THREE) return;

    // Scene
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0f172a); // Slate-900 to match Hive Dark theme
    scene.fog = new THREE.FogExp2(0x0f172a, 0.015);

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

    // Orbit Controls
    if (OrbitControls) {
      controls = new OrbitControls(camera, renderer.domElement);
      controls.enableDamping = true;
      controls.dampingFactor = 0.05;
      controls.maxPolarAngle = Math.PI / 2 - 0.05; // Prevent camera going below ground
      controls.minDistance = 5;
      controls.maxDistance = 100;
    }

    // Lights
    setupLighting();

    // Rebuild Scene content
    rebuildScene();
  }

  function setupLighting() {
    const ambient = new THREE.AmbientLight(0xffffff, 0.5);
    scene.add(ambient);

    const sun = new THREE.DirectionalLight(0xffffff, 1.0);
    sun.position.set(30, 50, 30);
    sun.castShadow = true;
    sun.shadow.mapSize.width = 2048;
    sun.shadow.mapSize.height = 2048;
    sun.shadow.camera.near = 0.5;
    sun.shadow.camera.far = 150;

    const d = 30;
    sun.shadow.camera.left = -d;
    sun.shadow.camera.right = d;
    sun.shadow.camera.top = d;
    sun.shadow.camera.bottom = -d;
    sun.shadow.bias = -0.0005;

    scene.add(sun);
  }

  function rebuildScene() {
    if (!THREE || !scene) return;

    // Clear old floorGroup
    if (floorGroup) {
      scene.remove(floorGroup);
      floorGroup.traverse((child: any) => {
        if (child instanceof THREE.Mesh) {
          child.geometry.dispose();
          if (Array.isArray(child.material)) {
            child.material.forEach((m: any) => m.dispose());
          } else {
            child.material.dispose();
          }
        }
      });
    }

    floorGroup = new THREE.Group();
    scene.add(floorGroup);

    const floor = floorPlanStore.currentFloor;
    if (!floor) return;

    const floorHeight = floor.height_m || 2.8;
    const plotWidth = floorPlanStore.config.plot.width;
    const plotHeight = floorPlanStore.config.plot.height;
    const offsetX = -plotWidth / 2;
    const offsetZ = -plotHeight / 2;

    // Ground plane representing the lot size
    const groundGeom = new THREE.BoxGeometry(plotWidth, 0.1, plotHeight);
    const groundMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.9 });
    const groundMesh = new THREE.Mesh(groundGeom, groundMat);
    groundMesh.position.set(0, -0.05, 0);
    groundMesh.receiveShadow = true;
    floorGroup.add(groundMesh);

    // Build floor elements from store components
    floor.components.forEach((comp) => {
      const w = comp.width || 0;
      const h = comp.height || 0;

      if (comp.type === 'zone') {
        const { color, opacity } = parseColor(comp.properties.color);
        const geom = new THREE.BoxGeometry(w, 0.05, h);
        const mat = new THREE.MeshStandardMaterial({
          color: color,
          transparent: opacity < 1.0,
          opacity: opacity,
          roughness: 0.8
        });
        const mesh = new THREE.Mesh(geom, mat);
        // Place slightly above the ground plane to avoid z-fighting
        mesh.position.set(comp.x + w / 2 + offsetX, 0.025, comp.y + h / 2 + offsetZ);
        mesh.receiveShadow = true;
        floorGroup.add(mesh);
      } else if (comp.type === 'wall') {
        // Walls extruded by floor height_m
        const geom = new THREE.BoxGeometry(w, floorHeight, h);
        const mat = new THREE.MeshStandardMaterial({
          color: 0xe2e8f0, // Clean light wall color
          roughness: 0.7
        });
        const mesh = new THREE.Mesh(geom, mat);
        mesh.position.set(comp.x + w / 2 + offsetX, floorHeight / 2, comp.y + h / 2 + offsetZ);
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        floorGroup.add(mesh);
      } else if (['door', 'sliding_door', 'garage_door', 'pedestrian_door'].includes(comp.type)) {
        // Render doors/garage doors beautifully
        const doorHeight = comp.type === 'garage_door' ? 2.4 : 2.0;
        const geom = new THREE.BoxGeometry(w, doorHeight, h);
        const mat = new THREE.MeshStandardMaterial({
          color: comp.type === 'garage_door' ? 0x0ea5e9 : 0x78350f, // Blue for garage, wood brown for pedestrian
          roughness: 0.8,
          transparent: true,
          opacity: 0.85
        });
        const mesh = new THREE.Mesh(geom, mat);
        mesh.position.set(comp.x + w / 2 + offsetX, doorHeight / 2, comp.y + h / 2 + offsetZ);
        mesh.castShadow = true;
        floorGroup.add(mesh);
      } else if (['car', 'motorcycle', 'furniture'].includes(comp.type)) {
        // Render simple placeholder bounding volumes
        const objHeight = comp.type === 'car' ? 1.4 : comp.type === 'motorcycle' ? 1.0 : 0.75;
        const geom = new THREE.BoxGeometry(w, objHeight, h);
        const color = comp.type === 'car' ? 0xe11d48 : comp.type === 'motorcycle' ? 0x2563eb : 0x059669;
        const mat = new THREE.MeshStandardMaterial({
          color: color,
          roughness: 0.5
        });
        const mesh = new THREE.Mesh(geom, mat);
        mesh.position.set(comp.x + w / 2 + offsetX, objHeight / 2, comp.y + h / 2 + offsetZ);
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        floorGroup.add(mesh);
      }
    });
  }

  function animate() {
    animationId = requestAnimationFrame(animate);
    if (controls) controls.update();
    if (renderer && scene && camera) {
      renderer.render(scene, camera);
    }
  }

  function cleanupThree() {
    if (renderer) {
      renderer.dispose();
    }
    if (scene) {
      scene.traverse((object: any) => {
        if (object instanceof THREE.Mesh) {
          object.geometry.dispose();
          if (Array.isArray(object.material)) {
            object.material.forEach((m: any) => m.dispose());
          } else {
            object.material.dispose();
          }
        }
      });
    }
  }
</script>

<div bind:this={container} class="scene-container">
  <canvas bind:this={canvas}></canvas>

  <div class="controls-overlay">
    <div class="control-group">
      <h4>NIDO 3D Viewer</h4>
      <p>🖱️ Left Click + Drag: Rotate</p>
      <p>🖱️ Right Click + Drag: Pan</p>
      <p>🖱️ Scroll: Zoom</p>
      <div class="active-info">
        Floor: <strong>{floorPlanStore.currentFloor?.name || ''}</strong> ({floorPlanStore.currentFloor?.height_m || 2.8}m)
      </div>
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
    background: rgba(15, 23, 42, 0.9);
    padding: 15px;
    border-radius: 8px;
    border: 1px solid rgba(255, 255, 255, 0.1);
    pointer-events: none;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
  }

  .control-group h4 {
    margin: 0 0 8px 0;
    color: #38bdf8;
    font-size: 14px;
    font-weight: 600;
  }

  .control-group p {
    margin: 4px 0;
    font-size: 11px;
    color: #94a3b8;
  }

  .active-info {
    margin-top: 10px;
    padding-top: 8px;
    border-top: 1px solid rgba(255, 255, 255, 0.1);
    font-size: 11px;
    color: #e2e8f0;
  }
</style>