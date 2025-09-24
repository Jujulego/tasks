import {
  isJobActive,
  isJobCompleted,
  isJobWaiting,
  job$,
  type JobOnStartProps,
  JobState,
} from '@/src/index.js';
import { describe, expect, it, vi } from 'vitest';

describe('job$', () => {
  it('should create a job in ready state, with defaults applied', () => {
    const job = job$({ onStart: vi.fn() });

    expect(job.id).toBeDefined();
    expect(job.state()).toBe(JobState.Ready);
    expect(job.weight).toBe(1);
  });

  it('should apply given id', () => {
    const job = job$({ id: 'life', onStart: vi.fn() });

    expect(job.id).toBe('life');
  });

  it('should apply given weight', () => {
    const job = job$({ weight: 42, onStart: vi.fn() });

    expect(job.weight).toBe(42);
  });

  describe('start', () => {
    it('should update job state to starting and call onStart callback', async () => {
      const onStart = vi.fn();
      const job = job$({ onStart });

      await job.start();

      expect(job.state()).toBe(JobState.Starting);
      expect(onStart).toHaveBeenCalled();
    });

    it.each([
      JobState.Running,
      JobState.Succeeded,
      JobState.Failed,
    ] as const)('should apply running state as triggerred by onStart callback', async (state) => {
      const onStart = vi.fn(({ setState }: JobOnStartProps) => setState(state));
      const job = job$({ onStart });

      await job.start();

      expect(job.state()).toBe(state);
    });

    it('should update job state to failed if onStart callback throws', async () => {
      const onStart = vi.fn(() => {
        throw new Error('Test');
      });
      const job = job$({ onStart });

      await expect(job.start()).rejects.toThrow(new Error('Test'));

      expect(job.state()).toBe(JobState.Failed);
    });

    it('should throw if job is not waiting', async () => {
      const job = job$({ onStart: vi.fn() });

      await job.start();
      await expect(job.start()).rejects.toThrow(new Error('Job in "starting" state cannot be started.'));
    });
  });

  describe('cancel', () => {
    it('should update job state to cancelled and trigger onStart signal', async () => {
      const onStart = vi.fn<(props: JobOnStartProps) => void>();
      const job = job$({ onStart });

      // First start the job
      await job.start();

      const { signal } = onStart.mock.calls[0]![0];
      expect(signal.aborted).toBe(false);

      // Then cancel it !
      await job.cancel();

      expect(job.state()).toBe(JobState.Canceled);
      expect(signal.aborted).toBe(true);
    });

    it('should call onCancel callback', async () => {
      expect.assertions(3);

      const onCancel = vi.fn(() => {
        expect(job.state()).toBe(JobState.Canceling);
      });
      const job = job$({ onStart: vi.fn(), onCancel });

      await job.start();
      await job.cancel();

      expect(job.state()).toBe(JobState.Canceled);
      expect(onCancel).toHaveBeenCalled();
    });
  });
});

describe('isJobWaiting', () => {
  it.each([
    JobState.Blocked,
    JobState.Ready,
  ])('should return true for "%s"', (state) => {
    expect(isJobWaiting(state)).toBe(true);
  });

  it.each([
    JobState.Starting,
    JobState.Running,
    JobState.Succeeded,
    JobState.Failed,
    JobState.Canceling,
    JobState.Canceled,
  ])('should return false for "%s"', (state) => {
    expect(isJobWaiting(state)).toBe(false);
  });
});

describe('isJobActive', () => {
  it.each([
    JobState.Starting,
    JobState.Running,
    JobState.Canceling,
  ])('should return true for "%s"', (state) => {
    expect(isJobActive(state)).toBe(true);
  });

  it.each([
    JobState.Blocked,
    JobState.Ready,
    JobState.Succeeded,
    JobState.Failed,
    JobState.Canceled,
  ])('should return false for "%s"', (state) => {
    expect(isJobActive(state)).toBe(false);
  });
});

describe('isJobCompleted', () => {
  it.each([
    JobState.Succeeded,
    JobState.Failed,
  ])('should return true for "%s"', (state) => {
    expect(isJobCompleted(state)).toBe(true);
  });

  it.each([
    JobState.Blocked,
    JobState.Ready,
    JobState.Starting,
    JobState.Running,
    JobState.Canceling,
    JobState.Canceled,
  ])('should return false for "%s"', (state) => {
    expect(isJobCompleted(state)).toBe(false);
  });
});
