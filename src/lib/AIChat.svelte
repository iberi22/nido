<script lang="ts">
  import { Input, Button } from '@swal/ui';
  import { toast } from './vendor/swal-ui/lib/toast.svelte.js';
  import { executeSkill, parseSkillCommand } from './domain/ai-skills';

  let command = $state('');

  function handleSend() {
    const parsed = parseSkillCommand(command);
    if (!parsed) {
      toast.error('Enter a skill command');
      return;
    }
    const result = executeSkill(parsed.name, parsed.params);
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
</style>
