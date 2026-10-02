// Framework-agnostic command history with undo/redo. UI actions and chat both call execute().
import { applyCommand, type SceneModel } from './apply';
import type { Command } from './schema';

export interface ModelPort {
  /** Must return a fresh, plain snapshot (no reactive proxies). */
  get(): SceneModel;
  set(model: SceneModel): void;
}

interface Entry {
  forward: Command[];
  inverse: Command[]; // already in undo order (reverse of forward)
}

export type ExecResult = { ok: true; summaries: string[] } | { ok: false; error: string };

function applyAll(model: SceneModel, cmds: Command[]) {
  let current = model;
  const inverses: Command[] = [];
  const summaries: string[] = [];
  for (const cmd of cmds) {
    const r = applyCommand(current, cmd);
    if (!r.ok) return { ok: false as const, error: r.error };
    current = r.model;
    inverses.unshift(r.inverse);
    summaries.push(r.summary);
  }
  return { ok: true as const, model: current, inverses, summaries };
}

export class CommandHistory {
  private undoStack: Entry[] = [];
  private redoStack: Entry[] = [];
  private readonly limit: number;

  constructor(
    private readonly port: ModelPort,
    private readonly onChange: () => void = () => {},
    limit = 200
  ) {
    this.limit = limit;
  }

  get canUndo(): boolean {
    return this.undoStack.length > 0;
  }

  get canRedo(): boolean {
    return this.redoStack.length > 0;
  }

  /** Validate + apply without committing anything. */
  dryRun(input: Command | Command[]): ExecResult {
    const cmds = Array.isArray(input) ? input : [input];
    const r = applyAll(this.port.get(), cmds);
    return r.ok ? { ok: true, summaries: r.summaries } : { ok: false, error: r.error };
  }

  /** Apply a command (or an atomic batch). Nothing changes if any command fails. */
  execute(input: Command | Command[]): ExecResult {
    const cmds = Array.isArray(input) ? input : [input];
    if (cmds.length === 0) return { ok: false, error: 'Sin comandos' };
    const r = applyAll(this.port.get(), cmds);
    if (!r.ok) return { ok: false, error: r.error };
    this.port.set(r.model);
    this.undoStack.push({ forward: cmds, inverse: r.inverses });
    if (this.undoStack.length > this.limit) this.undoStack.shift();
    this.redoStack = [];
    this.onChange();
    return { ok: true, summaries: r.summaries };
  }

  undo(): ExecResult {
    const entry = this.undoStack.pop();
    if (!entry) return { ok: false, error: 'Nada que deshacer' };
    const r = applyAll(this.port.get(), entry.inverse);
    if (!r.ok) {
      this.undoStack.push(entry);
      return { ok: false, error: r.error };
    }
    this.port.set(r.model);
    this.redoStack.push(entry);
    this.onChange();
    return { ok: true, summaries: r.summaries };
  }

  redo(): ExecResult {
    const entry = this.redoStack.pop();
    if (!entry) return { ok: false, error: 'Nada que rehacer' };
    const r = applyAll(this.port.get(), entry.forward);
    if (!r.ok) {
      this.redoStack.push(entry);
      return { ok: false, error: r.error };
    }
    this.port.set(r.model);
    this.undoStack.push(entry);
    this.onChange();
    return { ok: true, summaries: r.summaries };
  }

  clear(): void {
    this.undoStack = [];
    this.redoStack = [];
    this.onChange();
  }
}
