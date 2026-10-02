// applyCommand: PURE function (model, command) -> new model + inverse command.
// Operates on the existing domain Component model (src/lib/stores/floorPlanStore.svelte.ts,
// coordinates in metres). Commands are in integer millimetres; conversion happens here only.
// Plan (commands) is separate from mesh emission (three-extrusion.ts / Scene3D.svelte).
import type { Component } from '../stores/floorPlanStore.svelte';
import { MIN_ROOM_MM, parseCommand, type Command } from './schema';
import { mToMm, mmToM } from './units';

export interface SceneModel {
  components: Component[];
}

export type ApplyResult =
  | { ok: true; model: SceneModel; inverse: Command; summary: string }
  | { ok: false; error: string };

const DEFAULT_THICKNESS_MM = 150;
const DOOR_TYPES = ['door', 'window'];
const ROOM_TYPES = ['zone', 'room'];

// ---------- read helpers (mm) ----------

export function isWall(c: Component): boolean {
  return c.type === 'wall';
}

export function isOpening(c: Component): boolean {
  return DOOR_TYPES.includes(c.type) && typeof c.properties?.wallId === 'string';
}

export function wallEndsMm(c: Component): { x1: number; y1: number; x2: number; y2: number } {
  const p = c.properties ?? {};
  const w = c.width ?? 0;
  const h = c.height ?? 0;
  return {
    x1: mToMm(p.x1 ?? c.x),
    y1: mToMm(p.y1 ?? c.y),
    x2: mToMm(p.x2 ?? c.x + w),
    y2: mToMm(p.y2 ?? c.y + h)
  };
}

export function wallThicknessMm(c: Component): number {
  const t = c.properties?.thickness;
  return typeof t === 'number' ? mToMm(t) : DEFAULT_THICKNESS_MM;
}

export function wallLengthMm(c: Component): number {
  const e = wallEndsMm(c);
  return Math.round(Math.hypot(e.x2 - e.x1, e.y2 - e.y1));
}

/** Origin used to snap a drag: wall start point, otherwise the component x/y. */
export function componentOriginMm(c: Component): { x: number; y: number } {
  if (isWall(c)) {
    const e = wallEndsMm(c);
    return { x: e.x1, y: e.y1 };
  }
  return { x: mToMm(c.x), y: mToMm(c.y) };
}

// ---------- internal builders ----------

function cloneComp(c: Component): Component {
  return JSON.parse(JSON.stringify(c)) as Component;
}

function withWall(
  c: Component,
  e: { x1: number; y1: number; x2: number; y2: number },
  thicknessMm: number
): Component {
  const t = mmToM(thicknessMm);
  return {
    ...c,
    x: mmToM(Math.min(e.x1, e.x2)),
    y: mmToM(Math.min(e.y1, e.y2)),
    width: mmToM(Math.abs(e.x2 - e.x1)) || t,
    height: mmToM(Math.abs(e.y2 - e.y1)) || t,
    properties: {
      ...c.properties,
      x1: mmToM(e.x1),
      y1: mmToM(e.y1),
      x2: mmToM(e.x2),
      y2: mmToM(e.y2),
      thickness: t
    }
  };
}

function orientation(c: Component): 'h' | 'v' | null {
  const e = wallEndsMm(c);
  if (e.y1 === e.y2 && e.x1 !== e.x2) return 'h';
  if (e.x1 === e.x2 && e.y1 !== e.y2) return 'v';
  return null;
}

/** Box (metres, top-left + size) of an opening laid on an orthogonal wall. */
function openingBox(wall: Component, offset: number, width: number) {
  const e = wallEndsMm(wall);
  const t = wallThicknessMm(wall);
  if (orientation(wall) === 'h') {
    return { x: mmToM(Math.min(e.x1, e.x2) + offset), y: mmToM(e.y1 - t / 2), width: mmToM(width), height: mmToM(t) };
  }
  return { x: mmToM(e.x1 - t / 2), y: mmToM(Math.min(e.y1, e.y2) + offset), width: mmToM(t), height: mmToM(width) };
}

function shift(c: Component, dx: number, dy: number): Component {
  const next: Component = { ...c, x: mmToM(mToMm(c.x) + dx), y: mmToM(mToMm(c.y) + dy) };
  if (isWall(c)) {
    const e = wallEndsMm(c);
    return withWall(next, { x1: e.x1 + dx, y1: e.y1 + dy, x2: e.x2 + dx, y2: e.y2 + dy }, wallThicknessMm(c));
  }
  if (c.type === 'dimension') {
    const p = c.properties ?? {};
    next.properties = {
      ...p,
      ...(typeof p.toX === 'number' ? { toX: mmToM(mToMm(p.toX) + dx) } : {}),
      ...(typeof p.toY === 'number' ? { toY: mmToM(mToMm(p.toY) + dy) } : {})
    };
  }
  return next;
}

const fail = (error: string): ApplyResult => ({ ok: false, error });

function find(model: SceneModel, id: string): { c: Component; i: number } | null {
  const i = model.components.findIndex((c) => c.id === id);
  return i === -1 ? null : { c: model.components[i], i };
}

