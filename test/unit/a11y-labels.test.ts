import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, cleanup, fireEvent } from '@testing-library/svelte';
import MeshPanel from '../../src/lib/MeshPanel.svelte';
import AdminPanel from '../../src/lib/AdminPanel.svelte';
import Toolbar from '../../src/lib/Toolbar.svelte';
import type { MeshClient } from '../../src/lib/domain/mesh';

describe('Accessibility Labels and Semantic Roles Unit Tests', () => {
  beforeEach(() => {
    cleanup();
  });

  it('MeshPanel peer buttons and message form contain proper interactive labels and states', async () => {
    const mockClient: MeshClient = {
      instanceId: 'test-inst',
      namespace: 'swal/nido/test-inst',
      peers: [
        { id: 'peer-alice', name: 'Alice', presence: 'online' }
      ],
      messages: [],
      publishPresence: vi.fn(),
      sendChatMessage: vi.fn(),
      authzCheck: vi.fn(() => true)
    };

    const { getByTestId, getByPlaceholderText } = render(MeshPanel, { client: mockClient });

    // 1. Verify the peer item button has correct aria-pressed and aria-label attributes
    const peerBtn = getByTestId('peer-item-peer-alice');
    expect(peerBtn.getAttribute('aria-pressed')).toEqual('false');
    expect(peerBtn.getAttribute('aria-label')).toEqual('Chat with Alice, currently online');

    // Select the peer
    await fireEvent.click(peerBtn);
    expect(peerBtn.getAttribute('aria-pressed')).toEqual('true');

    // 2. Chat history must have aria-label and log role
    const chatLog = getByTestId('chat-messages');
    expect(chatLog.getAttribute('role')).toEqual('log');
    expect(chatLog.getAttribute('aria-label')).toEqual('Chat messages history');

    // 3. Input must have secure chat message label or placeholder text
    const chatInput = getByPlaceholderText('Type a secure message...');
    expect(chatInput.getAttribute('aria-label')).toEqual('Secure chat message text');
  });

  it('AdminPanel copy-btn renders with copy instance ID aria label', async () => {
    const fakeAdminClient = {
      instanceId: 'test-inst-admin-uuid',
      getTier: vi.fn().mockResolvedValue({ isPro: false }),
      refresh: vi.fn()
    };

    const { getByTestId } = render(AdminPanel, { client: fakeAdminClient });

    const copyBtn = getByTestId('copy-btn');
    expect(copyBtn).toBeTruthy();
    expect(copyBtn.getAttribute('aria-label')).toEqual('Copy Instance ID to clipboard');
  });

  it('Toolbar renders drawing tools with toolbar role and component library with group role', () => {
    const { getByLabelText } = render(Toolbar);

    // Verify drawing tools container has role="toolbar"
    const drawingTools = getByLabelText('Drawing tools');
    expect(drawingTools.getAttribute('role')).toEqual('toolbar');

    // Verify component library container has role="group" instead of invalid role="list"
    const componentLibrary = getByLabelText('Component library');
    expect(componentLibrary.getAttribute('role')).toEqual('group');
  });
});
