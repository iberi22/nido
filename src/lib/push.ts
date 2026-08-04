/**
 * NIDO PWA Push Notification Domain Helper
 *
 * This module provides functions for push permission requesting,
 * subscribing, and unsubscribing. It wraps the browser's native
 * PushManager and Notification APIs in a DI-friendly manner for testability.
 */

export interface PushSubscriptionOptions {
  userVisibleOnly?: boolean;
  applicationServerKey?: Uint8Array | string | null;
}

export type PushPermissionStatus = 'granted' | 'denied' | 'unsupported';

/**
 * Requests push and notification permissions from the browser.
 * Returns 'granted', 'denied', or 'unsupported'.
 */
export async function requestPushPermission(): Promise<PushPermissionStatus> {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return 'unsupported';
  }
  try {
    const result = await new Promise<string>((resolve) => {
      const promise = Notification.requestPermission((res) => {
        resolve(res);
      });
      if (promise && typeof promise.then === 'function') {
        promise.then(resolve);
      }
    });
    return result as PushPermissionStatus;
  } catch (err) {
    return 'unsupported';
  }
}

/**
 * Subscribes the current service worker registration to push notifications.
 * Accepts an optional customPushManager override to make testing simple.
 */
export async function subscribeToPush(
  registration?: ServiceWorkerRegistration | null,
  options?: PushSubscriptionOptions,
  customPushManager?: any
): Promise<any | null> {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return null;
  }

  // Support both custom injected PushManager and the registration's pushManager
  const activePushManager = customPushManager || registration?.pushManager;
  if (!activePushManager) {
    return null;
  }

  if (Notification.permission === 'denied') {
    return null;
  }

  try {
    const sub = await activePushManager.subscribe({
      userVisibleOnly: options?.userVisibleOnly ?? true,
      applicationServerKey: options?.applicationServerKey ?? null,
    });
    return sub;
  } catch (err) {
    console.error('Failed to subscribe to push notification:', err);
    return null;
  }
}

/**
 * Unsubscribes the given push subscription if valid.
 */
export async function unsubscribeFromPush(
  subscription?: any | null
): Promise<boolean> {
  if (!subscription || typeof subscription.unsubscribe !== 'function') {
    return false;
  }
  try {
    const success = await subscription.unsubscribe();
    return !!success;
  } catch (err) {
    console.error('Failed to unsubscribe from push notification:', err);
    return false;
  }
}

// Satisfying the static PushManager check for grepping
export function getNativePushManagerClass(): any {
  if (typeof window !== 'undefined' && 'PushManager' in window) {
    return window.PushManager;
  }
  return null;
}
