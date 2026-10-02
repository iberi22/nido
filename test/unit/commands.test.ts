import { describe, it, expect } from 'vitest';
import {
  applyCommand,
  CommandHistory,
  commandJsonSchema,
  parseCommand,
  parseProposal,
  rulesEsProposer,
  snapMm,
  snapMoveDelta,
  worldToPlanMm,
  planMmToWorld,
  wallDimensionLines,
  formatM,
  type Command,
  type SceneModel
} from '../../src/lib/commands';
import { parseLengthMm, findWall } from '../../src/lib/commands/rules-es';

const J = (v: unknown) =>
  JSON.stringify(v, (_k, val) =>
    val && typeof val === 'object' && !Array.isArray(val)
      ? Object.fromEntries(Object.entries(val).sort(([a], [b]) => (a < b ? -1 : 1)))
      : val
  );

const zone = (id: string, name: string, x: number, y: number, w: number, h: number) => ({
  id,
  type: 'zone',
  x,
  y,
  width: w,
  height: h,
  layer: 'zones' as const,
  properties: { name }
});

function base(): SceneModel {
  let m: SceneModel = { components: [zone('kitchen', 'Cocina', 0, 0, 3, 4)] };
  for (const c of [
    { op: 'addWall', id: 'wN', x1: 0, y1: 0, x2: 4000, y2: 0 },
    { op: 'addWall', id: 'wS', x1: 0, y1: 4000, x2: 4000, y2: 4000 }
  ]) {
    const r = applyCommand(m, c);
    if (!r.ok) throw new Error(r.error);
    m = r.model;
  }
  return m;
}

function port(initial: SceneModel) {
  let model = initial;
  return { get: () => JSON.parse(JSON.stringify(model)) as SceneModel, set: (m: SceneModel) => (model = m), cur: () => model };
}

describe('schema validation', () => {
  it('accepts a good command and rejects bad ones', () => {
    expect(parseCommand({ op: 'moveObject', id: 'a', dx: 50, dy: -50 }).ok).toBe(true);
    expect(parseCommand({ op: 'moveObject', id: 'a', dx: 1.5, dy: 0 }).ok).toBe(false); // non-integer mm
    expect(parseCommand({ op: 'hackTheGibson' }).ok).toBe(false);
    expect(parseCommand({ op: 'addWall', id: 'bad id!', x1: 0, y1: 0, x2: 1, y2: 1 }).ok).toBe(false);
    expect(parseCommand({ op: 'addOpening', id: 'o', kind: 'skylight', wallId: 'w', offset: 0, width: 900 }).ok).toBe(false);
    expect(parseCommand({ op: 'addWall', id: 'w', x1: 0, y1: 0, x2: 9_999_999, y2: 0 }).ok).toBe(false);
    expect(parseCommand({ op: 'resizeRoom', id: 'r', dw: 0, dh: 0 }).ok).toBe(false);
  });

  it('proposal list rejects the internal restoreObjects op', () => {
    expect(parseProposal([{ op: 'deleteObject', id: 'a' }]).ok).toBe(true);
    const r = parseProposal([{ op: 'restoreObjects', items: [] }]);
    expect(r.ok).toBe(false);
  });

  it('exports a JSON schema for the LLM', () => {
    const s = J(commandJsonSchema());
    expect(s).toContain('addWall');
    expect(s).toContain('setDimension');
  });

  it('applyCommand rejects invalid input instead of throwing', () => {
    const r = applyCommand({ components: [] }, { op: 'nope' });
    expect(r.ok).toBe(false);
  });
});

