import { workload$, type WorkloadOnStartProps, WorkloadState, } from '@/src/index.js';
import { describe, expect, it, vi } from 'vitest';

// Tests
describe('workload$', () => {
  it('should create a workload in ready state, with defaults applied', () => {
    const workload = workload$({ label: 'test', onStart: vi.fn() });

    expect(workload.id).toBeDefined();
    expect(workload.label).toBe('test');
    expect(workload.state()).toBe(WorkloadState.Ready);
    expect(workload.weight).toBe(1);
  });

  it('should apply given id', () => {
    const workload = workload$({ id: 'life', label: 'test', onStart: vi.fn() });

    expect(workload.id).toBe('life');
  });

  it('should apply given weight', () => {
    const workload = workload$({ weight: 42, label: 'test', onStart: vi.fn() });

    expect(workload.weight).toBe(42);
  });

  describe('block', () => {
    it('should change workload state to blocked', () => {
      const workload = workload$({ label: 'test', onStart: vi.fn() });

      // Blocks a "ready" workload
      workload.block();
      expect(workload.state()).toBe(WorkloadState.Blocked);

      // Blocks a "blocked" workload
      workload.block();
      expect(workload.state()).toBe(WorkloadState.Blocked);
    });

    it('should throw if workload state is neither blocked or ready', async () => {
      const workload = workload$({ label: 'test', onStart: vi.fn() });
      await workload.cancel();

      expect(() => workload.block()).toThrow(new Error('Workload in "canceled" state cannot be blocked.'));
    });
  });

  describe('unblock', () => {
    it('should change workload state to ready', () => {
      const workload = workload$({ label: 'test', onStart: vi.fn() });

      // Unblocks a "ready" workload
      workload.unblock();
      expect(workload.state()).toBe(WorkloadState.Ready);

      // Unblocks a "blocked" workload
      workload.block();
      workload.unblock();
      expect(workload.state()).toBe(WorkloadState.Ready);
    });

    it('should throw if workload state is neither blocked or ready', async () => {
      const workload = workload$({ label: 'test', onStart: vi.fn() });
      await workload.cancel();

      expect(() => workload.unblock()).toThrow(new Error('Workload in "canceled" state cannot be unblocked.'));
    });
  });

  describe('start', () => {
    it('should update workload state to starting and call onStart callback', () => {
      const onStart = vi.fn();
      const workload = workload$({ label: 'test', onStart });

      workload.start();

      expect(workload.state()).toBe(WorkloadState.Starting);
      expect(onStart).toHaveBeenCalled();
    });

    it.each([
      WorkloadState.Running,
      WorkloadState.Succeeded,
      WorkloadState.Failed,
    ] as const)('should apply running state as triggerred by onStart callback', (state) => {
      const onStart = vi.fn(({ setState }: WorkloadOnStartProps) => setState(state));
      const workload = workload$({ label: 'test', onStart });

      workload.start();

      expect(workload.state()).toBe(state);
    });

    it('should update workload state to failed if onStart callback throws', () => {
      const onStart = vi.fn(() => {
        throw new Error('Test');
      });
      const workload = workload$({ label: 'test', onStart });

      expect(() => workload.start()).toThrow(new Error('Test'));

      expect(workload.state()).toBe(WorkloadState.Failed);
    });

    it('should throw if workload is not waiting', () => {
      const workload = workload$({ label: 'test', onStart: vi.fn() });

      workload.start();
      expect(() => workload.start()).toThrow(new Error('Workload in "starting" state cannot be started.'));
    });
  });

  describe('cancel', () => {
    it('should update workload state to cancelled and trigger onStart signal', async () => {
      const onStart = vi.fn<(props: WorkloadOnStartProps) => void>();
      const workload = workload$({ label: 'test', onStart });

      // First start the workload
      workload.start();

      const { signal } = onStart.mock.calls[0]![0];
      expect(signal.aborted).toBe(false);

      // Then cancel it !
      await workload.cancel();

      expect(workload.state()).toBe(WorkloadState.Canceled);
      expect(signal.aborted).toBe(true);
    });

    it('should call onCancel callback', async () => {
      expect.assertions(3);

      const onCancel = vi.fn(() => {
        expect(workload.state()).toBe(WorkloadState.Canceling);
      });
      const workload = workload$({ label: 'test', onStart: vi.fn(), onCancel });

      workload.start();
      await workload.cancel();

      expect(workload.state()).toBe(WorkloadState.Canceled);
      expect(onCancel).toHaveBeenCalled();
    });
  });
});
