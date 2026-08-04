// NIDO — i18n Translation Service
// Fulfills Wave 6.08 requirements and Issue-07 contract

let currentLangState = $state('en');

const translations: Record<string, Record<string, string>> = {
  en: {
    "app.title": "NIDO",
    "app.subtitle": "Intelligent Home Administration",
    "app.badge": "Casa 3 Pisos",
    "app.local": "Local",
    "global.plans": "Plans",
    "global.inventory": "Inventory",
    "global.taxes": "Taxes",
    "global.maintenance": "Maintenance",
    "view.2d": "2D",
    "view.3d": "3D",
    "btn.export": "Export",
    "btn.aiChat": "🤖 AI Chat",
    "onboarding.welcome": "Welcome to NIDO",
    "onboarding.step1": "Draw a Wall: Start drawing your blueprint walls directly in the 2D stage.",
    "onboarding.step2": "Save Offline: All layout updates are persisted offline automatically.",
    "onboarding.step3": "Network: Synchronize updates and publish presence in real-time.",
    "onboarding.next": "Next",
    "onboarding.prev": "Previous",
    "onboarding.dismiss": "Dismiss",
    "lang.en": "English",
    "lang.es": "Español"
  },
  es: {
    "app.title": "NIDO",
    "app.subtitle": "Administración Inteligente de Hogares",
    "app.badge": "Casa 3 Pisos",
    "app.local": "Local",
    "global.plans": "Planos",
    "global.inventory": "Inventario",
    "global.taxes": "Impuestos",
    "global.maintenance": "Mantenimiento",
    "view.2d": "2D",
    "view.3d": "3D",
    "btn.export": "Exportar",
    "btn.aiChat": "🤖 Chat de IA",
    "onboarding.welcome": "Bienvenido a NIDO",
    "onboarding.step1": "Dibujar un muro: Comienza a dibujar las paredes de tu plano directamente en el lienzo 2D.",
    "onboarding.step2": "Guardar sin conexión: Todos los cambios se guardan localmente de forma automática.",
    "onboarding.step3": "Red: Sincroniza actualizaciones y publica tu presencia en tiempo real.",
    "onboarding.next": "Siguiente",
    "onboarding.prev": "Anterior",
    "onboarding.dismiss": "Descartar",
    "lang.en": "Inglés",
    "lang.es": "Español"
  }
};

export function setLang(lang: string): void {
  currentLangState = lang;
}

export function getLang(): string {
  return currentLangState;
}

export function t(key: string): string {
  const dict = translations[currentLangState] || translations['en'];
  return dict[key] || key;
}
