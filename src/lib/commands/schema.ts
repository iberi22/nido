// Zod-validated JSON command schema. Whitelisted ops only; units = integer millimetres.
// This is the contract both the UI, the Spanish rule parser and (later) a local LLM use.
import { z } from 'zod';

export const LIMIT_MM = 200_000; // 200 m
export const MIN_LEN_MM = 100;
export const MAX_LEN_MM = 100_000;
export const MIN_ROOM_MM = 500;

const Id = z.string().regex(/^[\w.:-]{1,64}$/, 'id inválido');
const Coord = z.number().int().min(-LIMIT_MM).max(LIMIT_MM);
const Delta = z.number().int().min(-LIMIT_MM).max(LIMIT_MM);
const Len = z.number().int().min(MIN_LEN_MM).max(MAX_LEN_MM);

export const ComponentSchema = z.object({
  id: Id,
  type: z.string().min(1).max(40),
  x: z.number(),
  y: z.number(),
  width: z.number().optional(),
  height: z.number().optional(),
  rotation: z.number().optional(),
  layer: z.enum(['structure', 'furniture', 'zones', 'annotations', 'grid']),
  properties: z.record(z.string(), z.any()),
  locked: z.boolean().optional()
});

export const AddWall = z.object({
  op: z.literal('addWall'),
  id: Id,
  x1: Coord,
  y1: Coord,
  x2: Coord,
  y2: Coord,
  thickness: z.number().int().min(50).max(600).optional()
});

export const MoveWall = z.object({ op: z.literal('moveWall'), id: Id, dx: Delta, dy: Delta });

export const MoveObject = z.object({ op: z.literal('moveObject'), id: Id, dx: Delta, dy: Delta });

export const ResizeRoom = z
  .object({ op: z.literal('resizeRoom'), id: Id, dw: Delta.default(0), dh: Delta.default(0) })
  .refine((c) => c.dw !== 0 || c.dh !== 0, { message: 'resizeRoom sin cambio' });

export const AddOpening = z.object({
  op: z.literal('addOpening'),
  id: Id,
  kind: z.enum(['door', 'window']),
  wallId: Id,
  /** distance from the wall start (min x / min y end) to the opening start */
  offset: z.number().int().min(0).max(MAX_LEN_MM),
  width: Len,
  height: z.number().int().min(300).max(4000).optional(),
  sill: z.number().int().min(0).max(3000).optional()
});

export const AddFurniture = z.object({
  op: z.literal('addFurniture'),
  id: Id,
  kind: z.string().min(1).max(40),
  label: z.string().max(60).optional(),
  x: Coord,
  y: Coord,
  width: Len,
  depth: Len,
  rotation: z.number().int().min(0).max(359).optional()
});

export const DeleteObject = z.object({ op: z.literal('deleteObject'), id: Id });

export const SetDimension = z.object({
  op: z.literal('setDimension'),
  id: Id,
  dimension: z.enum(['length', 'thickness', 'width', 'depth']),
  value: Len
});

/** Internal: inverse of deleteObject (restores components at their original index). */
export const RestoreObjects = z.object({
  op: z.literal('restoreObjects'),
  items: z.array(z.object({ index: z.number().int().min(0), component: ComponentSchema })).min(1)
});

export const CommandSchema = z.discriminatedUnion('op', [
  AddWall,
  MoveWall,
  MoveObject,
  ResizeRoom,
  AddOpening,
  AddFurniture,
  DeleteObject,
  SetDimension,
  RestoreObjects
]);

export type Command = z.infer<typeof CommandSchema>;
export type CommandOp = Command['op'];
export type SceneComponent = z.infer<typeof ComponentSchema>;

/** Ops an external proposer (chat / LLM) may emit. `restoreObjects` is internal-only. */
export const PROPOSABLE_OPS: CommandOp[] = [
  'addWall',
  'moveWall',
  'moveObject',
  'resizeRoom',
  'addOpening',
  'addFurniture',
  'deleteObject',
  'setDimension'
];

export const ProposalCommandsSchema = z.array(
  CommandSchema.refine((c) => PROPOSABLE_OPS.includes(c.op), { message: 'op no permitida' })
);

export type ParseResult<T> = { ok: true; value: T } | { ok: false; error: string };

function fmtIssues(err: z.ZodError): string {
  return err.issues
    .slice(0, 3)
    .map((i) => `${i.path.join('.') || 'comando'}: ${i.message}`)
    .join('; ');
}

export function parseCommand(input: unknown): ParseResult<Command> {
  const r = CommandSchema.safeParse(input);
  return r.success ? { ok: true, value: r.data } : { ok: false, error: fmtIssues(r.error) };
}

/** Validate an array of commands coming from an untrusted source (LLM JSON output). */
export function parseProposal(input: unknown): ParseResult<Command[]> {
  const r = ProposalCommandsSchema.safeParse(input);
  return r.success ? { ok: true, value: r.data } : { ok: false, error: fmtIssues(r.error) };
}

/** JSON Schema of the command union, to hand to an LLM as response constraint. */
export function commandJsonSchema(): unknown {
  return z.toJSONSchema(z.array(CommandSchema));
}
