import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, cleanup, fireEvent } from '@testing-library/svelte';
import { tick } from 'svelte';
import App from '../../src/App.svelte';
import { t, setLang, getLang } from '../../src/lib/i18n/index.svelte';

// NIDO — Wave 6.08 Unit Tests for Shell i18n + Onboarding.
// Ensures that language switching and first-run onboarding behave correctly.

// Mock dependencies to isolate the shell and components
vi.mock('konva', () => {
  const noop = () => {};
  function konvaNode() {
    return new Proxy({} as Record<string, unknown>, {
      get(target, prop) {
        if (prop in target) return target[prop];
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
  createMeshClient: () => ({
    instanceId: 'test-inst',
    peers: [],
    messages: [],
    publishPresence: () => {},
    sendChatMessage: () => {},
    authzCheck: () => true
  })
}));

vi.mock('../../src/lib/maloca/client', () => ({
  EdgeHiveClient: vi.fn().mockImplementation(function(this: unknown) {
    return {
      getNodeStatus: vi.fn().mockResolvedValue({ nodeId: 'n1', active: true }),
      getAccountStatus: vi.fn().mockResolvedValue({ status: 'active' }),
      syncInstance: vi.fn().mockResolvedValue({ success: true })
    };
  })
}));

vi.mock('../../src/lib/maloca/instance', () => ({
  generateInstanceId: () => 'test-inst'
}));

class ResizeObserverStub {
  observe = () => {};
  unobserve = () => {};
  disconnect = () => {};
}

async function flush() {
  await tick();
  await tick();
  await tick();
  await new Promise((r) => setTimeout(r, 0));
  await tick();
  await tick();
}

describe('Wave 6.08 Shell: Language Selector and Onboarding Tour', () => {
  beforeEach(() => {
    cleanup();
    localStorage.clear();
    setLang('en'); // Reset to default English
    vi.stubGlobal('ResizeObserver', ResizeObserverStub);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('1. shell renders the language selector with English and Spanish options', async () => {
    const { getByTestId } = render(App);
    await flush();

    const selector = getByTestId('language-selector') as HTMLSelectElement;
    expect(selector).toBeTruthy();
    expect(selector.options[0].value).toEqual('en');
    expect(selector.options[1].value).toEqual('es');
  });

  it('2. switching language calls setLang and reactively updates translated labels', async () => {
    const { getByTestId } = render(App);
    await flush();

    const selector = getByTestId('language-selector') as HTMLSelectElement;

    // Switch to Spanish
    await fireEvent.change(selector, { target: { value: 'es' } });
    await flush();

    expect(getLang()).toEqual('es');

    // Verify that some header/tab labels reactively switched to Spanish
    const plansTab = getByTestId('tab-plan');
    expect(plansTab.textContent?.trim()).toEqual('Planos');

    // Switch back to English
    await fireEvent.change(selector, { target: { value: 'en' } });
    await flush();

    expect(getLang()).toEqual('en');
    expect(plansTab.textContent?.trim()).toEqual('Plans');
  });

  it('3. onboarding shows on first run when localStorage is empty', async () => {
    // localStorage is empty initially due to beforeEach
    const { getByTestId } = render(App);
    await flush();

    const onboarding = getByTestId('onboarding');
    expect(onboarding).toBeTruthy();
    expect(onboarding.textContent).toContain('Welcome to NIDO');
  });

  it('4. onboarding is hidden on subsequent runs when seen flag is true', async () => {
    localStorage.setItem('nido_onboarding_seen', 'true');
    const { queryByTestId } = render(App);
    await flush();

    const onboarding = queryByTestId('onboarding');
    expect(onboarding).toBeNull();
  });

  it('5. dismissing onboarding hides the overlay and writes seen flag to localStorage', async () => {
    const { getByTestId, queryByTestId } = render(App);
    await flush();

    // Verify overlay is shown
    expect(getByTestId('onboarding')).toBeTruthy();

    // Find and click the dismiss button
    const dismissBtn = getByTestId('onboarding-dismiss');
    await fireEvent.click(dismissBtn);
    await flush();

    // Verify overlay is hidden
    const onboarding = queryByTestId('onboarding');
    expect(onboarding).toBeNull();

    // Verify flag in localStorage
    expect(localStorage.getItem('nido_onboarding_seen')).toEqual('true');
  });
});
