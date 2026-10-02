<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { floorPlanStore } from './stores/floorPlanStore.svelte';
  import { buildExtrusion, parseColorToHexAndOpacity } from './three-extrusion';
  import { sceneCommands } from './commands/sceneCommands.svelte';
  import { componentOriginMm, isOpening, isWall } from './commands/apply';
  import { wallDimensionLines } from './commands/measure';
  import { snapMoveDelta } from './commands/units';

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

  // 3D measurements (toggleable) + drag state
  let showDims = $state(true);
  let raycaster: any;
  let dragPlane: any;
  let drag: null | {
    targetId: string;
    meshes: Array<{ mesh: any; start: { x: number; y: number; z: number } }>;
    startPoint: { x: number; z: number };
    originMm: { x: number; y: number };
    wall: boolean;
    delta: { dx: number; dy: number };
    pointerId: number;
  } = null;

  // Trigger rebuild when three is loaded, config changes, or floor switches/updates
  $effect(() => {
    // Establish dependencies
    const _id = floorPlanStore.currentFloorId;
    const _floor = floorPlanStore.currentFloor;
    const _comps = floorPlanStore.currentFloor?.components;
    const _config = floorPlanStore.config;
    const _dims = showDims;
    const _sel = floorPlanStore.selectedComponentId;

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

    // Pointer picking / drag on the floor plane
    raycaster = new THREE.Raycaster();
    dragPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
    const el = renderer.domElement as HTMLCanvasElement;
    // capture phase: runs before OrbitControls so it can be disabled for the drag
    el.addEventListener('pointerdown', onPointerDown, true);
    el.addEventListener('pointermove', onPointerMove);
    el.addEventListener('pointerup', onPointerUp);
    el.addEventListener('pointercancel', onPointerCancel);

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

  function createTextSprite(text: string, colorStr: string) {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 128;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Background tooltip style
      ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
      ctx.roundRect ? ctx.roundRect(16, 16, canvas.width - 32, canvas.height - 32, 12) : ctx.rect(16, 16, canvas.width - 32, canvas.height - 32);
      ctx.fill();

      // Border outline matching the zone color
      const parsedColor = parseColorToHexAndOpacity(colorStr);
      const r = (parsedColor.color >> 16) & 255;
      const g = (parsedColor.color >> 8) & 255;
      const b = parsedColor.color & 255;
      ctx.strokeStyle = `rgba(${r}, ${g}, ${b}, 0.8)`;
      ctx.lineWidth = 3;
      ctx.stroke();

      // Text properties
      ctx.fillStyle = '#f1f5f9';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';

      const lines = text.split('\n');
      if (lines.length > 1) {
        ctx.font = 'bold 24px sans-serif';
        ctx.fillText(lines[0], canvas.width / 2, canvas.height / 2 - 15);
        ctx.font = '20px sans-serif';
        ctx.fillStyle = `rgba(${r}, ${g}, ${b}, 0.95)`;
        ctx.fillText(lines[1], canvas.width / 2, canvas.height / 2 + 18);
      } else {
        ctx.font = 'bold 26px sans-serif';
        ctx.fillText(text, canvas.width / 2, canvas.height / 2);
      }
    }

    const texture = new THREE.CanvasTexture(canvas);
    const material = new THREE.SpriteMaterial({ map: texture, transparent: true });
    const sprite = new THREE.Sprite(material);
    // Scale standard dimensions
    sprite.scale.set(4, 1, 1);
    return sprite;
  }

  function rebuildScene() {
    if (!THREE || !scene) return;

    // Clear old floorGroup
    if (floorGroup) {
      scene.remove(floorGroup);
      floorGroup.traverse((child: any) => {
        if (child instanceof THREE.Mesh || child instanceof THREE.Sprite || child instanceof THREE.Line) {
          child.geometry?.dispose();
          if (child.material) {
            if (Array.isArray(child.material)) {
              child.material.forEach((m: any) => m.dispose());
            } else {
              child.material.dispose();
            }
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
    const wallThickness = floorPlanStore.config.wallThickness || 0.15;

    // Ground plane representing the lot size
    const groundGeom = new THREE.BoxGeometry(plotWidth, 0.1, plotHeight);
    const groundMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.9 });
    const groundMesh = new THREE.Mesh(groundGeom, groundMat);
    groundMesh.position.set(0, -0.05, 0);
    groundMesh.receiveShadow = true;
    floorGroup.add(groundMesh);

    // Call pure geometry builder to get all standard items
    const extrudedItems = buildExtrusion(
      floor.components,
      floorHeight,
      plotWidth,
      plotHeight,
      wallThickness
    );

    extrudedItems.forEach((item) => {
      const { width, height, depth } = item.dimensions;
      const geom = new THREE.BoxGeometry(width, height, depth);

      let mat;
      if (item.type === 'zone') {
        const { color, opacity } = parseColorToHexAndOpacity(item.color || '');
        mat = new THREE.MeshStandardMaterial({
          color: color,
          transparent: opacity < 1.0,
          opacity: opacity,
          roughness: 0.8
        });
      } else if (item.type === 'wall') {
        mat = new THREE.MeshStandardMaterial({
          color: 0xe2e8f0, // Clean light wall color
          roughness: 0.7
        });
      } else {
        // door or object/furniture
        const colorHex = parseColorToHexAndOpacity(item.color || '').color;
        mat = new THREE.MeshStandardMaterial({
          color: colorHex,
          roughness: 0.5,
          transparent: item.opacity !== undefined,
          opacity: item.opacity ?? 1.0
        });
      }

      const mesh = new THREE.Mesh(geom, mat);
      const src = floor.components.find((c) => c.id === item.id);
      mesh.userData.cid = item.id;
      mesh.userData.groupId = src && isOpening(src) ? src.properties.wallId : item.id;
      if (item.id === floorPlanStore.selectedComponentId && item.type !== 'zone') {
        mat.emissive = new THREE.Color(0xf59e0b);
        mat.emissiveIntensity = 0.45;
      }
      mesh.position.set(item.position.x, item.position.y, item.position.z);
      mesh.rotation.y = item.rotationY;

      if (item.type === 'wall') {
        mesh.castShadow = true;
        mesh.receiveShadow = true;
      } else if (item.type === 'zone') {
        mesh.receiveShadow = true;
      } else {
        mesh.castShadow = true;
        if (item.type !== 'door') {
          mesh.receiveShadow = true;
        }
      }

      floorGroup.add(mesh);

      // Create high-quality canvas-based text sprite for zones/rooms
      if (item.type === 'zone' && item.label) {
        const labelText = `${item.label}\n${(item.area_m2 || 0).toFixed(1)} m²`;
        const textSprite = createTextSprite(labelText, item.color || '#ffffff');
        // Position it slightly above the zone slab so it floats beautifully
        textSprite.position.set(item.position.x, 0.25, item.position.z);
        floorGroup.add(textSprite);
      }
    });

    // Wall dimension lines + labels (length in m, 2 decimals)
    if (showDims) {
      const lineMat = new THREE.LineBasicMaterial({ color: 0xfbbf24, depthTest: false });
      const y = floorHeight + 0.2;
      for (const d of wallDimensionLines(floor.components, floorPlanStore.config.plot)) {
        const geo = new THREE.BufferGeometry().setFromPoints([
          new THREE.Vector3(d.a.x, y, d.a.z),
          new THREE.Vector3(d.b.x, y, d.b.z)
        ]);
        const line = new THREE.Line(geo, lineMat);
        line.renderOrder = 9;
        floorGroup.add(line);
        const label = createDimLabel(d.label);
        label.position.set(d.mid.x, y + 0.2, d.mid.z);
        floorGroup.add(label);
      }
    }
  }

  // ---- picking + drag (plane-drag with grid snap; commits ONE undoable command on release) ----

  function setRay(e: PointerEvent) {
    const rect = renderer.domElement.getBoundingClientRect();
    const ndc = new THREE.Vector2(
      ((e.clientX - rect.left) / rect.width) * 2 - 1,
      -((e.clientY - rect.top) / rect.height) * 2 + 1
    );
    raycaster.setFromCamera(ndc, camera);
  }

  function planePoint(e: PointerEvent): { x: number; z: number } | null {
    setRay(e);
    const hit = new THREE.Vector3();
    return raycaster.ray.intersectPlane(dragPlane, hit) ? { x: hit.x, z: hit.z } : null;
  }

  function onPointerDown(e: PointerEvent) {
    if (!floorGroup || (e.pointerType === 'mouse' && e.button !== 0)) return;
    setRay(e);
    const pickables = floorGroup.children.filter((m: any) => m.userData?.cid);
    const hit = raycaster.intersectObjects(pickables, false)[0];
    const cid: string | undefined = hit?.object.userData.cid;
    if (!cid) return;

    // doors/windows are dragged through their wall
    const comps = floorPlanStore.currentFloor?.components ?? [];
    let comp = comps.find((c) => c.id === cid);
    if (!comp) return;
    if (isOpening(comp)) comp = comps.find((c) => c.id === comp!.properties.wallId) ?? comp;
    if (comp.type === 'zone' || comp.type === 'room') return; // zones: let OrbitControls orbit
    floorPlanStore.selectComponent(comp.id);
    if (comp.locked || isOpening(comp)) return;

    const start = planePoint(e);
    if (!start) return;
    const meshes = floorGroup.children
      .filter((m: any) => m.userData?.groupId === comp!.id)
      .map((mesh: any) => ({ mesh, start: mesh.position.clone() }));
    drag = {
      targetId: comp.id,
      meshes,
      startPoint: start,
      originMm: componentOriginMm(comp),
      wall: isWall(comp),
      delta: { dx: 0, dy: 0 },
      pointerId: e.pointerId
    };
    if (controls) controls.enabled = false;
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
  }

  function onPointerMove(e: PointerEvent) {
    if (!drag || e.pointerId !== drag.pointerId) return;
    const p = planePoint(e);
    if (!p) return;
    drag.delta = snapMoveDelta(
      drag.originMm,
      { x: Math.round((p.x - drag.startPoint.x) * 1000), y: Math.round((p.z - drag.startPoint.z) * 1000) }
    );
    for (const m of drag.meshes) {
      m.mesh.position.set(m.start.x + drag.delta.dx / 1000, m.start.y, m.start.z + drag.delta.dy / 1000);
    }
  }

  function endDrag(commit: boolean) {
    if (!drag) return;
    const d = drag;
    drag = null;
    if (controls) controls.enabled = true;
    if (commit && (d.delta.dx !== 0 || d.delta.dy !== 0)) {
      const r = sceneCommands.execute({
        op: d.wall ? 'moveWall' : 'moveObject',
        id: d.targetId,
        dx: d.delta.dx,
        dy: d.delta.dy
      });
      if (r.ok) return; // store change triggers rebuildScene()
      console.warn('3D move rejected:', r.error);
    }
    rebuildScene(); // snap meshes back
  }

  function onPointerUp(e: PointerEvent) {
    if (drag && e.pointerId === drag.pointerId) endDrag(true);
  }

  function onPointerCancel(e: PointerEvent) {
    if (drag && e.pointerId === drag.pointerId) endDrag(false);
  }

  function createDimLabel(text: string) {
    const c = document.createElement('canvas');
    c.width = 256;
    c.height = 64;
    const ctx = c.getContext('2d');
    if (ctx) {
      ctx.fillStyle = 'rgba(15, 23, 42, 0.9)';
      ctx.fillRect(0, 0, 256, 64);
      ctx.strokeStyle = '#fbbf24';
      ctx.lineWidth = 3;
      ctx.strokeRect(2, 2, 252, 60);
      ctx.fillStyle = '#fde68a';
      ctx.font = 'bold 34px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(text, 128, 34);
    }
    const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(c), transparent: true, depthTest: false }));
    sprite.scale.set(1.6, 0.4, 1);
    sprite.renderOrder = 10;
    return sprite;
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
      const el = renderer.domElement as HTMLCanvasElement;
      el.removeEventListener('pointerdown', onPointerDown, true);
      el.removeEventListener('pointermove', onPointerMove);
      el.removeEventListener('pointerup', onPointerUp);
      el.removeEventListener('pointercancel', onPointerCancel);
      renderer.dispose();
    }
    if (scene) {
      scene.traverse((object: any) => {
        if (object instanceof THREE.Mesh || object instanceof THREE.Sprite) {
          object.geometry?.dispose();
          if (object.material) {
            if (Array.isArray(object.material)) {
              object.material.forEach((m: any) => m.dispose());
            } else {
              object.material.dispose();
            }
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
      <p>👆 Drag a wall/object: move (50 mm snap)</p>
      <button
        type="button"
        class="dims-toggle"
        data-testid="toggle-3d-dims"
        aria-pressed={showDims}
        onclick={() => (showDims = !showDims)}
      >
        {showDims ? 'Hide' : 'Show'} measurements
      </button>
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
    color: var(--swal-accent, #06b6d4);
    font-size: 14px;
    font-weight: 600;
  }

  .control-group p {
    margin: 4px 0;
    font-size: 11px;
    color: var(--swal-text, #f1f5f9);
    opacity: 0.85;
  }

  .dims-toggle {
    pointer-events: auto;
    margin-top: 6px;
    padding: 6px 10px;
    min-height: 32px;
    font-size: 11px;
    color: var(--swal-text, #f1f5f9);
    background: var(--swal-surface-hover, #1e293b);
    border: 1px solid var(--swal-border, rgba(255, 255, 255, 0.2));
    border-radius: 6px;
    cursor: pointer;
  }

  .active-info {
    margin-top: 10px;
    padding-top: 8px;
    border-top: 1px solid var(--swal-border, rgba(255, 255, 255, 0.08));
    font-size: 11px;
    color: var(--swal-text, #f1f5f9);
  }
</style>