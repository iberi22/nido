import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, cleanup, fireEvent } from '@testing-library/svelte';
import { tick } from 'svelte';
import AdminPanel from '../../src/lib/AdminPanel.svelte';

// Konva is not used here but let's mock it just in case
vi.mock('konva', () => ({ default: {} }));

describe('AdminPanel component', () => {
  beforeEach(() => {
    cleanup();
    vi.stubGlobal('navigator', {
      clipboard: {
        writeText: vi.fn().mockResolvedValue(undefined)
      }
    });
  });

  it('renders Pro badge and Active status when tier.isPro is true', async () => {
    const fakeClient = {
      instanceId: 'test-uuid-pro',
      getTier: vi.fn().mockResolvedValue({ isPro: true, name: 'Pro Tier' }),
      refresh: vi.fn().mockResolvedValue(undefined)
    };

    const { getByTestId, queryByTestId } = render(AdminPanel, { props: { client: fakeClient } });

    // Wait for the async onMount/loadData call to complete and tick the Svelte microtasks
    await tick();
    await tick();
    await tick();

    const panel = getByTestId('admin-panel');
    expect(panel).toBeTruthy();

    const nodeStatus = getByTestId('node-status-text');
    expect(nodeStatus.textContent).toContain('Active');

    const tierBadgeContainer = getByTestId('tier-badge-container');
    expect(tierBadgeContainer.textContent).toContain('Pro');
    expect(tierBadgeContainer.textContent).not.toContain('Free');

    // No error message should be rendered
    expect(queryByTestId('error-message')).toBeNull();
  });

  it('renders Free badge and Inactive status when tier.isPro is false', async () => {
    const fakeClient = {
      instanceId: 'test-uuid-free',
      getTier: vi.fn().mockResolvedValue({ isPro: false }),
      refresh: vi.fn().mockResolvedValue(undefined)
    };

    const { getByTestId } = render(AdminPanel, { props: { client: fakeClient } });

    await tick();
    await tick();
    await tick();

    const nodeStatus = getByTestId('node-status-text');
    expect(nodeStatus.textContent).toContain('Inactive');

    const tierBadgeContainer = getByTestId('tier-badge-container');
    expect(tierBadgeContainer.textContent).toContain('Free');
    expect(tierBadgeContainer.textContent).not.toContain('Pro');
  });

  it('renders the copyable instance ID correctly and triggers copy on click', async () => {
    const fakeClient = {
      instanceId: 'test-uuid-123456',
      getTier: vi.fn().mockResolvedValue({ isPro: false })
    };

    const { getByTestId } = render(AdminPanel, { props: { client: fakeClient } });

    await tick();
    await tick();
    await tick();

    const instanceIdElement = getByTestId('instance-id');
    expect(instanceIdElement.textContent).toEqual('test-uuid-123456');

    const copyBtn = getByTestId('copy-btn');
    expect(copyBtn).toBeTruthy();

    await fireEvent.click(copyBtn);
    expect(navigator.clipboard.writeText).toHaveBeenCalledWith('test-uuid-123456');
  });

  it('refresh button re-queries the status from the client and updates UI', async () => {
    let proState = false;
    const fakeClient = {
      instanceId: 'test-uuid-refresh',
      getTier: vi.fn().mockImplementation(() => {
        return { isPro: proState };
      }),
      refresh: vi.fn().mockImplementation(() => {
        proState = true;
        return Promise.resolve();
      })
    };

    const { getByTestId } = render(AdminPanel, { props: { client: fakeClient } });

    await tick();
    await tick();
    await tick();

    // Initially Inactive and Free
    expect(getByTestId('node-status-text').textContent).toContain('Inactive');
    expect(getByTestId('tier-badge-container').textContent).toContain('Free');

    // Click refresh
    const refreshBtn = getByTestId('refresh-btn');
    await fireEvent.click(refreshBtn);

    await tick();
    await tick();
    await tick();

    // Verify client.refresh was called
    expect(fakeClient.refresh).toHaveBeenCalled();

    // Now Active and Pro
    expect(getByTestId('node-status-text').textContent).toContain('Active');
    expect(getByTestId('tier-badge-container').textContent).toContain('Pro');
  });

  it('error state shows degraded message and keeps retry option', async () => {
    const fakeClient = {
      instanceId: 'test-uuid-error',
      getTier: vi.fn().mockRejectedValue(new Error('Connection timed out')),
      refresh: vi.fn().mockResolvedValue(undefined)
    };

    const { getByTestId, queryByTestId } = render(AdminPanel, { props: { client: fakeClient } });

    await tick();
    await tick();
    await tick();

    // Error message should be rendered
    const errorMsg = getByTestId('error-message');
    expect(errorMsg).toBeTruthy();
    expect(errorMsg.textContent).toContain('Degraded Mode: Connection timed out');

    // Refresh and copy button should still be present
    expect(getByTestId('refresh-btn')).toBeTruthy();
    expect(getByTestId('copy-btn')).toBeTruthy();
  });
});
