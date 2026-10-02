// CommandProposer: the seam between natural language and the command layer.
// Today: Spanish rule-based parser (rules-es.ts). Later: a local LLM (WebLLM/Gemma with JSON
// schema output = commandJsonSchema()) implements the same interface; its output MUST go
// through parseProposal() before being shown as a preview.
import type { SceneModel } from './apply';
import type { Command } from './schema';

export type Proposal =
  | { kind: 'commands'; commands: Command[]; summary: string[] }
  | { kind: 'undo' }
  | { kind: 'redo' }
  | { kind: 'unknown'; message: string };

export interface CommandProposer {
  readonly name: string;
  propose(text: string, model: SceneModel): Promise<Proposal> | Proposal;
}
