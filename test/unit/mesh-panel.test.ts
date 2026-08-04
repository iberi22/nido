import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, cleanup, fireEvent, tick } from '@testing-library/svelte';
import MeshPanel from '../../src/lib/MeshPanel.svelte';
import type { MeshClient, MeshPeer, MeshMessage } from '../../src/lib/domain/mesh';

describe('MeshPanel component', () => {
  let fakeClient: MeshClient;
  let mockPeers: MeshPeer[];
  let mockMessages: MeshMessage[];

  beforeEach(() => {
    cleanup();

    mockPeers = [
      { id: 'peer-1', name: 'Alice', presence: 'online' },
      { id: 'peer-2', name: 'Bob', presence: 'offline' }
    ];

    mockMessages = [
      {
        id: 'msg-1',
        from: 'peer-1',
        to: 'self',
        text: 'Hello from Alice!',
        createdAt: new Date().toISOString()
      }
    ];

    fakeClient = {
      instanceId: 'test-instance',
      namespace: 'swal/nido/test-instance',
      get peers() {
        return mockPeers;
      },
      get messages() {
        return mockMessages;
      },
      publishPresence: vi.fn(),
      sendChatMessage: vi.fn((to: string, text: string) => {
        const newMsg: MeshMessage = {
          id: `msg-${Math.random()}`,
          from: 'self',
          to,
          text,
          createdAt: new Date().toISOString()
        };
        mockMessages.push(newMsg);
        return newMsg;
      }),
      authzCheck: vi.fn(() => true)
    };
  });

  it('renders mesh panel and contains data-testid="mesh-panel"', () => {
    const { getByTestId } = render(MeshPanel, { client: fakeClient });
    const panel = getByTestId('mesh-panel');
    expect(panel).toBeTruthy();
  });

  it('renders network peer items correctly with names and presence states', () => {
    const { getByText, getByTestId } = render(MeshPanel, { client: fakeClient });
    const list = getByTestId('peers-list');
    expect(list).toBeTruthy();

    expect(getByText('Alice')).toBeTruthy();
    expect(getByText('Bob')).toBeTruthy();
    expect(getByText('online')).toBeTruthy();
    expect(getByText('offline')).toBeTruthy();
  });

  it('selects a peer and shows chatting with name', async () => {
    const { getByText, queryByText, getAllByText } = render(MeshPanel, { client: fakeClient });

    // Initially should show placeholder
    expect(getByText('Select a peer from the network list to start chatting.')).toBeTruthy();

    const peerBtn = getByText('Alice');
    await fireEvent.click(peerBtn);

    expect(queryByText('Select a peer from the network list to start chatting.')).toBeNull();
    expect(getByText('Chat with')).toBeTruthy();

    // There can be multiple "Alice" instances (the button, the chatting-with header, message sender, etc.)
    const aliceElements = getAllByText('Alice');
    expect(aliceElements.length).toBeGreaterThanOrEqual(1);
  });

  it('sends a chat message successfully calling sendChatMessage on the client', async () => {
    const { getByText, getByTestId, getByPlaceholderText } = render(MeshPanel, { client: fakeClient });

    // Select peer first
    await fireEvent.click(getByText('Alice'));

    // Input message
    const input = getByPlaceholderText('Type a secure message...') as HTMLInputElement;
    await fireEvent.input(input, { target: { value: 'Hey Alice, how are you?' } });

    // Submit form
    const sendBtn = getByTestId('chat-send-btn');
    await fireEvent.click(sendBtn);

    // Verify client sendChatMessage was called
    expect(fakeClient.sendChatMessage).toHaveBeenCalledWith('peer-1', 'Hey Alice, how are you?');
  });

  it('updates the view dynamically when a peer is selected and shows previous messages', async () => {
    const { getByText, getByTestId } = render(MeshPanel, { client: fakeClient });

    // Select Alice
    await fireEvent.click(getByText('Alice'));

    const messagesContainer = getByTestId('chat-messages');
    expect(messagesContainer.textContent).toContain('Hello from Alice!');
  });
});
