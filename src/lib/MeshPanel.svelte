<script lang="ts">
  import { Button, Input, Card, Badge } from '@swal/ui';
  import { toast } from './vendor/swal-ui/lib/toast.svelte.js';
  import type { MeshClient, MeshPeer, MeshMessage } from './domain/mesh';

  // 1. Props using Svelte 5 runes
  let { client } = $props<{
    client: MeshClient;
  }>();

  // 2. Local state derived or tracked reactively
  // To allow tests to easily bind or read these lists, we can define reactive lists
  let peers = $state<MeshPeer[]>([]);
  let messages = $state<MeshMessage[]>([]);

  // Chat panel states
  let selectedPeerId = $state<string>('');
  let messageText = $state<string>('');

  // 3. Keep internal states up to date with the client properties (using $effect)
  $effect(() => {
    // Sync client lists to local reactive variables
    peers = client.peers;
    messages = client.messages;
  });

  // Export properties or bindable states so that tests can read them
  export { peers, messages };

  // 4. Svelte 5 reactive derivations ($derived) for active peer and messages
  let selectedPeer = $derived(peers.find(p => p.id === selectedPeerId));
  let activeMessages = $derived(messages.filter(m =>
    (m.from === 'self' && m.to === selectedPeerId) ||
    (m.from === selectedPeerId && m.to === 'self')
  ));

  function handleSend(e?: Event) {
    if (e) e.preventDefault();
    if (!selectedPeerId) {
      toast.error('Please select a peer to chat with.');
      return;
    }
    if (!messageText.trim()) {
      toast.error('Message text cannot be empty.');
      return;
    }

    try {
      // Use client API to send chat message
      const msg = client.sendChatMessage(selectedPeerId, messageText);
      // Immediately refresh messages in state
      messages = client.messages;
      messageText = '';
      toast.success('Message sent!');
    } catch (err: any) {
      toast.error(err?.message || 'Failed to send message');
    }
  }

  function getPeerStatusVariant(presence: MeshPeer['presence']) {
    switch (presence) {
      case 'online': return 'success';
      case 'away': return 'warning';
      case 'offline': return 'neutral';
      default: return 'neutral';
    }
  }
</script>

