<script lang="ts">
  import { Input, Button } from '@swal/ui';
  import { toast } from './vendor/swal-ui/lib/toast.svelte.js';
  import { executeSkill, parseSkillCommand } from './domain/ai-skills';

  // Export optional context prop
  let { context = {} } = $props<{ context?: any }>();

  let command = $state('');
  let results = $state<Array<{ id: string; name: string; ok: boolean; message: string }>>([]);

  function handleSend() {
    const parsed = parseSkillCommand(command);
    if (!parsed) {
      toast.error('Enter a skill command');
      return;
    }
    const result = executeSkill(parsed.name, parsed.params, context);
    const id = (typeof crypto !== 'undefined' && crypto.randomUUID) ? crypto.randomUUID() : Math.random().toString(36);
    results = [...results, { id, name: parsed.name, ok: result.ok, message: result.message }];

    if (result.ok) {
      toast.success(result.message);
      command = '';
    } else {
      toast.error(result.message);
    }
  }

  function handleSubmit(e: Event) {
    e.preventDefault();
    handleSend();
  }
</script>

<div class="ai-chat">
  <p class="hint">e.g. addWall x=2 y=3 width=5 height=0.15</p>
  <form class="row" onsubmit={handleSubmit}>
    <Input label="Command" bind:value={command} />
    <Button variant="primary" size="sm" type="submit">Send</Button>
  </form>

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
