import { defineConfig } from '@playwright/test'
import { execSync } from 'node:child_process'
import fs from 'node:fs'

// NixOS: Playwright's bundled chromium_headless_shell needs libnspr4.so from
// the system chromium's nix-store deps. Build LD_LIBRARY_PATH automatically.
function nixChromiumLibraryPath(): string | undefined {
  const chromiumPath = '/run/current-system/sw/bin/chromium'
  if (!fs.existsSync(chromiumPath)) return undefined
  try {
    const deps = execSync(`nix-store -qR ${chromiumPath}`, { encoding: 'utf8' })
      .split('\n')
      .map((p) => p.trim())
      .filter(Boolean)
    const libs = deps
      .map((p) => p + '/lib')
      .filter((libDir) => fs.existsSync(libDir))
    return libs.length ? libs.join(':') : undefined
  } catch {
    return undefined
  }
}

const nixLibs = nixChromiumLibraryPath()
const env = { ...process.env, ...(nixLibs ? { LD_LIBRARY_PATH: nixLibs } : {}) }

export default defineConfig({
  testDir: './test/e2e',
  timeout: 30000,
  retries: 0,
  use: {
    baseURL: 'http://localhost:4173',
    headless: true,
    launchOptions: {
      // Use system chromium when Playwright's bundled shell lacks nix libs
      ...(fs.existsSync('/run/current-system/sw/bin/chromium')
        ? { executablePath: '/run/current-system/sw/bin/chromium' }
        : {}),
      // Headless chromium mDNS host candidates (.local) never resolve — ICE
      // fails silently. Disable IP obfuscation so WebRTC E2E (mesh-realtime)
      // can connect over loopback in CI. (wave 6.03)
      args: ['--disable-features=WebRtcHideLocalIpsWithMdns'],
      env,
    },
  },
  webServer: {
    command: 'npm run build && npm run preview',
    url: 'http://localhost:4173',
    reuseExistingServer: !process.env.CI,
    timeout: 120000,
  },
  projects: [
    { name: 'chromium', use: { browserName: 'chromium' } },
  ],
})