function replace(model: SceneModel, updates: Map<number, Component>): SceneModel {
  return { components: model.components.map((c, i) => updates.get(i) ?? c) };
}

// ---------- the pure reducer ----------

export function applyCommand(model: SceneModel, input: unknown): ApplyResult {
  const parsed = parseCommand(input);
  if (!parsed.ok) return fail(`Comando inválido: ${parsed.error}`);
  const cmd = parsed.value;

  switch (cmd.op) {
    case 'addWall': {
      if (find(model, cmd.id)) return fail(`Ya existe el id ${cmd.id}`);
      if (cmd.x1 === cmd.x2 && cmd.y1 === cmd.y2) return fail('La pared tiene longitud cero');
      const base: Component = {
        id: cmd.id,
        type: 'wall',
        x: 0,
        y: 0,
        layer: 'structure',
        rotation: 0,
        properties: { note: 'User Wall' }
      };
      const wall = withWall(base, cmd, cmd.thickness ?? DEFAULT_THICKNESS_MM);
      return {
        ok: true,
        model: { components: [...model.components, wall] },
        inverse: { op: 'deleteObject', id: cmd.id },
        summary: 'pared agregada'
      };
    }

    case 'moveWall':
    case 'moveObject': {
      const hit = find(model, cmd.id);
      if (!hit) return fail(`No existe el objeto ${cmd.id}`);
      if (cmd.op === 'moveWall' && !isWall(hit.c)) return fail(`${cmd.id} no es una pared`);
      if (hit.c.locked) return fail(`${cmd.id} está bloqueado`);
      if (isOpening(hit.c)) return fail('Las aperturas se mueven con su pared (mueve la pared)');
      const updates = new Map<number, Component>([[hit.i, shift(hit.c, cmd.dx, cmd.dy)]]);
      if (isWall(hit.c)) {
        // openings ride along with their wall
        model.components.forEach((c, i) => {
          if (isOpening(c) && c.properties.wallId === cmd.id) updates.set(i, shift(c, cmd.dx, cmd.dy));
        });
      }
      return {
        ok: true,
        model: replace(model, updates),
        inverse: { op: cmd.op, id: cmd.id, dx: -cmd.dx + 0, dy: -cmd.dy + 0 },
        summary: 'objeto movido'
      };
    }

    case 'resizeRoom': {
      const hit = find(model, cmd.id);
      if (!hit) return fail(`No existe el espacio ${cmd.id}`);
      if (!ROOM_TYPES.includes(hit.c.type)) return fail(`${cmd.id} no es una habitación`);
      const w = mToMm(hit.c.width ?? 0) + cmd.dw;
      const h = mToMm(hit.c.height ?? 0) + cmd.dh;
      if (w < MIN_ROOM_MM || h < MIN_ROOM_MM) return fail(`La habitación quedaría menor a ${MIN_ROOM_MM} mm`);
      return {
        ok: true,
        model: replace(model, new Map([[hit.i, { ...hit.c, width: mmToM(w), height: mmToM(h) }]])),
        inverse: { op: 'resizeRoom', id: cmd.id, dw: -cmd.dw + 0, dh: -cmd.dh + 0 },
        summary: 'habitación redimensionada'
      };
    }

    case 'addOpening': {
      if (find(model, cmd.id)) return fail(`Ya existe el id ${cmd.id}`);
      const wall = find(model, cmd.wallId);
      if (!wall || !isWall(wall.c)) return fail(`No existe la pared ${cmd.wallId}`);
      if (!orientation(wall.c)) return fail('Solo se admiten aperturas en paredes ortogonales');
      if (cmd.offset + cmd.width > wallLengthMm(wall.c)) return fail('La apertura no cabe en la pared');
      const box = openingBox(wall.c, cmd.offset, cmd.width);
      const heightMm = cmd.height ?? (cmd.kind === 'window' ? 1100 : 2100);
      const sillMm = cmd.sill ?? (cmd.kind === 'window' ? 900 : 0);
      const opening: Component = {
        id: cmd.id,
        type: cmd.kind,
        ...box,
        rotation: 0,
        layer: 'structure',
        properties: {
          wallId: cmd.wallId,
          offsetMm: cmd.offset,
          widthMm: cmd.width,
          heightMm,
          sillMm
        }
      };
      return {
        ok: true,
        model: { components: [...model.components, opening] },
        inverse: { op: 'deleteObject', id: cmd.id },
        summary: cmd.kind === 'window' ? 'ventana agregada' : 'puerta agregada'
      };
    }

    case 'addFurniture': {
      if (find(model, cmd.id)) return fail(`Ya existe el id ${cmd.id}`);
      const piece: Component = {
        id: cmd.id,
        type: 'furniture',
        x: mmToM(cmd.x),
        y: mmToM(cmd.y),
        width: mmToM(cmd.width),
        height: mmToM(cmd.depth),
        rotation: cmd.rotation ?? 0,
        layer: 'furniture',
        properties: { kind: cmd.kind, label: cmd.label ?? cmd.kind, note: 'New' }
      };
      return {
        ok: true,
        model: { components: [...model.components, piece] },
        inverse: { op: 'deleteObject', id: cmd.id },
        summary: 'mueble agregado'
      };
    }

    case 'deleteObject': {
      const hit = find(model, cmd.id);
      if (!hit) return fail(`No existe el objeto ${cmd.id}`);
      if (hit.c.locked) return fail(`${cmd.id} está bloqueado`);
      const gone = new Set<number>([hit.i]);
      if (isWall(hit.c)) {
        model.components.forEach((c, i) => {
          if (isOpening(c) && c.properties.wallId === cmd.id) gone.add(i);
        });
      }
      const items = [...gone]
        .sort((a, b) => a - b)
        .map((index) => ({ index, component: cloneComp(model.components[index]) }));
      return {
        ok: true,
        model: { components: model.components.filter((_, i) => !gone.has(i)) },
        inverse: { op: 'restoreObjects', items },
        summary: 'objeto eliminado'
      };
    }

    case 'restoreObjects': {
      const comps = [...model.components];
      for (const it of [...cmd.items].sort((a, b) => a.index - b.index)) {
        if (comps.some((c) => c.id === it.component.id)) return fail(`Ya existe el id ${it.component.id}`);
        comps.splice(Math.min(it.index, comps.length), 0, cloneComp(it.component as Component));
      }
      // inverse removes the main (first) object; cascaded openings are removed with their wall
      const ids = cmd.items.map((i) => i.component.id);
      const roots = ids.filter((id) => {
        const comp = cmd.items.find((i) => i.component.id === id)!.component;
        return !(typeof comp.properties?.wallId === 'string' && ids.includes(comp.properties.wallId));
      });
      return {
        ok: true,
        model: { components: comps },
        // deleting each root again (walls cascade their openings) is a single batch-free
        // command only when there is one root; otherwise delete roots in order via first root
        inverse: { op: 'deleteObject', id: roots[0] ?? ids[0] },
        summary: 'objeto restaurado'
      };
    }

    case 'setDimension': {
      const hit = find(model, cmd.id);
      if (!hit) return fail(`No existe el objeto ${cmd.id}`);
      const c = hit.c;
      if (isWall(c)) {
        if (cmd.dimension === 'thickness') {
          const old = wallThicknessMm(c);
          const e = wallEndsMm(c);
          const updates = new Map<number, Component>([[hit.i, withWall(c, e, cmd.value)]]);
          const wallNext = updates.get(hit.i)!;
          model.components.forEach((o, i) => {
            if (isOpening(o) && o.properties.wallId === c.id) {
              updates.set(i, { ...o, ...openingBox(wallNext, o.properties.offsetMm ?? 0, o.properties.widthMm ?? 900) });
            }
          });
          return {
            ok: true,
            model: replace(model, updates),
            inverse: { op: 'setDimension', id: cmd.id, dimension: 'thickness', value: old },
            summary: 'grosor actualizado'
          };
        }
        if (cmd.dimension === 'length') {
          const o = orientation(c);
          if (!o) return fail('Solo se puede fijar la longitud de paredes ortogonales');
          const e = wallEndsMm(c);
          const old = wallLengthMm(c);
          const sx = Math.sign(e.x2 - e.x1);
          const sy = Math.sign(e.y2 - e.y1);
          const next = withWall(c, { x1: e.x1, y1: e.y1, x2: e.x1 + sx * cmd.value, y2: e.y1 + sy * cmd.value }, wallThicknessMm(c));
          const tooLong = model.components.some(
            (op) =>
              isOpening(op) &&
              op.properties.wallId === c.id &&
              (op.properties.offsetMm ?? 0) + (op.properties.widthMm ?? 0) > cmd.value
          );
          if (tooLong) return fail('Hay aperturas que no caben en la longitud pedida');
          return {
            ok: true,
            model: replace(model, new Map([[hit.i, next]])),
            inverse: { op: 'setDimension', id: cmd.id, dimension: 'length', value: old },
            summary: 'longitud actualizada'
          };
        }
        return fail(`Una pared no admite la dimensión ${cmd.dimension}`);
      }
      if (cmd.dimension === 'width' || cmd.dimension === 'depth') {
        if (isOpening(c) || !(ROOM_TYPES.includes(c.type) || c.layer === 'furniture')) {
          return fail(`${cmd.id} no admite setDimension`);
        }
        const key = cmd.dimension === 'width' ? 'width' : 'height';
        const old = mToMm(c[key] ?? 0);
        if (cmd.value < MIN_ROOM_MM && ROOM_TYPES.includes(c.type)) return fail(`Mínimo ${MIN_ROOM_MM} mm`);
        return {
          ok: true,
          model: replace(model, new Map([[hit.i, { ...c, [key]: mmToM(cmd.value) }]])),
          inverse: { op: 'setDimension', id: cmd.id, dimension: cmd.dimension, value: Math.max(old, 100) },
          summary: 'dimensión actualizada'
        };
      }
      return fail(`${cmd.id} no admite la dimensión ${cmd.dimension}`);
    }
  }
}
