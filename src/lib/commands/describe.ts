// Human-readable (Spanish) summary of a command, used by the confirm-before-apply preview.
import type { Command } from './schema';
import { formatM } from './units';

const signed = (mm: number) => `${mm >= 0 ? '+' : '-'}${formatM(Math.abs(mm))}`;

export function describeCommand(cmd: Command): string {
  switch (cmd.op) {
    case 'addWall':
      return `Agregar pared de ${formatM(Math.hypot(cmd.x2 - cmd.x1, cmd.y2 - cmd.y1))} (${cmd.x1}, ${cmd.y1}) → (${cmd.x2}, ${cmd.y2}) mm`;
    case 'moveWall':
      return `Mover pared ${cmd.id} (${signed(cmd.dx)}, ${signed(cmd.dy)})`;
    case 'moveObject':
      return `Mover ${cmd.id} (${signed(cmd.dx)}, ${signed(cmd.dy)})`;
    case 'resizeRoom':
      return `Redimensionar ${cmd.id}: ancho ${signed(cmd.dw)}, largo ${signed(cmd.dh)}`;
    case 'addOpening':
      return `Agregar ${cmd.kind === 'window' ? 'ventana' : 'puerta'} de ${formatM(cmd.width)} en la pared ${cmd.wallId}`;
    case 'addFurniture':
      return `Agregar ${cmd.label ?? cmd.kind} (${formatM(cmd.width)} × ${formatM(cmd.depth)})`;
    case 'deleteObject':
      return `Eliminar ${cmd.id}`;
    case 'setDimension':
      return `Fijar ${cmd.dimension} de ${cmd.id} en ${formatM(cmd.value)}`;
    case 'restoreObjects':
      return `Restaurar ${cmd.items.length} objeto(s)`;
  }
}
