// Shim temporal: AIChat.svelte aún importa esta ruta. Reexporta el toast del core
// @swal/ui para que exista UN solo store. Borrar cuando AIChat importe '@swal/ui/toast'.
export * from '@swal/ui/toast';
