// Spanish rule-based CommandProposer (no LLM). Deterministic semantic resolution
// ("pared norte", "la cocina") lives here, so an LLM only has to emit high-level commands.
import type { Component } from '../stores/floorPlanStore.svelte';
import { isOpening, isWall, wallEndsMm, wallLengthMm, type SceneModel } from './apply';
import { describeCommand } from './describe';
import type { CommandProposer, Proposal } from './proposer';
import type { Command } from './schema';
import { formatM, mToMm, newId, snapMm } from './units';

export type Dir = 'north' | 'south' | 'east' | 'west';

export function normalize(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[¿?¡!.;:]+$/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/** First length in the text, in integer mm. "3 m", "2,5 metros", "50 cm", "300 mm". */
export function parseLengthMm(norm: string): number | null {
  const m = norm.match(/(\d+(?:[.,]\d+)?)\s*(milimetros?|mm|centimetros?|cms?|metros?|mts?|m)\b/);
  if (!m) return null;
  const n = parseFloat(m[1].replace(',', '.'));
  const u = m[2];
  const factor = u.startsWith('mi') || u === 'mm' ? 1 : u.startsWith('c') ? 10 : 1000;
  return Math.round(n * factor);
}

const DIRS: Array<[RegExp, Dir]> = [
  [/\bnorte\b/, 'north'],
  [/\bsur\b/, 'south'],
  [/\beste\b|\boriente\b/, 'east'],
  [/\boeste\b|\boccidente\b/, 'west']
];

export function parseDir(norm: string): Dir | null {
  for (const [re, d] of DIRS) if (re.test(norm)) return d;
  return null;
}

const DIR_ES: Record<Dir, string> = { north: 'norte', south: 'sur', east: 'este', west: 'oeste' };

interface Bounds {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
}

export function planBounds(model: SceneModel): Bounds | null {
  let b: Bounds | null = null;
  const grow = (x: number, y: number) => {
    b = b
      ? { minX: Math.min(b.minX, x), minY: Math.min(b.minY, y), maxX: Math.max(b.maxX, x), maxY: Math.max(b.maxY, y) }
      : { minX: x, minY: y, maxX: x, maxY: y };
  };
  for (const c of model.components) {
    if (isWall(c)) {
      const e = wallEndsMm(c);
      grow(e.x1, e.y1);
      grow(e.x2, e.y2);
    } else if (c.type === 'zone' || c.type === 'room') {
      grow(mToMm(c.x), mToMm(c.y));
      grow(mToMm(c.x + (c.width ?? 0)), mToMm(c.y + (c.height ?? 0)));
    }
  }
  return b;
}

/** Outermost orthogonal wall on a side; ties -> longest. */
export function findWall(model: SceneModel, dir: Dir): Component | null {
  const horizontal = dir === 'north' || dir === 'south';
  const cands = model.components.filter((c) => {
    if (!isWall(c)) return false;
    const e = wallEndsMm(c);
    return horizontal ? e.y1 === e.y2 && e.x1 !== e.x2 : e.x1 === e.x2 && e.y1 !== e.y2;
  });
  if (cands.length === 0) return null;
  const pos = (c: Component) => {
    const e = wallEndsMm(c);
    return horizontal ? e.y1 : e.x1;
  };
  const sign = dir === 'north' || dir === 'west' ? 1 : -1; // smaller is "more north/west"
  cands.sort((a, b) => sign * (pos(a) - pos(b)) || wallLengthMm(b) - wallLengthMm(a));
  return cands[0];
}

function label(c: Component): string {
  const p = c.properties ?? {};
  return String(p.name ?? p.label ?? p.kind ?? c.id).replace(/\s+/g, ' ');
}

/** Find a named room/furniture mentioned in the text (whole-word token match). */
export function findNamed(model: SceneModel, norm: string): Component | null {
  let best: { c: Component; score: number } | null = null;
  for (const c of model.components) {
    if (isWall(c) || isOpening(c)) continue;
    const name = normalize(label(c));
    if (!name || name === normalize(c.id)) continue;
    let score = 0;
    if (norm.includes(name)) score = 100 + name.length;
    else {
      for (const tok of name.split(/[^a-z0-9]+/).filter((t) => t.length >= 4)) {
        if (new RegExp(`\\b${tok}s?\\b`).test(norm)) score += tok.length;
      }
    }
    if (score > 0 && (!best || score > best.score)) best = { c, score };
  }
  return best?.c ?? null;
}

interface FurnitureDef {
  re: RegExp;
  kind: string;
  label: string;
  w: number;
  d: number;
}

const FURNITURE: FurnitureDef[] = [
  { re: /\bsofa\b/, kind: 'sofa', label: 'Sofá', w: 2000, d: 900 },
  { re: /\bmesa\b/, kind: 'table', label: 'Mesa', w: 1600, d: 900 },
  { re: /\bcama\b/, kind: 'bed', label: 'Cama', w: 1400, d: 1900 },
  { re: /\bsilla\b/, kind: 'chair', label: 'Silla', w: 450, d: 450 },
  { re: /\bescritorio\b/, kind: 'desk', label: 'Escritorio', w: 1400, d: 700 },
  { re: /\bnevera\b|\brefrigerador\b/, kind: 'fridge', label: 'Nevera', w: 700, d: 700 },
  { re: /\bestufa\b/, kind: 'stove', label: 'Estufa', w: 600, d: 600 },
  { re: /\barmario\b|\bcloset\b/, kind: 'wardrobe', label: 'Armario', w: 1200, d: 600 }
];

const ADD_VERB = /\b(agrega|agregar|agregame|anade|anadir|pon|poner|ponme|coloca|colocar|crea|crear|inserta|insertar|dibuja)\b/;
const MOVE_VERB = /\b(mueve|mover|desplaza|desplazar|corre|correr)\b/;
const DELETE_VERB = /\b(elimina|eliminar|borra|borrar|quita|quitar|suprime)\b/;
const RESIZE_VERB = /\b(haz|hace|haga|hazme|vuelve|agranda|agrandar|amplia|ampliar|ensancha|ensanchar|alarga|alargar|reduce|reducir|acorta|acortar|achica|achicar|estrecha|estrechar)\b/;

const unknown = (message: string): Proposal => ({ kind: 'unknown', message });
const ok = (commands: Command[], model: SceneModel, names?: string[]): Proposal => ({
  kind: 'commands',
  commands,
  summary: names ?? commands.map(describeCommand)
});

function propose(text: string, model: SceneModel): Proposal {
  const norm = normalize(text);
  if (!norm) return unknown('Escribe una instrucción.');

  if (/^(deshac|deshaz|undo|anula|revierte)/.test(norm)) return { kind: 'undo' };
  if (/^(rehac|rehaz|redo|repite)/.test(norm)) return { kind: 'redo' };

  const len = parseLengthMm(norm);
  const dir = parseDir(norm);

  // --- windows / doors on a wall ---
  const openingKind = /\bventana\b/.test(norm) ? 'window' : /\bpuerta\b/.test(norm) ? 'door' : null;
  if (openingKind && ADD_VERB.test(norm) && /\b(pared|muro)\b/.test(norm)) {
    if (!dir) return unknown('¿En qué pared? Indica norte, sur, este u oeste.');
    const wall = findWall(model, dir);
    if (!wall) return unknown(`No hay una pared al ${DIR_ES[dir]}. Agrega una primero.`);
    const wallLen = wallLengthMm(wall);
    const want = len ?? (openingKind === 'window' ? 1200 : 900);
    const width = Math.min(want, wallLen);
    const offset = Math.max(0, Math.round((wallLen - width) / 2));
    const cmd: Command = { op: 'addOpening', id: newId(openingKind), kind: openingKind, wallId: wall.id, offset, width };
    return ok([cmd], model, [
      `Agregar ${openingKind === 'window' ? 'ventana' : 'puerta'} de ${formatM(width)} centrada en la pared ${DIR_ES[dir]}`
    ]);
  }

  // --- add wall ---
  if (/\b(pared|muro)\b/.test(norm) && ADD_VERB.test(norm)) {
    if (!len) return unknown('¿De qué largo? Ejemplo: "agrega una pared de 3 m al norte".');
    const d = dir ?? 'north';
    const b = planBounds(model) ?? { minX: 0, minY: 0, maxX: 0, maxY: 0 };
    let cmd: Command;
    const id = newId('wall');
    if (d === 'north') cmd = { op: 'addWall', id, x1: b.minX, y1: b.minY, x2: b.minX + len, y2: b.minY };
    else if (d === 'south') cmd = { op: 'addWall', id, x1: b.minX, y1: b.maxY, x2: b.minX + len, y2: b.maxY };
    else if (d === 'west') cmd = { op: 'addWall', id, x1: b.minX, y1: b.minY, x2: b.minX, y2: b.minY + len };
    else cmd = { op: 'addWall', id, x1: b.maxX, y1: b.minY, x2: b.maxX, y2: b.minY + len };
    return ok([cmd], model, [`Agregar pared de ${formatM(len)} en el borde ${DIR_ES[d]} del plano`]);
  }

  // --- add furniture ---
  const piece = FURNITURE.find((f) => f.re.test(norm));
  if (piece && ADD_VERB.test(norm)) {
    const room = findNamed({ components: model.components.filter((c) => c.type === 'zone' || c.type === 'room') }, norm);
    const b = planBounds(model);
    const cx = room ? mToMm(room.x + (room.width ?? 0) / 2) : b ? Math.round((b.minX + b.maxX) / 2) : 0;
    const cy = room ? mToMm(room.y + (room.height ?? 0) / 2) : b ? Math.round((b.minY + b.maxY) / 2) : 0;
    const cmd: Command = {
      op: 'addFurniture',
      id: newId(piece.kind),
      kind: piece.kind,
      label: piece.label,
      x: snapMm(cx - piece.w / 2),
      y: snapMm(cy - piece.d / 2),
      width: piece.w,
      depth: piece.d
    };
    return ok([cmd], model, [`Agregar ${piece.label.toLowerCase()} (${formatM(piece.w)} × ${formatM(piece.d)})${room ? ` en ${label(room)}` : ''}`]);
  }

  // --- delete ---
  if (DELETE_VERB.test(norm)) {
    if (/\b(pared|muro)\b/.test(norm) && dir) {
      const wall = findWall(model, dir);
      if (!wall) return unknown(`No hay una pared al ${DIR_ES[dir]}.`);
      return ok([{ op: 'deleteObject', id: wall.id }], model, [`Eliminar la pared ${DIR_ES[dir]} (${formatM(wallLengthMm(wall))})`]);
    }
    const target = findNamed(model, norm);
    if (!target) return unknown('No encuentro qué eliminar. Nómbralo (ej. "elimina la mesa").');
    return ok([{ op: 'deleteObject', id: target.id }], model, [`Eliminar ${label(target)}`]);
  }

  // --- move named object ---
  if (MOVE_VERB.test(norm)) {
    if (!len || !dir) return unknown('Indica distancia y dirección. Ejemplo: "mueve la mesa 1 m al este".');
    const target = findNamed(model, norm);
    if (!target) return unknown('No encuentro qué mover. Nómbralo (ej. "mueve la mesa 1 m al este").');
    const dx = dir === 'east' ? len : dir === 'west' ? -len : 0;
    const dy = dir === 'south' ? len : dir === 'north' ? -len : 0;
    return ok([{ op: 'moveObject', id: target.id, dx, dy }], model, [`Mover ${label(target)} ${formatM(len)} al ${DIR_ES[dir]}`]);
  }

  // --- resize room ("haz la cocina 50 cm más ancha") ---
  if (RESIZE_VERB.test(norm) || /\b(mas|menos)\b/.test(norm)) {
    const room = findNamed(
      { components: model.components.filter((c) => c.type === 'zone' || c.type === 'room') },
      norm
    );
    if (room && len) {
      const negative = /\b(angost\w*|estrech\w*|menos|reduc\w*|acort\w*|achic\w*|disminu\w*)/.test(norm);
      const amount = negative ? -len : len;
      let dw = 0;
      let dh = 0;
      let what = '';
      if (/anch|ensanch|angost/.test(norm)) {
        dw = amount;
        what = 'ancho';
      } else if (/larg|profund|fondo|alarg|acort/.test(norm)) {
        dh = amount;
        what = 'largo';
      } else if (/agrand|ampli/.test(norm)) {
        dw = amount;
        dh = amount;
        what = 'ancho y largo';
      }
      if (what) {
        return ok([{ op: 'resizeRoom', id: room.id, dw, dh }], model, [
          `${label(room)}: ${what} ${amount >= 0 ? '+' : '-'}${formatM(Math.abs(amount))}`
        ]);
      }
      return unknown('¿Más ancha o más larga? Ejemplo: "haz la cocina 50 cm más ancha".');
    }
    if (len && !room) return unknown('No encuentro esa habitación en el plano.');
  }

  return unknown(
    'No entendí. Prueba: "agrega una pared de 3 m al norte", "pon una ventana en la pared norte", "haz la cocina 50 cm más ancha", "deshacer".'
  );
}

export const rulesEsProposer: CommandProposer = {
  name: 'rules-es',
  propose
};
