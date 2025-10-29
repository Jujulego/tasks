import { job$, type Workload$, workload$, WorkloadState } from '@/src/index.js';
import { var$ } from 'kyrielle';
import { beforeEach, describe, expect, it, vi } from 'vitest';

// Mocks
vi.mock('@/src/workload$.js');

// Setup
const workload = {
  id: 'mocked-workload-id',
  label: 'mocked workload',
  type: 'mocked',
  weight: 1,
  state$: var$<WorkloadState>(WorkloadState.Ready),
  block: vi.fn(),
  unblock: vi.fn(),
  start: vi.fn(),
  cancel: vi.fn(),
  state: vi.fn(() => WorkloadState.Ready),
} satisfies Workload$;

beforeEach(() => {
  vi.resetAllMocks();

  vi.mocked(workload$).mockReturnValue(workload);
});

// Tests
describe('job$', () => {
  it('should create a job using workload$', () => {
    const onStart = vi.fn();
    const job = job$({ label: 'test', onStart });

    expect(workload$).toHaveBeenCalledWith({ label: 'test', type: 'job', onStart });

    expect(job.id).toBe(workload.id);
    expect(job.cancel).toBe(workload.cancel);
    expect(job.start).toBe(workload.start);
    expect(job.state).toBe(workload.state);
    expect(job.weight).toBe(1);
  });

  it('should pass given props to workload$', () => {
    const onStart = vi.fn();
    job$({ id: '42', label: 'life', type: 'test', weight: 2, onStart });

    expect(workload$).toHaveBeenCalledWith({ id: '42', label: 'life', type: 'test', weight: 2, onStart });
  });

  describe('dependsOn', () => {
    it('should add dependency and block workload', () => {
      const job = job$({ label: 'test', onStart: vi.fn() });
      const dep = {
        state$: var$(WorkloadState.Ready),
        state: () => WorkloadState.Ready,
      } as unknown as Workload$;

      job.dependsOn(dep);

      expect(job.dependencies()).toContain(dep);
      expect(workload.block).toHaveBeenCalled();
      expect(workload.cancel).not.toHaveBeenCalled();
    });

    it('should add the succeeded dependency and keep workload state', () => {
      const job = job$({ label: 'test', onStart: vi.fn() });
      const dep = {
        state$: var$(WorkloadState.Succeeded),
        state: () => WorkloadState.Succeeded,
      } as unknown as Workload$;

      job.dependsOn(dep);

      expect(job.dependencies()).toContain(dep);
      expect(workload.block).not.toHaveBeenCalled();
      expect(workload.cancel).not.toHaveBeenCalled();
    });

    it('should add the failed dependency and cancel workload', () => {
      const job = job$({ label: 'test', onStart: vi.fn() });
      const dep = {
        state$: var$(WorkloadState.Canceled),
        state: () => WorkloadState.Canceled,
      } as unknown as Workload$;

      job.dependsOn(dep);

      expect(job.dependencies()).toContain(dep);
      expect(workload.block).not.toHaveBeenCalled();
      expect(workload.cancel).toHaveBeenCalled();
    });

    it('should unblock workload when dependency succeeds', () => {
      const job = job$({ label: 'test', onStart: vi.fn() });

      const state$ = var$(WorkloadState.Ready);
      const dep = { state$, state: state$.defer } as unknown as Workload$;

      job.dependsOn(dep);

      expect(job.dependencies()).toContain(dep);
      expect(workload.block).toHaveBeenCalled();
      expect(workload.cancel).not.toHaveBeenCalled();

      state$.mutate(WorkloadState.Succeeded);

      expect(workload.cancel).not.toHaveBeenCalled();
      expect(workload.unblock).toHaveBeenCalled();
    });

    it('should unblock workload when dependency fails', () => {
      const job = job$({ label: 'test', onStart: vi.fn() });

      const state$ = var$(WorkloadState.Ready);
      const dep = { state$, state: state$.defer } as unknown as Workload$;

      job.dependsOn(dep);

      expect(job.dependencies()).toContain(dep);
      expect(workload.block).toHaveBeenCalled();
      expect(workload.cancel).not.toHaveBeenCalled();

      state$.mutate(WorkloadState.Failed);

      expect(workload.cancel).toHaveBeenCalled();
      expect(workload.unblock).not.toHaveBeenCalled();
    });

    it('should not unblock workload when dependency succeeds, if it was manually blocked', () => {
      const job = job$({ label: 'test', onStart: vi.fn() });

      const state$ = var$(WorkloadState.Ready);
      const dep = { state$, state: state$.defer } as unknown as Workload$;

      job.dependsOn(dep);
      job.block();

      expect(job.dependencies()).toContain(dep);
      expect(workload.block).toHaveBeenCalled();

      state$.mutate(WorkloadState.Succeeded);

      expect(workload.cancel).not.toHaveBeenCalled();
      expect(workload.unblock).not.toHaveBeenCalled();
    });

    it('should cancel workload when dependency fails, even if it was manually blocked', () => {
      const job = job$({ label: 'test', onStart: vi.fn() });

      const state$ = var$(WorkloadState.Ready);
      const dep = { state$, state: state$.defer } as unknown as Workload$;

      job.dependsOn(dep);
      job.block();

      expect(job.dependencies()).toContain(dep);
      expect(workload.block).toHaveBeenCalled();

      state$.mutate(WorkloadState.Failed);

      expect(workload.cancel).toHaveBeenCalled();
      expect(workload.unblock).not.toHaveBeenCalled();
    });

    it('should throw if workload is not waiting', async () => {
      const job = job$({ label: 'test', onStart: vi.fn() });
      const dep = {
        state$: var$(WorkloadState.Ready),
        state: () => WorkloadState.Ready,
      } as unknown as Workload$;

      workload.state$.mutate(WorkloadState.Running);
      workload.state.mockReturnValue(WorkloadState.Running);

      expect(() => job.dependsOn(dep)).toThrow(new Error('Cannot add dependency to job in "running" state.'));

      expect(job.dependencies()).not.toContain(dep);
      expect(workload.block).not.toHaveBeenCalled();
    });
  });

  describe('block', () => {
    it('should block workload', () => {
      const job = job$({ label: 'test', onStart: vi.fn() });
      job.block();

      expect(workload.block).toHaveBeenCalled();
    });
  });

  describe('unblock', () => {
    it('should unblock workload', () => {
      const job = job$({ label: 'test', onStart: vi.fn() });
      job.unblock();

      expect(workload.unblock).toHaveBeenCalled();
    });

    it('should not unblock workload, if it has uncompleted dependencies', () => {
      const job = job$({ label: 'test', onStart: vi.fn() });
      const dep = {
        state$: var$(WorkloadState.Ready),
        state: () => WorkloadState.Ready,
      } as unknown as Workload$;

      job.dependsOn(dep);
      job.unblock();

      expect(workload.unblock).not.toHaveBeenCalled();
    });
  });
});
