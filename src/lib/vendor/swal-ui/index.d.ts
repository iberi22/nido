// Type declarations for vendored @swal/ui (Svelte 5 components)
declare module '@swal/ui' {
  import type { SvelteComponent } from 'svelte';

  export class Button extends SvelteComponent<{
    variant?: 'primary' | 'secondary' | 'ghost' | 'danger' | 'orange';
    size?: 'sm' | 'md' | 'lg';
    disabled?: boolean;
    loading?: boolean;
    fullWidth?: boolean;
    type?: string;
    onclick?: () => void;
    ondragstart?: (e: DragEvent) => void;
    draggable?: boolean;
    title?: string;
    children?: unknown;
  }> {}
  export class Card extends SvelteComponent<{ variant?: 'default' | 'surface' | 'elevated' | 'glass'; hoverable?: boolean }> {}
  export class Badge extends SvelteComponent<{ variant?: 'success' | 'warning' | 'danger' | 'info' | 'orange' | 'neutral'; pulse?: boolean; dot?: boolean }> {}
  export class Input extends SvelteComponent<{ label?: string; type?: string; error?: string; value?: unknown }> {}
  export class Table extends SvelteComponent<Record<string, never>> {}
  export class Tabs extends SvelteComponent<{ value?: string }> {}
  export class Skeleton extends SvelteComponent<{ variant?: 'text' | 'card' | 'circle' }> {}
  export class Modal extends SvelteComponent<{ open?: boolean; size?: 'sm' | 'md' | 'lg' }> {}
  export class StatusBadge extends SvelteComponent<{ status?: 'healthy' | 'warning' | 'error' | 'offline' }> {}
  export class LoadingState extends SvelteComponent<{ retry?: boolean }> {}
  export class Terminal extends SvelteComponent<Record<string, never>> {}
  export class CommandPalette extends SvelteComponent<Record<string, never>> {}
  export class Toaster extends SvelteComponent<Record<string, never>> {}
  export class LogViewer extends SvelteComponent<Record<string, never>> {}
  export class ConfigEditor extends SvelteComponent<Record<string, never>> {}

  export const toast: {
    success(msg: string): void;
    error(msg: string): void;
    warning(msg: string): void;
    info(msg: string): void;
    loading(msg: string): void;
  };
}
