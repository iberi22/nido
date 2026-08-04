import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, cleanup } from '@testing-library/svelte';
import { tick } from 'svelte';
import App from '../../src/App.svelte';
import { createMeshClient as createMeshClientMock } from '../../src/lib/domain/mesh';
import { generateInstanceId as generateInstanceIdMock } from '../../src/lib/maloca/instance';

// NIDO — Wave 5 #92 shell integration unit tests.
// App.svelte must mount MeshPanel + AdminPanel + OfflineBanner and create the
// DI clients (mesh + maloca) ONCE, passing them via props. All infra modules
// are stubbed; the real panels render against the fake clients (asserting the
// props actually flow through).

// ---- DI stubs (hoisted so vi.mock factories can reference them) ----
const { createMeshClient, generateInstanceId, EdgeHiveClient } = vi.hoisted(() => {
  const fakeMeshClient = {
    instanceId: 'inst-test-123',
    namespace: 'swal/nido/inst-test-123',
    peers: [
      { id: 'peer-1', name: 'Alice', presence: 'online' },
      { id: 'peer-2', name: 'Bob', presence: 'offline' }
    ],
    messages: [],
    publishPresence: () => {},
    sendChatMessage: () => ({ id: 'm1', from: 'self', to: 'peer-1', text: 'hi', createdAt: '' }),
    authzCheck: () => true
  };
  return {
    fakeMeshClient,
    createMeshClient: vi.fn(() => fakeMeshClient),
    generateInstanceId: vi.fn(() => 'inst-test-123'),
    EdgeHiveClient: vi.fn().mockImplementation(function (this: unknown) {
      return {
        getAccountStatus: vi.fn().mockResolvedValue({
          status: 'active',
          email: 'xavier@swal.xyz',
          userId: 'u-1'
        }),
        getNodeStatus: vi.fn().mockResolvedValue({
          nodeId: 'node-1',
          active: true,
          expiresAt: null
        }),
        syncInstance: vi.fn().mockResolvedValue({
          success: true,
          updatedAt: '2026-08-04T00:00:00Z'
        })
      };
    })
  };
});

// Konva: CanvasStage mounts a stage tree in onMount. Any unknown method is a
// no-op and reads return undefined/null so the mount + draw effects are inert.
vi.mock('konva', () => {
  const noop = () => {};
  // Regular function (constructible with `new Konva.X(...)`); returns a Proxy
  // whose unknown methods are no-ops so the mount + draw effects stay inert.
  function konvaNode(..._args: any[]) {
    return new Proxy({} as Record<string, unknown>, {
      get(target, prop) {
        const key = prop as string;
        if (key in target) return target[key];
        return noop;
      },
      set(target, prop, value) {
        (target as Record<string, unknown>)[prop as string] = value;
        return true;
      }
    });
  }
  return {
    default: {
      Stage: konvaNode,
      Layer: konvaNode,
      Group: konvaNode,
      Rect: konvaNode,
      Line: konvaNode,
      Text: konvaNode,
      Arc: konvaNode,
      Arrow: konvaNode,
      Transformer: konvaNode,
      Circle: konvaNode,
      Path: konvaNode,
      RegularPolygon: konvaNode,
      Label: konvaNode,
      Tag: konvaNode
    }
  };
});

vi.mock('../../src/lib/domain/mesh', () => ({
  createMeshClient: createMeshClient
}));

vi.mock('../../src/lib/maloca/client', () => ({
  EdgeHiveClient: EdgeHiveClient
}));

vi.mock('../../src/lib/maloca/instance', () => ({
  generateInstanceId: generateInstanceId,
  getMeshNamespace: (id: string) => `swal/nido/${id}`
}));

const noop = () => {};

class ResizeObserverStub {
  observe = noop;
  unobserve = noop;
  disconnect = noop;
}

async function flush() {
  // Let App's $effect create the clients, then the panels' async onMount settle.
  await tick();
  await tick();
  await tick();
  await new Promise((r) => setTimeout(r, 0));
  await tick();
  await tick();
}

describe('Wave 5 #92 — shell integration: MeshPanel + AdminPanel + OfflineBanner mounted', () => {
  beforeEach(() => {
    cleanup();
    vi.clearAllMocks();
    localStorage.clear();
    vi.stubGlobal('ResizeObserver', ResizeObserverStub);
    Object.defineProperty(navigator, 'onLine', { configurable: true, get: () => true });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('1. mounts MeshPanel and passes the created mesh client (peers render)', async () => {
    const { getByTestId, getByText } = render(App);
    await flush();

    expect(getByTestId('mesh-panel')).toBeTruthy();
    // Peer names come from the client prop → proves DI props actually flow.
    expect(getByText('Alice')).toBeTruthy();
    expect(getByText('Bob')).toBeTruthy();
    expect(createMeshClientMock).toHaveBeenCalledWith('inst-test-123');
  });

  it('2. mounts AdminPanel with the maloca client (Pro node status renders)', async () => {
    const { getByTestId } = render(App);
    await flush();

    expect(getByTestId('admin-panel')).toBeTruthy();
    expect(getByTestId('instance-id').textContent).toContain('inst-test-123');
    expect(getByTestId('node-status-text').textContent).toContain('Active');
    expect(getByTestId('tier-badge-container').textContent).toContain('Pro');
  });

  it('3. mounts OfflineBanner: shows the banner when the app goes offline', async () => {
    const { getByTestId, queryByTestId } = render(App);
    await flush();
    expect(queryByTestId('offline-banner')).toBeNull(); // online

    Object.defineProperty(navigator, 'onLine', { configurable: true, get: () => false });
    window.dispatchEvent(new Event('offline'));
    await tick();
    expect(getByTestId('offline-banner')).toBeTruthy();

    Object.defineProperty(navigator, 'onLine', { configurable: true, get: () => true });
    window.dispatchEvent(new Event('online'));
    await tick();
    expect(queryByTestId('offline-banner')).toBeNull();
  });

  it('4. creates the mesh client exactly once per mount (DI discipline)', async () => {
    const first = render(App);
    await flush();
    expect(createMeshClientMock).toHaveBeenCalledTimes(1);
    first.unmount();
    vi.clearAllMocks();
    localStorage.clear();

    render(App);
    await flush();
    expect(createMeshClientMock).toHaveBeenCalledTimes(1);
  });

  it('5. persists the instance id in localStorage (multi-instance workspace)', async () => {
    render(App);
    await flush();
    expect(generateInstanceIdMock).toHaveBeenCalledTimes(1);
    expect(localStorage.getItem('nido:instanceId')).toBe('inst-test-123');
  });

  it('6. renders the shell without console errors', async () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const { getByTestId } = render(App);
    await flush();

    expect(getByTestId('mesh-panel')).toBeTruthy();
    expect(getByTestId('admin-panel')).toBeTruthy();
    expect(errorSpy).not.toHaveBeenCalled();
    errorSpy.mockRestore();
  });
});
