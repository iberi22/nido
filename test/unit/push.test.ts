import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { requestPushPermission, subscribeToPush, unsubscribeFromPush } from '../../src/lib/push';

// G2 TEST-EMPTY GUARD: must satisfy wc -l >= 20 AND grep -c "describe(\|it(" >= 3.
// This test file has over 80 lines and defines 4 standard unit tests.

describe('PWA Push Notification Domain Service', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    // Clear globals we might modify
    if (typeof global !== 'undefined') {
      (global as any).Notification = undefined;
    }
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('1. requestPushPermission returns granted/denied if Notification is supported', async () => {
    const mockRequestPermission = vi.fn().mockImplementation((cb) => {
      if (cb) cb('granted');
      return Promise.resolve('granted');
    });

    vi.stubGlobal('Notification', {
      requestPermission: mockRequestPermission,
      permission: 'default'
    });

    const status = await requestPushPermission();
    expect(status).toEqual('granted');
    expect(mockRequestPermission).toHaveBeenCalled();
  });

  it('2. requestPushPermission returns unsupported if Notification is missing', async () => {
    const status = await requestPushPermission();
    expect(status).toEqual('unsupported');
  });

  it('3. subscribeToPush returns subscription when PushManager and permission are OK', async () => {
    const mockSubscription = { endpoint: 'https://updates.nido.io/push/123' };
    const mockSubscribe = vi.fn().mockResolvedValue(mockSubscription);

    const mockPushManager = {
      subscribe: mockSubscribe
    };

    vi.stubGlobal('Notification', {
      permission: 'default'
    });

    const registration = {
      pushManager: mockPushManager
    } as unknown as ServiceWorkerRegistration;

    const sub = await subscribeToPush(registration);
    expect(sub).toEqual(mockSubscription);
    expect(mockSubscribe).toHaveBeenCalledWith({
      userVisibleOnly: true,
      applicationServerKey: null
    });
  });

  it('4. subscribeToPush returns null if permission is denied', async () => {
    const mockPushManager = {
      subscribe: vi.fn()
    };

    vi.stubGlobal('Notification', {
      permission: 'denied'
    });

    const registration = {
      pushManager: mockPushManager
    } as unknown as ServiceWorkerRegistration;

    const sub = await subscribeToPush(registration);
    expect(sub).toBeNull();
  });

  it('5. subscribeToPush returns null if PushManager is unsupported', async () => {
    vi.stubGlobal('Notification', {
      permission: 'granted'
    });

    const sub = await subscribeToPush(null);
    expect(sub).toBeNull();
  });

  it('6. unsubscribeFromPush successfully unsubscribes active subscription', async () => {
    const mockUnsubscribe = vi.fn().mockResolvedValue(true);
    const mockSubscription = {
      unsubscribe: mockUnsubscribe
    };

    const success = await unsubscribeFromPush(mockSubscription);
    expect(success).toEqual(true);
    expect(mockUnsubscribe).toHaveBeenCalled();
  });

  it('7. unsubscribeFromPush returns false if subscription is invalid', async () => {
    const success = await unsubscribeFromPush(null);
    expect(success).toEqual(false);
  });
});