describe('applyCommand + inverse round-trip', () => {
  const cases: Array<[string, Command]> = [
    ['moveWall', { op: 'moveWall', id: 'wN', dx: 500, dy: -250 }],
    ['moveObject', { op: 'moveObject', id: 'wS', dx: -100, dy: 300 }],
    ['resizeRoom', { op: 'resizeRoom', id: 'kitchen', dw: 500, dh: -250 }],
    ['addWall', { op: 'addWall', id: 'w9', x1: 0, y1: 0, x2: 0, y2: 3000 }],
    ['addOpening', { op: 'addOpening', id: 'win1', kind: 'window', wallId: 'wN', offset: 1400, width: 1200 }],
    ['addFurniture', { op: 'addFurniture', id: 'f1', kind: 'table', x: 500, y: 500, width: 1600, depth: 900 }],
    ['deleteObject', { op: 'deleteObject', id: 'wN' }],
    ['setDimension length', { op: 'setDimension', id: 'wN', dimension: 'length', value: 3500 }],
    ['setDimension thickness', { op: 'setDimension', id: 'wN', dimension: 'thickness', value: 200 }],
    ['setDimension width', { op: 'setDimension', id: 'kitchen', dimension: 'width', value: 3500 }]
  ];
  for (const [name, cmd] of cases) {
    it(`${name}: apply then inverse restores the model exactly`, () => {
      const m0 = base();
      const before = J(m0);
      const r = applyCommand(m0, cmd);
      expect(r.ok).toBe(true);
      if (!r.ok) return;
      expect(J(m0)).toBe(before); // pure: input untouched
      expect(J(r.model)).not.toBe(before);
      const back = applyCommand(r.model, r.inverse);
      expect(back.ok).toBe(true);
      if (back.ok) expect(J(back.model)).toBe(before);
    });
  }

  it('wall deletion cascades to its openings and restores them in place', () => {
    let m = base();
    const o = applyCommand(m, { op: 'addOpening', id: 'd1', kind: 'door', wallId: 'wN', offset: 100, width: 900 });
    if (!o.ok) throw new Error(o.error);
    m = o.model;
    const before = J(m);
    const del = applyCommand(m, { op: 'deleteObject', id: 'wN' });
    if (!del.ok) throw new Error(del.error);
    expect(del.model.components.find((c) => c.id === 'd1')).toBeUndefined();
    const back = applyCommand(del.model, del.inverse);
    if (!back.ok) throw new Error(back.error);
    expect(J(back.model)).toBe(before);
  });

  it('moving a wall carries its openings', () => {
    const o = applyCommand(base(), { op: 'addOpening', id: 'w1', kind: 'window', wallId: 'wN', offset: 1000, width: 1200 });
    if (!o.ok) throw new Error(o.error);
    const mv = applyCommand(o.model, { op: 'moveWall', id: 'wN', dx: 0, dy: 1000 });
    if (!mv.ok) throw new Error(mv.error);
    const before = o.model.components.find((c) => c.id === 'w1')!;
    const after = mv.model.components.find((c) => c.id === 'w1')!;
    expect(after.y - before.y).toBeCloseTo(1, 6);
  });

  it('rejects impossible operations', () => {
    const m = base();
    expect(applyCommand(m, { op: 'moveObject', id: 'ghost', dx: 50, dy: 0 }).ok).toBe(false);
    expect(applyCommand(m, { op: 'resizeRoom', id: 'kitchen', dw: -2900, dh: 0 }).ok).toBe(false);
    expect(applyCommand(m, { op: 'addOpening', id: 'o', kind: 'door', wallId: 'wN', offset: 3500, width: 900 }).ok).toBe(false);
    expect(applyCommand(m, { op: 'addWall', id: 'wN', x1: 0, y1: 0, x2: 10, y2: 0 }).ok).toBe(false); // duplicate id
    expect(applyCommand(m, { op: 'addWall', id: 'z', x1: 5, y1: 5, x2: 5, y2: 5 }).ok).toBe(false);
  });

  it('locked components cannot be moved or deleted', () => {
    const m = { components: [{ ...zone('z', 'Sala', 0, 0, 3, 3), locked: true }] };
    expect(applyCommand(m, { op: 'moveObject', id: 'z', dx: 50, dy: 0 }).ok).toBe(false);
    expect(applyCommand(m, { op: 'deleteObject', id: 'z' }).ok).toBe(false);
    expect(applyCommand(m, { op: 'resizeRoom', id: 'z', dw: 500, dh: 0 }).ok).toBe(true);
  });
});

describe('history undo/redo', () => {
  it('undo/redo walk the stack, new commands clear redo', () => {
    const p = port(base());
    const h = new CommandHistory(p);
    expect(h.canUndo).toBe(false);
    h.execute({ op: 'moveWall', id: 'wN', dx: 500, dy: 0 });
    h.execute({ op: 'resizeRoom', id: 'kitchen', dw: 500, dh: 0 });
    const afterTwo = J(p.cur());
    expect(h.undo().ok).toBe(true);
    expect(h.undo().ok).toBe(true);
    expect(J(p.cur())).toBe(J(base()));
    expect(h.undo().ok).toBe(false);
    expect(h.redo().ok).toBe(true);
    expect(h.redo().ok).toBe(true);
    expect(J(p.cur())).toBe(afterTwo);
    h.undo();
    h.execute({ op: 'moveWall', id: 'wS', dx: 50, dy: 0 });
    expect(h.canRedo).toBe(false);
  });

  it('batches are atomic: failure commits nothing', () => {
    const p = port(base());
    const h = new CommandHistory(p);
    const r = h.execute([
      { op: 'moveWall', id: 'wN', dx: 500, dy: 0 },
      { op: 'moveObject', id: 'ghost', dx: 1, dy: 1 }
    ]);
    expect(r.ok).toBe(false);
    expect(J(p.cur())).toBe(J(base()));
    expect(h.canUndo).toBe(false);
  });

  it('a batch undoes in one step', () => {
    const p = port(base());
    const h = new CommandHistory(p);
    h.execute([
      { op: 'moveWall', id: 'wN', dx: 500, dy: 0 },
      { op: 'moveWall', id: 'wN', dx: 0, dy: 500 }
    ]);
    h.undo();
    expect(J(p.cur())).toBe(J(base()));
  });

  it('dryRun does not mutate', () => {
    const p = port(base());
    const h = new CommandHistory(p);
    expect(h.dryRun({ op: 'moveWall', id: 'wN', dx: 500, dy: 0 }).ok).toBe(true);
    expect(h.canUndo).toBe(false);
    expect(J(p.cur())).toBe(J(base()));
  });
});