<div class="mesh-panel" data-testid="mesh-panel">
  <div class="panel-layout">
    <!-- Left Column: Presence / Peers List -->
    <div class="peers-column">
      <h3 class="column-title">Network Peers</h3>
      <div class="peers-list" data-testid="peers-list">
        {#if peers.length === 0}
          <div class="empty-state">No peers found in mesh</div>
        {:else}
          {#each peers as peer}
            <button
              class="peer-item"
              class:selected={selectedPeerId === peer.id}
              onclick={() => selectedPeerId = peer.id}
              data-testid={`peer-item-${peer.id}`}
            >
              <div class="peer-info">
                <span class="peer-name">{peer.name}</span>
                <span class="peer-id">{peer.id}</span>
              </div>
              <Badge variant={getPeerStatusVariant(peer.presence)} size="sm">
                {peer.presence}
              </Badge>
            </button>
          {/each}
        {/if}
      </div>
    </div>

    <!-- Right Column: Chat view -->
    <div class="chat-column">
      {#if !selectedPeerId}
        <div class="chat-placeholder">
          <p>Select a peer from the network list to start chatting.</p>
        </div>
      {:else}
        <div class="chat-header">
          <div class="peer-meta">
            <span class="chatting-with">Chat with <strong>{selectedPeer?.name || selectedPeerId}</strong></span>
            <Badge variant={selectedPeer ? getPeerStatusVariant(selectedPeer.presence) : 'neutral'} size="sm">
              {selectedPeer?.presence || 'unknown'}
            </Badge>
          </div>
        </div>

        <div class="chat-messages" data-testid="chat-messages">
          {#if activeMessages.length === 0}
            <div class="empty-chat">No messages yet. Say hello!</div>
          {:else}
            {#each activeMessages as msg}
              <div class="msg-bubble" class:self={msg.from === 'self'}>
                <div class="msg-meta">
                  <span class="msg-sender">{msg.from === 'self' ? 'Me' : (selectedPeer?.name || msg.from)}</span>
                  <span class="msg-time">{new Date(msg.createdAt).toLocaleTimeString()}</span>
                </div>
                <div class="msg-text">{msg.text}</div>
              </div>
            {/each}
          {/if}
        </div>

        <form class="chat-form" onsubmit={handleSend}>
          <div class="input-container">
            <Input
              bind:value={messageText}
              placeholder="Type a secure message..."
              data-testid="chat-input"
            />
          </div>
          <Button variant="primary" type="submit" data-testid="chat-send-btn">
            Send
          </Button>
        </form>
      {/if}
    </div>
  </div>
</div>

<style>
  .mesh-panel {
    display: flex;
    flex-direction: column;
    background: var(--swal-elevated, #121824);
    border: 1px solid var(--swal-border, #222b3c);
    border-radius: var(--swal-radius, 8px);
    width: 100%;
    height: 500px;
    font-family: var(--swal-font, sans-serif);
    color: var(--swal-text, #f3f4f6);
    overflow: hidden;
  }

  .panel-layout {
    display: flex;
    flex-direction: row;
    height: 100%;
    width: 100%;
  }

  .peers-column {
    width: 250px;
    border-right: 1px solid var(--swal-border, #222b3c);
    display: flex;
    flex-direction: column;
    background: var(--swal-surface, #0d121f);
  }

  .column-title {
    margin: 0;
    padding: var(--swal-space-4, 16px);
    font-size: var(--swal-font-size-sm, 14px);
    font-weight: 600;
    border-bottom: 1px solid var(--swal-border, #222b3c);
    color: var(--swal-text, #f3f4f6);
  }

  .peers-list {
    flex: 1;
    overflow-y: auto;
    display: flex;
    flex-direction: column;
    padding: var(--swal-space-2, 8px);
    gap: var(--swal-space-1, 4px);
  }

  .empty-state {
    padding: var(--swal-space-4, 16px);
    color: var(--swal-text-muted, #6b7280);
    font-size: var(--swal-font-size-xs, 12px);
    text-align: center;
  }

  .peer-item {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: var(--swal-space-2, 8px) var(--swal-space-3, 12px);
    background: transparent;
    border: none;
    border-radius: var(--swal-radius, 8px);
    cursor: pointer;
    text-align: left;
    transition: background var(--swal-transition-fast, 0.1s);
  }

  .peer-item:hover {
    background: var(--swal-surface-hover, #1a2235);
  }

  .peer-item.selected {
    background: var(--swal-surface-hover, #1a2235);
    border: 1px solid var(--swal-accent, #3b82f6);
  }

  .peer-info {
    display: flex;
    flex-direction: column;
    gap: 2px;
  }

  .peer-name {
    font-size: var(--swal-font-size-sm, 14px);
    font-weight: 500;
    color: var(--swal-text, #f3f4f6);
  }

  .peer-id {
    font-size: 10px;
    color: var(--swal-text-secondary, #9ca3af);
  }

  .chat-column {
    flex: 1;
    display: flex;
    flex-direction: column;
    background: var(--swal-elevated, #121824);
  }

  .chat-placeholder {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    color: var(--swal-text-secondary, #9ca3af);
    font-size: var(--swal-font-size-sm, 14px);
    text-align: center;
    padding: var(--swal-space-4, 16px);
  }

  .chat-header {
    padding: var(--swal-space-3, 12px) var(--swal-space-4, 16px);
    border-bottom: 1px solid var(--swal-border, #222b3c);
    background: var(--swal-surface, #0d121f);
  }

  .peer-meta {
    display: flex;
    align-items: center;
    justify-content: space-between;
  }

  .chatting-with {
    font-size: var(--swal-font-size-sm, 14px);
    color: var(--swal-text, #f3f4f6);
  }

  .chat-messages {
    flex: 1;
    overflow-y: auto;
    padding: var(--swal-space-4, 16px);
    display: flex;
    flex-direction: column;
    gap: var(--swal-space-3, 12px);
  }

  .empty-chat {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    color: var(--swal-text-muted, #6b7280);
    font-size: var(--swal-font-size-sm, 14px);
  }

  .msg-bubble {
    max-width: 70%;
    align-self: flex-start;
    background: var(--swal-surface, #0d121f);
    border: 1px solid var(--swal-border, #222b3c);
    border-radius: var(--swal-radius, 8px);
    padding: var(--swal-space-2, 8px) var(--swal-space-3, 12px);
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  .msg-bubble.self {
    align-self: flex-end;
    background: var(--swal-accent-muted, rgba(59, 130, 246, 0.1));
    border-color: var(--swal-accent, #3b82f6);
  }

  .msg-meta {
    display: flex;
    justify-content: space-between;
    gap: 12px;
    align-items: center;
  }

  .msg-sender {
    font-size: 11px;
    font-weight: 600;
    color: var(--swal-accent, #3b82f6);
  }

  .msg-time {
    font-size: 10px;
    color: var(--swal-text-muted, #6b7280);
  }

  .msg-text {
    font-size: var(--swal-font-size-sm, 14px);
    color: var(--swal-text, #f3f4f6);
    word-break: break-word;
    white-space: pre-wrap;
  }

  .chat-form {
    padding: var(--swal-space-3, 12px);
    border-top: 1px solid var(--swal-border, #222b3c);
    display: flex;
    gap: var(--swal-space-2, 8px);
    align-items: flex-end;
    background: var(--swal-surface, #0d121f);
  }

  .input-container {
    flex: 1;
  }
</style>
