# NIDO PWA & Lighthouse Checklist

This document details the Progressive Web App (PWA) audit goals, baseline target scores, and manual execution instructions for deployment verification.

## 1. Lighthouse Baseline Target Scores

To guarantee maximum quality, performance, and compliance for NIDO on both mobile and desktop screens, the application is measured against the following baseline targets at deployment time:

| Lighthouse Category | Target Score | Description / Standard |
|---------------------|--------------|------------------------|
| **Performance**     | `>= 90`      | Rapid initial load, optimized bundle chunks under 500kB, and smart asset caching. |
| **Accessibility**   | `>= 95`      | Perfect semantic HTML hierarchy, proper ARIA labeling on Svelte components. |
| **Best Practices**  | `>= 95`      | Modern APIs, safe security headers, and error-free console logs. |
| **SEO**             | `>= 90`      | Proper viewport configuration, clear title headers, and meta descriptions. |
| **PWA Installable** | `100% / Pass` | Active Service Worker, valid standalone manifest, custom maskable/standard icons. |

---

## 2. PWA Compliance Checklist

Before triggering a production release, ensure that the built PWA conforms to these standards:

- [ ] **Manifest Validity**: The `/manifest.webmanifest` file is served with the correct `application/manifest+json` MIME type and contains `name: "NIDO"`, `short_name: "NIDO"`, `display: "standalone"`, and `start_url: "/"`.
- [ ] **Icon Set Coverage**: Both 192px and 512px icons are referenced in the manifest and return HTTP 200 on request.
- [ ] **Service Worker Registration**: A Service Worker (`sw.js`) is correctly registered, activated, and manages the caching strategies (`NetworkFirst` / `StaleWhileRevalidate`).
- [ ] **Offline Resilience**: Simulating network disconnection preserves core app shell capability, keeping the title as "NIDO" upon page reload.
- [ ] **Theme/Background Color**: The status bar color fits standard SWAL UI tokens (#020617).

---

## 3. Manual Verification & Lighthouse Execution Instructions

Since automated sandboxes do not always run full Chrome graphics stacks, humans must execute the Lighthouse CLI locally or inside a CI environment at deploy time using these steps:

### Option A: Local Dev & Lighthouse CLI

1. **Build and Preview the Production Application**:
   ```bash
   npm run build
   npm run preview
   ```
   *This starts the local web server on port 4173.*

2. **Run the Lighthouse Audit**:
   ```bash
   npx lighthouse http://localhost:4173 --view --chrome-flags="--headless"
   ```
   - `--view` opens the HTML report directly in your default browser.
   - `--chrome-flags="--headless"` is useful for headless server terminals.

### Option B: Chrome DevTools (Graphical Interface)

1. Open **Google Chrome** or any Chromium-based browser.
2. Navigate to the deployed site or `http://localhost:4173`.
3. Open **Chrome DevTools** (`F12` or `Cmd + Option + I`).
4. Select the **Lighthouse** panel.
5. Choose **Navigation** (Default) mode, and check **Mobile** or **Desktop** device options.
6. Check all 5 categories: *Performance*, *Accessibility*, *Best Practices*, *SEO*, and *Progressive Web App*.
7. Click **Analyze page load** and verify all targets are met.
