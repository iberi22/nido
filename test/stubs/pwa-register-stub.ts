// Vitest-only stub for the vite-plugin-pwa build-time virtual module.
// vite.config.ts injects `virtual:pwa-register` at build/dev time; vitest
// resolves it to this stub via the `resolve.alias` in vitest.config.ts so that
// importing src/main.ts in tests never fails. Production builds keep using the
// real registerSW (autoUpdate) from the plugin.
export function registerSW(_options?: {
  immediate?: boolean;
  onNeedRefresh?: () => void;
  onOfflineReady?: () => void;
}): (reloadPage?: boolean) => Promise<void> {
  return async (_reloadPage?: boolean) => {};
}
