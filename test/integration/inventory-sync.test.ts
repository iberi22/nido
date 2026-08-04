import { describe, test, expect, vi } from 'vitest';
import { SyncQueue, type SyncOperation } from '../../src/lib/domain/inventory';

describe('Inventory Offline-First Sync Queue Integration Tests', () => {
  test('should enqueue sync operations properly', () => {
    const queue = new SyncQueue();
    expect(queue.getQueue()).toHaveLength(0);

    queue.enqueue('add', 'item-1', { name: 'Microwave', value: 150 });
    queue.enqueue('update', 'item-1', { value: 160 });
    queue.enqueue('remove', 'item-2');

    const ops = queue.getQueue();
    expect(ops).toHaveLength(3);

    expect(ops[0].action).toBe('add');
    expect(ops[0].itemId).toBe('item-1');
    expect(ops[0].payload).toEqual({ name: 'Microwave', value: 150 });

    expect(ops[1].action).toBe('update');
    expect(ops[1].itemId).toBe('item-1');
    expect(ops[1].payload).toEqual({ value: 160 });

    expect(ops[2].action).toBe('remove');
    expect(ops[2].itemId).toBe('item-2');
  });

  test('should process and clear successful operations', async () => {
    const queue = new SyncQueue();
    queue.enqueue('add', 'item-1', { name: 'Microwave' });
    queue.enqueue('update', 'item-1', { name: 'Microwave v2' });

    // Mock successful sync fn
    const syncFn = vi.fn().mockResolvedValue(true);

    const result = await queue.process(syncFn);
    expect(result.success).toBe(true);
    expect(result.processedCount).toBe(2);
    expect(syncFn).toHaveBeenCalledTimes(2);

    // Queue should be empty now
    expect(queue.getQueue()).toHaveLength(0);
  });

  test('should keep failed operations in the queue', async () => {
    const queue = new SyncQueue();
    queue.enqueue('add', 'item-1', { name: 'Microwave' });
    queue.enqueue('update', 'item-1', { name: 'Microwave v2' });

    // Mock first sync success, second failure
    const syncFn = vi.fn()
      .mockResolvedValueOnce(true)
      .mockResolvedValueOnce(false);

    const result = await queue.process(syncFn);
    expect(result.success).toBe(false);
    expect(result.processedCount).toBe(1);

    // Remaining failed operation should still be in queue
    const remaining = queue.getQueue();
    expect(remaining).toHaveLength(1);
    expect(remaining[0].action).toBe('update');
  });

  test('should clear the queue completely when requested', () => {
    const queue = new SyncQueue();
    queue.enqueue('add', 'item-1');
    queue.enqueue('update', 'item-2');

    expect(queue.getQueue()).toHaveLength(2);
    queue.clear();
    expect(queue.getQueue()).toHaveLength(0);
  });

  test('should retain operations when syncFn throws', async () => {
    const queue = new SyncQueue();
    queue.enqueue('add', 'item-1', { name: 'Toaster' });
    queue.enqueue('remove', 'item-2');

    const syncFn = vi.fn()
      .mockResolvedValueOnce(true)
      .mockRejectedValueOnce(new Error('network down'));

    const result = await queue.process(syncFn);
    expect(result.success).toEqual(false);
    expect(result.processedCount).toBe(1);
    expect(queue.getQueue()).toHaveLength(1);
    expect(queue.getQueue()[0].action).toBe('remove');
  });
});