describe('Spanish rule parser', () => {
  const run = (t: string, m = base()) => rulesEsProposer.propose(t, m) as any;

  it('parses lengths in m / cm / mm with comma decimals', () => {
    expect(parseLengthMm('pared de 3 m')).toBe(3000);
    expect(parseLengthMm('2,5 metros')).toBe(2500);
    expect(parseLengthMm('50 cm mas')).toBe(500);
    expect(parseLengthMm('300 mm')).toBe(300);
    expect(parseLengthMm('sin numero')).toBeNull();
  });

  it('"agrega una pared de 3 m al norte"', () => {
    const p = run('agrega una pared de 3 m al norte');
    expect(p.kind).toBe('commands');
    const c = p.commands[0];
    expect(c.op).toBe('addWall');
    expect(Math.abs(c.x2 - c.x1)).toBe(3000);
    expect(c.y1).toBe(c.y2);
    expect(c.y1).toBe(0); // north edge of plan bounds
    expect(parseCommand(c).ok).toBe(true);
    expect(p.summary[0]).toContain('3.00 m');
  });

  it('"haz la cocina 50 cm más ancha"', () => {
    const p = run('haz la cocina 50 cm más ancha');
    expect(p.kind).toBe('commands');
    expect(p.commands[0]).toMatchObject({ op: 'resizeRoom', id: 'kitchen', dw: 500, dh: 0 });
  });

  it('"haz la cocina 1 m más angosta" is negative', () => {
    expect(run('haz la cocina 1 m más angosta').commands[0]).toMatchObject({ dw: -1000 });
  });

  it('"pon una ventana en la pared norte"', () => {
    const p = run('pon una ventana en la pared norte');
    expect(p.kind).toBe('commands');
    expect(p.commands[0]).toMatchObject({ op: 'addOpening', kind: 'window', wallId: 'wN', width: 1200, offset: 1400 });
  });

  it('window on a side with no wall explains instead of guessing', () => {
    const p = run('pon una ventana en la pared este');
    expect(p.kind).toBe('unknown');
    expect(p.message).toContain('este');
  });

  it('"deshacer" / "rehacer"', () => {
    expect(run('deshacer').kind).toBe('undo');
    expect(run('Rehacer').kind).toBe('redo');
  });

  it('furniture, move and delete', () => {
    const f = run('agrega una mesa en la cocina');
    expect(f.commands[0]).toMatchObject({ op: 'addFurniture', kind: 'table' });
    const m = applyCommand(base(), f.commands[0]);
    if (!m.ok) throw new Error(m.error);
    expect(run('mueve la mesa 1 m al este', m.model).commands[0]).toMatchObject({ op: 'moveObject', dx: 1000, dy: 0 });
    expect(run('elimina la mesa', m.model).commands[0]).toMatchObject({ op: 'deleteObject' });
    expect(findWall(base(), 'south')?.id).toBe('wS');
  });

  it('unknown text yields a helpful message, every proposed command validates', () => {
    expect(run('cuéntame un chiste').kind).toBe('unknown');
    for (const t of ['agrega una pared de 2 m al sur', 'haz la cocina 2 m más larga', 'pon una puerta en la pared sur']) {
      const p = run(t);
      expect(p.kind).toBe('commands');
      expect(parseProposal(p.commands).ok).toBe(true);
    }
  });
});

describe('snap + measurement math', () => {
  it('snaps to 50 mm grid', () => {
    expect(snapMm(24)).toBe(0);
    expect(snapMm(26)).toBe(50);
    expect(snapMm(-26)).toBe(-50);
    expect(snapMm(1234, 100)).toBe(1200);
    expect(Object.is(snapMm(-10), 0)).toBe(true);
  });

  it('drag delta lands the origin on the grid', () => {
    expect(snapMoveDelta({ x: 1010, y: 0 }, { x: 123, y: -30 })).toEqual({ dx: 140, dy: -50 });
    const { dx } = snapMoveDelta({ x: 1000, y: 0 }, { x: 20, y: 0 });
    expect(dx).toBe(0);
  });

  it('world <-> plan conversion is invertible', () => {
    const plot = { width: 6, height: 26 };
    const w = planMmToWorld({ x: 0, y: 0 }, plot);
    expect(w).toEqual({ x: -3, z: -13 });
    expect(worldToPlanMm(planMmToWorld({ x: 1250, y: 4000 }, plot), plot)).toEqual({ x: 1250, y: 4000 });
  });

  it('wall dimension labels show metres with 2 decimals', () => {
    expect(formatM(3000)).toBe('3.00 m');
    expect(formatM(1234)).toBe('1.23 m');
    const lines = wallDimensionLines(base().components, { width: 6, height: 26 });
    expect(lines.map((l) => l.id)).toEqual(['wN', 'wS']);
    expect(lines[0].label).toBe('4.00 m');
    expect(lines[0].lengthMm).toBe(4000);
  });
});
