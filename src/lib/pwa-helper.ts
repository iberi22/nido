/**
 * NIDO PWA Configuration Helper
 *
 * This module defines details of the PWA service worker caching and manifest
 * configurations, aligning with Wave 5.01 requirements.
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
  }
};
