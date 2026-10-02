<script lang="ts">
  import { Input, Button } from '@swal/ui';
  import { toast } from '@swal/ui/toast';
  import { executeSkill, parseSkillCommand } from './domain/ai-skills';
  import { sceneCommands } from './commands/sceneCommands.svelte';
  import { rulesEsProposer } from './commands/rules-es';
  import type { CommandProposer } from './commands/proposer';
  import type { Command } from './commands/schema';

  // `proposer` is the plug-in point for a local LLM (WebLLM/Gemma, JSON-schema output).
  let { context = {}, proposer = rulesEsProposer } = $props<{
    context?: any;
    proposer?: CommandProposer;
  }>();

  interface Pending {
    commands: Command[];
    summary: string[];
    error: string | null;
  }

  let command = $state('');
  let pending = $state<Pending | null>(null);
  let results = $state<Array<{ id: string; name: string; ok: boolean; message: string }>>([]);

  function log(name: string, ok: boolean, message: string) {
    const id = (typeof crypto !== 'undefined' && crypto.randomUUID) ? crypto.randomUUID() : Math.random().toString(36);
    results = [...results, { id, name, ok, message }];
  }

  async function handleSend() {
    const text = command.trim();
    if (!text) {
      toast.error('Escribe una instrucción');
      return;
    }
    const proposal = await proposer.propose(text, sceneCommands.model);

    if (proposal.kind === 'undo' || proposal.kind === 'redo') {
      const r = proposal.kind === 'undo' ? sceneCommands.undo() : sceneCommands.redo();
      log(proposal.kind === 'undo' ? 'deshacer' : 'rehacer', r.ok, r.ok ? 'Hecho' : r.error);
      pending = null;
      command = '';
      return;
    }

    if (proposal.kind === 'commands') {
      // dry-run so the preview already shows if the plan would reject it
      const dry = sceneCommands.dryRun(proposal.commands);
      pending = { commands: proposal.commands, summary: proposal.summary, error: dry.ok ? null : dry.error };
      return;
    }

    // Legacy `skillName k=v` commands (e.g. addWall x=2 y=3 width=5 height=0.15)
    const parsed = parseSkillCommand(text);
    if (parsed) {
      const result = executeSkill(parsed.name, parsed.params, context);
      log(parsed.name, result.ok, result.message);
      if (result.ok) {
        toast.success(result.message);
        command = '';
      } else {
        toast.error(result.message);
      }
      return;
    }
    log('chat', false, proposal.message);
    toast.error(proposal.message);
  }

  function confirm() {
    if (!pending || pending.error) return;
    const r = sceneCommands.execute(pending.commands);
    if (r.ok) {
      log('aplicado', true, pending.summary.join('\n'));
      toast.success('Cambios aplicados');
      command = '';
    } else {
      log('error', false, r.error);
      toast.error(r.error);
    }
    pending = null;
  }

  function cancel() {
    pending = null;
  }

  function handleSubmit(e: Event) {
    e.preventDefault();
    void handleSend();
  }
</script>

<div class="ai-chat">
  <p class="hint">Ej.: "agrega una pared de 3 m al norte", "haz la cocina 50 cm más ancha", "pon una ventana en la pared norte", "deshacer"</p>
  <form class="row" onsubmit={handleSubmit} aria-label="AI Assistant panel">
    <Input label="Command" bind:value={command} />
    <Button variant="primary" size="sm" type="submit">Send</Button>
  </form>

  <div class="history-row">
    <Button variant="ghost" size="sm" disabled={!sceneCommands.canUndo} onclick={() => sceneCommands.undo()}>Deshacer</Button>
    <Button variant="ghost" size="sm" disabled={!sceneCommands.canRedo} onclick={() => sceneCommands.redo()}>Rehacer</Button>
  </div>

  {#if pending}
    <div class="preview" data-testid="ai-preview" class:error={!!pending.error}>
      <strong>Vista previa</strong>
      <ul>
        {#each pending.summary as line}
          <li>{line}</li>
        {/each}
      </ul>
      {#if pending.error}
        <p class="preview-error">No se puede aplicar: {pending.error}</p>
      {/if}
      <div class="history-row">
        <Button variant="primary" size="sm" disabled={!!pending.error} onclick={confirm}>Confirmar</Button>
        <Button variant="ghost" size="sm" onclick={cancel}>Cancelar</Button>
      </div>
    </div>
  {/if}

  {#if results.length > 0}
    <ul class="results-list">
      {#each results as res (res.id)}
        <li data-testid="ai-skill-result" class="result-item" class:error={!res.ok}>
          <span class="skill-name">{res.name}:</span>
          <pre class="skill-message">{res.message}</pre>
        </li>
      {/each}
    </ul>
  {/if}
</div>

<style>
  .ai-chat {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }
  .hint {
    margin: 0;
    font-size: 11px;
    color: var(--swal-text-secondary, #94a3b8);
  }
  .history-row {
    display: flex;
    gap: 8px;
  }
  .preview {
    padding: 8px;
    border: 1px solid var(--swal-accent, #3b82f6);
    border-radius: var(--swal-radius, 4px);
    background: var(--swal-surface-hover, #1e293b);
    font-size: var(--swal-font-size-xs, 12px);
    color: var(--swal-text, #f8fafc);
    display: flex;
    flex-direction: column;
    gap: 6px;
  }
  .preview.error {
    border-color: var(--swal-danger, #ef4444);
  }
  .preview ul {
    margin: 0;
    padding-left: 16px;
  }
  .preview-error {
    margin: 0;
    color: var(--swal-danger, #ef4444);
  }
  .row {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }
  .results-list {
    margin: 8px 0 0 0;
    padding: 0;
    list-style: none;
    display: flex;
    flex-direction: column;
    gap: 6px;
    max-height: 200px;
    overflow-y: auto;
  }
  .result-item {
    font-family: var(--swal-font-mono, monospace);
    font-size: var(--swal-font-size-xs, 12px);
    padding: 8px;
    background: var(--swal-surface-hover, #1e293b);
    border: 1px solid var(--swal-border, #334155);
    border-radius: var(--swal-radius, 4px);
    color: var(--swal-text, #f8fafc);
  }
  .result-item.error {
    border-color: var(--swal-danger, #ef4444);
    background: rgba(239, 68, 68, 0.1);
  }
  .skill-name {
    font-weight: bold;
    display: block;
    margin-bottom: 4px;
    color: var(--swal-accent, #3b82f6);
  }
  .skill-message {
    margin: 0;
    white-space: pre-wrap;
    font-family: inherit;
    font-size: inherit;
    color: inherit;
  }
</style>
