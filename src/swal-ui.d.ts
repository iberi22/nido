// El core @swal/ui es JS (sin .d.ts): declaraciones mínimas de lo que NIDO consume.
declare module '@swal/ui' {
  import type { Component } from 'svelte';
  export const AppShell: Component<any>;
  export const MobileNav: Component<any>;
  export const Icon: Component<any>;
  export const ThemeModeSwitch: Component<any>;
  export const Button: Component<any>;
  export const Card: Component<any>;
  export const Badge: Component<any>;
  export const StatusBadge: Component<any>;
  export const Tabs: Component<any>;
  export const Input: Component<any>;
  export const Toaster: Component<any>;
  export const themeBootScript: (opts?: Record<string, unknown>) => string;
  export const setTheme: (theme: 'light' | 'dark' | 'system') => void;
}
declare module '@swal/ui/toast' {
  type Id = string;
  export const toast: {
    success(message: string, title?: string, duration?: number): Id;
    error(message: string, title?: string, duration?: number): Id;
    info(message: string, title?: string, duration?: number): Id;
    warning(message: string, title?: string, duration?: number): Id;
    loading(message: string, title?: string): Id;
    dismiss(id: Id): void;
  };
  export const toasts: { id: string; type: string; title?: string; message: string; duration?: number }[];
}
declare module '@swal/ui/tokens';
