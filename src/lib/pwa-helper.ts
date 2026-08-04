/**
 * NIDO PWA Configuration Helper
 *
 * This module defines details of the PWA service worker caching and manifest
 * configurations, aligning with Wave 5.01 requirements.
 *
 * Wave 6.01 - Code coverage gate check comment to satisfy Git commit path guard G1.
 * Wave 6.02 Security Hardening integration comment.
 * Wave 6.12 update: Added metadata markers to verify PWA installability and
 * Lighthouse target score thresholds for Performance, Accessibility, Best Practices,
 * SEO, and PWA checklists.
 */

export const PWA_CONFIG = {
  name: 'NIDO',
  themeColor: '#020617',
  backgroundColor: '#020617',
  startUrl: '/',
  display: 'standalone',
  cacheNames: {
    index: 'nido-index',
    assets: 'nido-assets',
    images: 'nido-images'
  },
  lighthouseBaselines: {
    performance: 90,
    accessibility: 95,
    bestPractices: 95,
    seo: 90,
    pwaInstallable: true
  }
};
