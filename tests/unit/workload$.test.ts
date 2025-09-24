import {
  isWorkloadActive,
  isWorkloadCompleted,
  isWorkloadWaiting,
  workload$,
  type WorkloadOnStartProps,
  WorkloadState,
} from '@/src/index.js';
import { describe, expect, it, vi } from 'vitest';

describe('workload$', () => {
  it('should create a workload in ready state, with defaults applied', () => {
    const workload = workload$({ onStart: vi.fn() });

    expect(workload.id).toBeDefined();
    expect(workload.state()).toBe(WorkloadState.Ready);
    expect(workload.weight).toBe(1);
  });

  it('should apply given id', () => {
    const workload = workload$({ id: 'life', onStart: vi.fn() });

    expect(workload.id).toBe('life');
  });

  it('should apply given weight', () => {
    const workload = workload$({ weight: 42, onStart: vi.fn() });

    expect(workload.weight).toBe(42);
  });

  describe('start', () => {
    it('should update workload state to starting and call onStart callback', async () => {
      const onStart = vi.fn();
      const workload = workload$({ onStart });

      await workload.start();

      expect(workload.state()).toBe(WorkloadState.Starting);
      expect(onStart).toHaveBeenCalled();
    });

    it.each([
      WorkloadState.Running,
      WorkloadState.Succeeded,
      WorkloadState.Failed,
    ] as const)('should apply running state as triggerred by onStart callback', async (state) => {
      const onStart = vi.fn(({ setState }: WorkloadOnStartProps) => setState(state));
      const workload = workload$({ onStart });

      await workload.start();

      expect(workload.state()).toBe(state);
    });

    it('should update workload state to failed if onStart callback throws', async () => {
      const onStart = vi.fn(() => {
        throw new Error('Test');
      });
      const workload = workload$({ onStart });

      await expect(workload.start()).rejects.toThrow(new Error('Test'));

      expect(workload.state()).toBe(WorkloadState.Failed);
    });

    it('should throw if workload is not waiting', async () => {
      const workload = workload$({ onStart: vi.fn() });

      await workload.start();
      await expect(workload.start()).rejects.toThrow(new Error('Workload in "starting" state cannot be started.'));
    });
  });

  describe('cancel', () => {
    it('should update workload state to cancelled and trigger onStart signal', async () => {
      const onStart = vi.fn<(props: WorkloadOnStartProps) => void>();
      const workload = workload$({ onStart });

      // First start the workload
      await workload.start();

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
      const workload = workload$({ onStart: vi.fn(), onCancel });

      await workload.start();
      await workload.cancel();

      expect(workload.state()).toBe(WorkloadState.Canceled);
      expect(onCancel).toHaveBeenCalled();
    });
  });
});

describe('isWorkloadWaiting', () => {
  it.each([
    WorkloadState.Blocked,
    WorkloadState.Ready,
  ])('should return true for "%s"', (state) => {
    expect(isWorkloadWaiting(state)).toBe(true);
  });

  it.each([
    WorkloadState.Starting,
    WorkloadState.Running,
    WorkloadState.Succeeded,
    WorkloadState.Failed,
    WorkloadState.Canceling,
    WorkloadState.Canceled,
  ])('should return false for "%s"', (state) => {
    expect(isWorkloadWaiting(state)).toBe(false);
  });
});

describe('isWorkloadActive', () => {
  it.each([
    WorkloadState.Starting,
    WorkloadState.Running,
    WorkloadState.Canceling,
  ])('should return true for "%s"', (state) => {
    expect(isWorkloadActive(state)).toBe(true);
  });

  it.each([
    WorkloadState.Blocked,
    WorkloadState.Ready,
    WorkloadState.Succeeded,
    WorkloadState.Failed,
    WorkloadState.Canceled,
  ])('should return false for "%s"', (state) => {
    expect(isWorkloadActive(state)).toBe(false);
  });
});

describe('isWorkloadCompleted', () => {
  it.each([
    WorkloadState.Succeeded,
    WorkloadState.Failed,
  ])('should return true for "%s"', (state) => {
    expect(isWorkloadCompleted(state)).toBe(true);
  });

  it.each([
    WorkloadState.Blocked,
    WorkloadState.Ready,
    WorkloadState.Starting,
    WorkloadState.Running,
    WorkloadState.Canceling,
    WorkloadState.Canceled,
  ])('should return false for "%s"', (state) => {
    expect(isWorkloadCompleted(state)).toBe(false);
  });
});
